'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine');
const {CoopGame}=require('./public/coop-engine');
const {pack,unpack}=require('./public/autoplay');
const {rules}=require('./public/summoning');
const epsilon=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function battle(coop=false){
 const g=coop?new CoopGame({}, {realtimeSummons:true}):new FrontGame({},undefined,{map:'livingroom-star',realtimeSummons:true});
 g.start();g.phase='playing';g.time=30;g.obstacles=[];g.structures=[];g.defenses=[];
 if(coop)g.coopChoosing=[false,false];
 g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.cash[0]=1000;
 return g;
}
function card(g,type){
 g.phase='choice';g.choiceKind='level';g.turnChoice=null;g.currentOptions=[type];
 assert(g.chooseUpgradeCard(type),type);g.phase='playing';
}
function registerPair(g){
 g.tech[0].drone=3;g.summonSlots=['drone'];
 card(g,'combatDrone');
}
function land(g){
 g.time+=rules.fall;g.updateDropPods();
}
function add(g,type,star=1){
 const c=g.commander(0),u=g.addUnit(0,type,c.x+70,c.y+10);u.star=star;u.hp=u.maxHp=g.stats(u).hp;return u;
}
test('a sixth occupied slot can unlock the partner and consolidate cards at the higher level',()=>{
 const g=battle();g.summonSlots=['rifle','machinegun','drone','sniper','lucky','rocket'];
 g.tech[0].drone=4;
 assert.equal(g.dronePartnerSlot('combatDrone'),3);
 assert.equal(g.summonStatus(3).cost,125);
 card(g,'combatDrone');
 assert.deepEqual(g.summonSlots,['rifle','machinegun','multiDrone','sniper','lucky','rocket']);
 assert.deepEqual([g.tech[0].drone,g.tech[0].combatDrone,g.tech[0].multiDrone],[4,4,4]);
 assert(!g.eligibleCard('drone'));assert(!g.eligibleCard('combatDrone'));assert(g.eligibleCard('multiDrone'));
 assert.equal(g.summonStatus(3).cost,110);
 g.abilities.haste=5;
 card(g,'multiDrone');
 assert.equal(g.tech[0].drone,5);assert.equal(g.tech[0].combatDrone,5);assert(g.evolved.multiDrone);
});
test('rapid orders pair correctly and a checkpoint preserves which drone to buy next',()=>{
 const g=battle();registerPair(g);
 assert.equal(g.summonStatus(1).docking.type,'drone');assert(g.summon(1));
 assert.equal(g.summonStatus(1).docking.type,'combatDrone');assert(g.summon(1));
 land(g);
 assert.equal(g.alive(0).filter(u=>u.type==='multiDrone').length,1);
 assert.equal(g.cash[0],780);
 assert(g.summon(1));land(g);
 const saved=unpack(battle(),pack(g));
 const lonely=saved.alive(0).find(u=>u.type==='drone');
 assert.equal(saved.summonStatus(1).docking.partner,lonely);
 saved.damage(lonely,1e9,{type:'ant',team:2});
 assert.equal(saved.summonStatus(1).docking.type,'combatDrone');
 assert(saved.summon(1));land(saved);
 assert.equal(saved.summonStatus(1).docking.type,'drone');
});
test('full squads can only buy a live unmatched one-star partner and never grow past capacity',()=>{
 const g=battle(true);g.withOwner(0,()=>registerPair(g));g.withOwner(1,()=>registerPair(g));
 for(const owner of [0,1])g.withOwner(owner,()=>{
  for(let i=1;i<g.capacity();i++)add(g,'rifle');
  add(g,owner?'combatDrone':'drone');g.cash[0]=1000;
 });
 g.withOwner(0,()=>{
  assert.equal(g.summonStatus(1).docking.type,'combatDrone');
  assert(g.summon(1));assert.equal(g.cash[0],890);
  assert.equal(g.owned(0).filter(u=>u.type!=='leader').length,g.capacity());
  assert.equal(g.owned(0).filter(u=>u.type==='multiDrone').length,1);
  assert.equal(g.dropPods.length,0);assert(!g.summon(1));
 });
 g.withOwner(1,()=>{
  assert.equal(g.summonStatus(1).docking.type,'drone');assert.equal(g.cash[0],1000);
  assert(g.summon(1));assert.equal(g.owned(1).filter(u=>u.type==='multiDrone').length,1);
 });
});
test('docking precedes fusion, same-rank pairs remain same rank, and multi-drone promotion and recovery work',()=>{
 const g=battle();registerPair(g);
 for(let i=0;i<3;i++){add(g,'drone');add(g,'combatDrone');}
 g.autoFuseUnits();
 const two=g.alive(0).find(u=>u.type==='multiDrone');
 assert.equal(two.star,2);epsilon(two.maxHp,220*(1+.18*2)*2.2);
 add(g,'drone',2);add(g,'combatDrone',2);g.autoFuseUnits();
 add(g,'multiDrone',2);
 const c=g.commander(0),star={x:c.x,y:c.y,active:true,destinyStar:true};
 assert(g.collectFieldSupply(star));
 const three=g.alive(0).find(u=>u.type==='multiDrone');assert.equal(three.star,3);
 epsilon(g.stats(three).damage,14*.88*(1+.18*2)*8);
 const fighter=add(g,'multiDrone',2);
 g.damage(fighter,1e9,{type:'ant',team:2});
 assert(g.alive(0).some(u=>u.type==='multiDrone'&&u.star===1));
 const cash=g.cash[0];
 g.damage(three,1e9,{type:'ant',team:2});
 assert.equal(TYPES.multiDrone.cost,220);assert.equal(g.cash[0],cash+55);
});
test('combat drone fires two base pulses, then three pulses and two homing missiles after evolution',()=>{
 const g=battle(),c=g.commander(0);g.random=()=>.99;g.visible=g.lineClear=()=>true;
 const enemy=g.addUnit(2,'ant',c.x+140,c.y);const u=add(g,'combatDrone');
 const s=g.stats(u);assert.deepEqual([s.hp,s.damage,s.rate,s.range],[130,14,.75,360]);
 u.cooldown=0;
 for(const dt of [0,.075]){g.time+=dt;g.updateCombatDrone(u,c,0,s,[enemy]);}
 assert.deepEqual(g.shots.map(p=>[p.kind,p.damage]),[['dronePulse',14],['dronePulse',14]]);
 g.shots=[];u.cooldown=0;u.nextDroneMissileAt=g.time;g.evolved.combatDrone=true;
 for(const dt of [0,.075,.075]){g.time+=dt;g.updateCombatDrone(u,c,0,s,[enemy]);}
 assert.equal(g.shots.filter(p=>p.kind==='dronePulse').length,3);
 assert.equal(g.shots.filter(p=>p.kind==='droneMissile').length,2);
 assert(g.shots.every(p=>p.target===enemy));assert.equal(g.isDroneStealthed(u),false);
});
