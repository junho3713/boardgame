'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),room=require('./public/room-campaign.js').config;
function scene(map='livingroom-star'){const g=new FrontGame({},undefined,{map});g.start();g.mission.stage=3;g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.tech[0].sniper=1;g.visible=()=>true;return g;}
test('snipers choose the highest max HP within range, vision and a clear firing line',()=>{
 const g=scene(),sniper=g.addUnit(0,'sniper',1500,6000),ant=g.addUnit(2,'ant',1510,6000),mage=g.addUnit(2,'blizzardMage',1680,6000);
 const heavy=g.addUnit(2,'tank',1790,6000),candidates=[ant,mage,heavy];
 Object.assign(heavy,{maxHp:5000,hp:1});mage.activeStage=1;mage.maxHp=1500;
 a.equal(g.selectCombatTarget(sniper,candidates),heavy);
 g.visible=t=>t!==heavy;
 a.equal(g.selectCombatTarget(sniper,candidates),mage);
 g.visible=()=>true;g.lineClear=(_,t)=>t!==heavy;
 a.equal(g.selectCombatTarget(sniper,candidates),mage);
 g.lineClear=()=>true;heavy.x=2500;
 a.equal(g.selectCombatTarget(sniper,candidates),mage);
 heavy.x=1790;heavy.hp=0;mage.fixedGuard=true;mage.activeStage=4;
 a.equal(g.selectCombatTarget(sniper,candidates),ant);
});
test('snipers resume the nearest target among equal maximum HP after manual aim',()=>{
 const g=scene('livingroom'),sniper=g.addUnit(0,'sniper',1500,6000),ant=g.addUnit(2,'ant',1510,6000),mortar=g.addUnit(2,'mortar',1700,6000),mage=g.addUnit(2,'blizzardMage',1800,6000);
 mage.activeStage=1;mortar.maxHp=mage.maxHp=3000;ant.maxHp=100;
 const candidates=[mage,ant,mortar];
 a.equal(g.selectCombatTarget(sniper,candidates),mortar);
 g.addUnit(0,'leader',1500,6100);g.setManualAim({x:-1,y:0});g.setFocus(ant);
 g.updateRoomWaves=g.updateBosses=g.updateMission=()=>{};
 g.update(.05);
 a.equal(sniper.sniperAim.target.angle,Math.PI);
 g.setManualAim(null);g.update(.05);
 a.equal(sniper.sniperAim.target,mortar);
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
 const g=scene();g.time=360;g.units=[];g.northernSpawn=()=>({x:1500,y:6000});g.random=()=>0;g.roomWavePlan=()=>({count:3,interval:1,forced:[],surge:false});g.roomPhase=()=>({at:360,name:'test',cap:100,mix:{blizzardMage:1,ant:1}});g.updateRoomScheduledTanks=()=>{};
 // Isolate escort slot debt; basic reinforcement cadence has its own regression test.
 g.addRoomWeakReinforcements=()=>{};let groups=0;
 for(let i=0;i<60;i++){g.units=[];g.roomCampaign.nextSpawnAt=g.time;const before=g.roomCampaign.spawned;g.updateRoomWaves();const added=g.roomCampaign.spawned-before;if(g.units.some(u=>u.mobileMage)){a.equal(added,5);groups++;}else a.ok(added<=3);g.time+=1;}
 a.equal(g.roomCampaign.spawned,180);a.equal(groups,1);a.equal(g.roomCampaign.waveSpawnDebt,0);
});
test('roaming ice mages approach, stop to cast, freeze targets and use the original mortar shield; fixed guards stay planted',()=>{
 const g=scene(),leader=g.addUnit(0,'leader',1500,6500),mage=g.addUnit(2,'blizzardMage',1500,5800),fixed=g.addUnit(1,'blizzardMage',1800,5800);Object.assign(mage,{mobileMage:true,activeStage:1,cooldown:0});fixed.fixedGuard=true;fixed.activeStage=1;
 const oldY=mage.y;g.updateBlizzard(mage,.1);a.ok(mage.y>oldY);const fixedY=fixed.y;g.move(fixed,0,100,.1,100);a.equal(fixed.y,fixedY);
 mage.y=leader.y-200;g.updateBlizzard(mage,.1);
 a.equal(mage.blizzardCast.hitAt-mage.blizzardCast.startedAt,2);
 a.equal(mage.castUntil,mage.blizzardCast.hitAt);
 const castY=mage.y,hp=leader.hp;
 g.time=1.99;g.updateBlizzard(mage,.1);a.equal(mage.y,castY);a.equal(leader.hp,hp);a.ok(!(leader.rootedUntil>g.time));
 g.time=2;g.updateBlizzard(mage,.1);a.ok(leader.hp<hp&&leader.rootedUntil>g.time);
 g.mortarShells=[{team:0,x:mage.x,y:mage.y,landAt:2.5,radius:100}];g.updateMageShields();a.ok(mage.iceShield);g.time=2.3;a.equal(g.blockMageMortar(mage,g.mortarShells[0]),true);
});
test('mobile mages enter only from six minutes onward, share the wave cap and never become respawning guardians',()=>{
 a.ok(room.phases.filter(p=>p.at<360).every(p=>!p.mix.blizzardMage));a.ok(room.phases.filter(p=>p.at>=360).every(p=>p.mix.blizzardMage>0));
 const g=new FrontGame({},undefined,{map:'livingroom'});g.start();g.time=360;g.northernSpawn=()=>({x:1500,y:6000});
 for(let i=0;i<2;i++){const u=g.spawnRoomEnemy('blizzardMage');a.ok(u.mobileMage);a.equal(u.activeStage,1);a.equal(u.guardianRespawn,undefined);a.equal(u.fixedGuard,undefined);a.ok(g.stats(u).speed>0);}
 a.equal(g.spawnRoomEnemy('blizzardMage'),null);
});
test('boss charge warnings are halved and the locked lanes are crossed at the new speed',()=>{
 for(const [type,pattern,windup,speed] of [['rhinoBeetle','rhinoCharge',.5,1200],['bikeRaider','rapidBike',.625,900],['bikeRaider',null,1.25,600]]){
  const g=scene(),leader=g.addUnit(0,'leader',1500,6400),enemy=g.addUnit(2,type,1500,6100);
  Object.assign(enemy,{boss:!!pattern,bossPattern:pattern,cooldown:0});
  g.updateBattleUnits(.01);const attack=enemy.bikeAttack;
  a.equal(attack.chargeAt,windup);a.equal(attack.speed,speed);
  a.equal(g.bikeHazards()[0].landAt,windup+attack.distance/speed);
  g.time=windup-.001;g.updateBattleUnits(.01);a.equal(attack.phase,'windup');a.equal(enemy.y,6100);
  g.time=windup;g.updateBattleUnits(.01);a.equal(attack.phase,'charge');
  const y=enemy.y;g.time=windup+.05;g.updateBattleUnits(.05);a.ok(Math.abs(enemy.y-y-speed*.05)<1e-6);
  a.ok(leader.hp>0);
 }
});
test('the four portal laser towers stay destroyed, including a legacy save waiting to rebuild',()=>{
 const {pack,unpack}=require('./public/autoplay.js');
 const g=new FrontGame({},undefined,{map:'livingroom-assault'});g.start();g.time=365;
 const sites=[...room.guardians.finalLasers,...room.guardians.rearLasers],ids=sites.map(site=>site.id);
 const towers=ids.map(id=>g.defenses.find(tower=>tower.id===id));
 for(const tower of towers){
  g.damage(tower,1e8,g.commander(0));
  a.equal(tower.hp,0);a.equal(tower.respawnAt,undefined);
  Object.assign(tower,{guardianRespawn:true,respawnAt:g.time+20});
 }
 g.roomGuardianVersion=142;
 const mage=g.units.find(u=>u.guardianId===room.guardians.finalMages[0].id);
 g.damage(mage,1e8,g.commander(0));a.ok(mage.respawnAt>g.time);
 const restored=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
 restored.time=Math.max(mage.respawnAt,g.time+20)+1;restored.updateGuardianRespawns();
 for(const id of ids){
  const tower=restored.defenses.find(tower=>tower.id===id);
  a.equal(tower.hp,0);a.equal(tower.respawnAt,undefined);a.equal(tower.guardianRespawn,undefined);
 }
 a.ok(restored.units.find(u=>u.id===mage.id).hp>0);
});
