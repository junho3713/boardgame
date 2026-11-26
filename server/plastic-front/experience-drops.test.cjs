'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame,ABILITIES,EVOLUTIONS,TYPES}=require('./public/engine.js');
const {pack,unpack,cleanPlan}=require('./public/autoplay.js');
const {CoopGame}=require('./public/coop-engine.js');

function game(){
 const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();return g;
}

test('defeats drop experience and the magnet attracts distant crystals before granting it',()=>{
 const g=game(),leader=g.commander(0);
 for(let i=0;i<20;i++)g.update(.05);
 assert.equal(g.xp,0);
 const foe=g.addUnit(2,'ant',leader.x+135,leader.y,true),cash=g.cash[0];
 g.damage(foe,1e9,leader);g.damage(foe,1e9,leader);
 assert.equal(g.xp,0);assert.ok(g.cash[0]>cash);
 assert.deepEqual(g.experienceDrops,[{x:foe.x,y:foe.y,amount:5,owner:0,pulling:false}]);
 g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops[0].pulling,false);
 g.abilities.magnet=5;g.abilities.xpGain=2;
 g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops[0].pulling,true);assert.equal(g.xp,0);
 const restored=unpack(game(),pack(g));
 for(let i=0;i<14;i++)restored.updateExperienceDrops(.05);
 assert.equal(restored.experienceDrops.length,0);
 assert.ok(Math.abs(restored.xp-5.8)<1e-8);
});

test('the room needs the same XP for each level, with 85px base pickup reach and +8% per XP rank',()=>{
 const g=game(),leader=g.commander(0);
 assert.equal(g.neededXP(),46);
 g.level=10;assert.equal(g.neededXP(),136);
 assert.equal(g.experienceRadius(),85);
 g.earnDefeatXP({x:leader.x+85,y:leader.y},25);
 g.earnDefeatXP({x:leader.x+170,y:leader.y},25);
 g.updateExperienceDrops(.05);
 assert.deepEqual(g.experienceDrops.map(drop=>drop.pulling),[true,false]);
 g.abilities.magnet=5;assert.equal(g.experienceRadius(),205);
 g.abilities.xpGain=5;assert.equal(g.abilityBonus('xpGain'),40);
 for(let i=0;i<40;i++)g.updateExperienceDrops(.05);
 assert.equal(g.xp,70);
});

test('ordinary ants spawn at half health through 3 minutes and new waves restore baseline by 4 minutes',()=>{
 const g=game();
 const healthAt=(time,expected)=>{
  g.time=time;
  const ant=g.addUnit(2,'ant',1800,6000,true);
  const baseline=TYPES.ant.hp*1.2*.75*(1+.12*Math.floor(time/60));
  assert.ok(Math.abs(ant.maxHp-baseline*expected)<1e-8,time+' seconds');
  return ant;
 };
 const early=healthAt(0,.5);assert.ok(Math.abs(early.maxHp-49.5)<1e-8);
 healthAt(179.99,.5);healthAt(180,.5);healthAt(210,.75);healthAt(240,1);
 assert.equal(g.stats(early).hp,early.maxHp,'old waves retain their spawn-time strength');
 assert.equal(g.enemyHealthScale({...early,roomGarrison:true}),1.2);
 assert.equal(g.enemyHealthScale({...early,type:'soldierAnt'}),.75*1.2);
 const outside=new FrontGame({},undefined,{map:'backyard'});
 assert.equal(outside.stats(outside.addUnit(2,'ant',800,1000,true)).hp,TYPES.ant.hp);
});

test('old operation saves migrate the early ant maximum while retaining damage taken',()=>{
 const g=game(),ant=g.addUnit(2,'ant',1800,6000,true);
 g.roomHealthVersion=142;ant.maxHp*=2;ant.hp=ant.maxHp*.4;
 const restored=unpack(game(),pack(g)),copy=restored.units.find(u=>u.id===ant.id);
 assert.ok(Math.abs(copy.maxHp-49.5)<1e-8);
 assert.ok(Math.abs(copy.hp/copy.maxHp-.4)<1e-8);
});

test('the room XP table distinguishes regular infantry and dangerous enemies from ordinary ants',()=>{
 const g=game(),leader=g.commander(0);
 g.units=[leader];
 const xp={ant:5,rifle:12,machinegun:14,sniper:14,mortar:14,bombBug:32,acidBeetle:32,pirateCannon:40,bubbleOctopus:42,blizzardMage:38};
 for(const [type,expected] of Object.entries(xp)){
  g.experienceDrops=[];
  const target=g.addUnit(2,type,leader.x+300,leader.y,true);
  g.damage(target,1e9,leader);
  assert.equal(g.experienceDrops.length,1,type);
  assert.equal(g.experienceDrops[0].amount,expected,type);
  assert.equal(g.experienceDrops[0].boss,undefined,type);
 }
 const outside=new FrontGame({},undefined,{map:'backyard'});
 outside.damage(outside.addUnit(2,'ant',800,1000,true),1e9,outside.commander(0));
 assert.equal(outside.experienceDrops[0].amount,13);
});

