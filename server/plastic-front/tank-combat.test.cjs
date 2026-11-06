'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.mission.stage=3;for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','gainXP','levelCheck','syncEnemyGrowth'])g[key]=()=>{};return g;}
function durable(u){u.hp=u.maxHp=100000;u.cooldown=10000;u.aiEvade={x:u.x,y:u.y,until:1e6};return u;}
test('ordinary enemy tanks finish aiming and hit even as almost equidistant targets trade nearest priority',()=>{
 for(const coop of [false,true])for(const team of [1,2]){
  const g=scene(coop),left=durable(g.addUnit(0,'tank',1300,6000)),right=durable(coop?g.withOwner(1,()=>g.addUnit(0,'tank',1701,6000)):g.addUnit(0,'tank',1701,6000)),tank=g.addUnit(team,'tank',1500,6000,true);
  // Use the same armor class so a one-unit movement swaps the weighted distance winner.
  durable(g.addUnit(0,'leader',1500,7000));if(coop)durable(g.withOwner(1,()=>g.addUnit(0,'leader',1800,7000)));tank.cooldown=0;let fired=0;g.events.fire=u=>{if(u===tank)fired++;};
  for(let i=0;i<160;i++){left.x=1300-(i%2);right.x=1700+((i+1)%2);left.y=right.y=6000;for(const u of [left,right])u.aiEvade={x:u.x,y:u.y,until:g.time+1};g.update(.05);}
  a.ok(fired>=3,'tank never finishes aiming: '+fired);a.ok(left.hp<100000||right.hp<100000,'no shell impact');
 }
});


test('a tank drops a dead, missing, friendly or out-of-range aiming target and acquires another',()=>{
 for(const invalidate of [u=>u.hp=0,(u,g)=>g.units=g.units.filter(v=>v!==u),u=>u.team=1,u=>u.x=2000]){
  const g=scene(),c=durable(g.addUnit(0,'leader',1500,7000)),first=durable(g.addUnit(0,'rifle',1500,6200)),next=durable(g.addUnit(0,'rifle',1700,6000)),tank=g.addUnit(1,'tank',1500,6000,true);
  tank.cooldown=0;g.update(.05);a.equal(tank.tankAimTargetId,first.id);invalidate(first,g);g.update(.05);a.equal(tank.tankAimTargetId,next.id);
  const hp=next.hp;for(let i=0;i<80;i++)g.update(.05);a.ok(next.hp<hp);a.ok(c.hp>0);
 }
});

test('ordinary red tanks warn and land one rear shell; the red boss keeps three and both retain direct fire',()=>{
 for(const coop of [false,true])for(const boss of [false,true]){
  const g=scene(coop);durable(g.addUnit(0,'leader',1500,7000));if(coop)durable(g.withOwner(1,()=>g.addUnit(0,'leader',1800,7000)));
  durable(g.addUnit(0,'rifle',1500,6200));const rear=durable(coop?g.withOwner(1,()=>g.addUnit(0,'medic',1500,6400)):g.addUnit(0,'medic',1500,6400));
  rear.aiEvade={x:rear.x,y:rear.y,until:100};const u=g.addUnit(1,'crimsonAce',1500,6000,true);u.cooldown=0;if(boss)Object.assign(u,{boss:true,bossPattern:'rearBarrage'});
  g.update(.05);const barrage=u.bossBarrage,count=boss?3:1;a.equal(barrage.targets.length,count);a.deepEqual(barrage.targets[0],{x:rear.x,y:rear.y});a.equal(g.effects.filter(e=>e.kind==='bossBarrageWarn'&&e.source===u).length,count);a.equal(g.bossHazards().length,count);a.ok(g.shots.some(p=>p.source===u),'direct shot must remain');
  a.ok(Math.abs(barrage.hitAt-g.time-1.5)<1e-8);const hp=rear.hp;g.time=barrage.hitAt-.01;g.updateBossPattern(u,.01);a.equal(g.mortarShells.length,0);
  g.time=barrage.hitAt;g.updateBossPattern(u,.01);const shells=g.mortarShells.filter(p=>p.source===u);a.equal(shells.length,count);
  for(const p of shells){a.equal(p.radius,100);a.equal(p.damage,g.stats(u).damage*1.35);a.equal(p.landAt,g.time+.25);}
  g.time=shells[0].landAt;g.updateMortars();a.ok(rear.hp<hp);a.equal(u.bossBarrage,null);
  g.time=u.nextBossSkillAt-.001;g.updateBossPattern(u,.01);a.equal(u.bossBarrage,null);g.time=u.nextBossSkillAt;g.updateBossPattern(u,.01);a.equal(u.bossBarrage.targets.length,count);
 }
});

test('moving after a red tank warning avoids its fixed landing point, and a dead caster never releases shells',()=>{
 for(const dead of [false,true]){
  const g=scene();durable(g.addUnit(0,'leader',1500,7000));const rear=durable(g.addUnit(0,'medic',1500,6400)),u=g.addUnit(1,'crimsonAce',1500,6000,true);u.cooldown=100;
  g.update(.05);const barrage=u.bossBarrage,hp=rear.hp;rear.x+=250;rear.aiEvade={x:rear.x,y:rear.y,until:100};if(dead)u.hp=0;
  g.time=barrage.hitAt;g.update(.01);a.equal(g.mortarShells.filter(p=>p.source===u).length,dead?0:1);a.equal(g.bossHazards().length,0);
  g.time+=.3;g.updateMortars();a.equal(rear.hp,hp);
 }
 const g=scene(),ally=g.addUnit(0,'crimsonAce',1500,6000);g.addUnit(0,'leader',1500,6400);g.updateBossPattern(ally,.05);a.equal(ally.bossBarrage,undefined);
});
