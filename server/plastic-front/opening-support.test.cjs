'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame,ROSTER}=require('./public/engine');
const {pack,unpack}=require('./public/autoplay');
const make=map=>new FrontGame({},undefined,{map,realtimeSummons:true});

test('each new PvE map enters the starter choice with no preset troops, no registered slot and a stopped clock',()=>{
 for(const map of ['backyard','livingroom','livingroom-star','livingroom-pixel','desktop','bedroom-star']){
  const g=make(map);g.start();g.update(.05);
  assert.equal(g.phase,'choice',map);assert.equal(g.time,0);assert.deepEqual(g.alive(0).map(u=>u.type),['leader']);
  assert.deepEqual(g.summonSlots,[]);assert.equal(g.rerollCount,4);assert.equal(g.currentOptions.length,3);
  assert.equal(new Set(g.currentOptions).size,3);
  assert(g.currentOptions.every(t=>ROSTER.includes(t)&&t!=='medic'));assert.equal(g.stageChoice('ability_haste'),false);
  assert(g.chooseInitialSupport(g.currentOptions[0]),map);
 }
});
test('starter reroll replaces all three cards, with four rerolls shared through saves and levelups',()=>{
 const g=make('livingroom-star');g.start();
 const first=g.currentOptions;assert(g.rerollUpgrade());assert(g.currentOptions.every(t=>!first.includes(t)));
 const offer=g.currentOptions[0];assert(g.chooseInitialSupport(offer));assert.equal(g.rerollCount,3);
 g.xp=g.neededXP();g.levelCheck();
 const shown=g.currentOptions;assert(g.stageChoice(shown[0]));
 const level=g.level;assert(g.rerollUpgrade());assert.equal(g.level,level);assert.equal(g.pendingChoice,null);
 assert(g.currentOptions.every(t=>!shown.includes(t)));
 const restored=unpack(make('backyard'),pack(g));assert.equal(restored.rerollCount,2);assert(restored.rerollUpgrade());assert(restored.rerollUpgrade());
 const finalCards=restored.currentOptions;assert(!restored.rerollUpgrade());assert.equal(restored.currentOptions,finalCards);
 restored.reset();assert.equal(restored.rerollCount,4);
});
test('each opening card deploys one free level-one unit and reserves the next slot for future upgrades',()=>{
 for(const type of ROSTER.filter(t=>t!=='medic')){
  const g=make('livingroom');g.start();g.currentOptions=[type];const gold=g.cash[0];assert(g.chooseInitialSupport(type));
  assert.equal(g.cash[0],gold);assert.deepEqual(g.summonSlots,[type]);assert.equal(g.tech[0][type],1);
  assert.equal(g.dropPods.length,1);assert.equal(g.alive(0).length,1);assert(!g.chooseInitialSupport(type));
  g.time=g.dropPods[0].landAt;g.updateDropPods();assert.equal(g.alive(0).filter(u=>u.type===type).length,1);
  g.phase='choice';g.currentOptions=['medic'];assert.equal(g.nextSummonSlot('medic'),2);
  assert(g.stageChoice('medic'));assert(g.confirmChoice());assert.deepEqual(g.summonSlots,[type,'medic']);
 }
});

