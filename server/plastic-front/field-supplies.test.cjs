'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.structures=[];g.defenses=[];g.buildings=[];g.pickups=[];g.visible=g.lineClear=()=>true;for(const u of g.units){u.x=1500+(u.coopOwner||0)*200;u.y=7000;u.cooldown=1e6;}for(const method of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck','syncEnemyGrowth','move','navigate','separateCrowd'])if(method!=='gainXP'&&method!=='levelCheck')g[method]=()=>{};return g;}
function scope(g,owner,fn){return g.coop?g.withOwner(owner,fn):fn();}
function reward(g,kind){const c=g.commander(0),p={x:c.x,y:c.y,active:true,supplyKind:kind,rareSupply:true};a.equal(g.collectFieldSupply(p),true);return p;}
function near(x,y){a.ok(Math.abs(x-y)<1e-7,x+' != '+y);}

test('supplies use 25/20/15/15 utility odds and 10/10/5 special troop odds',()=>{
 const g=scene(),counts={};for(let i=0;i<10000;i++){g.random=()=>(i+.5)/10000;const kind=g.rollSupply();counts[kind]=(counts[kind]||0)+1;}
 a.deepEqual(counts,{support:2500,medkit:2000,boost:1500,artillery:1500,special:1000,spectre:1000,titan:500});
});
test('the actual solo and cooperative collection loops award a nearby crate exactly once to its collector',()=>{
 for(const coop of [false,true]){const g=scene(coop),owner=coop?1:0,c=scope(g,owner,()=>g.commander(0));g.pickups=[{x:c.x,y:c.y,active:true,supplyKind:'artillery',rareSupply:true}];g.update(.05);a.equal(scope(g,owner,()=>g.supplyState().artillery),1);g.update(.05);a.equal(scope(g,owner,()=>g.supplyState().artillery),1);if(coop)a.equal(scope(g,0,()=>g.supplyState().artillery),0);}
});
test('400 production resources open a separate support choice without consuming a level or upgrade',()=>{
 const g=scene(),cash=g.cash[0],level=g.level,xp=g.xp,p=reward(g,'support');a.equal(g.cash[0],cash+400);a.equal(g.xp,xp+18);a.equal(g.level,level);a.equal(g.collectFieldSupply(p),false);
 g.levelCheck();a.equal(g.phase,'choice');a.equal(g.choiceKind,'supply');a.equal(g.stageChoice('rifle'),false);a.equal(g.stageChoice('support',{rifle:1}),true);a.equal(g.confirmChoice(),true);a.equal(g.cash[0],cash+400-TYPES.rifle.cost);a.equal(g.level,level);a.equal(g.xp,xp+18);a.equal(g.nextRecoveryAt,0);
 g.phase='playing';reward(g,'support');g.levelCheck();const after=g.cash[0];a.equal(g.cancelRecovery(),true);a.equal(g.phase,'playing');a.equal(g.cash[0],after);
});
test('support rewards wait behind an existing choice and survive a full roster or a cancelled purchase',()=>{
 const g=scene();g.phase='choice';g.choiceKind='boss';g.currentOptions=['fieldGold'];reward(g,'support');a.equal(g.choiceKind,'boss');a.equal(g.supplyState().pendingSupport,1);g.levelCheck();a.equal(g.choiceKind,'boss');g.phase='playing';g.levelCheck();a.equal(g.choiceKind,'supply');g.cancelRecovery();a.equal(g.supplyState().pendingSupport,0);
 const far={x:500,y:100,active:true,supplyKind:'special'};a.equal(g.collectFieldSupply(far),false);a.equal(far.active,true);
});
test('a stored medkit fully heals and cleanses living squad members once, without reviving casualties or wasting a healthy charge',()=>{
 const g=scene(),c=g.commander(0),u=g.addUnit(0,'rifle',1510,7000),dead=g.addUnit(0,'rifle',1520,7000);dead.hp=0;reward(g,'medkit');a.equal(g.useMedkit(),false);a.equal(g.supplyState().medkits,1);
 c.hp=1;u.hp=1;for(const target of [c,u])Object.assign(target,{poisonUntil:100,poisonDps:999,rootedUntil:100,healingReductionUntil:100,luckySlowUntil:100});
 a.equal(g.useMedkit(),true);a.equal(c.hp,c.maxHp);a.equal(u.hp,u.maxHp);a.equal(dead.hp,0);a.equal(g.hasCleansableStatus(c),false);a.equal(g.hasCleansableStatus(u),false);a.equal(g.useMedkit(),false);
});
test('combat boost lasts sixty simulation seconds, refreshes without stacking and keeps medic healing intervals',()=>{
 const g=scene(),c=g.commander(0),medic=g.addUnit(0,'medic',1500,7100),base=g.stats(c);reward(g,'boost');near(g.stats(c).damage,base.damage*1.3);near(g.stats(c).rate,base.rate/1.2);near(g.stats(medic).rate,1);
 g.time=30;reward(g,'boost');near(g.supplyState().boostUntil,90);near(g.stats(c).damage,base.damage*1.3);g.phase='paused';g.update(1);near(g.time,30);g.time=90;near(g.stats(c).damage,base.damage);
});
test('rare Blackbear troops use separate slots, resist fusion and pierce up to three hostile targets',()=>{
 const g=scene(),capacity=g.capacity();reward(g,'special');const u=g.units.find(u=>u.type==='commando');a.ok(u);a.equal(g.capacity(),capacity+1);a.equal(u.hp,u.maxHp);a.ok(g.stats(u).hp>=480);a.ok(g.stats(u).rate<.2);a.equal(g.fusionCandidates('commando').length,0);a.equal(g.tech[0].commando,undefined);
 const targets=[100,140,180,220].map(dx=>{const t=g.addUnit(2,'ant',u.x+dx,u.y);t.hp=t.maxHp=1e5;return t;});const b=g.fireUnitProjectiles(u,targets[0],{damage:100},g.stats(u))[0];a.equal(b.evoStyle,'heatPierce');g.impact(b);a.ok(targets.slice(0,3).every(t=>t.hp<1e5));a.equal(targets[3].hp,1e5);
});
test('an existing special soldier gains its increased maximum HP when the commander advances',()=>{
 const g=scene();reward(g,'special');const u=g.units.find(u=>u.type==='commando'),before=u.maxHp;g.phase='choice';g.choiceKind='level';g.currentOptions=['rifle'];a.equal(g.choose('rifle'),true);a.ok(u.maxHp>before);near(u.maxHp,g.stats(u).hp);near(u.hp,u.maxHp);
});
test('artillery tickets validate targets, warn for one second and strike five times without friendly fire',()=>{
 const g=scene(),c=g.commander(0),enemy=g.addUnit(2,'ant',c.x+150,c.y),friend=g.addUnit(0,'rifle',c.x+150,c.y);enemy.hp=enemy.maxHp=1e6;reward(g,'artillery');
 for(const [x,y]of [[NaN,7000],[1,7000],[c.x+1000,c.y]])a.equal(g.useArtilleryTicket(x,y),false);a.equal(g.supplyState().artillery,1);a.equal(g.useArtilleryTicket(enemy.x,enemy.y),true);a.equal(g.useArtilleryTicket(enemy.x,enemy.y),false);
 g.time=.99;g.updateSupplyStrikes();a.equal(enemy.hp,1e6);g.phase='paused';g.update(.05);a.equal(enemy.hp,1e6);g.phase='playing';g.time=1;g.updateSupplyStrikes();a.ok(enemy.hp<1e6);g.time=2;g.updateSupplyStrikes();a.equal(g.effects.filter(e=>e.visualKind==='supportArtillery').length,5);a.equal(g.supplyStrikes.length,0);a.equal(friend.hp,friend.maxHp);const hp=enemy.hp;g.updateSupplyStrikes();a.equal(enemy.hp,hp);
});
test('support artillery respects a boss airborne invulnerability window',()=>{
 const g=scene(),c=g.commander(0),boss=g.addUnit(2,'hornet',c.x+100,c.y);boss.boss=true;boss.bossPattern='venomDive';boss.bossAction={phase:'high'};boss.hp=boss.maxHp=1e6;reward(g,'artillery');g.useArtilleryTicket(boss.x,boss.y);g.time=2;g.updateSupplyStrikes();a.equal(boss.hp,1e6);
});
test('cooperative pickups, inventories, combat buffs and support shields belong to their collecting owner',()=>{
 const g=scene(true),green=g.withOwner(0,()=>g.commander(0)),blue=g.withOwner(1,()=>g.commander(0)),baseGreen=g.stats(green).damage;green.hp=10;blue.hp=10;
 g.withOwner(1,()=>{reward(g,'medkit');reward(g,'boost');reward(g,'artillery');reward(g,'support');a.equal(g.useMedkit(),true);});a.equal(green.hp,10);a.equal(blue.hp,blue.maxHp);near(g.stats(green).damage,baseGreen);a.equal(g.withOwner(0,()=>g.supplyState().artillery),0);a.equal(g.withOwner(1,()=>g.supplyState().artillery),1);
 g.levelCheck();a.equal(g.phase,'playing');a.equal(g.coopChoosing[0],false);a.equal(g.coopChoosing[1],true);a.ok(g.coopInvulnerable[1]>=g.time+5);a.equal(g.withOwner(1,()=>g.choiceKind),'supply');
});
test('saved consumables, temporary buffs, special troops and pending artillery retain ownership and references',()=>{
 const g=scene(true);g.withOwner(1,()=>{for(const kind of ['medkit','boost','special','artillery'])reward(g,kind);const c=g.commander(0);g.useArtilleryTicket(c.x+100,c.y);});const restored=unpack(scene(true),JSON.parse(JSON.stringify(pack(g))));
 const state=restored.withOwner(1,()=>restored.supplyState());a.equal(state.medkits,1);a.equal(state.boostUntil,60);a.equal(restored.withOwner(0,()=>restored.supplyState().medkits),0);a.ok(restored.units.some(u=>u.type==='commando'&&u.coopOwner===1));a.equal(restored.supplyStrikes[0].source,restored.withOwner(1,()=>restored.commander(0)));
 const old=pack(scene());delete old.fields.fieldSupplyState;delete old.fields.supplyStrikes;const legacy=unpack(scene(),old);a.equal(legacy.supplyState().medkits,0);a.doesNotThrow(()=>legacy.updateSupplyStrikes());
});