test('red boss crystals keep exact mini and full rewards separate from ordinary drops and Destiny Star',()=>{
 const g=game(),leader=g.commander(0);
 g.time=540;
 const mini=g.addUnit(2,'rhinoBeetle',1800,6000,true);
 Object.assign(mini,{boss:true,miniBoss:true,miniBossMinute:9});
 g.earnDefeatXP(mini,5);
 g.damage(mini,1e9,leader);
 assert.ok(g.pickups.some(p=>p.destinyStar));
 assert.equal(g.bossState.rewards,0);
 const full=g.addUnit(2,'hornet',mini.x,mini.y,true);
 full.boss=true;
 g.damage(full,1e9,leader);
 assert.equal(g.bossState.rewards,1);
 const road=g.addUnit(2,'bayonet',mini.x,mini.y,true);
 Object.assign(road,{boss:true,roadCaptain:true,roadStage:1});
 g.damage(road,1e9,leader);
 assert.equal(g.bossState.rewards,2);
 g.earnDefeatXP(full,5);
 assert.deepEqual(g.experienceDrops.map(d=>[d.amount,d.boss||false]),[[30,false],[162.5,true],[200,true]]);
});

test('a saved cooperative boss crystal belongs only to the player credited with the kill',()=>{
 const g=new CoopGame();g.start();
 const green=g.commander(0),blue=g.withOwner(1,()=>g.commander(0));
 const boss=g.addUnit(2,'stagBeetle',green.x+300,green.y,true);boss.boss=true;
 g.damage(boss,1e9,blue);
 const restored=unpack(new CoopGame(),pack(g)),red=restored.experienceDrops[0];
 assert.deepEqual([red.amount,red.boss,red.owner],[152,true,1]);
 for(const commander of [restored.commander(0),restored.withOwner(1,()=>restored.commander(0))]){
  commander.x=red.x;commander.y=red.y;
 }
 restored.updateExperienceDrops(.05);
 assert.equal(restored.xp,0);assert.equal(restored.experienceDrops.length,1);
 restored.withOwner(1,()=>{restored.updateExperienceDrops(.05);assert.equal(restored.xp,152);});
 assert.equal(restored.experienceDrops.length,0);
});

test('old gold ranks and offered cards migrate to magnet without adding a gold multiplier',()=>{
 const old=game(),state=pack(old);
 delete state.fields.abilities.magnet;
 delete state.fields.experienceDrops;
 state.fields.abilities.gold=4;
 state.fields.currentOptions=['ability_gold','medic'];
 state.fields.pendingChoice={type:'ability_gold'};
 const restored=unpack(game(),state);
 assert.deepEqual(restored.experienceDrops,[]);
 assert.equal(restored.abilities.magnet,4);
 assert.equal(restored.currentOptions[0],'ability_magnet');
 assert.equal(restored.pendingChoice.type,'ability_magnet');
 assert.equal(restored.awardGold(10),10);
 assert.equal(cleanPlan({growth:{gold:4}}).growth.magnet,4);
 assert.equal(ABILITIES.gold,undefined);
 assert.equal(EVOLUTIONS.machinegun.ability,'magnet');
 restored.tech[0].machinegun=5;restored.abilities.magnet=5;restored.checkEvolutions();
 assert.equal(restored.evolved.machinegun,true);
});

test('rare rolls create a map magnet or a healing pack at the enemy position',()=>{
 const g=game(),leader=g.commander(0);
 const defeat=(roll,offset)=>{
  g.random=()=>roll;
  const foe=g.addUnit(2,'ant',leader.x+offset,leader.y,true);
  g.damage(foe,1e9,leader);
  return g.pickups.find(p=>p.combatDrop&&p.x===foe.x&&p.y===foe.y);
 };
 const magnet=defeat(.0059,50),heal=defeat(.006,95);
 assert.equal(magnet?.combatDrop,'magnet');
 assert.equal(heal?.combatDrop,'heal');
 assert.equal(defeat(.021,145),undefined);
 g.earnDefeatXP({x:100,y:100},80);
 assert.ok(g.collectFieldSupply(magnet));
 assert.ok(g.experienceDrops.every(drop=>drop.pulling));
 assert.equal(g.xp,0);
 for(let i=0;i<100;i++)g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops.length,0);assert.equal(g.xp,95);
 Object.assign(leader,{x:heal.x,y:heal.y});
 assert.equal(g.collectFieldSupply(heal),false);
 assert.equal(heal.active,true);
 const ally=g.addUnit(0,'rifle',leader.x,leader.y);
 ally.hp=ally.maxHp*.5;
 assert.equal(g.canCollectCombatDrop(heal,leader),true);
 leader.hp=leader.maxHp*.5;
 assert.ok(g.collectFieldSupply(heal));
 assert.equal(leader.hp,leader.maxHp*.75);
 assert.equal(ally.hp,ally.maxHp*.75);
 assert.equal(g.collectFieldSupply(heal),false);
});

test('a saved cooperative magnet attracts the owner’s crystals from anywhere on the map',()=>{
 const g=new CoopGame();g.start();
 const green=g.commander(0),blue=g.withOwner(1,()=>g.commander(0));
 g.earnDefeatXP({x:100,y:100},20);
 g.withOwner(1,()=>{
  g.earnDefeatXP({x:110,y:100},24);
  g.random=()=>.001;g.rollCombatDrop(green);
 });
 blue.x=green.x+16;blue.y=green.y;
 const restored=unpack(new CoopGame(),pack(g));
 restored.coopCollectPickups();
 assert.deepEqual(restored.experienceDrops.map(p=>[p.owner,p.pulling]),[[0,false],[1,true]]);
 assert.equal(restored.pickups.find(p=>p.combatDrop==='magnet').active,false);
});
