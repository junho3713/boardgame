'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const asset='public/assets/effects/pixelfx/dice-impact-v20261124',meta=JSON.parse(fs.readFileSync(__dirname+'/'+asset+'.json'));
function harness(){
 const requests=[],calls=[],stack=[];
 class Image{constructor(){requests.push(this);}load(ok=true,wrongSize=false){if(!ok)return this.onerror();const png=fs.readFileSync(__dirname+'/public/'+this.src);this.naturalWidth=png.readUInt32BE(16)+(wrongSize?1:0);this.naturalHeight=png.readUInt32BE(20);this.onload();}}
 const window={Image};vm.runInNewContext(fs.readFileSync(__dirname+'/public/roster-art.js','utf8'),{window,Promise});
 const ctx=new Proxy({globalAlpha:1,globalCompositeOperation:'source-over',imageSmoothingEnabled:false,
  save(){stack.push([this.globalAlpha,this.globalCompositeOperation,this.imageSmoothingEnabled]);},restore(){a.ok(stack.length);[this.globalAlpha,this.globalCompositeOperation,this.imageSmoothingEnabled]=stack.pop();},
  createLinearGradient(){return{addColorStop(){}};},
  drawImage(image,sx,sy,sw,sh,...dst){a.ok([sx,sy,sw,sh,...dst].every(Number.isFinite));a.ok(sx>=0&&sy>=0&&sx+sw<=image.naturalWidth&&sy+sh<=image.naturalHeight);calls.push(['image',image.src,sx,sy,sw,sh,...dst]);}
 },{get:(o,k)=>k in o?o[k]:(...args)=>{a.ok(args.filter(v=>typeof v==='number').every(Number.isFinite),String(k));calls.push([k,...args]);}});
 return{requests,calls,ctx,art:window.FrontRosterArt,check(){a.equal(stack.length,0);a.equal(ctx.globalAlpha,1);a.equal(ctx.globalCompositeOperation,'source-over');a.equal(ctx.imageSmoothingEnabled,false);}};
}
const variants=[{kind:'rosterBlast',style:'dice',radius:69,face:3},{kind:'rosterBlast',style:'diceSplit',radius:38,face:6},{kind:'rosterBlast',style:'diceChild',radius:49,face:2},{kind:'rosterDiceWave',tx:220,ty:130,width:54,face:4}];
test('dice atlas comes from the official independent explosion and frame rectangles fit its PNG',()=>{
 const png=fs.readFileSync(__dirname+'/'+asset+'.png');a.equal(meta.meta.source.effect,'explosions/small-explosion');a.equal(meta.meta.source.commit,'5294518ce7c72e48b6100a744596e0acf57f2826');
 a.equal(meta.frames.length,29);a.equal(png.readUInt32BE(16),1536);a.equal(png.readUInt32BE(20),1120);a.deepEqual(meta.meta.pixelfx.pivot,[128,178]);
 for(const {frame:f}of meta.frames){a.ok(f.x>=0&&f.y>=0&&f.x+f.w<=1536&&f.y+f.h<=1120);a.equal(f.w,256);a.equal(f.h,224);}
});
test('normal, split, child and golden double use bounded frames without mutating combat or paused draws',async()=>{
 const h=harness();a.equal(h.requests.length,1);h.requests[0].load();a.equal(await h.art.prepareDiceEffects(),true);
 for(const variant of variants)for(const p of [0,.06,.25,.5,.8,.999,1]){
  const e={x:100,y:120,t:.47*(1-p),max:.47,source:{x:20,y:25,hp:10},...variant},before=JSON.stringify(e);h.calls.length=0;
  a.equal(h.art.event(h.ctx,e),true);h.check();a.equal(JSON.stringify(e),before);const first=JSON.stringify(h.calls),image=h.calls.find(x=>x[0]==='image');a.ok(image);a.equal(image[2],Math.min(28,Math.floor(p*29))%6*256);
  h.calls.length=0;h.art.event(h.ctx,e);a.equal(JSON.stringify(h.calls),first);h.check();
 }
 a.equal(h.requests.length,1);h.calls.length=0;a.equal(h.art.event(h.ctx,{kind:'rosterDieResult'}),true);a.equal(h.calls.length,0);
});
test('failed or malformed images keep procedural chips and never re-request the atlas',async()=>{
 for(const wrongSize of [false,true]){const h=harness();h.requests[0].load(wrongSize,wrongSize);a.equal(await h.art.prepareDiceEffects(),false);
  for(const variant of variants){h.calls.length=0;h.art.event(h.ctx,{x:100,y:120,t:.3,max:.47,...variant});a.ok(!h.calls.some(x=>x[0]==='image'));a.ok(h.calls.some(x=>x[0]==='fill'));h.check();await h.art.prepareDiceEffects();}
  a.equal(h.requests.length,1);
 }
});
