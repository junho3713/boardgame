'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,ROSTER,EVOLUTIONS}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const five=['sniper','mortar','tank','rocket','machinegun'];
function complete(g,types=five){for(const t of types){g.tech[0][t]=5;g.abilities[EVOLUTIONS[t].ability]=5;}g.checkEvolutions();}
function scene(){const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.time=900;g.choiceKind='level';return g;}
test('five completed evolutions offer one eligible remaining upgrade plus gold and healing, without duplicates',()=>{
 const g=scene();complete(g);a.equal(g.completedEvolutions(),5);const seen=new Set();for(let i=0;i<100;i++){g.random=()=>(i+.5)/100;const options=g.options();a.equal(options.length,3);a.deepEqual(options.slice(1),['fieldGold','fieldRepair']);a.ok(g.eligibleCard(options[0]));a.ok(!options[0].startsWith('field'));a.equal(new Set(options).size,3);seen.add(options[0]);}a.ok(seen.size>=3);
});
test('four completed evolutions do not trigger the new reward layout, even with all five selected abilities maxed',()=>{
 const g=scene();complete(g,five.slice(0,4));g.abilities.gold=5;a.equal(g.completedEvolutions(),4);for(let i=0;i<20;i++){g.random=()=>i/20;a.equal(g.options().filter(t=>!t.startsWith('field')).length,3);}
});
test('completion persists after troops die and still uses the existing gold and healing transactions',()=>{
 const g=scene();complete(g);const c=g.commander(0);c.hp=c.maxHp/4;g.phase='choice';g.currentOptions=g.options();const gold=g.profile.gold,level=g.level,xp=g.xp;g.stageChoice('fieldGold');a.equal(g.confirmChoice(),true);a.ok(g.profile.gold>gold);a.equal(g.level,level);a.equal(g.xp,xp);g.phase='choice';g.turnChoice=null;g.currentOptions=g.options();g.stageChoice('fieldRepair');a.equal(g.confirmChoice(),true);a.ok(c.hp>c.maxHp/4);a.equal(g.completedEvolutions(),5);
});
test('when no upgrades remain only gold and healing are offered, including boss rewards',()=>{
 const g=scene();complete(g);for(const t of ROSTER)g.tech[0][t]=5;for(const key of g.selectedAbilities())g.abilities[key]=5;for(const kind of ['level','boss']){g.choiceKind=kind;a.deepEqual(g.options(),['fieldGold','fieldRepair']);}
});
test('cooperative completion and boss-upgrade ownership belong to each squad and survive a saved choice',()=>{
 const g=new CoopGame();g.start();g.withOwner(1,()=>complete(g));a.equal(g.completedEvolutions(),0);a.equal(g.withOwner(1,()=>g.completedEvolutions()),5);g.withOwner(1,()=>{g.choiceKind='boss';g.tech[0].rifle=5;g.tech[0].medic=1;g.addUnit(0,'medic',1500,7000);g.bossState.rewards=1;g.currentOptions=g.options();a.equal(g.currentOptions[0],'medic');});
 const restored=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));restored.withOwner(1,()=>{a.deepEqual(restored.currentOptions,['medic','fieldGold','fieldRepair']);restored.phase='choice';restored.turnChoice=null;a.equal(restored.stageChoice('fieldGold'),true);a.equal(restored.confirmChoice(),true);a.equal(restored.bossState.rewards,0);});a.equal(restored.withOwner(0,()=>restored.completedEvolutions()),0);
});
