'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame,ABILITIES,EVOLUTIONS}=require('./public/engine.js');
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
 assert.deepEqual(g.experienceDrops,[{x:foe.x,y:foe.y,amount:13,owner:0,pulling:false}]);
 g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops[0].pulling,false);
 g.abilities.magnet=5;g.abilities.xpGain=2;
 g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops[0].pulling,true);assert.equal(g.xp,0);
 const restored=unpack(game(),pack(g));
 for(let i=0;i<14;i++)restored.updateExperienceDrops(.05);
 assert.equal(restored.experienceDrops.length,0);
 assert.ok(Math.abs(restored.xp-14.3)<1e-8);
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
 const magnet=defeat(.0029,50),heal=defeat(.003,95);
 assert.equal(magnet?.combatDrop,'magnet');
 assert.equal(heal?.combatDrop,'heal');
 assert.equal(defeat(.01,145),undefined);
 g.earnDefeatXP({x:100,y:100},80);
 assert.ok(g.collectFieldSupply(magnet));
 assert.ok(g.experienceDrops.every(drop=>drop.pulling));
 assert.equal(g.xp,0);
 for(let i=0;i<100;i++)g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops.length,0);assert.equal(g.xp,119);
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
