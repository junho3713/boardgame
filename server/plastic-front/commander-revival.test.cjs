'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
const source={team:2,type:'hornet',x:1550,y:7000};
function scope(g,owner,fn){return g.coop?g.withOwner(owner,fn):fn();}
function scene(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.type==='leader');g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.pickups=[];
 for(const method of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck','syncEnemyGrowth','move','navigate','separateCrowd','autoFuseUnits'])g[method]=()=>{};
 for(const u of g.units){u.cooldown=1e6;if(u.team===0){u.x=1500+(u.coopOwner||0)*150;u.y=7000;}}
 return g;
}
function step(g,until){while(g.time+1e-8<until)g.update(Math.min(.05,until-g.time));}
function kill(g,c){g.damage(c,c.hp/g.defenseFactor(c,source)+1000,source);}

test('ordinary and evolved medics prioritize wounded allied commanders before closer soldiers',()=>{
 for(const coop of [false,true])for(const owner of coop?[0,1]:[0])for(const evolved of [false,true]){
  const g=scene(coop);scope(g,owner,()=>{
   const c=g.commander(0);c.hp-=100;g.evolved.medic=evolved;
   const medic=g.addUnit(0,'medic',c.x+100,c.y);medic.cooldown=0;
   const troops=[10,20,30].map(dx=>{const t=g.addUnit(0,'rifle',medic.x+dx,c.y);t.hp-=50;t.cooldown=1e6;return t;});
   const calls=[],heal=g.heal;g.heal=function(t,n,s){calls.push(t.id);return heal.call(this,t,n,s);};
   g.update(.05);a.equal(calls[0],c.id);a.equal(calls.length,evolved?3:1);a.equal(c.hp,c.maxHp-100+g.stats(medic).heal);
   a.equal(troops.filter(t=>t.hp>t.maxHp-50).length,evolved?2:0);
  });
 }
});

test('healthy, dead and out-of-range commanders do not displace a treatable soldier',()=>{
 for(const state of ['healthy','dead','far']){
  const g=scene(),c=g.commander(0),medic=g.addUnit(0,'medic',c.x+100,c.y),soldier=g.addUnit(0,'rifle',medic.x+20,c.y);medic.cooldown=0;soldier.hp-=50;
  if(state==='dead')c.hp=0;if(state==='far'){c.hp-=100;c.x-=500;}
  const before=soldier.hp;g.update(.05);a.ok(soldier.hp>before);
 }
});

test('a commander death never removes squad members and each coop owner spends only their own life',()=>{
 for(const coop of [false,true])for(const owner of coop?[0,1]:[0]){
  const g=scene(coop),troops=[];
  for(const player of coop?[0,1]:[0])scope(g,player,()=>{for(const type of ['rifle','machinegun','sniper','rocket','tank','guntruck','lucky','medic']){const u=g.addUnit(0,type,1400,7100);u.star=2;troops.push(u);}});
  const before=troops.map(u=>u.hp),unitCount=g.units.length,cash=scope(g,owner,()=>g.cash[0]),c=scope(g,owner,()=>g.commander(0));kill(g,c);
  a.equal(c.hp,0);a.equal(c.deadUntil,5);a.deepEqual(troops.map(u=>u.hp),before);a.equal(g.units.length,unitCount);
  a.equal(scope(g,owner,()=>g.retreated),1);a.equal(scope(g,owner,()=>g.losses[0]),0);a.equal(scope(g,owner,()=>g.cash[0]),cash);a.equal(scope(g,owner,()=>g.lastCommanderLoss),null);
  if(coop)a.equal(scope(g,1-owner,()=>g.retreated),0);
 }
});

