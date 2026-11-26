'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(time=180,coop=false,map='livingroom-star'){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map});g.start();g.time=time;
 g.units=g.units.filter(u=>u.type==='leader'&&u.team===0);g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.pickups=[];
 for(const c of g.units)Object.assign(c,{x:1500,y:6000,cooldown:1e6});g.camera={x:1500,y:6000};g.viewport={width:1000,height:700};
 g.visible=g.lineClear=()=>true;g.levelCheck=g.gainXP=()=>{};g.random=()=>.99;return g;
}

test('the two-minute tutorial packet fits the solo and cooperative wave budget and survives a save',()=>{
 for(const coop of [false,true]){
  const fresh=()=>coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});
  const g=scene(119.95,coop);g.random=()=>.44;g.roomCampaign.nextSpawnAt=119.95;g.updateRoomWaves();
  a.ok(!g.units.some(u=>u.type==='bombBug'));
  g.time=120;g.roomCampaign.nextSpawnAt=120;
  const beforeIntro=g.roomEnemyCount(),introBudget=g.roomWavePlan().count;
  g.updateRoomWaves();
  const bombs=g.units.filter(u=>u.openingBombBug);
  a.equal(bombs.length,1,'one opening encounter per battlefield');const bomb=bombs[0];
  a.equal(bomb.type,'bombBug');a.equal(bomb.maxHp,g.stats(bomb).hp);
  a.ok(g.roomEnemyCount()-beforeIntro<=introBudget);
  const ants=g.units.filter(u=>u.roomBombLeaderId===bomb.id);
  a.equal(ants.length,2);a.ok(ants.every(ant=>ant.type==='ant'&&Math.hypot(ant.x-bomb.x,ant.y-bomb.y)<140));
  a.equal(g.roomCanSpawn('bombBug'),true);
  const debt=g.roomCampaign.waveSpawnDebt;a.equal(debt,0);

  const restored=unpack(fresh(),JSON.parse(JSON.stringify(pack(g))));
  const savedBomb=restored.units.find(u=>u.id===bomb.id);
  a.ok(savedBomb.openingBombBug);a.equal(restored.roomCampaign.waveSpawnDebt,debt);
  const ally=restored.addUnit(0,'rifle',savedBomb.x+15,savedBomb.y,true);
  const oldHP=ally.hp,expected=(restored.stats(savedBomb).damage*.2+ally.maxHp*.25)*restored.defenseFactor(ally,{type:'bombBug',team:2});
  restored.damage(savedBomb,1e6,restored.commander(0));
  a.ok(Math.abs(oldHP-ally.hp-expected)<1e-6);a.ok(ally.hp>0);
  a.ok(ants.every(({id})=>restored.units.find(u=>u.id===id).hp===0));
  restored.units=restored.units.filter(u=>!u.openingBombBug&&!u.roomBombLeaderId);
  restored.roomCampaign.nextSpawnAt=restored.time+.05;
  const before=restored.roomCampaign.spawned;
  restored.time+=.05;const budget=restored.roomWavePlan().count;restored.updateRoomWaves();
  a.ok(restored.roomCampaign.spawned-before<=Math.max(0,budget-debt));
  a.equal(restored.roomCampaign.waveSpawnDebt,Math.max(0,debt-budget));
  for(let i=0;i<20;i++){restored.time+=1;restored.updateRoomWaves();}
  a.ok(!restored.units.some(u=>u.openingBombBug),'restoring does not repeat the opening packet');
 }
});

test('ordinary three-wave rotation resumes after eleven minutes',()=>{
 for(const time of [660,720]){
  const g=scene(time);g.roomCampaign.antWaveCursor=2;g.roomBeat=()=>({density:1,name:'test'});
  g.nextPirateCannonAt=9999;
  g.roomWavePlan=()=>({count:12,interval:5,forced:['rifle'],surge:false});g.roomCampaign.nextSpawnAt=time;
  g.updateRoomWaves();
  const wave=g.units.filter(u=>u.roomWave);
  a.ok(wave.some(u=>u.type==='rifle'));a.ok(wave.every(u=>u.type!=='bombBug'));
 }
});

