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
test('sniper priority is mage, mortar, then ordinary targets, within real range, visibility and firing lines',()=>{
 const g=scene(),sniper=g.addUnit(0,'sniper',1500,6000),ant=g.addUnit(2,'ant',1510,6000),mortar=g.addUnit(2,'mortar',1700,6000),mage=g.addUnit(2,'blizzardMage',1800,6000);
 const candidates=[ant,mortar,mage];mage.activeStage=1;
 a.equal(g.selectCombatTarget(sniper,candidates,new Set([ant])),mage);mage.hp=0;a.equal(g.selectCombatTarget(sniper,candidates,new Set([ant])),mortar);
 g.visible=u=>u!==mortar;a.equal(g.selectCombatTarget(sniper,candidates,new Set([ant])),ant);g.visible=()=>true;
 g.lineClear=(u,t)=>t!==mortar;a.equal(g.selectCombatTarget(sniper,candidates,new Set([ant])),ant);g.lineClear=()=>true;
 mortar.x=2500;a.equal(g.selectCombatTarget(sniper,candidates,new Set([ant])),ant);mortar.x=1700;
 const leader=g.addUnit(0,'leader',1500,6100);g.focusTarget=ant;g.focusAutomatic=false;g.updateRoomWaves=()=>{};g.updateBosses=()=>{};g.updateMission=()=>{};
 g.update(.05);a.equal(sniper.sniperAim.target,ant);a.ok(leader.hp>0);
});
test('mage groups spawn atomically with four mortar escorts, including cooperative caps',()=>{
 const {CoopGame}=require('./public/coop-engine.js');
 for(const g of [scene(),new CoopGame()]){g.start();g.time=360;g.units=g.units.filter(u=>u.team===0);g.northernSpawn=()=>({x:1500,y:6000});
  const group=g.spawnRoomMageGroup();a.equal(group.length,5);const mage=group[0];a.ok(mage.mobileMage);
  for(const u of group.slice(1)){a.equal(u.type,'mortar');a.equal(u.roomEscortLeaderId,mage.id);a.equal(u.roomEscortGroup,mage.id);a.ok(Math.hypot(u.x-mage.x,u.y-mage.y)<180);a.equal(g.canTarget(mage,u),false);}
  const original=g.roomWaveCap;g.roomWaveCap=()=>g.roomEnemyCount()+4;const before=g.units.length;a.equal(g.spawnRoomMageGroup(),null);a.equal(g.units.length,before);g.roomWaveCap=original;
 }
});
test('mortar escorts follow a moving mage, continue their own pursuit after her defeat, and survive snapshot restore',()=>{
 const {pack,unpack}=require('./public/autoplay.js');const g=scene();g.time=360;g.addUnit(0,'leader',1500,7500);g.northernSpawn=()=>({x:1500,y:6000});const [mage,...escorts]=g.spawnRoomMageGroup();mage.face=Math.PI/2;
 mage.y+=200;for(const u of escorts){const y=u.y;a.equal(g.followRoomEscort(u,.1,g.stats(u)),true);a.ok(u.y>y);}
 const copy=unpack(new FrontGame(),pack(g)),restored=copy.units.find(u=>u.id===escorts[0].id);a.equal(restored.roomEscortLeaderId,mage.id);a.equal(copy.followRoomEscort(restored,.1,copy.stats(restored)),true);
 mage.hp=0;for(const u of escorts)a.equal(g.followRoomEscort(u,.1,g.stats(u)),false);
});
test('a five-unit escort group consumes future wave slots rather than multiplying regular wave counts',()=>{
 const g=scene();g.time=360;g.units=[];g.northernSpawn=()=>({x:1500,y:6000});g.random=()=>0;g.roomWavePlan=()=>({count:3,interval:1,forced:[],surge:false});g.roomPhase=()=>({at:360,name:'test',cap:100,mix:{blizzardMage:1}});g.updateRoomScheduledTanks=()=>{};
 let groups=0;
 for(let i=0;i<60;i++){g.units=[];g.roomCampaign.nextSpawnAt=g.time;const before=g.roomCampaign.spawned;g.updateRoomWaves();const added=g.roomCampaign.spawned-before;if(added){a.equal(added,5);groups++;}g.time+=1;}
 a.equal(g.roomCampaign.spawned,180);a.equal(groups,36);a.equal(g.roomCampaign.waveSpawnDebt,0);
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
