'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,ROSTER}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.type==='leader');g.obstacles=[];g.structures=[];g.defenses=[];g.buildings=[];g.effects=[];g.mission.stage=3;g.visible=g.lineClear=()=>true;return g;}
function actor(g,type,owner=0){const create=()=>{g.evolved[type]=true;return g.addUnit(0,type,1000,6000);};return g.coop?g.withOwner(owner,create):create();}
function enemy(g,type='ant',x=1200){const t=g.addUnit(2,type,x,6000);t.hp=t.maxHp=1e6;return t;}
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-6,x+' != '+y);

test('thirteen distinct links give every regular class two or three partners, including rifle, medic and truck',()=>{
 const g=scene();for(const t of ROSTER)actor(g,t);const links=g.evolutionLinks();a.equal(links.length,13);a.equal(links.filter(l=>l.active).length,13);a.equal(new Set(links.map(l=>[...l.types].sort().join('/'))).size,13);for(const t of ROSTER){const n=links.filter(l=>l.types.includes(t)).length;a.ok(n>=2&&n<=3,t+': '+n);}a.ok(links.every(l=>l.detail.length>10));
});
test('crossfire requires a hit from the other evolved weapon and its damage bonus expires after two seconds',()=>{
 const g=scene(),r=actor(g,'rifle'),m=actor(g,'machinegun'),t=enemy(g);const d=100*g.defenseFactor(t,r);let hp=t.hp;g.damage(t,100,r);near(hp-t.hp,d);hp=t.hp;g.damage(t,100,m);near(hp-t.hp,d*1.1);hp=t.hp;g.damage(t,100,r);near(hp-t.hp,d*1.1);g.time=2;hp=t.hp;g.damage(t,100,m);near(hp-t.hp,d);a.ok(g.effects.some(e=>e.kind==='evolutionLink'&&e.link==='crossfire'));
});
test('rifles follow a reachable sniper mark and pursuit plus crossfire never multiplies damage twice',()=>{
 const g=scene(),r=actor(g,'rifle'),m=actor(g,'machinegun'),s=actor(g,'sniper'),t=enemy(g),nearby=enemy(g,'ant',1100);g.damage(t,1,s);a.equal(g.selectCombatTarget(r,[nearby,t],new Set()),t);g.damage(t,1,m);const hp=t.hp;g.damage(t,100,r);near(hp-t.hp,110*g.defenseFactor(t,r));g.time=4;a.equal(g.linkMarked(t,r,'snipe'),false);t.x=2000;g.linkMark(t,s,'snipe');a.notEqual(g.selectCombatTarget(r,[nearby,t],new Set()),t);
});
test('truck links provide bounded nearby movement and range benefits without accelerating medic treatment',()=>{
 const g=scene(),r=actor(g,'rifle'),m=actor(g,'mortar'),medic=actor(g,'medic'),base=[r,m,medic].map(u=>g.stats(u)),truck=actor(g,'guntruck');
 near(g.stats(r).speed,base[0].speed*1.12);near(g.stats(m).speed,base[1].speed*1.15);near(g.stats(m).minRange,base[1].minRange-20);near(g.stats(medic).speed,base[2].speed*1.15);near(g.stats(medic).range,base[2].range+35);near(g.stats(medic).rate,1);near(g.stats(medic).heal,base[2].heal);
 truck.x=2000;for(const [i,u]of [r,m,medic].entries())near(g.stats(u).speed,base[i].speed);truck.x=1000;truck.hp=0;near(g.stats(medic).range,base[2].range);
});
test('actual medic healing braces an evolved gunner for two seconds but healing a healthy patient does not',()=>{
 const g=scene(),m=actor(g,'machinegun'),medic=actor(g,'medic'),t=enemy(g);m.hp=100;m.maxHp=1000;g.heal(m,50,medic);near(m.linkBracedUntil,2);let hp=m.hp;g.damage(m,100,t);near(hp-m.hp,88*g.defenseFactor(m,t));g.time=2;hp=m.hp;g.damage(m,10,t);near(hp-m.hp,10*g.defenseFactor(m,t));m.hp=m.maxHp;m.linkBracedUntil=0;a.equal(g.heal(m,50,medic),0);a.equal(m.linkBracedUntil,0);
});
test('field repair increases actual medic tank healing while preserving heal caps, debuffs and source ownership',()=>{
 const g=scene(true),tank=actor(g,'tank',0),medic=actor(g,'medic',0),other=actor(g,'medic',1);tank.hp=100;tank.maxHp=1000;near(g.heal(tank,100,other),100);near(g.heal(tank,100,medic),115*.6);tank.healingReductionUntil=10;near(g.heal(tank,100,medic),57.5*.6);tank.healingReductionUntil=0;tank.hp=990;near(g.heal(tank,100,medic),10);
});
test('Lucky and rocket add one delayed bounded explosion, share its cooldown and never recursively trigger it',()=>{
 const g=scene(),l=actor(g,'lucky'),r=actor(g,'rocket'),t=enemy(g);g.damage(t,1,l);const b=g.fireUnitProjectiles(r,t,{damage:100},g.stats(r))[0];g.impact(b);a.equal(b.linkApplied,'volatile');a.equal(g.evolutionLinkState.bursts.length,1);const next=g.fireUnitProjectiles(r,t,{damage:100},g.stats(r))[0];g.impact(next);a.equal(g.evolutionLinkState.bursts.length,1);g.time=.19;g.updateEvolutionCombat();const hp=t.hp;a.equal(g.effects.filter(e=>e.style==='linkVolatile').length,0);g.time=.2;g.updateEvolutionCombat();near(hp-t.hp,10*g.defenseFactor(t,r));a.equal(g.evolutionLinkState.bursts.length,0);a.equal(g.effects.filter(e=>e.style==='linkVolatile').length,1);g.time=.21;g.updateEvolutionCombat();a.equal(g.effects.filter(e=>e.style==='linkVolatile').length,1);
});
test('one rocket cannot activate breach and volatile together and an immune impact does not queue an explosion',()=>{
 const g=scene(),l=actor(g,'lucky'),r=actor(g,'rocket'),tank=actor(g,'tank'),t=enemy(g);g.damage(t,1,l);g.damage(t,1,tank);const b=g.fireUnitProjectiles(r,t,{damage:100},g.stats(r))[0];g.impact(b);a.equal(b.linkApplied,'breach');a.equal(g.evolutionLinkState.bursts.length,0);
 const boss=enemy(g,'hornet');boss.boss=true;g.damage(boss,1,l);boss.bossPattern='venomDive';boss.bossAction={phase:'high'};g.impact(g.fireUnitProjectiles(r,boss,{damage:100},g.stats(r))[0]);a.equal(g.evolutionLinkState.bursts.length,0);
});
test('new links never borrow a cooperative partner and a saved delayed blast keeps its source and owner',()=>{
 const g=scene(true),r=actor(g,'rifle',0),truck=actor(g,'guntruck',1);a.equal(g.hasEvolutionLink(r,'escort'),false);const base=g.stats(r).speed;a.equal(g.stats(r).speed,base);
 const l=actor(g,'lucky',1),rocket=actor(g,'rocket',1),t=enemy(g);g.damage(t,1,l);g.withOwner(1,()=>g.impact(g.fireUnitProjectiles(rocket,t,{damage:100},g.stats(rocket))[0]));const restored=unpack(scene(true),JSON.parse(JSON.stringify(pack(g)))),burst=restored.evolutionLinkState.bursts[0];a.equal(burst.owner,1);a.equal(burst.source,restored.units.find(u=>u.id===rocket.id));restored.phase='paused';restored.update(.05);a.equal(restored.time,0);a.equal(restored.evolutionLinkState.bursts.length,1);restored.time=.2;restored.updateEvolutionCombat();a.equal(restored.evolutionLinkState.bursts.length,0);a.ok(restored.effects.some(e=>e.style==='linkVolatile'));
});
