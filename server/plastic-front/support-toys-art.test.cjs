'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
require('./public/engine.js');
function viewHarness(){
 const requests=[],draws=[],stack=[],sizes={
  'drum-rabbit-v20261109.webp':[1374,1145],
  'otter-fishing-v20261109.webp':[1536,960],
  'water-turtle-v20261109.webp':[1344,1120],
  'water-jet-v20261109.webp':[1536,768],
  'shark-breach-v20261109.webp':[1216,1216],
  'shark-fin-v20261109.png':[1254,1254],
  'fishing-bait-v20261110.png':[256,256],
  'tsunami-directions-v20261109.png':[1086,1448],
  'ramjwi-thunder-v20261109.webp':[1536,960],
  'thundercloud-v20261109.webp':[1536,768]
 };
 class Image{
  constructor(){this.naturalWidth=this.naturalHeight=0;requests.push(this);}
  load(){const size=sizes[this.src.split('/').at(-1)];assert.ok(size,this.src);[this.naturalWidth,this.naturalHeight]=size;this.onload();}
  fail(){this.onerror();}
 }
 const window={Image,FrontSupportToys:globalThis.FrontSupportToys};
 vm.runInNewContext(fs.readFileSync(__dirname+'/public/support-toys-view.js','utf8'),{window,Math,WeakMap,Map});
 const ctx=new Proxy({
  globalAlpha:1,globalCompositeOperation:'source-over',
  save(){stack.push([this.globalAlpha,this.globalCompositeOperation]);},
  restore(){assert.ok(stack.length);[this.globalAlpha,this.globalCompositeOperation]=stack.pop();},
  createRadialGradient(){return{addColorStop(){}};},
  drawImage(image,...args){assert.ok(image.naturalWidth>0);assert.ok(args.every(Number.isFinite));draws.push([image.src,...args]);}
 },{get:(object,key)=>key in object?object[key]:(...args)=>{assert.ok(args.filter(v=>typeof v==='number').every(Number.isFinite),String(key));}});
 return{view:window.FrontSupportToyView,ctx,requests,draws,check(){assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,1);assert.equal(ctx.globalCompositeOperation,'source-over');}};
}
const actor=(type,id=1)=>({id,type,team:0,x:1000,y:6000,face:Math.PI/2,hp:100,maxHp:100,walk:0,toyNextAt:12});

test('otter, turtle and squirrel atlases render eight directions and their articulated actions with shared assets',()=>{
 const h=viewHarness(),g={time:1},otter=actor('toyDecoyMaker'),turtle=actor('toyTurtle',2),squirrel=actor('toyStunner',3);
 h.view.draw(h.ctx,otter,g);h.view.draw(h.ctx,turtle,g);h.view.draw(h.ctx,squirrel,g);assert.equal(h.draws.length,0);
 assert.equal(h.requests.length,9);for(const image of h.requests)image.load();
 for(const u of [otter,turtle,squirrel])for(let direction=0;direction<8;direction++){
  u.face=Math.PI/2+direction*Math.PI/4;g.time+=.2;h.view.draw(h.ctx,u,g);h.check();assert.equal(h.view.motionPose(u).spriteDirection,direction);
 }
 otter.toyActionStartedAt=g.time;otter.toyActionUntil=g.time+.7;otter.toyActionFace=0;
 h.view.draw(h.ctx,otter,g);assert.equal(h.view.motionPose(otter).spriteFrame,6);
 g.time+=.2;h.view.draw(h.ctx,otter,g);assert.equal(h.view.motionPose(otter).spriteFrame,7);
 g.time+=1;delete otter.toyActionUntil;otter.x+=9;h.view.draw(h.ctx,otter,g);assert.ok(h.view.motionPose(otter).spriteFrame<4);
 squirrel.toyActionUntil=g.time+1;squirrel.toyActionFace=0;squirrel.toyProcTier=2;h.view.draw(h.ctx,squirrel,g);assert.equal(h.view.motionPose(squirrel).spriteFrame,7);
 assert.equal(h.requests.length,9);
});

