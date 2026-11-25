'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,ROSTER}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.type==='leader');g.obstacles=[];g.structures=[];g.defenses=[];g.buildings=[];g.effects=[];g.mission.stage=3;g.visible=g.lineClear=()=>true;return g;}
function actor(g,type,owner=0){const create=()=>{g.evolved[type]=true;return g.addUnit(0,type,1000,6000);};return g.coop?g.withOwner(owner,create):create();}
function enemy(g,type='ant',x=1200){const t=g.addUnit(2,type,x,6000);t.hp=t.maxHp=1e6;return t;}
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-6,x+' != '+y);


function mineImpact(g,u,t){
 const m=g.fireUnitProjectiles(u,t,{damage:100},g.stats(u))[0];
 const b={source:u,target:t,mine:{...m,x:t.x,y:t.y},team:0,kind:'blockMineImpact',damage:m.damage,splash:m.radius};
 g.impact(b);return b;
}

test('seventeen distinct links include the three radio partnerships',()=>{
 const g=scene();for(const t of ROSTER)actor(g,t);
 const links=g.evolutionLinks();
 a.deepEqual(links.filter(l=>l.types.includes('guntruck')).map(l=>l.types.find(t=>t!=='guntruck')).sort(),['lucky','mortar','sniper']);
 a.equal(links.length,17);
 a.equal(links.filter(l=>l.active).length,17);
 a.equal(new Set(links.map(l=>[...l.types].sort().join('/'))).size,17);
 for(const t of ROSTER){
  const n=links.filter(l=>l.types.includes(t)).length;
  a.ok(n>=3&&n<=5,t+': '+n);
 }
 a.ok(links.every(l=>l.detail.length>10));
});
test('crossfire shortens the shotgun reload only during allied gunner overheat',()=>{
 const g=scene(true),r=actor(g,'rifle',0),foreign=actor(g,'machinegun',1);
 const reload=g.shotgunReloadTime(r);
 foreign.overheatUntil=20;
 near(g.shotgunReloadTime(r),reload);
 const own=actor(g,'machinegun',0);
 near(g.shotgunReloadTime(r),reload);
 own.overheatUntil=4;
 near(g.shotgunReloadTime(r),reload*.75);
 g.time=4;
 near(g.shotgunReloadTime(r),reload);
});
test('shotgun pursuit increases hits on targets with a live sniper mark',()=>{
 const g=scene(),r=actor(g,'rifle'),s=actor(g,'sniper'),target=enemy(g),other=enemy(g,'ant',1100);
 g.damage(target,1,s);
 const factor=100*g.defenseFactor(target,r);
 let hp=target.hp;g.damage(target,100,r);near(hp-target.hp,factor*1.15);
 hp=other.hp;g.damage(other,100,r);near(hp-other.hp,factor);
 g.time=4;hp=target.hp;g.damage(target,100,r);near(hp-target.hp,factor);
});
test('shotgun healing strengthens all four shots of the next magazine exactly once',()=>{
 const g=scene(true),r=actor(g,'rifle',0),own=actor(g,'medic',0),other=actor(g,'medic',1);
 r.shotgunRounds=2;r.hp=100;r.maxHp=1000;
 g.heal(r,50,other);
 a.equal(g.shotgunShotMultiplier(r),1);
 a.equal(r.shotgunBoostPending,undefined);
 g.heal(r,50,own);
 a.equal(g.shotgunShotMultiplier(r),1);
 for(const rounds of [4,3,2,1]){
  r.shotgunRounds=rounds;
  a.equal(g.shotgunShotMultiplier(r),1.15);
 }
 r.shotgunRounds=4;
 a.equal(g.shotgunShotMultiplier(r),1);
 r.hp=r.maxHp;
 a.equal(g.heal(r,50,own),0);
 a.equal(r.shotgunBoostPending,undefined);
});
test('real 777 and Boss Killer rewards charge the same owner once per draw and stop at two codes',()=>{
 const g=scene(true),l=actor(g,'lucky',0),d=actor(g,'guntruck',0),other=actor(g,'guntruck',1);
 g.random=()=>0;
 a.equal(g.diceFace(d),1);
 g.castLucky(l,'missiles');
 a.equal(g.luckySalvos.at(-1).waiting,true);
 a.equal(g.linkState().radioNukeCodes,1);
 g.castLucky(l,'missiles');
 a.equal(g.linkState().radioNukeCodes,1);
 a.equal(g.diceFace(d),1);
 a.equal(g.diceFace(other),1);
 const saved=unpack(scene(true),JSON.parse(JSON.stringify(pack(g))));
 a.equal(saved.linkState().radioNukeCodes,1);
 a.equal(saved.linkState(1).radioNukeCodes,undefined);
 g.time=5;
 a.equal(g.diceFace(d),1);
 g.random=()=>.99;
 g.castLucky(l,'bossKiller');
 a.equal(g.linkState().radioNukeCodes,1);
 const t=enemy(g,'stagBeetle');t.boss=true;
 g.castLucky(l,'bossKiller');
 a.equal(g.shots.at(-1).kind,'bossKiller');
 a.equal(g.linkState().radioNukeCodes,2);
 g.time=10;g.castLucky(l,'missiles');
 a.equal(g.linkState().radioNukeCodes,2);
});
test('precision coordinates prioritize a marked boss over manual aim and boost every marked enemy caught in the blast',()=>{
 const g=scene(),radio=actor(g,'guntruck'),sniper=actor(g,'sniper'),target=enemy(g),other=enemy(g,'ant',1230);
 const collateral=enemy(g,'ant',1175),boss=enemy(g,'ant',1255);boss.boss=true;
 g.damage(target,5,sniper);g.damage(collateral,5,sniper);g.damage(boss,5,sniper);
 g.diceFace=()=>6;
 g.fireUnitProjectiles(radio,g.commandFirePoint(radio,600,Math.PI),{damage:100});
 const shell=g.radioStrikes[0];a.equal(shell.x,boss.x);a.ok(shell.precise);
 const hp=target.hp,otherHp=other.hp,before=collateral.hp;g.time=shell.landAt;g.updateEvolutionCombat();
 near(hp-target.hp,(otherHp-other.hp)*1.2);near(before-collateral.hp,hp-target.hp);
});
test('mortar landings gain both radius and damage only in their own active radio fire zone',()=>{
 const g=scene(true),radio=actor(g,'guntruck',0),m=actor(g,'mortar',0),other=actor(g,'guntruck',1);
 const target=enemy(g),edge=enemy(g,'ant',1311);
 const shell={source:m,team:0,x:target.x,y:target.y,radius:100,damage:100,landAt:0};
 function land(){g.mortarShells.push({...shell});const before=target.hp;g.updateMortars();return before-target.hp;}
 const base=land();a.ok(base>0);a.equal(edge.hp,edge.maxHp);
 const zone={source:other,x:shell.x,y:shell.y,radius:80,until:3.5};
 g.radioFireZones=[zone];near(land(),base);a.equal(edge.hp,edge.maxHp);
 zone.source=radio;near(land(),base*1.15);a.ok(edge.hp<edge.maxHp);
 zone.x+=100;near(land(),base);zone.x=shell.x;g.time=3.5;near(land(),base);
});
test('drone laser prioritizes the observed target, increases damage and honors mark expiration',()=>{
 const g=scene(),drone=actor(g,'drone'),s=actor(g,'sniper'),marked=enemy(g),nearest=enemy(g,'ant',1090);
 a.equal(g.droneTarget(drone,500),nearest);
 g.damage(marked,1,s);
 a.equal(g.droneTarget(drone,500),nearest);
 a.equal(g.droneLaserTarget(drone,500,nearest),marked);
 near(g.droneLaserDamage(drone,marked,100),120);
 near(g.droneLaserDamage(drone,nearest,100),100);
 g.time=4;
 a.equal(g.droneTarget(drone,500),nearest);
 near(g.droneLaserDamage(drone,marked,100),100);
});
test('drone and Retona shorten their independent cycle timers while the linked partner qualifies',()=>{
 const g=scene(),drone=actor(g,'drone'),lucky=actor(g,'lucky'),mg=actor(g,'machinegun');
 lucky.star=2;
 near(g.droneLaserPeriod(drone),6);
 near(g.luckyRouletteInterval(lucky),3.5);
 g.updateLuckyUnit(lucky);
 a.deepEqual(lucky.luckyChannels.map(slot=>slot.next),[3.5,3.5,3.5]);
 mg.overheatUntil=2;
 near(g.droneLaserPeriod(drone),4.8);
 g.time=3.5;
 near(g.droneLaserPeriod(drone),6);
 g.updateLuckyUnit(lucky);
 a.deepEqual(lucky.luckyChannels.map(slot=>slot.roll.startedAt),[3.5,3.5,3.5]);
 a.deepEqual(lucky.luckyChannels.map(slot=>slot.next),[7,7,7]);
 drone.hp=0;
 g.updateLuckyUnit(lucky);
 near(g.luckyRouletteInterval(lucky),4);
 a.deepEqual(lucky.luckyChannels.map(slot=>slot.next),[7.5,7.5,7.5]);
});
test('actual medic healing braces an evolved gunner for two seconds but healing a healthy patient does not',()=>{
 const g=scene(),m=actor(g,'machinegun'),medic=actor(g,'medic'),t=enemy(g);m.hp=100;m.maxHp=1000;g.heal(m,50,medic);near(m.linkBracedUntil,2);let hp=m.hp;g.damage(m,100,t);near(hp-m.hp,88*g.defenseFactor(m,t));g.time=2;hp=m.hp;g.damage(m,10,t);near(hp-m.hp,10*g.defenseFactor(m,t));m.hp=m.maxHp;m.linkBracedUntil=0;a.equal(g.heal(m,50,medic),0);a.equal(m.linkBracedUntil,0);
});
test('field repair increases actual medic tank healing while preserving heal caps, debuffs and source ownership',()=>{
 const g=scene(true),tank=actor(g,'tank',0),medic=actor(g,'medic',0),other=actor(g,'medic',1);tank.hp=100;tank.maxHp=1000;near(g.heal(tank,100,other),100);near(g.heal(tank,100,medic),115*.6);tank.healingReductionUntil=10;near(g.heal(tank,100,medic),57.5*.6);tank.healingReductionUntil=0;tank.hp=990;near(g.heal(tank,100,medic),10);
});
test('Lucky and rocket add one delayed bounded explosion, share its cooldown and never recursively trigger it',()=>{
 const g=scene(),l=actor(g,'lucky'),r=actor(g,'rocket'),t=enemy(g);g.damage(t,1,l);const b=mineImpact(g,r,t);a.equal(b.linkApplied,'volatile');a.equal(g.evolutionLinkState.bursts.length,1);mineImpact(g,r,t);a.equal(g.evolutionLinkState.bursts.length,1);g.time=.19;g.updateEvolutionCombat();const hp=t.hp;a.equal(g.effects.filter(e=>e.style==='linkVolatile').length,0);g.time=.2;g.updateEvolutionCombat();near(hp-t.hp,b.damage*.2*.5*g.defenseFactor(t,r));a.equal(g.evolutionLinkState.bursts.length,0);a.equal(g.effects.filter(e=>e.style==='linkVolatile').length,1);g.time=.21;g.updateEvolutionCombat();a.equal(g.effects.filter(e=>e.style==='linkVolatile').length,1);
});
test('one rocket cannot activate breach and volatile together and an immune impact does not queue an explosion',()=>{
 const g=scene(),l=actor(g,'lucky'),r=actor(g,'rocket'),tank=actor(g,'tank'),t=enemy(g);g.damage(t,1,l);g.damage(t,1,tank);const b=mineImpact(g,r,t);a.equal(b.linkApplied,'breach');a.equal(g.evolutionLinkState.bursts.length,0);
 const boss=enemy(g,'hornet');boss.boss=true;g.damage(boss,1,l);boss.bossPattern='venomDive';boss.bossAction={phase:'high'};mineImpact(g,r,boss);a.equal(g.evolutionLinkState.bursts.length,0);
});
test('new links never borrow a cooperative partner and a saved delayed blast keeps its source and owner',()=>{
 const g=scene(true),r=actor(g,'sniper',0);actor(g,'guntruck',1);a.equal(g.hasEvolutionLink(r,'radioPrecision'),false);
 const l=actor(g,'lucky',1),rocket=actor(g,'rocket',1),t=enemy(g);g.damage(t,1,l);g.withOwner(1,()=>mineImpact(g,rocket,t));const restored=unpack(scene(true),JSON.parse(JSON.stringify(pack(g)))),burst=restored.evolutionLinkState.bursts[0];a.equal(burst.owner,1);a.equal(burst.source,restored.units.find(u=>u.id===rocket.id));restored.phase='paused';restored.update(.05);a.equal(restored.time,0);a.equal(restored.evolutionLinkState.bursts.length,1);restored.time=.2;restored.updateEvolutionCombat();a.equal(restored.evolutionLinkState.bursts.length,0);a.ok(restored.effects.some(e=>e.style==='linkVolatile'));
});
