'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {CoopGame}=require('./public/coop-engine.js');
const {FrontGame,FrontProfile}=require('./public/engine.js');
const pattern=require('./public/room-campaign.js').config.patterns.venomDive;
function dive(g,target,miss=false){
 const boss=g.addUnit(2,'hornet',target.x+80,target.y);boss.boss=true;boss.bossPattern='venomDive';
 boss.bossAction={phase:'dive',started:g.time-pattern.descent,until:g.time,target,x:target.x+(miss?200:0),y:target.y,fromX:boss.x,fromY:boss.y};
 g.updateVenomDive(boss,pattern);return boss;
}
test('hornet warns for 0.6 seconds then completes its dive and half-HP impact in 0.1 seconds',()=>{
 const g=new CoopGame();g.start();const t=g.owned(0)[0],hp=t.hp,boss=g.addUnit(2,'hornet',t.x+150,t.y);
 g.units=[t,boss];Object.assign(boss,{boss:true,bossPattern:'venomDive'});g.updateVenomDive(boss,pattern);aPhase('rise');
 g.time=.25;g.updateVenomDive(boss,pattern);aPhase('high');assert.equal(boss.bossAction.until,.85);
 g.time=.849;g.updateVenomDive(boss,pattern);aPhase('high');
 g.time=.85;g.updateVenomDive(boss,pattern);aPhase('dive');assert.equal(t.hp,hp);
 g.time=.95;g.updateVenomDive(boss,pattern);aPhase('low');assert.ok(Math.abs(t.hp-hp*.5)<1e-7);
 function aPhase(phase){assert.equal(boss.bossAction.phase,phase);}
});
test('boss dive removes half maximum HP at every star and armor level, once per impact',()=>{
 for(const type of ['rifle','medic','tank','lucky'])for(const star of [1,2,3]){
  const g=new FrontGame({},new FrontProfile(),{map:'livingroom-star3'});g.start();g.abilities.defense=5;
  const t=g.addUnit(0,type,800,900);t.star=star;t.hp=t.maxHp=g.stats(t).hp;const hp=t.maxHp,boss=dive(g,t);
  assert.ok(Math.abs(t.hp-hp*.5)<1e-7,`${type} ${star}`);assert.equal(t.poisonUntil,g.time+pattern.poisonDuration);
  const after=t.hp;g.updateVenomDive(boss,pattern);assert.equal(t.hp,after);
 }
});
test('leaving the landing circle avoids both the impact and poison',()=>{
 const g=new CoopGame();g.start();const t=g.owned(0)[0],hp=t.hp;dive(g,t,true);assert.equal(t.hp,hp);assert.equal(t.poisonUntil,undefined);
});
test('each squad shield blocks impact and poison until exactly five seconds, then takes half HP',()=>{
 for(const owner of [0,1]){
  const g=new CoopGame();g.start();g.withOwner(owner,()=>{g.xp=g.neededXP();});g.levelCheck();
  const t=g.owned(owner)[0],hp=t.maxHp;g.time=4.999;dive(g,t);assert.equal(t.hp,hp);assert.equal(t.poisonUntil,undefined);
  g.time=5;dive(g,t);assert.ok(Math.abs(t.hp-hp*.5)<1e-7);assert.equal(t.poisonUntil,9);
  const before=t.hp;g.time=5.25;g.updatePoisons();assert.ok(t.hp<before);
 }
});
test('medic skin selection belongs to each owner and changes no combat stats',()=>{
 const g=new CoopGame({},{medicSkins:['rina','classic']});
 const a=g.withOwner(0,()=>g.addUnit(0,'medic',800,900)),b=g.withOwner(1,()=>g.addUnit(0,'medic',1000,900));
 assert.equal(a.appearance,'rina');assert.equal(b.appearance,'classic');assert.deepEqual(g.stats(a),g.stats(b));
});