test('ordinary map crates keep their original small rewards and never roll rare items',()=>{for(const coop of [false,true]){const g=scene(coop),owner=coop?1:0;scope(g,owner,()=>{const c=g.commander(0),cash=g.cash[0],xp=g.xp;g.random=()=>0;g.collectFieldSupply({x:c.x,y:c.y,active:true});a.equal(g.cash[0],cash+25);a.equal(g.xp,xp+18);a.equal(g.supplyState().collected,0);a.equal(g.supplyState().pendingSupport,0);});}});
test('rare crates start at two minutes, repeat every two minutes and share one world schedule in cooperative play',()=>{for(const coop of [false,true]){const g=scene(coop);g.time=119.99;g.updateRareSupplies();a.equal(g.pickups.length,0);g.time=120;g.updateRareSupplies();a.equal(g.pickups.filter(p=>p.active&&p.rareSupply).length,1);a.equal(g.nextRareSupply,240);a.equal(g.pickups[0].expires,240);a.ok(Math.hypot(g.pickups[0].x-g.commander(0).x,g.pickups[0].y-g.commander(0).y)>60);g.updateRareSupplies();a.equal(g.pickups.length,1);g.time=240;g.updateRareSupplies();a.equal(g.pickups.filter(p=>p.active&&p.rareSupply).length,1);a.equal(g.nextRareSupply,360);g.phase='paused';g.time=360;g.updateRareSupplies();a.equal(g.nextRareSupply,360);}});
test('rare supply expiry and saved schedule prevent retroactive stockpiles and retain 400-resource support',()=>{const g=scene();g.time=120;g.updateRareSupplies();const crate=g.pickups[0],restored=unpack(scene(),pack(g));a.equal(restored.nextRareSupply,240);a.equal(restored.pickups[0].rareSupply,true);const c=g.commander(0);Object.assign(crate,{x:c.x,y:c.y});g.time=240;a.equal(g.collectFieldSupply(crate),false);a.equal(g.supplyState().collected,0);const old=pack(scene());old.fields.time=601;delete old.fields.nextRareSupply;unpack(restored,old);a.equal(restored.nextRareSupply,720);});

