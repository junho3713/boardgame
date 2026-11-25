'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame,TYPES,ROSTER}=require('./public/engine');
const {rules,rollBox}=require('./public/summoning');
const {pack,unpack}=require('./public/autoplay');
const {CoopGame:FrontCoopGame}=require('./public/coop-engine');

function landInitial(g,type='rifle'){
  g.start();g.currentOptions=[type];assert(g.chooseInitialSupport(type));
  g.time=rules.fall;g.updateDropPods();g.time=0;
  return g;
}
function battle(){
 const g=new FrontGame({},undefined,{map:'livingroom-star',realtimeSummons:true});
 return landInitial(g);
}
function upgrade(g,type){
 g.phase='choice';g.choiceKind='level';g.turnChoice=null;g.currentOptions=[type];
 assert(g.stageChoice(type));assert(g.confirmChoice());g.phase='playing';
}
test('slot order is committed once and round trips through saves with pending orders',()=>{
 const g=battle();
 for(const type of ['tank','medic','tank','rocket','lucky','drone'])upgrade(g,type);
 assert.deepEqual(g.summonSlots,['rifle','tank','medic','rocket','lucky']);
 assert.equal(g.nextSummonSlot('sniper'),null);
 const old=g.cash[0];assert(g.summon(1));assert.equal(g.cash[0],old-TYPES.rifle.cost);
 const restored=unpack(new FrontGame(),pack(g));
 assert.deepEqual(restored.summonSlots,g.summonSlots);
 assert.equal(restored.dropPods.length,1);
 const pod=restored.dropPods[0],c=restored.commander(0),distance=Math.hypot(c.x-pod.x,c.y-pod.y);
 assert(distance>=60&&distance<=100);assert.equal(pod.landAt,restored.time+rules.fall);
 const size=restored.units.length;restored.time=pod.landAt-.01;restored.updateDropPods();assert.equal(restored.units.length,size);
 restored.time=pod.landAt;restored.updateDropPods();restored.updateDropPods();
 assert.equal(restored.units.length,size+1);assert.equal(restored.dropPods.length,0);
});
test('normal action gates reject unaffordable or capped orders without charging; vehicle landing pushes enemies',()=>{
 const g=battle();
 assert.equal(g.income(0),2.5);
 g.cash[0]=59;assert(!g.summon(1));assert.equal(g.cash[0],59);
 g.cash[0]=1000;g.capacity=()=>3;
 assert(g.summon(1));assert(!g.summon(1));assert.equal(g.cash[0],940);
 g.dropPods=[];g.capacity=()=>20;upgrade(g,'tank');assert(g.summon(2));
 const pod=g.dropPods[0],foe=g.addUnit(2,'ant',pod.x+75,pod.y);
 g.time=pod.landAt;g.updateDropPods();
 assert(foe.toyKnockback);assert.equal(g.effects.at(-1).heavy,true);
});
test('box uses the stated odds, keeps full rewards, and evolves mercenaries individually',()=>{
 const rng=(...values)=>()=>values.shift()??0;
 assert.equal(rollBox(ROSTER,rng(.599,.1,.1)).units.length,2);
 assert.equal(rollBox(ROSTER,rng(.6)).units.length,4);
 assert(rollBox(ROSTER,rng(.8)).units[0].summonEvolved);
 assert(rollBox(ROSTER,rng(.95,.499)).units[0].goldenSummon);
 assert.equal(rollBox(ROSTER,rng(.96,.501,.499)).units.length,5);
 assert.equal(rollBox(ROSTER,rng(.96,.501,.5)).units.length,6);
 const g=battle();g.capacity=()=>7;g.cash[0]=500;
 assert(!g.summon(6));assert.equal(g.cash[0],500);
 g.capacity=()=>20;g.random=rng(.8,.8);assert(g.summon(6));
 assert.equal(g.cash[0],500-rules.boxCost);
 g.time=rules.fall;g.updateDropPods();
 const u=g.units.find(u=>u.summonEvolved);
 assert(u);assert(g.evolutionEnabled(u));assert(!g.evolved[u.type]);
 assert.equal(g.fusionCandidates(u.type).includes(u),false);
 const tank={type:'tank',team:0};assert.equal(g.stats({...tank,goldenSummon:true}).damage,g.stats(tank).damage*1.5);
});
test('regular support appointments do not interrupt realtime battles',()=>{
 const g=battle();g.time=65;g.levelCheck();
 assert.equal(g.phase,'playing');assert.equal(g.supplyState().pendingMinute,null);
 g.supplyState().pendingSupport=1;g.levelCheck();assert.equal(g.phase,'playing');
});
test('co-op owns each slot list, purchase, and deployed reinforcement separately',()=>{
 const g=new FrontCoopGame({}, {realtimeSummons:true});g.start();
 for(const owner of [0,1])g.withOwner(owner,()=>{g.phase='choice';g.currentOptions=['rifle'];assert(g.chooseInitialSupport('rifle'));g.coopChoosing[owner]=false;});
 g.time=rules.fall;g.updateDropPods();g.time=0;
 g.withOwner(1,()=>upgrade(g,'medic'));
 assert.deepEqual(g.summonSlots,['rifle']);
 g.withOwner(1,()=>{assert.deepEqual(g.summonSlots,['rifle','medic']);assert(g.summon(2));assert.equal(g.cash[0],135-70);});
 assert.equal(g.cash[0],135);g.time=rules.fall;g.updateDropPods();
 assert.equal(g.owned(1).filter(u=>u.type==='medic').length,1);
 assert.equal(g.owned(0).filter(u=>u.type==='medic').length,0);
});
test('reinforcement art draws the correct canopy and exchanges the deployed mesh for a collapsed pose',async()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const view={FrontSummoning:require('./public/summoning')};
 const read=url=>fs.readFileSync(path.join(__dirname,'public',url));
 class Image {
  set src(url){assert.equal(read(url).toString('ascii',8,12),'WEBP');queueMicrotask(()=>this.onload());}
 }
 const fetch=async url=>({ok:true,json:async()=>JSON.parse(read(url))});
 vm.runInNewContext(read('summon-hud.js'),{window:view,Image,fetch});
 const hud=view.FrontSummonHud;await hud.ready;
 const cells=[],cell=JSON.parse(read('assets/models/summon-canopies-v2.json')).cell;
 const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},moveTo(){},
  lineTo(){},quadraticCurveTo(){},stroke(){},fillRect(){},globalAlpha:1,
  drawImage(_image,x,y){cells.push([x/cell,y/cell]);}};
 for(const [type,mystery,row] of [['rifle',false,0],['tank',false,1],['medic',true,2],['lucky',true,3]]){
  const pod={type,mystery,x:12,y:23,startedAt:0,landAt:rules.fall};
  const game={dropPods:[pod],time:0,evolved:{}};
  for(const [time,frame] of [[0,0],[.3,3]]){
   cells.length=0;game.time=time;hud.airborne(ctx,game,()=>true);
   const expected=Array.from({length:view.FrontSummoning.isVehicle(type)?2:1},()=>[frame,row]);
   assert.deepEqual(cells,expected);
  }
  cells.length=0;
  hud.impact(ctx,{kind:'summonChute',x:12,y:23,t:.01,max:rules.chuteFade,heavy:view.FrontSummoning.isVehicle(type),mystery});
  assert.deepEqual(cells,Array.from({length:view.FrontSummoning.isVehicle(type)?2:1},()=>[6,row]));
 }
});
