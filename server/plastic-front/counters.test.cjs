'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),room=require('./public/room-campaign.js').config;
function scene(){const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.mission.stage=3;g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.tech[0].sniper=1;g.visible=()=>true;return g;}
test('snipers prioritize a reachable live ice mage over closer threats, but skip blocked, distant and inactive mages',()=>{
 const g=scene(),sniper=g.addUnit(0,'sniper',1500,6000),ant=g.addUnit(2,'ant',1510,6000),mage=g.addUnit(2,'blizzardMage',1700,6000);mage.activeStage=1;mage.mobileMage=true;
 a.equal(g.selectCombatTarget(sniper,[ant,mage],new Set([ant])),mage);
 const before=g.lineClear;g.lineClear=()=>false;a.equal(g.selectCombatTarget(sniper,[ant,mage],new Set([ant])),ant);g.lineClear=before;
 mage.x=2500;a.equal(g.selectCombatTarget(sniper,[ant,mage]),ant);mage.x=1700;mage.hp=0;a.equal(g.selectCombatTarget(sniper,[ant,mage]),ant);
 mage.hp=100;mage.fixedGuard=true;mage.activeStage=4;a.equal(g.selectCombatTarget(sniper,[ant,mage]),ant);
});
test('roaming ice mages approach, stop to cast, freeze targets and use the original mortar shield; fixed guards stay planted',()=>{
 const g=scene(),leader=g.addUnit(0,'leader',1500,6500),mage=g.addUnit(2,'blizzardMage',1500,5800),fixed=g.addUnit(1,'blizzardMage',1800,5800);Object.assign(mage,{mobileMage:true,activeStage:1,cooldown:0});fixed.fixedGuard=true;fixed.activeStage=1;
 const oldY=mage.y;g.updateBlizzard(mage,.1);a.ok(mage.y>oldY);const fixedY=fixed.y;g.move(fixed,0,100,.1,100);a.equal(fixed.y,fixedY);
 mage.y=leader.y-200;g.updateBlizzard(mage,.1);a.ok(mage.blizzardCast);const castY=mage.y;g.updateBlizzard(mage,.1);a.equal(mage.y,castY);g.time=1;g.updateBlizzard(mage,.1);a.ok(leader.rootedUntil>g.time);
 g.mortarShells=[{team:0,x:mage.x,y:mage.y,landAt:1.5,radius:100}];g.updateMageShields();a.ok(mage.iceShield);g.time=1.3;a.equal(g.blockMageMortar(mage,g.mortarShells[0]),true);
});
test('mobile mages enter only from six minutes onward, share the wave cap and never become respawning guardians',()=>{
 a.ok(room.phases.filter(p=>p.at<360).every(p=>!p.mix.blizzardMage));a.ok(room.phases.filter(p=>p.at>=360).every(p=>p.mix.blizzardMage>0));
 const g=new FrontGame({},undefined,{map:'livingroom'});g.start();g.time=360;g.northernSpawn=()=>({x:1500,y:6000});
 for(let i=0;i<2;i++){const u=g.spawnRoomEnemy('blizzardMage');a.ok(u.mobileMage);a.equal(u.activeStage,1);a.equal(u.guardianRespawn,undefined);a.equal(u.fixedGuard,undefined);a.ok(g.stats(u).speed>0);}
 a.equal(g.spawnRoomEnemy('blizzardMage'),null);
});
test('rhino boss warns for one second and covers the same 360 units in half the old charge time',()=>{
 const p=room.patterns.rhinoCharge;a.equal(p.windup,1);a.equal(p.speed,800);a.equal(p.distance/p.speed,.45);
 const g=scene(),leader=g.addUnit(0,'leader',1500,6400),boss=g.addUnit(2,'rhinoBeetle',1500,6100);Object.assign(boss,{boss:true,bossPattern:'rhinoCharge',cooldown:0});
 g.updateBossPattern(boss,.05);a.equal(boss.bikeAttack.phase,'windup');g.time=.999;g.updateBossPattern(boss,.05);a.equal(boss.bikeAttack.phase,'windup');g.time=1;g.updateBossPattern(boss,.05);a.equal(boss.bikeAttack.phase,'charge');
 const y=boss.y;g.time=1.1;g.updateBossPattern(boss,.1);a.ok(Math.abs(boss.y-y-80)<1e-6);a.ok(leader.hp>0);
});