test('active ant waves bring two packets plus mixed troops while recovery and global caps remain bounded',()=>{
 for(const time of [180,300,420,780,1100]){const g=scene(time);g.roomBeat=()=>({density:1,name:'test'});g.upgradeRoomCampaign=()=>false;g.updateRoomScheduledTanks=()=>{};g.roomCampaign.nextSpawnAt=time;g.updateRoomWaves();const bombs=g.units.filter(u=>u.type==='bombBug');a.ok(bombs.length>=2,String(time));a.ok(g.roomEnemyCount()>=10,String(time));a.ok(g.roomEnemyCount()<=g.roomWaveCap());a.ok(new Set(bombs.map(u=>u.roomEntrySide)).size>=2);}
 const early=scene(120);a.ok(early.roomWavePlan().count<10);const rest=scene(350);rest.roomBeat=()=>({density:.3,name:'rest'});a.equal(rest.roomWavePlan().count,1);
});

test('solo and co-op remove bomb limits even in old saves while retaining opening and global capacity rules',()=>{
 for(const coop of [false,true]){const g=scene(119.99,coop);a.equal(g.roomCanSpawn('bombBug'),false);g.time=300;g.roomCampaign.insectNext={bombBug:9999};for(let i=0;i<5;i++)a.equal(g.spawnRoomAntGroup(null,5).length,5);a.equal(g.roomEnemyCount('bombBug'),5);const copy=unpack(scene(300,coop),JSON.parse(JSON.stringify(pack(g))));a.equal(copy.roomCanSpawn('bombBug'),true);while(g.roomEnemyCount()<g.roomWaveCap())g.addUnit(2,'ant',1500,4000,true);a.equal(g.roomCanSpawn('bombBug'),false);a.deepEqual(g.spawnRoomAntGroup(),[]);a.ok(g.spawnRoomEnemy('acidBeetle')===null);}
});
test('ant packets start at two minutes, share one offscreen entry and have no bomb-specific cooldown or count cap',()=>{
 const g=scene(119.99);a.deepEqual(g.spawnRoomAntGroup(),[]);g.time=120;const group=g.spawnRoomAntGroup();a.deepEqual(group.map(u=>u.type),['bombBug','ant','ant','ant']);
 const b=group[0],view=g.spawnView();for(const ant of group.slice(1)){a.equal(ant.roomBombLeaderId,b.id);a.equal(ant.roomEntrySide,b.roomEntrySide);a.ok(Math.hypot(ant.x-b.x,ant.y-b.y)<125);a.ok(ant.x+TYPES.ant.r<view.left||ant.x-TYPES.ant.r>view.right||ant.y+TYPES.ant.r<view.top||ant.y-TYPES.ant.r>view.bottom);}
 for(let i=0;i<3;i++)a.equal(g.spawnRoomAntGroup().length,4);a.equal(g.roomEnemyCount('bombBug'),4);g.roomCampaign.insectNext={bombBug:g.time+1000};a.equal(g.spawnRoomAntGroup().length,4);
});
test('midgame packets use up to six ants and never exceed the wave budget or living-enemy cap',()=>{
 const g=scene(300);a.equal(g.spawnRoomAntGroup(null,5).length,5);
 for(const [time,count] of [[299.99,4],[300,7],[659.99,7],[660,5]]){
  const packet=scene(time).spawnRoomAntGroup(null,12);a.equal(packet.length,count,'time '+time);
  a.ok(packet.slice(1).every(ant=>ant.roomBombLeaderId===packet[0].id));
 }
 const h=scene(300);a.deepEqual(h.spawnRoomAntGroup(null,3),[]);a.equal(h.units.length,1);a.equal(h.spawnRoomAntGroup(null,4).length,4);
 const k=scene(300);for(let i=0;i<k.roomWaveCap()-3;i++)k.addUnit(2,'ant',1000+i,4000,true);const count=k.roomEnemyCount();a.deepEqual(k.spawnRoomAntGroup(),[]);a.equal(k.roomEnemyCount(),count);
 const blocked=scene();blocked.roomEntry=()=>null;a.deepEqual(blocked.spawnRoomAntGroup(),[]);a.equal(blocked.units.length,1);
});
test('the normal scheduled wave spends existing slots on a bomb and ants without a second spawner',()=>{
 const early=scene(120);early.roomCampaign.nextSpawnAt=120;early.updateRoomWaves();
 const openingTypes=early.units.filter(u=>u.roomWave).map(u=>u.type);
 a.deepEqual(openingTypes.slice(0,3),['bombBug','ant','ant']);
 a.equal(openingTypes.length,6);
 const g=scene(180);g.upgradeRoomCampaign=()=>false;g.updateRoomScheduledTanks=()=>{};g.roomCampaign.nextSpawnAt=g.time;g.roomCampaign.phaseAt=g.roomPhase().at;
 const before=g.roomCampaign.spawned;g.updateRoomWaves();const wave=g.units.filter(u=>u.roomWave);a.deepEqual(wave.slice(0,9).map(u=>u.type),['pirateCannon','bombBug','ant','ant','ant','bombBug','ant','ant','ant']);a.equal(g.roomCampaign.spawned-before,g.roomWavePlan().count);a.equal(g.roomEnemyCount(),g.roomWavePlan().count);
 const first=wave.length;g.updateRoomWaves();a.equal(g.roomEnemyCount(),first);
 const small=scene(190);small.upgradeRoomCampaign=()=>false;small.updateRoomScheduledTanks=()=>{};small.roomWavePlan=()=>({count:2,interval:5,forced:[],surge:false});small.roomCampaign.nextSpawnAt=190;small.random=()=>.15;small.updateRoomWaves();a.ok(small.units.every(u=>u.type!=='bombBug'));
});
test('the new opening caps preserve the composition weights',()=>{
 const g=scene(0);a.deepEqual(g.roomPhase().mix,{ant:1});a.equal(g.roomPhase().cap,10);
 g.time=30;a.deepEqual(g.roomPhase().mix,{ant:1});a.equal(g.roomPhase().cap,16);
 g.time=60;a.equal(g.roomPhase().mix.ant,10);g.time=120;a.equal(g.roomPhase().mix.ant,9);g.time=180;a.equal(g.roomPhase().mix.ant,8);g.time=480;a.equal(g.roomPhase().mix.ant,8);g.time=600;a.equal(g.roomPhase().mix.ant,6);
});

