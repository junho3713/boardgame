'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame,TYPES,ROSTER,ABILITIES}=require('./public/engine');
const {rules,rollBox}=require('./public/summoning');
const boxSlot=rules.slots+1;
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
 for(const type of ['tank','medic','tank','rocket','lucky','mortar'])upgrade(g,type);
 assert.deepEqual(g.summonSlots,['rifle','tank','medic','rocket','lucky','mortar']);
 assert.equal(g.nextSummonSlot('sniper'),null);
 assert.equal(g.capacity(),20);
 for(const [rank,cap] of [[1,21],[2,22],[3,24],[4,26],[5,29]]){
  g.abilities.capacity=rank;assert.equal(g.capacity(),cap);
 }
 assert.equal(g.summonStatus(6).cost,130);
 assert.equal(g.summonStatus(boxSlot).cost,220);
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
test('full slots restrict level-ups, rerolls and restored choices to registered troops and stats',()=>{
 const g=battle();
 for(const type of ['rocket','tank','medic','lucky','machinegun'])upgrade(g,type);
 assert(g.summonSlotsLocked());g.tech[0].drone=2;
 g.time=90;g.mission.stage=2;g.level=6;g.phase='choice';g.turnChoice=null;
 const allowed=t=>g.summonSlots.includes(t)||t.startsWith('ability_');
 const rolled=g.options();assert.equal(rolled.length,3);assert(rolled.every(allowed));
 g.currentOptions=['drone','mortar','ability_health'];
 assert(!g.stageChoice('drone'));assert(!g.choose('mortar'));assert(g.stageChoice('ability_health'));
 const restored=unpack(battle(),pack(g));restored.reconcileSummonChoices();
 assert(restored.currentOptions.every(allowed));
 assert.equal(restored.pendingChoice.type,'ability_health');
 assert(restored.rerollUpgrade());assert(restored.currentOptions.every(allowed));
 restored.addUnit(0,'drone',900,300);
 restored.choiceKind='boss';assert(!restored.bossRewardEligible('drone'));
 for(const type of restored.summonSlots){restored.evolved[type]=true;restored.tech[0][type]=5;}
 restored.choiceKind='level';assert(restored.options().every(t=>t.startsWith('ability_')));
 for(const key of Object.keys(ABILITIES).slice(0,5))restored.abilities[key]=5;
 restored.currentOptions=restored.options();assert.deepEqual(restored.currentOptions,[]);
 const rerolls=restored.rerollCount;assert(!restored.rerollUpgrade());assert.equal(restored.rerollCount,rerolls);
 assert(restored.canSkipLevelUpgrade());
});
test('skipping a drafted upgrade grants 30 spendable combat gold once and clears the staged choice',()=>{
 const g=battle();
 g.xp=g.neededXP();g.levelCheck();
 const [first]=g.currentOptions;assert(g.stageChoice(first));
 const before={gold:g.cash[0],runGold:g.runGold,slots:[...g.summonSlots],rerolls:g.rerollCount,level:g.level,tech:{...g.tech[0]},abilities:{...g.abilities}};
 assert(g.skipLevelUpgrade());assert(!g.skipLevelUpgrade());
 assert.equal(g.cash[0],before.gold+30);assert.equal(g.runGold,before.runGold);
 assert.equal(g.rerollCount,before.rerolls);assert.equal(g.level,before.level);
 assert.deepEqual(g.tech[0],before.tech);assert.deepEqual(g.abilities,before.abilities);
 assert.deepEqual(g.summonSlots,before.slots);assert.equal(g.pendingChoice,null);
 assert.deepEqual(g.currentOptions,[]);assert.equal(g.phase,'playing');
 for(const kind of ['initial','boss','recovery']){
  g.phase='choice';g.choiceKind=kind;assert(!g.skipLevelUpgrade());
 }
 const legacy=new FrontGame();legacy.start();legacy.xp=legacy.neededXP();legacy.levelCheck();
 assert(!legacy.skipLevelUpgrade());
});
function maxRegisteredUpgrades(g){
 g.summonSlots=ROSTER.slice(0,rules.slots);
 for(const type of g.summonSlots)g.tech[0][type]=5;
 for(const key of Object.keys(ABILITIES).slice(0,5))g.abilities[key]=5;
}
test('a fully upgraded roster automatically collects combat gold for each earned level without opening a draft',()=>{
 const g=battle(),drafts=[];
 maxRegisteredUpgrades(g);
 g.events.level=options=>drafts.push(options);
 const {level,rerollCount}=g, cash=g.cash[0];
 g.input={x:1,y:0};
 g.xp=g.neededXP();
 g.levelCheck();
 g.levelCheck();
 assert.equal(g.level,level+1);
 assert.equal(g.xp,0);
 assert.equal(g.cash[0],cash+rules.skipGold);
 assert.equal(g.rerollCount,rerollCount);
 assert.deepEqual(g.input,{x:1,y:0});
 assert.equal(g.phase,'playing');
 assert.deepEqual(drafts,[]);
 g.bossState.rewards=1;
 g.levelCheck();
 assert.equal(g.choiceKind,'boss');
 assert.deepEqual(drafts,[['fieldGold','fieldRepair']]);
});
test('choosing a card applies its effect at once and cannot reapply it in the same draft',()=>{
 const g=battle();
 g.xp=g.neededXP();g.levelCheck();
 g.currentOptions=['ability_haste','rifle','fieldGold'];
 assert(!g.chooseUpgradeCard('ability_damage'));
 assert(g.chooseUpgradeCard('ability_haste'));
 assert.equal(g.abilities.haste,1);
 assert.equal(g.pendingChoice,null);
 assert(!g.chooseUpgradeCard('ability_haste'));
 assert.equal(g.abilities.haste,1);
});
test('a saved empty level-up grants combat gold once and clears the old choice',()=>{
 const g=battle();
 maxRegisteredUpgrades(g);
 g.phase='choice';g.choiceKind='level';g.currentOptions=[];
 const restored=unpack(battle(),pack(g)), cash=restored.cash[0];
 restored.reconcileSummonChoices();
 restored.reconcileSummonChoices();
 assert.equal(restored.phase,'playing');
 assert.equal(restored.cash[0],cash+rules.skipGold);
 assert.equal(restored.level,g.level);
});
test('rerolling stale cards in a maxed draft resumes combat without spending a reroll',()=>{
 const g=battle(),drafts=[];
 maxRegisteredUpgrades(g);
 g.phase='choice';g.choiceKind='level';g.currentOptions=['rifle'];
 g.events.level=options=>drafts.push(options);
 const cash=g.cash[0],rerolls=g.rerollCount;
 assert.equal(g.rerollUpgrade(),true);
 assert.equal(g.phase,'playing');
 assert.equal(g.cash[0],cash+rules.skipGold);
 assert.equal(g.rerollCount,rerolls);
 assert.deepEqual(drafts,[]);
 assert.equal(g.rerollUpgrade(),false);
 assert.equal(g.cash[0],cash+rules.skipGold);
});
test('a maxed co-op squad does not enter the choice round while its partner can still draft',()=>{
 const g=new FrontCoopGame({}, {realtimeSummons:true});
 g.phase='playing';g.coopChoosing=[false,false];
 g.withOwner(0,()=>{maxRegisteredUpgrades(g);g.xp=g.neededXP();});
 g.withOwner(1,()=>{g.xp=g.neededXP();});
 const cash=g.cash[0],rounds=[...g.coopRounds];
 g.levelCheck();
 assert.deepEqual(g.coopChoosing,[false,true]);
 assert.deepEqual(g.coopRounds,[rounds[0],rounds[1]+1]);
 assert.equal(g.phase,'playing');
 assert.equal(g.cash[0],cash+rules.skipGold);
 assert.equal(g.withOwner(1,()=>g.currentOptions.length),3);
});
test('normal action gates reject unaffordable or capped orders without charging; vehicle landing pushes enemies',()=>{
 const g=battle();
 assert.equal(g.cash[0],120);
 assert.equal(g.income(0),1.5);
 g.cash[0]=59;assert(!g.summon(1));assert.equal(g.cash[0],59);
 g.cash[0]=1000;g.capacity=()=>2;
 assert(g.summon(1));assert(!g.summon(1));assert.equal(g.cash[0],940);
 g.dropPods=[];g.capacity=()=>20;upgrade(g,'tank');assert(g.summon(2));
 const pod=g.dropPods[0],foe=g.addUnit(2,'ant',pod.x+75,pod.y);
 g.time=pod.landAt;g.updateDropPods();
 assert(foe.toyKnockback);assert.equal(g.effects.at(-1).heavy,true);
});
const rng=(...values)=>()=>values.shift()??0;
const rosterRoll=type=>(ROSTER.indexOf(type)+.5)/ROSTER.length;
test('mystery box has five probability tiers and offers the full roster',()=>{
 assert.equal(rules.boxCost,220);
 assert.equal(rules.boxReserve,1);
 assert.deepEqual(rollBox(ROSTER,rng(.299,.999)).units,[{type:'medic'}]);
 assert.equal(rollBox(ROSTER,rng(.299)).refund,50);
 assert.deepEqual(rollBox(ROSTER,rng(.30,rosterRoll('drone'),rosterRoll('tank'))).units,[{type:'drone'},{type:'tank'}]);
 assert.equal(rollBox(ROSTER,rng(.739)).units.length,2);
 assert.deepEqual(rollBox(ROSTER,rng(.74,.31)).units,[{type:'guntruck',star:2}]);
 assert.equal(rollBox(ROSTER,rng(.909)).units[0].star,2);
 assert.deepEqual(rollBox(ROSTER,rng(.91,rosterRoll('combatDrone')),360).units,[{type:'combatDrone',star:2,summonEvolved:true}]);
 assert.equal(rollBox(ROSTER,rng(.969),360).units[0].summonEvolved,true);
 assert.deepEqual(rollBox(ROSTER,rng(.97,.499)).units,[{type:'tank',goldenSummon:true}]);
 assert.deepEqual(rollBox(ROSTER,rng(.97,.5)).units,[{type:'lucky',goldenSummon:true,summonEvolved:true}]);
 assert.deepEqual(rollBox(ROSTER,rng(.91,rosterRoll('combatDrone')),359.99).units,[{type:'combatDrone',star:2}]);
 assert.equal(rollBox(ROSTER,rng(.969),359.99).units[0].summonEvolved,undefined);
 for(const tier of [.30,.74,.91]){
  const types=ROSTER.map((_,i)=>rollBox(ROSTER,rng(tier,(i+.5)/ROSTER.length)).units[0].type);
  assert.deepEqual(types,ROSTER);
 }
});
test('one remaining troop slot reserves one box landing and retains mercenary level through a save',()=>{
 const g=battle();g.capacity=()=>2;g.cash[0]=500;
 upgrade(g,'medic');g.tech[0].rifle=4;
 g.random=rng(.30,rosterRoll('drone'),rosterRoll('tank'));
 assert(g.summon(boxSlot));assert.equal(g.cash[0],280);
 assert.equal(g.dropPods.length,1);assert.equal(g.dropPods[0].type,'drone');
 assert.equal(g.dropPods[0].mercenaryLevel,3);
 assert.equal(g.summonStatus(boxSlot).fever,true);
 const restored=unpack(battle(),pack(g));
 restored.time=rules.fall;restored.updateDropPods();
 const drone=restored.alive(0).find(u=>u.type==='drone');
 assert(drone);assert.equal(drone.mercenaryLevel,3);
 assert(Math.abs(drone.maxHp-TYPES.drone.hp*1.36)<1e-8);
 assert.equal(restored.tech[0].drone,0);
 assert(!restored.summonSlots.includes('drone'));
});
test('mystery refund is paid only after landing is planned and does not move profile gold',()=>{
 const g=battle();g.cash[0]=219;
 const profileGold=g.profile.gold;
 g.random=rng(0,.999);assert(!g.summon(boxSlot));assert.equal(g.cash[0],219);
 const plan=g.planSummonLandings;g.planSummonLandings=()=>null;
 g.cash[0]=220;assert(!g.summon(boxSlot));assert.equal(g.cash[0],220);
 g.planSummonLandings=plan;g.random=rng(0,.999);assert(g.summon(boxSlot));
 assert.equal(g.dropPods[0].type,'medic');
 assert.equal(g.cash[0],50);assert.equal(g.profile.gold,profileGold);
});
test('a full squad spends 180 gold and cannot reuse tactical fever for 25 seconds',()=>{
 const g=battle();g.capacity=()=>1;g.cash[0]=179;g.time=5;
 g.random=()=>assert.fail('full-squad box must not roll the reward table');
 assert(!g.summon(boxSlot));
 assert.equal(g.tacticalFeverRemaining(),0);
 g.cash[0]=360;
 assert(g.summon(boxSlot));
 assert.equal(g.cash[0],180);
 assert.equal(g.tacticalFeverRemaining(),10);
 assert.equal(g.summonStatus(boxSlot).cooldown,25);
 assert(!g.summon(boxSlot));assert.equal(g.cash[0],180);
 const restored=unpack(battle(),pack(g));restored.capacity=()=>1;
 restored.time=15;assert.equal(restored.tacticalFeverRemaining(),0);
 assert.equal(restored.summonStatus(boxSlot).cooldown,15);assert(!restored.summon(boxSlot));
 restored.time=30;assert(restored.summon(boxSlot));assert.equal(restored.cash[0],0);
 assert.deepEqual(g.dropPods,[]);
});
test('either golden jackpot keeps its identity from order to landing and emits a celebration',()=>{
 for(const [variant,type] of [[.49,'tank'],[.51,'lucky']]){
  const g=battle();g.cash[0]=220;g.random=rng(.97,variant);
  assert(g.summon(boxSlot));
  const [pod]=g.dropPods;
  assert.equal(pod.type,type);assert(pod.goldenSummon);assert(pod.mystery);
  g.time=pod.landAt;g.updateDropPods();
  const u=g.alive(0).find(u=>u.type===type);
  assert(u?.goldenSummon);
  assert(g.effects.some(e=>e.kind==='summonJackpot'&&e.x===u.x&&e.y===u.y));
  if(type==='lucky'){assert(g.evolutionEnabled(u));assert.equal(g.luckyOdds(u).blank,0);}
 }
});
test('an unregistered evolved mercenary lands at the average level with real 2-star stats',()=>{
 for(const map of ['livingroom-star','livingroom']){
  const g=landInitial(new FrontGame({},undefined,{map,realtimeSummons:true}));g.cash[0]=500;
  upgrade(g,'medic');g.tech[0].rifle=3;
  g.time=360;g.random=rng(.91,rosterRoll('drone'));
  assert(g.summon(boxSlot));assert.equal(g.cash[0],280);
  g.time=g.dropPods[0].landAt;g.updateDropPods();
  const u=g.alive(0).find(u=>u.type==='drone');
  assert(u);assert.equal(u.star,2);assert.equal(u.mercenaryLevel,2);
  assert(g.evolutionEnabled(u));assert(!g.evolved.drone);
  assert.equal(g.rankCombat(u).hp,2.2);
  assert.equal(u.maxHp,g.stats({...u,star:1}).hp*2.2);
  assert.equal(g.stats(u).damage,g.stats({...u,star:1}).damage*2.9);
 }
});
test('co-op mystery boxes reserve and bill only the purchasing squad',()=>{
 const g=landInitial(new FrontCoopGame({}, {realtimeSummons:true}));
 g.capacity=()=>2;
 const box=boxSlot;
 g.withOwner(0,()=>{
  g.coopChoosing[0]=false;
  g.cash[0]=500;g.random=rng(.30,rosterRoll('drone'),rosterRoll('tank'));
  assert(g.summon(box));assert.equal(g.summonStatus(box).openSquadSlots,0);
 });
 g.withOwner(1,()=>{
  g.phase='choice';g.currentOptions=['rifle'];assert(g.chooseInitialSupport('rifle'));
  g.coopChoosing[1]=false;g.cash[0]=240;g.tech[0].rifle=4;
  g.random=rng(.74,.11);assert(g.summon(box));assert.equal(g.cash[0],20);
 });
 assert.equal(g.cash[0],280);
 assert.deepEqual(g.dropPods.filter(p=>p.mystery).map(p=>[p.coopOwner,p.type,p.mercenaryLevel]),[[0,'drone',1],[1,'machinegun',4]]);
 g.time=rules.fall;g.updateDropPods();
 assert(g.owned(0).some(u=>u.type==='drone'));
 assert(g.owned(1).some(u=>u.type==='machinegun'&&u.star===2&&u.mercenaryLevel===4));
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
 assert.deepEqual([0,1].map(owner=>g.owned(owner).filter(u=>u.type==='rifle').length),[1,1]);
 g.withOwner(1,()=>upgrade(g,'medic'));
 assert.deepEqual(g.summonSlots,['rifle']);
 g.withOwner(1,()=>{assert.deepEqual(g.summonSlots,['rifle','medic']);assert(g.summon(2));assert.equal(g.cash[0],120-70);});
 assert.equal(g.cash[0],120);g.time=rules.fall;g.updateDropPods();
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
