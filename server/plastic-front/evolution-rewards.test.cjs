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
test('evolved rifle fires a timed 40/40/60% burst, and death cancels unlaunched follow-ups',()=>{
 const g=scene(),u=actor(g,'rifle'),t=enemy(g);g.fireUnitProjectiles(u,t,{damage:100},g.stats(u));a.equal(g.shots.length,1);a.equal(g.shots[0].damage,40);
 g.time=.089;g.updateEvolutionCombat();a.equal(g.shots.length,1);g.time=.09;g.updateEvolutionCombat();a.equal(g.shots.length,2);g.time=.18;g.updateEvolutionCombat();a.deepEqual(g.shots.map(b=>b.damage),[40,40,60]);
 g.fireUnitProjectiles(u,t,{damage:100},g.stats(u));u.hp=0;g.time=1;g.updateEvolutionCombat();a.equal(g.shots.length,4);a.equal(g.evolutionAttacks.length,0);
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
test('truck ricochets to at most four distinct enemies with 100/70/50/35%, and stops without a neighbor',()=>{
 const g=scene(),u=actor(g,'guntruck'),ts=[enemy(g,1200),enemy(g,1280),enemy(g,1360),enemy(g,1440),enemy(g,1520)],hits=[];g.damage=(t,d)=>hits.push([t.id,d]);g.fireUnitProjectiles(u,ts[0],{damage:100},g.stats(u));
 for(let i=0;i<g.shots.length;i++)g.impact(g.shots[i]);a.deepEqual(hits,ts.slice(0,4).map((t,i)=>[t.id,[100,70,50,35][i]]));a.equal(g.shots.length,4);
 const solo=scene(),v=actor(solo,'guntruck'),t=enemy(solo);solo.fireUnitProjectiles(v,t,{damage:100},solo.stats(v));solo.impact(solo.shots[0]);a.equal(solo.shots.length,1);
});
test('siege explosions extend forward at .15/.30 seconds and never hit an enemy twice',()=>{
 const g=scene(),u=actor(g,'tank'),first=enemy(g,1200),overlap=enemy(g,1280),second=enemy(g,1305),third=enemy(g,1430),hits=[];g.damage=(t,d)=>hits.push([t.id,d]);
 const b=g.fireUnitProjectiles(u,first,{damage:100},g.stats(u))[0];g.impact(b);g.time=.149;g.updateEvolutionCombat();a.equal(hits.length,2);g.time=.15;g.updateEvolutionCombat();a.ok(hits.some(([id])=>id===second.id));g.time=.3;g.updateEvolutionCombat();a.ok(hits.some(([id])=>id===third.id));a.equal(new Set(hits.map(([id])=>id)).size,hits.length);a.equal(hits.filter(([id])=>id===overlap.id).length,1);
});
test('rocket splits into five fixed, outward delayed blast points after the main impact',()=>{
 const g=scene(),u=actor(g,'rocket'),t=enemy(g),b=g.fireUnitProjectiles(u,t,{damage:100},g.stats(u))[0];g.impact(b);a.equal(g.evolutionBlasts[0].points.length,5);a.ok(g.evolutionBlasts[0].points.every(p=>p.factor===.22));t.x+=400;
 g.time=1;g.updateEvolutionCombat();const effects=g.effects.filter(e=>e.kind==='evoBlast'&&e.style==='cluster');a.equal(effects.length,6);a.ok(effects.every(e=>e.x<1400));
});
test('evolved mortar releases two 70% shells with one-second flights and .25-second launch spacing',()=>{
 const g=scene(),u=actor(g,'mortar'),t=enemy(g,1400);g.launchMortar(u,t,{damage:100});a.equal(g.mortarShells[0].damage,70);a.equal(g.mortarShells[0].landAt,1);
 t.x=1800;g.time=.249;g.updateEvolutionCombat();a.equal(g.mortarShells.length,1);g.time=.25;g.updateEvolutionCombat();a.equal(g.mortarShells.length,2);a.deepEqual(g.mortarShells.map(p=>[p.x,p.delay,p.landAt,p.damage]),[[1400,1,1,70],[1400,1,1.25,70]]);
});
test('ordinary and hostile weapons retain one bullet, one two-second mortar shell, and original roulette odds',()=>{
 for(const team of [0,1,2]){const g=scene(),u=g.addUnit(team,'rifle',1000,6000),t=enemy(g);if(team)g.evolved.rifle=true;g.fireUnitProjectiles(u,t,{damage:100},g.stats(u));a.equal(g.shots.length,1);a.equal(g.shots[0].evoStyle,undefined);const m=g.addUnit(team,'mortar',1000,6000);g.launchMortar(m,t,{damage:100});a.equal(g.mortarShells[0].delay,2);}
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
 g.castLucky(u,'bossKiller');a.equal(g.shots.length,1);const b=g.shots[0];a.equal(b.kind,'bossKiller');near(b.damage,4444*g.luckyScale(u));const before=boss.hp;g.impact(b);a.ok(boss.hp<before);a.equal(crowd.hp,hp);a.equal(g.luckySalvos.length,0);
 boss.hp=0;g.random=()=>.99;g.castLucky(u,'bossKiller');a.equal(g.shots.length,1);a.equal(g.luckySalvos.length,0);
});
test('boss-killer ignores 44% of boss defense through ordinary damage handling in solo and co-op',()=>{
 for(const coop of [false,true])for(const star of [1,3])for(const type of ['rifle','tank','crimsonAce']){
  const g=scene(coop),owner=coop?1:0,u=actor(g,'lucky',1000,6000,owner),boss=enemy(g,1300,6000,type);u.star=star;boss.boss=true;
  if(coop)g.withOwner(owner,()=>{g.tech[0].lucky=4;g.abilities.damage=2;});else{g.tech[0].lucky=4;g.abilities.damage=2;}
  const scale=coop?g.withOwner(owner,()=>g.luckyScale(u)):g.luckyScale(u),defense=g.stats(boss).defense;
  const before=boss.hp;g.castLucky(u,'bossKiller');const missile=g.shots.at(-1);near(missile.damage,4444*scale);g.impact(missile);
  near(before-boss.hp,4444*scale*100/(100+defense*.56));near(g.defenseFactor(boss,u),100/(100+defense));
  a.equal(missile.source,u);a.ok(g.effects.some(e=>e.kind==='hit'));
  const ordinary=g.addUnit(0,'rifle',1000,6000),hp=boss.hp;g.impact(g.fireUnitProjectiles(ordinary,boss,{damage:100},g.stats(ordinary))[0]);
  near(hp-boss.hp,100*(type==='rifle'?1:.8)*100/(100+defense));
  g.castLucky(u,'missiles');a.equal(g.luckySalvos.at(-1).remaining,7);near(g.luckySalvos.at(-1).damage,700*scale);
 }
});
test('boss-killer preserves boss invulnerability, groggy multipliers and ordinary kill rewards',()=>{
 const g=scene(),u=actor(g,'lucky'),boss=enemy(g,1300,6000,'hornet');boss.boss=true;g.castLucky(u,'bossKiller');const b=g.shots[0],hp=boss.hp;
 boss.bossPattern='venomDive';boss.bossAction={phase:'high'};g.impact(b);a.equal(boss.hp,hp);
 boss.bossAction=null;boss.groggyUntil=10;const rules=g.bossPatternRules;g.bossPatternRules=t=>t===boss?{vulnerable:1.5}:rules.call(g,t);
 g.impact(b);near(hp-boss.hp,b.damage*100/(100+g.stats(boss).defense*.56)*1.5);
 boss.hp=1;const kills=g.kills,rewards=g.bossState.rewards;g.impact(b);a.equal(boss.hp,0);a.equal(g.kills,kills+1);a.equal(g.bossState.rewards,rewards+1);a.ok(g.effects.some(e=>e.kind==='burst'));
});
test('saved delayed attacks and siege groups restore exact source references, hit history and coop ownership',()=>{
 const g=scene(true),u=actor(g,'rifle',1000,6000,1),t=enemy(g);g.fireUnitProjectiles(u,t,{damage:100},g.stats(u));const tank=actor(g,'tank',1000,6200,1),q=enemy(g,1200,6200);g.impact(g.fireUnitProjectiles(tank,q,{damage:100},g.stats(tank))[0]);
 const restored=unpack(scene(true),pack(g));const pending=restored.evolutionAttacks[0];a.equal(pending.source,restored.units.find(v=>v.id===u.id));a.equal(pending.source.coopOwner,1);a.ok(restored.evolutionBlasts[0].hitIds.includes(q.id));restored.time=.3;restored.updateEvolutionCombat();a.equal(restored.evolutionAttacks.length,0);
 const old=pack(scene());delete old.fields.evolutionAttacks;delete old.fields.evolutionBlasts;unpack(restored,old);a.deepEqual(restored.evolutionAttacks,[]);a.deepEqual(restored.evolutionBlasts,[]);
});
