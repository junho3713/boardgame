'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js'),{applySnapshot}=require('./public/coop-state.js');
async function renderer({fail=false,defer=false}={}){
 const window={},pending=[];class Image{set src(value){this.url=value;this.naturalWidth=value.includes('shion-')?1536:1024;this.naturalHeight=value.includes('shion-')?3264:768;const finish=()=>{this.complete=true;if(fail&&value.includes('shion-')){this.naturalWidth=this.naturalHeight=0;this.onerror?.();}else this.onload?.();};if(defer&&value.includes('shion-'))pending.push(finish);else queueMicrotask(finish);}}
 vm.runInNewContext(fs.readFileSync(__dirname+'/public/models.js','utf8'),{window,Image,Math,WeakMap,Map,Promise});
 const model=Object.assign(Object.create(window.FrontModels.prototype),{manifest:JSON.parse(fs.readFileSync(__dirname+'/public/assets/models/manifest.json')),assets:new Map(),motion:new WeakMap(),loaded:0,failures:0});
 const skin=model.ensure('commanderShion',0),base=model.ensure('leader',0);await base.loading;if(!defer)await skin.loading;return{model,skin,base,pending};
}
function canvas(){const draws=[],ctx={draws};for(const method of ['save','restore','beginPath','ellipse','fill','stroke','setLineDash'])ctx[method]=()=>{};for(const method of ['translate','rotate','scale','transform'])ctx[method]=(...args)=>a.ok(args.every(Number.isFinite),'invalid '+method+': '+args);
 ctx.createRadialGradient=()=>({addColorStop(){}});ctx.drawImage=(image,sx,sy,sw,sh,dx,dy,dw,dh)=>{a.ok([sx,sy,sw,sh,dx,dy,dw,dh].every(Number.isFinite),'non-finite sprite rectangle');a.ok(sw>0&&sh>0&&dw>0&&dh>0);a.ok(sx>=0&&sy>=0&&sx+sw<=image.naturalWidth&&sy+sh<=image.naturalHeight,'sprite outside loaded atlas');draws.push({image,sx,sy});};return ctx;
}
function actor(face=0){return{id:1,type:'leader',team:0,appearance:'shion',hp:400,x:100,y:100,walk:0,face};}
test('Shion remains drawable in eight directions through walking, each slash phase and repeated ultimate frames',async()=>{
 const {model}=await renderer();for(let d=0;d<8;d++){const face=d*Math.PI/4,u=actor(face),c=canvas();a.equal(model.draw(c,u,10),true);
  for(let step=1;step<=16;step++){u.x+=Math.cos(face)*6;u.y+=Math.sin(face)*6;u.walk+=.72;a.equal(model.draw(c,u,10+step*.05),true);a.ok(c.draws.length);}
  u.swordPose={angle:face,startedAt:11,hitAt:11.12,endsAt:11.5};for(const time of [11,11.13,11.3,11.4])a.equal(model.draw(c,u,time),true);
  u.ultimatePose={active:true,angle:face,startedAt:12};for(let step=0;step<80;step++)a.equal(model.draw(c,u,12+step*.05),true);
 }
});
test('a future ultimate timestamp from clock correction selects a visible valid frame',async()=>{
 const {model}=await renderer();for(const startedAt of [30.001,30.05,30.2,31.17]){const u=actor(),c=canvas();u.ultimatePose={active:true,angle:0,startedAt};a.equal(model.draw(c,u,30),true);a.ok(c.draws.length);a.ok(Number.isInteger(model.motion.get(u).frame));}
});
test('a failed Shion image uses the basic atlas with its own valid movement and attack frames',async()=>{
 const {model,base,failures}=await renderer({fail:true});for(let d=0;d<8;d++)for(const kind of ['idle','walk','slash','ultimate']){const u=actor(d*Math.PI/4),c=canvas();a.equal(model.draw(c,u,10),true);if(kind==='walk'){u.x+=8;u.walk+=.96;}if(kind==='slash')u.swordPose={angle:u.face,startedAt:10,hitAt:10.1,endsAt:10.5};if(kind==='ultimate')u.ultimatePose={active:true,angle:u.face,startedAt:10};a.equal(model.draw(c,u,10.2),true);a.ok(c.draws.length);a.ok(c.draws.every(call=>call.image===base.layers.body.image));}
 a.equal(model.failures,1);
});
test('a pending skin can replace the fallback on the same paused frame and resume walking without losing its phase',async()=>{
 const {model,skin,base,pending}=await renderer({defer:true}),u=actor(),c=canvas();a.equal(model.draw(c,u,10),true);a.equal(c.draws.at(-1).image,base.layers.body.image);for(const finish of pending)finish();await skin.loading;
 c.draws.length=0;a.equal(model.draw(c,u,10),true);a.equal(c.draws.at(-1).image,skin.layers.body.image);a.equal(model.motion.get(u).walkPhase,0);
 for(let i=1;i<9;i++){u.x+=7;u.walk+=.84;a.equal(model.draw(c,u,10+i*.05),true);a.ok(Number.isFinite(model.motion.get(u).walkPhase));}
});
test('cooperative snapshots with a slightly future sword ultimate stay drawable before and after the next packet',async()=>{
 const server=new CoopGame(),client=new CoopGame();server.start();const u=server.units.find(u=>u.team===0&&u.coopOwner===1&&u.type==='leader');u.appearance='shion';server.time=30;u.ultimatePose={active:true,angle:.5,startedAt:30.05,sword:true};applySnapshot(client,pack(server),unpack);
 const actor=client.units.find(v=>v.id===u.id),{model}=await renderer(),c=canvas();a.equal(model.draw(c,actor,client.time),true);server.time=30.15;u.x+=8;u.walk+=.96;applySnapshot(client,pack(server),unpack);a.equal(client.units.find(v=>v.id===u.id),actor);a.equal(model.draw(c,actor,client.time),true);a.ok(c.draws.length);
});
