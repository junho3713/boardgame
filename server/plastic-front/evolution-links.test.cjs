'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.type==='leader');g.obstacles=[];g.structures=[];g.defenses=[];g.buildings=[];g.effects=[];g.mission.stage=3;g.visible=g.lineClear=()=>true;return g;}
function actor(g,type,owner=0){const spawn=()=>{g.evolved[type]=true;return g.addUnit(0,type,1000,6000);};return g.coop?g.withOwner(owner,spawn):spawn();}
function enemy(g,type='ant',x=1200){const t=g.addUnit(2,type,x,6000);t.hp=t.maxHp=1e6;return t;}
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-6,x+' != '+y);

test('links require two living evolved types and do not combine different cooperative owners',()=>{
 const g=scene(true),s=actor(g,'sniper',0),m=actor(g,'mortar',1);a.equal(g.hasEvolutionLink(s,'precision'),false);a.equal(g.hasEvolutionLink(m,'precision'),false);
 const own=actor(g,'mortar',0);a.equal(g.hasEvolutionLink(s,'precision'),true);own.hp=0;a.equal(g.hasEvolutionLink(s,'precision'),false);own.hp=1;g.evolved.mortar=false;a.equal(g.hasEvolutionLink(s,'precision'),false);
});
test('precision marks expire, honor range and make both normal evolved mortar shells arrive in .65 seconds',()=>{
 const g=scene(),s=actor(g,'sniper'),m=actor(g,'mortar'),t=enemy(g),other=enemy(g,'ant',1250);g.damage(t,100,s);a.equal(g.selectCombatTarget(m,[other,t],new Set()),t);g.launchMortar(m,t,{damage:100});near(g.mortarShells[0].delay,.65);near(g.mortarShells[0].damage,70);
 g.time=.25;g.updateEvolutionCombat();near(g.mortarShells[1].landAt,.9);g.time=4;a.equal(g.linkMarked(t,m,'snipe'),false);g.launchMortar(m,t,{damage:100});near(g.mortarShells.at(-1).delay,1);
 t.x=3000;g.linkMark(t,s,'snipe');a.notEqual(g.selectCombatTarget(m,[other,t],new Set()),t);
});
test('hunter guides existing roulette missiles to marks without adding launches or changing odds',()=>{
 const g=scene(),s=actor(g,'sniper'),u=actor(g,'lucky'),t=enemy(g),other=enemy(g,'ant',1100),odds={...g.luckyOdds(u)};g.damage(t,100,s);a.equal(g.luckyMissileTarget(u).target,t);const hp=t.hp;g.damage(t,100,u);near(hp-t.hp,110*g.defenseFactor(t,u));g.castLucky(u,'missiles');a.equal(g.luckySalvos.at(-1).remaining,7);a.deepEqual(g.luckyOdds(u),odds);a.equal(other.hp,1e6);
});
test('mortar/tank and tank/rocket each share one six-second proc across all copies',()=>{
 const g=scene(),m=actor(g,'mortar'),tank=actor(g,'tank'),rocket=actor(g,'rocket'),t=enemy(g);g.damage(t,1,m);
 const first=g.fireUnitProjectiles(tank,t,{damage:100},g.stats(tank))[0];g.impact(first);near(first.damage,115);a.equal(first.linkApplied,'barrage');const copy=actor(g,'tank'),second=g.fireUnitProjectiles(copy,t,{damage:100},g.stats(copy))[0];g.impact(second);near(second.damage,100);
 const b=g.fireUnitProjectiles(rocket,t,{damage:100},g.stats(rocket))[0];g.impact(b);near(b.damage,120);a.equal(b.linkApplied,'breach');const next=g.fireUnitProjectiles(rocket,t,{damage:100},g.stats(rocket))[0];g.impact(next);near(next.damage,100);
 g.time=6;g.damage(t,1,m);const retry=g.fireUnitProjectiles(tank,t,{damage:100},g.stats(tank))[0];g.impact(retry);near(retry.damage,115);
});
test('overheated suppressive fire slows only normal enemies and expands one rocket without multiplying damage',()=>{
 const g=scene(),mg=actor(g,'machinegun'),r=actor(g,'rocket'),t=enemy(g),boss=enemy(g,'rhinoBeetle',1250);boss.boss=true;mg.overheatUntil=4;const speed=g.stats(t).speed,bossSpeed=g.stats(boss).speed;g.damage(t,1,mg);g.damage(boss,1,mg);near(g.stats(t).speed,speed*.85);near(g.stats(boss).speed,bossSpeed);
 const b=g.fireUnitProjectiles(r,t,{damage:100},g.stats(r))[0],radius=b.splash;g.impact(b);near(b.splash,radius*1.2);near(b.damage,100);g.time=2;near(g.stats(t).speed,speed);
});
test('immune boss impacts do not make marks, consume link cooldowns or bypass vulnerability rules',()=>{
 const g=scene(),s=actor(g,'sniper'),m=actor(g,'mortar'),tank=actor(g,'tank'),t=enemy(g,'hornet');t.boss=true;t.bossPattern='venomDive';t.bossAction={phase:'high'};g.damage(t,100,s);a.equal(t.evolutionLinkMarks,undefined);g.linkMark(t,m,'bombard');const b=g.fireUnitProjectiles(tank,t,{damage:100},g.stats(tank))[0];g.impact(b);a.equal(g.linkState().ready.barrage,undefined);a.equal(t.hp,1e6);
});
test('saved link marks, cooldowns and marked delayed mortar shots preserve owner and simulation timing',()=>{
 const g=scene(true),s=actor(g,'sniper',1),m=actor(g,'mortar',1),t=enemy(g);g.damage(t,100,s);g.withOwner(1,()=>g.launchMortar(m,t,{damage:100}));g.linkState(1).ready.barrage=8;const restored=unpack(scene(true),JSON.parse(JSON.stringify(pack(g))));const pending=restored.evolutionAttacks[0];a.equal(pending.attack.linkPrecision,true);a.equal(pending.source.coopOwner,1);a.equal(restored.linkState(1).ready.barrage,8);restored.time=.25;restored.updateEvolutionCombat();near(restored.mortarShells[1].delay,.65);a.equal(restored.linkMarked(restored.units.find(u=>u.id===t.id),restored.units.find(u=>u.id===m.id),'snipe'),true);
 const old=pack(scene());delete old.fields.evolutionLinkState;unpack(restored,old);a.deepEqual(restored.evolutionLinkState,{owners:[]});
});
test('obtaining evolution links keeps the same time-based enemy wave plan',()=>{
 const g=scene(),before=[];for(const time of [120,300,600,900]){g.time=time;before.push(g.roomWavePlan());}for(const type of ['sniper','mortar','tank','rocket','machinegun','lucky'])actor(g,type);for(const [i,time]of [120,300,600,900].entries()){g.time=time;a.deepEqual(g.roomWavePlan(),before[i]);}a.equal(g.evolutionLinks().filter(l=>l.active).length,5);
});
