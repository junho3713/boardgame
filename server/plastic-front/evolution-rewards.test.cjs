'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,LUCKY}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(coop=false,map='livingroom-star3'){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map});g.start();g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.mission.stage=3;
 for(const method of ['updateMission','updateSwarm','updateBosses','updateArtillery','gainXP','levelCheck','syncEnemyGrowth'])g[method]=()=>{};return g;
}
function actor(g,type,x=1000,y=6000,owner=0){const u=g.coop?g.withOwner(owner,()=>g.addUnit(0,type,x,y)):g.addUnit(0,type,x,y);if(g.coop)g.withOwner(owner,()=>g.evolved[type]=true);else g.evolved[type]=true;return u;}
function enemy(g,x=1200,y=6000,type='rifle'){const t=g.addUnit(2,type,x,y);t.hp=t.maxHp=1e6;t.cooldown=1e6;return t;}
function near(x,y){a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);}
test('a marching radio operator releases the last airstrike facing during cooldown',()=>{
 const g=scene(),leader=g.addUnit(0,'leader',1000,6000),radio=actor(g,'guntruck',leader.x-160);
 radio.cooldown=2;radio.aimFace=Math.PI;
 g.setMoveOrder(leader.x+200,leader.y);
 g.updateBattleUnits(.05,g.commander(1));
 a.equal(radio.aimFace,null);
 a.ok(radio.walk>0);
});
test('evolved shotgun uses a four-shell magazine, burning pellets and a single explosive fourth shot',()=>{
 const g=scene(),u=actor(g,'rifle'),t=enemy(g,1090),s=g.stats(u);
 for(let i=0;i<4;i++){
  const shots=g.fireUnitProjectiles(u,t,{damage:100},s);
  a.equal(shots.length,5);a.equal(u.shotgunRounds,3-i);a.ok(shots.every(b=>b.hot&&b.damage===20));
  a.equal(shots.filter(b=>b.exploding).length,i===3?1:0);
  for(const b of shots)g.advanceCommandShot(b,1,[t]);g.time+=s.rate;
 }
 a.ok(t.x>1090);a.equal(g.effects.filter(e=>e.kind==='rosterBlast'&&e.style==='shotgun').length,1);
 const hp=t.hp;g.updateEvolutionCombat();a.ok(t.hp<hp);
 a.equal(g.fireUnitProjectiles(u,t,{damage:100},s).length,0);
 g.time=u.shotgunReloadUntil;a.equal(g.fireUnitProjectiles(u,t,{damage:100},s).length,5);a.equal(u.shotgunRounds,3);
});
test('shotgun pellet damage falls with distance from the firing point',()=>{
 const measure=distance=>{
  const g=scene(),u=g.addUnit(0,'rifle',1000,6000),t=enemy(g,1000+distance),hits=[];
  const shots=g.fireUnitProjectiles(u,t,{damage:100},g.stats(u));
  const pellet=shots[2];
  u.x=t.x+70;u.y=t.y+55;
  g.damage=(target,amount)=>hits.push([target,amount]);
  g.advanceCommandShot(pellet,1,[t]);
  a.equal(hits.length,1);a.equal(hits[0][0],t);
  return hits[0][1];
 };
 const close=measure(45),mid=measure(130),far=measure(210);
 near(close,33);
 a.ok(close>mid&&mid>far&&far>=20);
});

