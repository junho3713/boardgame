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
for(const [owned,partner] of [['drone','combatDrone'],['combatDrone','drone']]){
 for(const source of ['level','reroll','boss','five-evolution boss']){
  test(`six filled slots with ${owned} offer ${partner} through ${source}`,()=>{
   const g=battle(),slots=['rifle','machinegun','sniper','lucky','rocket',owned];
   g.summonSlots=slots.slice();
   for(const unit of slots)g.tech[0][unit]=5;
   if(source==='reroll'){
    g.tech[0].rifle=g.tech[0].machinegun=4;
    g.random=()=>.999;
   }
   if(source==='five-evolution boss')for(const unit of slots.slice(0,5))g.evolved[unit]=true;
   if(source.includes('boss'))g.bossState.rewards=1;
   else g.xp=g.neededXP();
   g.levelCheck();
   if(source==='reroll'){assert(!g.currentOptions.includes(partner));assert(g.rerollUpgrade());}
   assert(g.currentOptions.includes(partner));
   assert(!g.currentOptions.includes('tank'));assert(!g.eligibleCard('tank'));
   assert(g.chooseUpgradeCard(partner));
   assert.deepEqual(g.summonSlots,[...slots.slice(0,5),'multiDrone']);
   assert.equal(g.summonStatus(6).cost,110);
   assert.equal(g.tech[0][owned],5);assert.equal(g.tech[0][partner],1);
  });
 }
}
test('six non-drone slots offer neither drone as a new unlock',()=>{
 const g=battle();g.summonSlots=['rifle','machinegun','sniper','lucky','rocket','tank'];
 for(const type of g.summonSlots)g.tech[0][type]=1;
 g.xp=g.neededXP();g.levelCheck();
 for(const type of ['drone','combatDrone']){
  assert(!g.eligibleCard(type));assert(!g.currentOptions.includes(type));assert(!g.bossRewardEligible(type));
 }
});
test('a sixth occupied slot can unlock the partner in place while keeping both cards and levels independent',()=>{
 const g=battle();g.summonSlots=['rifle','machinegun','drone','sniper','lucky','rocket'];
 g.tech[0].drone=4;
 assert.equal(g.dronePartnerSlot('combatDrone'),3);
 assert.equal(g.summonStatus(3).cost,125);
 card(g,'combatDrone');
 assert.deepEqual(g.summonSlots,['rifle','machinegun','multiDrone','sniper','lucky','rocket']);
 assert.deepEqual([g.tech[0].drone,g.tech[0].combatDrone,g.tech[0].multiDrone],[4,1,1]);
 assert.equal(g.summonSlots.length,6);
 assert(g.eligibleCard('drone'));assert(g.eligibleCard('combatDrone'));assert(!g.eligibleCard('multiDrone'));
 assert.equal(g.summonStatus(3).cost,110);
 g.abilities.haste=5;
 for(let i=1;i<5;i++)card(g,'combatDrone');
 assert(g.evolved.combatDrone);assert(!g.evolved.multiDrone);assert.equal(g.tech[0].drone,4);
 card(g,'drone');assert(!g.evolved.multiDrone);
 g.abilities.xpGain=4;card(g,'ability_xpGain');assert(g.evolved.multiDrone);
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
 assert.equal(two.star,2);epsilon(two.maxHp,220*(1+.18)*2.2);
 add(g,'drone',2);add(g,'combatDrone',2);g.autoFuseUnits();
 add(g,'multiDrone',2);
 const c=g.commander(0),star={x:c.x,y:c.y,active:true,destinyStar:true};
 assert(g.collectFieldSupply(star));
 const three=g.alive(0).find(u=>u.type==='multiDrone');assert.equal(three.star,3);
 epsilon(g.stats(three).damage,10*.85*8);
 const fighter=add(g,'multiDrone',2);
 g.damage(fighter,1e9,{type:'ant',team:2});
 assert(g.alive(0).some(u=>u.type==='multiDrone'&&u.star===1));
 const cash=g.cash[0];
 g.damage(three,1e9,{type:'ant',team:2});
 assert.equal(TYPES.multiDrone.cost,220);assert.equal(g.cash[0],cash+55);
});
test('three attacks use independent timers, cluster targeting, piercing and evolution modifiers',()=>{
 for(const [type,evolved,radius,period,bossBonus] of [
  ['combatDrone',false,52,7,1],['combatDrone',true,62.4,5,1.25],
  ['multiDrone',false,52,7,1],['multiDrone',true,65,4.5,1.35]
 ]){
  const g=battle(),c=g.commander(0);g.random=()=>.99;g.visible=g.lineClear=()=>true;
  const u=add(g,type),targets=[];
  for(const [dx,dy] of [[82,0],[158,0],[125,83],[135,85],[136,96],[132,106]]){
   const t=g.addUnit(2,'ant',u.x+dx,u.y+dy);t.hp=t.maxHp=20000;targets.push(t);
  }
  targets[1].roadCaptain=true;targets[1].roadStage=1;targets[0].maxHp=30000;
  g.evolved[type]=evolved;g.defenseFactor=()=>.5;
  const s=g.stats(u),scale=type==='multiDrone'&&!evolved?.85:1;
  assert.deepEqual([s.hp,s.damage,s.rate,s.range],[type==='multiDrone'?220:130,10*scale,.85,360]);
  u.cooldown=0;u.nextDroneMissileAt=g.time;u.nextDroneLaserAt=g.time;
  const initial=g.time;
  for(const dt of [0,.075,.075]){g.time+=dt;g.updateCombatDrone(u,c,0,s,targets);}
  const shots=kind=>g.shots.filter(p=>p.kind===kind),rockets=shots('droneMissile');
  assert.equal(shots('dronePulse').length,evolved?3:2);assert.equal(rockets.length,evolved?4:2);
  for(const p of rockets){epsilon(p.damage,26*scale);epsilon(p.splash,radius);assert(targets.indexOf(p.target)>=2);}
  epsilon(targets[0].hp,20000-65*scale);epsilon(targets[1].hp,20000-65*scale*bossBonus);
  assert.equal(targets[2].hp,20000);epsilon(u.nextDroneLaserAt,initial+period);epsilon(u.nextDroneMissileAt,initial+5);
  const clusterHp=targets[5].hp;g.impact(rockets[0]);assert(targets[5].hp<clusterHp);
  assert.equal(g.isDroneStealthed(u),false);
 }
});
test('all four requirements independently gate evolution, including restored older saves',()=>{
 for(const missing of ['drone','combatDrone','xpGain','haste']){
  const g=battle();registerPair(g);
  g.tech[0].combatDrone=g.tech[0].drone=g.abilities.haste=g.abilities.xpGain=5;
  (['drone','combatDrone'].includes(missing)?g.tech[0]:g.abilities)[missing]=4;
  g.syncDroneDocking();g.checkEvolutions();assert(!g.evolved.multiDrone,missing);
  g.evolved.multiDrone=true;
  const saved=unpack(battle(),pack(g));assert(!saved.evolved.multiDrone,missing);
 }
});
test('support levels strengthen the support share only and complete evolution further boosts shields',()=>{
 const g=battle(),c=g.commander(0);registerPair(g);
 const u=add(g,'multiDrone'),foe=g.addUnit(2,'ant',u.x+75,u.y);
 g.visible=()=>true;g.tech[0].combatDrone=1;g.tech[0].drone=5;
 let s=g.stats(u);epsilon(s.damage,8.5);epsilon(s.hp,110+110*1.72);
 g.updateSupportDrone(u,c,0,s,[foe]);
 epsilon(c.droneShield.maxHp,c.maxHp*.22*1.2);epsilon(u.droneScan.radius,76*1.2);
 g.tech[0].combatDrone=5;g.abilities.xpGain=g.abilities.haste=5;g.syncDroneDocking();g.checkEvolutions();
 s=g.stats(u);epsilon(s.damage,10*1.72);
 g.time+=9;g.updateSupportDrone(u,c,0,s,[foe]);
 epsilon(c.droneShield.maxHp,c.maxHp*.22*1.2*1.3);epsilon(u.droneScan.vulnerability,.35);
});
