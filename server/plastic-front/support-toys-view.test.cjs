'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {FrontGame}=require('./public/engine.js');

function harness(){
 const images=[],draws=[],transforms=[],stack=[];
 class Image{
  constructor(){images.push(this);}
  load(){this.naturalWidth=1374;this.naturalHeight=1145;this.onload();}
  fail(){this.onerror();}
 }
 const window={Image,FrontSupportToys:globalThis.FrontSupportToys},context=vm.createContext({window,Math,WeakMap});
 vm.runInContext(fs.readFileSync(__dirname+'/public/support-toys-view.js','utf8'),context);
 const gradient={addColorStop(){}};
 const ctx=new Proxy({
  globalAlpha:1,
  save(){stack.push(this.globalAlpha);},
  restore(){assert.ok(stack.length);this.globalAlpha=stack.pop();},
  createRadialGradient(){return gradient;},
  scale(...args){transforms.push(args);},
  drawImage(image,...args){
   assert.equal(image,images[0]);
   assert.ok(args.every(Number.isFinite));
   assert.ok(image.naturalWidth>0);
   draws.push(args);
  }
 },{get:(object,key)=>key in object?object[key]:()=>{}});
 const unit={id:7,type:'toyDrum',hp:100,maxHp:200,x:100,y:100,face:Math.PI/2,walk:0};
 const game={time:1};
 const view=window.FrontSupportToyView;
 return{images,draws,transforms,unit,game,ctx,view,draw(){view.draw(ctx,unit,game);assert.equal(stack.length,0);assert.equal(ctx.globalAlpha,1);}};
}

test('rabbit art is requested on first drum draw, shared, and safely falls back after a load failure',()=>{
 const h=harness();h.view.draw(h.ctx,{...h.unit,type:'toyTurtle'},h.game);assert.equal(h.images.length,0);
 h.draw();assert.equal(h.images.length,1);assert.equal(h.draws.length,0);
 assert.equal(h.images[0].src,'assets/support-toys/drum-rabbit-v20261109.webp');
 h.images[0].fail();for(let i=0;i<8;i++){h.game.time+=.05;h.draw();}
 assert.equal(h.images.length,1);assert.equal(h.draws.length,0);
 const ready=harness();ready.draw();ready.images[0].load();ready.draw();
 ready.view.draw(ready.ctx,{...ready.unit,id:8},ready.game);
 assert.equal(ready.images.length,1);assert.equal(ready.draws.length,2);
});

test('eight directions select the matching rabbit view and preserve a planted foot anchor',()=>{
 const h=harness();h.draw();h.images[0].load();
 const rows=[0,1,2,3,4,3,2,1];
 for(let direction=0;direction<8;direction++){
  h.unit.face=Math.PI/2+direction*Math.PI/4;h.game.time+=.05;h.transforms.length=0;h.draw();
  const pose=h.view.motionPose(h.unit),tile=h.draws.at(-1);
  assert.equal(pose.drumDirection,direction);assert.equal(tile[1],rows[direction]*229);
  assert.equal(tile[2],229);assert.equal(tile[3],229);
  assert.equal(tile[6],78);assert.equal(tile[7],78);
  assert.ok(tile[5]<-70&&tile[5]>-78);
  assert.equal(h.transforms.some(([x,y])=>x===-1&&y===1),direction>0&&direction<4);
 }
});

test('rabbit stride follows actual travel while idle, pause, rewind and repair use stable poses',()=>{
 const h=harness();h.draw();h.images[0].load();h.draw();assert.ok(h.view.motionPose(h.unit).drumFrame>=4);
 const phases=[];
 for(let i=0;i<7;i++){h.unit.x+=8;h.game.time+=.05;h.draw();const pose=h.view.motionPose(h.unit);phases.push(pose.phase);assert.equal(pose.walking,true);assert.ok(pose.drumFrame<4);}
 assert.ok(new Set(phases).size>3);
 h.game.time+=.3;h.draw();const stopped=h.view.motionPose(h.unit).phase;
 for(let i=0;i<12;i++){h.game.time+=.1;h.draw();assert.equal(h.view.motionPose(h.unit).phase,stopped);assert.ok(h.view.motionPose(h.unit).drumFrame>=4);}
 const paused=JSON.stringify(h.view.motionPose(h.unit));h.draw();assert.equal(JSON.stringify(h.view.motionPose(h.unit)),paused);
 h.unit.hp=0;h.unit.toyDownUntil=h.game.time+20;h.draw();assert.equal(h.view.motionPose(h.unit).drumFrame,4);
 h.unit.hp=100;h.game.time+=20;h.draw();assert.ok(h.view.motionPose(h.unit).drumFrame>=4);
 h.game.time=0;h.draw();assert.equal(h.view.motionPose(h.unit).phase,0);
});

test('the ordinary rare-supply reward creates the drum entity consumed by the rabbit renderer',()=>{
 const game=new FrontGame({},undefined,{map:'livingroom-star'});game.start();
 const leader=game.commander(0),pickup={x:leader.x,y:leader.y,active:true,rareSupply:true,supplyKind:'toyDrum',expires:120};
 assert.equal(game.collectFieldSupply(pickup),true);
 const unit=game.supportToys()[0];assert.equal(unit.type,'toyDrum');assert.equal(pickup.active,false);
 const h=harness();h.view.draw(h.ctx,unit,game);h.images[0].load();h.view.draw(h.ctx,unit,game);assert.equal(h.draws.length,1);
 const bytes=fs.readFileSync(__dirname+'/public/assets/support-toys/drum-rabbit-v20261109.webp');
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 for(const entry of ['index.html','boss-test.html']){
  const html=fs.readFileSync(__dirname+'/public/'+entry,'utf8');
  assert.match(html,/support-toys-view\.js\?v=20261109-rabbit1/);
 }
});