test('wave test clock jumps rebuild rare supply timing and discard stale strikes and link marks',()=>{const g=scene(),lab=require('./public/wave-test.js');g.waveTest=true;g.time=120;g.nextRareSupply=240;g.supplyStrikes=[{index:0}];g.evolutionLinkState={owners:[{ready:{breach:126}}]};g.commander(0).evolutionLinkMarks={0:{snipe:124}};lab.seek(g,601);a.equal(g.nextRareSupply,720);a.deepEqual(g.supplyStrikes,[]);a.deepEqual(g.evolutionLinkState,{owners:[]});a.equal(g.commander(0).evolutionLinkMarks,undefined);lab.seek(g,0);a.equal(g.nextRareSupply,120);});

test('rare supplies land at least 55 meters away and require all eight guards and the approaching reinforcements to be defeated',()=>{
 const g=scene();g.time=120;g.updateRareSupplies();const p=g.pickups[0],c=g.commander(0),cash=g.cash[0];a.ok(Math.hypot(p.x-c.x,p.y-c.y)>=550);a.equal(g.rareSupplyGuards(p).length,8);Object.assign(c,{x:p.x,y:p.y});a.equal(g.collectFieldSupply(p),false);a.equal(p.active,true);a.equal(g.cash[0],cash);
 const guards=g.rareSupplyGuards(p);a.equal(guards.length,12);for(const t of guards.slice(0,-1))g.damage(t,1e6,c);a.equal(g.collectFieldSupply(p),false);g.damage(guards.at(-1),1e6,c);p.supplyKind='support';const afterCombat=g.cash[0];a.equal(g.collectFieldSupply(p),true);a.equal(g.cash[0],afterCombat+400);a.equal(g.collectFieldSupply(p),false);
});
test('guard composition grows with time and expiration withdraws living guards without kill rewards',()=>{
 for(const [time,types]of [[120,['bayonet','bayonet','bayonet','bayonet','bayonet','rifle','rifle','machinegun']],[360,['bladeGuard','bladeGuard','bayonet','bayonet','machinegun','machinegun','mortar','sniper']],[780,['stagBeetle','bladeGuard','bladeGuard','machinegun','machinegun','mortar','mortar','sniper']]]){const g=scene();g.time=time;g.updateRareSupplies();const p=g.pickups[0],guards=g.rareSupplyGuards(p);a.deepEqual(guards.map(u=>u.type),types);a.ok(guards.every(u=>u.rareSupplyGuard&&!u.boss));const before={kills:g.kills,cash:g.cash[0],gold:g.profile.gold};g.time=p.expires;g.expireRareSupplies();a.equal(p.active,false);a.equal(g.rareSupplyGuards(p).length,0);a.ok(guards.every(u=>u.rareSupplyWithdrawn));a.deepEqual({kills:g.kills,cash:g.cash[0],gold:g.profile.gold},before);}
});
test('saved cooperative guard locks stay shared until all guards die, then reward only the collector',()=>{
 const g=scene(true);g.time=120;g.updateRareSupplies();const restored=unpack(scene(true),JSON.parse(JSON.stringify(pack(g)))),p=restored.pickups[0];a.equal(restored.rareSupplyGuards(p).length,8);restored.withOwner(1,()=>{const c=restored.commander(0);Object.assign(c,{x:p.x,y:p.y});a.equal(restored.collectFieldSupply(p),false);for(const t of restored.rareSupplyGuards(p))restored.damage(t,1e6,c);p.supplyKind='artillery';a.equal(restored.collectFieldSupply(p),true);a.equal(restored.supplyState().artillery,1);});a.equal(restored.withOwner(0,()=>restored.supplyState().artillery),0);
});