test('shark, megalodon, stronger jets, tsunami and drum bursts render finite frames without mutating combat state',()=>{
 const h=viewHarness(),g={time:1},otter=actor('toyDecoyMaker'),turtle=actor('toyTurtle'),drum=actor('toyDrum'),squirrel=actor('toyStunner');
 h.view.draw(h.ctx,otter,g);h.view.draw(h.ctx,turtle,g);h.view.draw(h.ctx,drum,g);h.view.draw(h.ctx,squirrel,g);
 for(const image of h.requests)image.load();
 const target={x:1120,y:6000,hp:100,visualFlightHeight:0};
 for(const tier of [0,1,2])for(let direction=0;direction<8;direction++)for(const phase of [.01,.25,.48,.75,.99]){
  const angle=direction*Math.PI/4,events=[
   {kind:'toyWater',source:turtle,target,angle,tier,t:1-phase,max:1},
   {kind:'toyWaterCarry',source:turtle,target,angle,tier,t:1-phase,max:1},
   {kind:'toyZap',source:otter,from:turtle,target,tier,t:1-phase,max:1},
   {kind:'toyDecoyDrop',source:otter,x:1120,y:6000,angle,tier,t:1-phase,max:1},
   {kind:'toyDrumBoost',source:drum,x:1000,y:6000,tier,range:300,t:1-phase,max:1},
   {kind:'toyThunder',source:squirrel,x:1120,y:6000,targets:[target,{x:1180,y:6030,hp:100}],tier:2,t:1-phase,max:1},
   {kind:'toyShark',source:otter,x:1120,y:6000,angle,tier:Math.max(1,tier),range:tier===2?240:140,startedAt:1-phase,t:1-phase,max:1},
   {kind:'toyTsunami',source:turtle,x:1000,y:6000,angle,range:500,arc:Math.PI*.78,t:1-phase,max:1}
  ];
  const before=JSON.stringify(events);for(const e of events){assert.equal(h.view.event(h.ctx,e,g),true);h.check();}assert.equal(JSON.stringify(events),before);
 }
 for(const file of ['water-jet','shark-breach','tsunami','thundercloud'])assert.ok(h.draws.some(([name])=>name.includes(file)),file+' must draw real texture frames');
});

test('circling fins use real directional art after bait lands and stop before the shark breaches',()=>{
 const h=viewHarness(),u=actor('toyDecoyMaker'),g={time:1},bait={x:1100,y:6000,hp:75,toyArrivesAt:.35,toyExpires:3.35};h.view.draw(h.ctx,u,g);for(const image of h.requests)image.load();
 for(const tier of [1,2])for(let i=0;i<12;i++){g.time=.4+i*.18;h.view.event(h.ctx,{kind:'toySharkFin',source:u,bait,tier,startedAt:.35,t:2,max:3},g);h.check();}
 assert.ok(h.draws.filter(([name])=>name.includes('shark-fin')).length>=24);
 const count=h.draws.length;bait.toySharkTriggeredAt=2.5;g.time=2.5;h.view.event(h.ctx,{kind:'toySharkFin',source:u,bait,tier:2,startedAt:.35,t:1,max:3},g);assert.equal(h.draws.length,count);
});

test('failed skill textures settle once and retain a drawable fallback',()=>{
 const h=viewHarness(),u=actor('toyTurtle'),g={time:1};h.view.draw(h.ctx,u,g);
 for(const image of h.requests)image.fail();const count=h.requests.length;
 for(let i=0;i<8;i++){g.time+=.1;h.view.draw(h.ctx,u,g);h.view.event(h.ctx,{kind:'toyTsunami',source:u,x:u.x,y:u.y,angle:0,arc:2,range:500,t:.5,max:1},g);h.check();}
 assert.equal(h.requests.length,count);assert.equal(h.draws.length,0);
});

test('tsunami selects all forty-eight directional animation cells while keeping the crest upright',()=>{
 const h=viewHarness(),u=actor('toyTurtle'),g={time:1};h.view.draw(h.ctx,u,g);for(const image of h.requests)image.load();
 const cells=new Set();
 for(let direction=0;direction<8;direction++)for(let frame=0;frame<6;frame++){
  const phase=(frame+.25)/6;h.view.event(h.ctx,{kind:'toyTsunami',source:u,x:u.x,y:u.y,angle:direction*Math.PI/4,range:500,arc:Math.PI*.78,t:1-phase,max:1},g);
  const [file,x,y,w,height]=h.draws.at(-1);assert.ok(file.includes('tsunami-directions'));assert.equal(x,frame*181);assert.equal(y,direction*181);assert.equal(w,181);assert.equal(height,181);cells.add(x+','+y);h.check();
 }
 assert.equal(cells.size,48);
});