test('sniper pierces only two aligned enemies behind the first with 100/50/25% and honors armor',()=>{
 const g=scene(),u=actor(g,'sniper'),targets=[enemy(g,1200),enemy(g,1300),enemy(g,1400),enemy(g,1500),enemy(g,1350,6060)],hits=[];g.damage=(t,d)=>hits.push([t.id,d]);
 const b=g.fireUnitProjectiles(u,targets[0],{damage:100},g.stats(u))[0];g.impact(b);a.deepEqual(hits,targets.slice(0,3).map((t,i)=>[t.id,[100,50,25][i]]));a.deepEqual(g.effects.filter(e=>e.kind==='evoBeam').map(e=>e.width),[6,3,1.5]);
});
test('three-star two-bullet snipers preserve one damage budget before applying pierce decay',()=>{
 const g=scene(),u=actor(g,'sniper'),t=enemy(g);u.star=3;g.focusTarget=t;g.focusAutomatic=false;
 const shots=g.fireUnitProjectiles(u,t,{damage:200},g.stats(u));a.equal(shots.length,2);a.deepEqual(shots.map(b=>b.damage),[100,100]);a.ok(shots.every(b=>b.evoStyle==='pierce'));
});
test('machinegun heats for three seconds, pierces for four, then restarts; paused time does not advance it',()=>{
 const g=scene(),u=actor(g,'machinegun'),t=enemy(g);let active;
 for(let i=0;i<=30;i++){g.time=i*.1;const b=g.fireUnitProjectiles(u,t,{damage:100},g.stats(u))[0];if(i<30)a.notEqual(b.evoStyle,'heatPierce');else active=b;}
 a.equal(active.evoStyle,'heatPierce');near(u.overheatUntil,7);const normal=scene(),other=normal.addUnit(0,'machinegun',1000,6000);a.ok(g.stats(u).rate<normal.stats(other).rate);
 g.phase='paused';const before=JSON.stringify(u);g.update(.05);a.equal(JSON.stringify(u),before);g.time=7;g.updateEvolutionCombat();a.equal(u.overheatUntil,0);a.equal(u.evolutionHeat,0);
 const h=scene(),v=actor(h,'machinegun'),q=enemy(h);h.fireUnitProjectiles(v,q,{damage:100},h.stats(v));h.time=.5;h.fireUnitProjectiles(v,q,{damage:100},h.stats(v));h.time=1.3;h.updateEvolutionCombat();a.equal(v.evolutionHeat,0);
});
test('radio doubles schedule three distinct barrages and burn moving targets for 5 seconds',()=>{
 for(const face of [1,2,3,4,5,6]){
  const g=scene(),u=g.addUnit(0,'guntruck',1000,6000),target=enemy(g,1200);
  g.diceFace=()=>face;g.random=()=>0;
  g.fireUnitProjectiles(u,target,{damage:100});
  const shell=g.radioStrikes[0],strike=face<=2?'incendiary':face<=4?'missile':'nuke';
  a.equal(shell.strike,strike);a.equal(g.radioStrikes.length,strike==='missile'?3:1);
  const roll=g.effects.find(e=>e.kind==='radioRoll');a.deepEqual([roll.a,roll.b],[face,face]);
  const hp=target.hp,x=target.x;g.time=shell.landAt-.001;g.updateEvolutionCombat();a.equal(target.hp,hp);
  g.time=shell.landAt;g.updateEvolutionCombat();a.ok(target.hp<hp);
  if(strike==='missile'){a.notEqual(target.x,x);a.equal(g.radioStrikes.length,2);}
  if(strike==='incendiary'){
   const zone=g.radioFireZones[0],late=enemy(g,zone.x+zone.radius/2);near(zone.until-zone.startedAt,5);
   g.time+=.5;g.updateEvolutionCombat();a.ok(late.hp<late.maxHp);
   const burnt=late.hp;
   g.time=zone.until-.5;g.updateEvolutionCombat();a.ok(late.hp<burnt);a.equal(g.radioFireZones.length,1);
   const lastBurn=late.hp;
   g.time=zone.until;g.updateEvolutionCombat();a.ok(late.hp<lastBurn);a.equal(g.radioFireZones.length,0);
   const expired=late.hp;
   g.time+=.5;g.updateEvolutionCombat();a.equal(late.hp,expired);
  }else a.equal(g.radioFireZones.length,0);
 }
});
test('five separate misses force the sixth roll for that operator, even through a save',()=>{
 const g=scene(),u=g.addUnit(0,'guntruck',1000,6000),other=g.addUnit(0,'guntruck',1000,6000),t=enemy(g);
 let idx=0;g.diceFace=()=>[3,1][idx++%2];
 for(let i=0;i<5;i++)g.fireUnitProjectiles(u,t,{damage:10});
 a.equal(g.radioStrikes.length,0);a.equal(u.radioMisses,5);
 g.fireUnitProjectiles(other,t,{damage:10});a.equal(other.radioMisses,1);
 const restored=unpack(scene(),pack(g)),saved=restored.units.find(v=>v.id===u.id);
 restored.diceFace=()=>5;restored.fireUnitProjectiles(saved,restored.units.find(v=>v.id===t.id),{damage:10});
 a.equal(saved.radioMisses,0);a.equal(restored.radioStrikes[0].strike,'nuke');
});
test('the evolved operator rolls only 3–6, can miss, and leaves a larger burn zone after a nuclear call',()=>{
 const g=scene(),u=actor(g,'guntruck'),t=enemy(g);
 for(const [sample,face] of [[0,3],[.26,4],[.51,5],[.999,6]]){g.random=()=>sample;a.equal(g.diceFace(u),face);}
 const picks=[3,4,5,5];g.diceFace=()=>picks.shift();
 g.fireUnitProjectiles(u,t,{damage:10});a.equal(g.radioStrikes.length,0);
 g.fireUnitProjectiles(u,t,{damage:10});a.equal(g.radioStrikes.length,1);
 g.time=1.2;g.updateEvolutionCombat();a.equal(g.radioFireZones[0].radius,158);near(g.radioFireZones[0].until-g.time,3.5);
});
test('an evolved drone circles its commander, shoots the nearest visible enemy and sweeps a piercing laser on a cooldown',()=>{
 const g=scene(),u=actor(g,'drone'),c=g.addUnit(0,'leader',1000,6100),behind=enemy(g,970,6000),a1=enemy(g,1120),a2=enemy(g,1220),off=enemy(g,1130,6150);
 const firstPoint=g.dronePatrolPoint(u,c);g.time=.3;a.notDeepEqual(g.dronePatrolPoint(u,c),firstPoint);
 a.equal(g.droneTarget(u,330),behind);behind.hp=0;a.equal(g.droneTarget(u,330),a1);
 const b=g.fireUnitProjectiles(u,a1,{damage:10},g.stats(u))[0];a.equal(b.rosterKind,'droneBullet');a.equal(b.target,a1);
 const until=g.rosterLasers[0].until;g.time=until;g.updateEvolutionCombat();a.ok(a1.hp<a1.maxHp&&a2.hp<a2.maxHp);a.equal(off.hp,off.maxHp);
 g.fireUnitProjectiles(u,a1,{damage:10},g.stats(u));a.equal(g.rosterLasers.length,0);g.time=u.nextDroneLaserAt;g.fireUnitProjectiles(u,a1,{damage:10},g.stats(u));a.equal(g.rosterLasers.length,1);
});
test('siege explosions extend forward at .15/.30 seconds and never hit an enemy twice',()=>{
 const g=scene(),u=actor(g,'tank'),first=enemy(g,1200),overlap=enemy(g,1280),second=enemy(g,1305),third=enemy(g,1430),hits=[];g.damage=(t,d)=>hits.push([t.id,d]);
 const b=g.fireUnitProjectiles(u,first,{damage:100},g.stats(u))[0];g.impact(b);g.time=.149;g.updateEvolutionCombat();a.equal(hits.length,2);g.time=.15;g.updateEvolutionCombat();a.ok(hits.some(([id])=>id===second.id));g.time=.3;g.updateEvolutionCombat();a.ok(hits.some(([id])=>id===third.id));a.equal(new Set(hits.map(([id])=>id)).size,hits.length);a.equal(hits.filter(([id])=>id===overlap.id).length,1);
});
test('evolved allied bazookas lay a stronger, wider three-block minefield and retain critical damage',()=>{
 const g=scene(),u=actor(g,'rocket'),t=enemy(g);const mines=g.fireUnitProjectiles(u,t,{damage:100,critical:true},g.stats(u));
 a.equal(mines.length,3);a.ok(mines.every(m=>m.evolved&&m.critical));a.equal(g.shots.length,0);
 const other=scene(),rookie=other.addUnit(0,'rocket',1000,6000),baseline=other.fireUnitProjectiles(rookie,enemy(other),{damage:100},other.stats(rookie));
 a.equal(baseline.length,2);a.ok(mines[0].radius>baseline[0].radius&&mines[0].damage>baseline[0].damage);
});
test('evolved mortar releases two 70% shells with one-second flights and .25-second launch spacing',()=>{
 const g=scene(),u=actor(g,'mortar'),t=enemy(g,1400);g.launchMortar(u,t,{damage:100});a.equal(g.mortarShells[0].damage,70);a.equal(g.mortarShells[0].landAt,1);
 t.x=1800;g.time=.249;g.updateEvolutionCombat();a.equal(g.mortarShells.length,1);g.time=.25;g.updateEvolutionCombat();a.equal(g.mortarShells.length,2);a.deepEqual(g.mortarShells.map(p=>[p.x,p.delay,p.landAt,p.damage]),[[1400,1,1,70],[1400,1,1.25,70]]);
});
test('ordinary and hostile weapons retain one bullet, one two-second mortar shell, and original roulette odds',()=>{
 for(const team of [0,1,2]){const g=scene(),t=enemy(g);for(const type of team?['rifle','guntruck']:['machinegun']){const u=g.addUnit(team,type,1000,6000);if(team)g.evolved[type]=true;const bullets=g.fireUnitProjectiles(u,t,{damage:100},g.stats(u));a.equal(bullets.length,1);a.equal(bullets[0].evoStyle,undefined);a.equal(bullets[0].target,t);}const m=g.addUnit(team,'mortar',1000,6000);g.launchMortar(m,t,{damage:100});a.equal(g.mortarShells[0].delay,2);}
 const g=scene(),u=g.addUnit(0,'lucky',1000,6000);a.deepEqual(g.luckyOdds(u),LUCKY.normal);
});
test('boss-killer odds consume only blank probability, preserve 777, and require an evolved owner and reachable boss',()=>{
 for(const coop of [false,true]){const g=scene(coop),u=actor(g,'lucky',1000,6000,coop?1:0),b=enemy(g,1300,6000,'tank');b.boss=true;
  const odds=g.luckyOdds(u);near(odds.bossKiller,.08);near(odds.blank,.22);a.equal(odds.missiles,LUCKY.evolved.missiles);near(Object.values(odds).reduce((s,v)=>s+v,0),1);
  if(coop){const other=g.addUnit(0,'lucky',1000,6000);a.equal(g.luckyOdds(other).bossKiller,undefined);}
  b.x=1600;a.equal(g.luckyOdds(u).bossKiller,undefined);b.x=1300;b.boss=false;a.equal(g.luckyOdds(u).bossKiller,undefined);
 }
 const g=scene(),u=actor(g,'lucky');u.star=3;enemy(g,1300,6000,'tank').boss=true;const odds=g.luckyOdds(u);near(odds.bossKiller,.03);a.equal(odds.blank,0);a.equal(odds.missiles,.14);
});
test('boss-killer is a separate single-boss projectile, uses existing Lucky scale, and falls back if the boss leaves',()=>{
 const g=scene(),u=actor(g,'lucky'),boss=enemy(g,1300,6000,'tank');boss.boss=true;const crowd=enemy(g,1301,6000),hp=crowd.hp;
 g.castLucky(u,'bossKiller');a.equal(g.shots.length,1);const b=g.shots[0];a.equal(b.kind,'bossKiller');near(b.damage,5000*g.luckyScale(u));const before=boss.hp;g.impact(b);a.ok(boss.hp<before);a.equal(crowd.hp,hp);a.equal(g.luckySalvos.length,0);
 boss.hp=0;g.random=()=>.99;g.castLucky(u,'bossKiller');a.equal(g.shots.length,1);a.equal(g.luckySalvos.length,0);
});
test('boss-killer ignores 65% of boss defense through ordinary damage handling in solo and co-op',()=>{
 for(const coop of [false,true])for(const star of [1,3])for(const type of ['rifle','tank','crimsonAce']){
  const g=scene(coop),owner=coop?1:0,u=actor(g,'lucky',1000,6000,owner),boss=enemy(g,1300,6000,type);u.star=star;boss.boss=true;
  if(coop)g.withOwner(owner,()=>{g.tech[0].lucky=4;g.abilities.damage=2;});else{g.tech[0].lucky=4;g.abilities.damage=2;}
  const scale=coop?g.withOwner(owner,()=>g.luckyScale(u)):g.luckyScale(u),defense=g.stats(boss).defense;
  const before=boss.hp;g.castLucky(u,'bossKiller');const missile=g.shots.at(-1);near(missile.damage,5000*scale);g.impact(missile);
  near(before-boss.hp,5000*scale*100/(100+defense*.35));near(g.defenseFactor(boss,u),100/(100+defense));
  a.equal(missile.source,u);a.ok(g.effects.some(e=>e.kind==='hit'));
  const ordinary=g.addUnit(0,'machinegun',1000,6000),hp=boss.hp;g.impact(g.fireUnitProjectiles(ordinary,boss,{damage:100},g.stats(ordinary))[0]);
  near(hp-boss.hp,100*(type==='rifle'?1:.8)*100/(100+defense));
  g.castLucky(u,'missiles');a.equal(g.luckySalvos.at(-1).remaining,7);near(g.luckySalvos.at(-1).damage,700*scale);
 }
});
test('boss-killer preserves boss invulnerability, groggy multipliers and ordinary kill rewards',()=>{
 const g=scene(),u=actor(g,'lucky'),boss=enemy(g,1300,6000,'hornet');boss.boss=true;g.castLucky(u,'bossKiller');const b=g.shots[0],hp=boss.hp;
 boss.bossPattern='venomDive';boss.bossAction={phase:'high'};g.impact(b);a.equal(boss.hp,hp);
 boss.bossAction=null;boss.groggyUntil=10;const rules=g.bossPatternRules;g.bossPatternRules=t=>t===boss?{vulnerable:1.5}:rules.call(g,t);
 g.impact(b);near(hp-boss.hp,b.damage*100/(100+g.stats(boss).defense*.35)*1.5);
 boss.hp=1;const kills=g.kills,rewards=g.bossState.rewards;g.impact(b);a.equal(boss.hp,0);a.equal(g.kills,kills+1);a.equal(g.bossState.rewards,rewards+1);a.ok(g.effects.some(e=>e.kind==='burst'));
});
test('saved delayed attacks and siege groups restore exact source references, hit history and coop ownership',()=>{
 const g=scene(true),u=actor(g,'guntruck',1000,6000,1),t=enemy(g);g.diceFace=()=>5;g.fireUnitProjectiles(u,t,{damage:100},g.stats(u));const tank=actor(g,'tank',1000,6200,1),q=enemy(g,1200,6200);g.impact(g.fireUnitProjectiles(tank,q,{damage:100},g.stats(tank))[0]);
 const restored=unpack(scene(true),pack(g));const pending=restored.radioStrikes[0];a.equal(pending.source,restored.units.find(v=>v.id===u.id));a.equal(pending.source.coopOwner,1);a.ok(restored.evolutionBlasts[0].hitIds.includes(q.id));restored.time=.3;restored.updateEvolutionCombat();a.equal(restored.evolutionAttacks.length,0);
 const old=pack(scene());
 for(const key of ['evolutionAttacks','evolutionBlasts','radioStrikes','radioFireZones','rosterLasers'])delete old.fields[key];
 restored.rosterLasers=[{source:u}];unpack(restored,old);
 for(const key of ['evolutionAttacks','evolutionBlasts','radioStrikes','radioFireZones','rosterLasers'])a.deepEqual(restored[key],[]);
 a.equal(restored.rosterDice,undefined);
});