test('active waves cycle bomb packets, pure ants including weak extras, and ordinary mixed troops in solo and co-op',()=>{
 for(const coop of [false,true]){
  const g=scene(360,coop);g.nextPirateCannonAt=9999;g.upgradeRoomCampaign=()=>false;g.updateRoomScheduledTanks=()=>{};g.roomBeat=()=>({density:1,name:'test'});g.roomWavePlan=()=>({count:12,interval:5,forced:['blizzardMage','rifle'],surge:true});g.random=()=>.01;
  for(let wave=0;wave<10;wave++){
   g.units=g.units.filter(u=>u.team===0);g.time=360+wave*5;g.roomCampaign.nextSpawnAt=g.time;g.updateRoomWaves();const enemies=g.units.filter(u=>u.roomWave);
   a.ok(enemies.length>=12);a.ok(g.roomEnemyCount()<=g.roomWaveCap());a.equal(g.roomCampaign.antWaveCursor,wave+1);
   if([0,2,4].includes(wave%5)){const bombs=enemies.filter(u=>u.type==='bombBug');a.equal(bombs.length,3);a.ok(bombs.every(b=>enemies.filter(ant=>ant.roomBombLeaderId===b.id).length===3));}
   if(wave%5===1){a.ok(enemies.every(u=>u.type==='ant'));a.ok(enemies.some(u=>u.weakReinforcement));a.ok(enemies.every(u=>!u.roomBombLeaderId));}
   if(wave%5===3){a.ok(enemies.every(u=>u.type!=='bombBug'));a.ok(enemies.some(u=>u.type!=='ant'));}
  }
 }
});

test('large cooperative waves sustain three packs without breaking the wave budget',()=>{
 const g=scene(360,true);g.roomBeat=()=>({density:1,name:'test'});
 g.nextPirateCannonAt=9999;g.roomCanSpawnMageGroup=()=>false;g.roomWavePlan=()=>({count:28,interval:5,forced:Array(28).fill('bombBug'),surge:false});
 g.roomCampaign.nextSpawnAt=g.time;g.updateRoomWaves();
 const wave=g.units.filter(u=>u.roomWave),bombs=wave.filter(u=>u.type==='bombBug');
 a.equal(bombs.length,3);a.ok(wave.length>=28);a.ok(g.roomEnemyCount()<=g.roomWaveCap());
 for(const bomb of bombs)a.equal(wave.filter(ant=>ant.roomBombLeaderId===bomb.id).length,6);
});