test('revival waits five simulation seconds, stays at the death position and restores clean full health',()=>{
 for(const coop of [false,true])for(const owner of coop?[0,1]:[0]){
  const g=scene(coop),c=scope(g,owner,()=>g.commander(0)),point={x:c.x,y:c.y};
  Object.assign(c,{poisonUntil:100,poisonDps:999,poisonSource:source,rootedUntil:100,slowUntil:100,windUntil:100,luckySlowUntil:100,healingReductionUntil:100});kill(g,c);
  step(g,2);g.phase='paused';const time=g.time;for(let i=0;i<100;i++)g.update(.05);a.equal(g.time,time);a.equal(c.hp,0);g.phase='playing';
  step(g,4.95);a.equal(c.hp,0);step(g,5.05);a.equal(c.hp,c.maxHp);a.deepEqual({x:c.x,y:c.y},point);a.equal(c.deadUntil,0);a.equal(c.diedAt,undefined);
  for(const key of ['poisonUntil','poisonDps','rootedUntil','slowUntil','windUntil','luckySlowUntil','healingReductionUntil'])a.equal(c[key],0);
  a.equal(c.poisonSource,null);a.equal(g.commanderReviveProtected(c),true);a.ok(c.reviveProtectionUntil-g.time>2.9);
 }
});

test('revival protection blocks damage, poison, freezing, healing reduction and glue without shielding the squad',()=>{
 const g=scene(),c=g.commander(0);kill(g,c);step(g,5.05);const end=c.reviveProtectionUntil,hp=c.hp;
 for(const damage of [50,1e9/c.maxHp,1e9/g.defenseFactor(c,source)])g.damage(c,damage,source);
 g.applyPoison(c,source,1e9);a.equal(c.hp,hp);a.equal(c.poisonUntil,0);
 const mage=g.addUnit(2,'blizzardMage',c.x+90,c.y);mage.activeStage=1;mage.blizzardCast={x:c.x,y:c.y,hitAt:g.time};g.updateBlizzard(mage,.05);a.equal(c.rootedUntil,0);g.units=g.units.filter(u=>u!==mage);
 g.butterflyGusts=[{x:c.x-60,y:c.y,angle:0,team:2,started:g.time-.3,ends:g.time+1,hitIds:[]}];g.updateButterflyGusts();a.equal(c.healingReductionUntil,0);g.butterflyGusts=[];
 g.luckyGlues=[{x:c.x,y:c.y,team:2,radius:100,landAt:g.time,expires:g.time+10,hitIds:[]}];g.updateLuckyObjects(.05);a.equal(c.luckySlowUntil,0);g.luckyGlues=[];
 const soldier=g.addUnit(0,'rifle',c.x+50,c.y);g.damage(soldier,10,source);a.ok(soldier.hp<soldier.maxHp);
 g.phase='paused';const time=g.time;for(let i=0;i<20;i++)g.update(.05);a.equal(g.time,time);a.equal(g.commanderReviveProtected(c),true);
 g.phase='playing';step(g,end+.01);a.equal(g.commanderReviveProtected(c),false);g.damage(c,10,source);a.ok(c.hp<hp);g.applyPoison(c,source,5);a.ok(c.poisonUntil>g.time);
});

test('save and restore preserve death location and the remaining personal revival shield',()=>{
 for(const protectedState of [false,true]){
  const g=scene(),c=g.commander(0);kill(g,c);step(g,protectedState?5.5:2.5);const data=pack(g),restored=unpack(scene(),data),copy=restored.commander(0);restored.obstacles=[];
  a.deepEqual(copy.revivePoint,c.revivePoint);a.equal(copy.deadUntil,c.deadUntil);a.equal(copy.reviveProtectionUntil,c.reviveProtectionUntil);
  step(restored,protectedState?6:5.1);a.equal(copy.hp,copy.maxHp);a.equal(copy.x,1500);a.equal(copy.y,7000);a.equal(restored.commanderReviveProtected(copy),true);
 }
});

test('legacy downed commanders revive at their retained location and exhausted lives still end the operation',()=>{
 const legacy=scene(),c=legacy.commander(0);c.hp=0;c.deadUntil=1;step(legacy,1.05);a.equal(c.hp,c.maxHp);a.equal(c.x,1500);a.equal(c.y,7000);
 const g=scene(),leader=g.commander(0),soldier=g.addUnit(0,'rifle',1500,7100);g.retreated=2;kill(g,leader);
 a.equal(g.phase,'ended');a.equal(g.result,'lose');a.equal(leader.deadUntil,0);a.equal(soldier.hp,soldier.maxHp);
});