test('wave variety survives a save and blocked, debt-only and recovery ticks do not consume the next pure-ant wave',()=>{
 const g=scene(360);g.roomCampaign.antWaveCursor=1;const copy=unpack(scene(360),JSON.parse(JSON.stringify(pack(g))));a.equal(copy.roomCampaign.antWaveCursor,1);
 copy.upgradeRoomCampaign=()=>false;copy.updateRoomScheduledTanks=()=>{};copy.roomBeat=()=>({density:1,name:'test'});copy.roomWavePlan=()=>({count:12,interval:5,forced:['blizzardMage'],surge:false});
 const entry=copy.roomEntry;copy.roomEntry=()=>null;copy.roomCampaign.nextSpawnAt=copy.time;copy.updateRoomWaves();a.equal(copy.roomCampaign.antWaveCursor,1);
 copy.time=copy.roomCampaign.waveEntryRetryAt;copy.roomEntry=entry;copy.roomCampaign.waveSpawnDebt=12;copy.roomCampaign.nextSpawnAt=copy.time;copy.updateRoomWaves();a.equal(copy.roomCampaign.antWaveCursor,1);a.equal(copy.roomCampaign.waveSpawnDebt,0);
 copy.roomCampaign.recoveryUntil=copy.time+5;copy.roomWavePlan=()=>({count:1,interval:5,forced:[],surge:false});copy.roomCampaign.nextSpawnAt=copy.time;copy.updateRoomWaves();a.equal(copy.roomCampaign.antWaveCursor,1);
 copy.units=copy.units.filter(u=>u.team===0);copy.time+=6;copy.roomWavePlan=()=>({count:12,interval:5,forced:['blizzardMage'],surge:false});copy.roomCampaign.nextSpawnAt=copy.time;copy.updateRoomWaves();a.equal(copy.roomCampaign.antWaveCursor,2);a.ok(copy.units.filter(u=>u.roomWave).every(u=>u.type==='ant'));
});
test('escorting ants stay with the slow bomb then resume their own pursuit after its death',()=>{
 const g=scene(),[bomb,ant]=g.spawnRoomAntGroup();ant.x=bomb.x+250;const steps=[];g.navigate=(u,x,y,dt,speed)=>steps.push({u,x,y,speed});a.equal(g.followRoomEscort(ant,.05,g.stats(ant)),true);a.equal(steps.length,1);a.ok(steps[0].speed<=g.stats(bomb).speed*1.15);a.ok(Math.hypot(steps[0].x-bomb.x,steps[0].y-bomb.y)<125);
 bomb.hp=0;a.equal(g.followRoomEscort(ant,.05,g.stats(ant)),false);a.equal(ant.roomBombLeaderId,undefined);
});
test('ordinary ranged auto-aim chooses the closest enemy it can see and hit',()=>{
 const g=scene(),u=g.addUnit(0,'machinegun',1500,6000),ant=g.addUnit(2,'ant',1540,6000,true),bomb=g.addUnit(2,'bombBug',1700,6000,true),targets=[bomb,ant];
 a.equal(g.selectCombatTarget(u,targets),ant);
 g.visible=t=>t!==ant;
 a.equal(g.selectCombatTarget(u,targets),bomb);
 g.visible=()=>true;g.lineClear=(_,t)=>t!==ant;
 a.equal(g.selectCombatTarget(u,targets),bomb);
 g.lineClear=()=>false;
 a.equal(g.selectCombatTarget(u,targets),null);
});
test('auto mortars keep safe minimum range and bomb priorities during manual aim',()=>{
 const g=scene(),mortar=g.addUnit(0,'mortar',1500,6000),ant=g.addUnit(2,'ant',1760,6000,true),bomb=g.addUnit(2,'bombBug',1550,6000,true),targets=[ant,bomb];
 g.setManualAim({x:-1,y:0});
 a.equal(g.selectCombatTarget(mortar,targets),ant);
 bomb.x=1850;
 a.equal(g.selectCombatTarget(mortar,targets),bomb);
 g.lineClear=(_,t)=>t!==bomb;
 a.equal(g.selectCombatTarget(mortar,targets),ant);
});
test('an early, middle or late bomb kill clears nearby ordinary ants and credits the player once',()=>{
 for(const time of [180,480,720,1140,1200]){const g=scene(time),c=g.commander(0),bomb=g.addUnit(2,'bombBug',1800,6000,true);bomb.roomWave=true;const ants=Array.from({length:4},(_,i)=>{const u=g.addUnit(2,'ant',1800+Math.cos(i*Math.PI/2)*70,6000+Math.sin(i*Math.PI/2)*70,true);u.roomWave=true;return u;});
  const outside=g.addUnit(2,'ant',1941,6000,true),hp=outside.hp,kills=g.kills;g.damage(bomb,1e6,c);a.ok(ants.every(u=>u.hp===0),String(time));a.equal(outside.hp,hp);a.equal(g.kills-kills,5);g.detonateBombBug(bomb,c);a.equal(g.kills-kills,5);
 }
});
test('wave bombs apply percentage damage to allies and only ordinary ants take the enemy splash bonus',()=>{
 const g=scene(),c=g.commander(0),bomb=g.addUnit(2,'bombBug',1800,6000,true),ally=g.addUnit(0,'rifle',1800,6060),boss=g.addUnit(2,'ant',1800,5940,true);boss.boss=true;ally.hp=ally.maxHp=boss.hp=boss.maxHp=1e6;
 const raw=g.stats(bomb).damage,allyHit=(raw+ally.maxHp*.25)*g.defenseFactor(ally,{type:'bombBug',team:2}),bossHit=raw*g.defenseFactor(boss,{type:'bombBug',team:0});g.damage(bomb,1e6,c);a.ok(Math.abs(1e6-ally.hp-allyHit)<1e-7);a.ok(Math.abs(1e6-boss.hp-bossHit)<1e-7);
});
test('cooperative saves keep ant escorts, cooldown and player-owned chain rewards',()=>{
 const g=scene(300,true),group=g.spawnRoomAntGroup(null,5),copy=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));copy.visible=copy.lineClear=()=>true;
 const bomb=copy.units.find(u=>u.id===group[0].id),ants=copy.units.filter(u=>u.roomBombLeaderId===bomb.id);a.equal(ants.length,4);a.equal(copy.roomCanSpawn('bombBug'),true);a.equal(copy.followRoomEscort(ants[0],.05,copy.stats(ants[0])),true);
 const blue=copy.withOwner(1,()=>copy.commander(0)),before=copy.withOwner(1,()=>copy.profile.gold);copy.damage(bomb,1e6,blue);a.ok(ants.every(u=>u.hp===0));a.ok(copy.withOwner(1,()=>copy.profile.gold)>before);
});
test('ordinary-map automatic gunfire hits the closest bomb and clears accompanying ants',()=>{
 const g=scene(180,false,'livingroom'),gunner=g.addUnit(0,'machinegun',1500,6000),bomb=g.addUnit(2,'bombBug',1700,6000,true);
 const ants=[-1.3,-.45,.45,1.3].map(angle=>g.addUnit(2,'ant',1700+Math.cos(angle)*60,6000+Math.sin(angle)*60,true));
 gunner.cooldown=0;bomb.hp=1;for(const method of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','updateMageQuest','updateLaserQuest'])g[method]=()=>{};
 g.update(.05);a.equal(g.shots.find(p=>p.source===gunner)?.target,bomb);
 for(let i=0;i<40&&!bomb.bombDetonated;i++)g.update(.025);a.equal(bomb.bombDetonated,true);a.ok(ants.every(u=>u.hp===0));
});
test('manual straight-line gunfire can detonate a bomb past a closer off-axis ant',()=>{
 const g=scene(180,false,'livingroom'),gunner=g.addUnit(0,'machinegun',1500,6000),bomb=g.addUnit(2,'bombBug',1700,6000,true),ant=g.addUnit(2,'ant',1680,6050,true);
 gunner.cooldown=0;bomb.hp=1;
 for(const method of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','updateMageQuest','updateLaserQuest','move','navigate'])g[method]=()=>{};
 a.equal(g.selectCombatTarget(gunner,[bomb,ant]),ant);
 g.setManualAim({x:1,y:0});g.update(.05);
 a.equal(g.shots.find(p=>p.source===gunner)?.commandAngle,0);
 for(let i=0;i<40&&!bomb.bombDetonated;i++)g.update(.025);
 a.equal(bomb.bombDetonated,true);a.equal(ant.hp,0);
});
