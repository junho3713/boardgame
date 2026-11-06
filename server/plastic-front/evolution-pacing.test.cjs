'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const config=require('./public/room-campaign.js').config,pacing=config.evolutionPacing;
function scene(map='livingroom-star3'){const g=new FrontGame({},undefined,{map});g.start();g.units=g.units.filter(u=>u.team===0);g.obstacles=[];g.buildings=[];g.structures=[];g.defenses=[];return g;}
function baseline(fn){const before=pacing.enabled;pacing.enabled=false;try{return fn();}finally{pacing.enabled=before;}}
function near(x,y){a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);}
test('the fixed ten-minute power window and two-minute ramp do not depend on player evolution or stars',()=>{
 for(const map of ['livingroom','livingroom-star','livingroom-star3','desktop']){
  const g=scene(map);for(const [time,relief,progress]of [[0,false,0],[119.9,false,0],[599.9,false,0],[600,true,0],[659.9,true,0],[660,false,0],[720,false,.5],[780,false,1],[1140,false,1]]){
   g.time=time;const before=g.evolutionPace();a.equal(before.relief,relief);near(before.progress,progress);
   Object.keys(g.evolved).forEach(k=>g.evolved[k]=true);a.deepEqual(g.evolutionPace(),before);Object.keys(g.evolved).forEach(k=>g.evolved[k]=false);
  }
 }
 for(const map of ['backyard','desktop']){const g=scene(map);g.time=900;if(map==='desktop')g.mode='duel';a.equal(g.evolutionPace().progress,0);a.equal(g.evolutionPace().relief,false);}
});
test('room waves ease for sixty seconds, then add at most eighteen percent spawn rate and four live slots',()=>{
 const g=scene();g.roomBeat=()=>({density:1,name:'test'});
 for(const time of [120,599,660,690,720,750,780,900,970,1140]){g.time=time;const old=baseline(()=>({plan:g.roomWavePlan(),cap:g.roomWaveCap()})),now=g.roomWavePlan(),pace=g.evolutionPace();near(now.interval,old.plan.interval/pace.spawnScale);a.equal(now.count,old.plan.count);a.equal(g.roomWaveCap(),old.cap+pace.capExtra);}
 delete g.roomBeat;g.time=610;const old=baseline(()=>g.roomWavePlan()),now=g.roomWavePlan();a.ok(now.interval>old.interval);a.equal(g.roomBeat().name,'전력 전환 · 돌파');
});
test('quiet windows and active bosses retain their recovery and reinforcement rhythm',()=>{
 const g=scene();g.time=990;const old=baseline(()=>g.roomWavePlan()),now=g.roomWavePlan();a.equal(g.roomBeat().density,.65);near(now.interval,old.interval);
 g.time=1140;const boss=g.addUnit(1,'crimsonAce',1500,6000,true);Object.assign(boss,{boss:true,bossPattern:'rearBarrage'});
 const plain=baseline(()=>({plan:g.roomWavePlan(),cap:g.roomWaveCap(),damage:g.stats(boss).damage}));a.deepEqual(g.roomWavePlan(),plain.plan);a.equal(g.roomWaveCap(),plain.cap);near(g.stats(boss).damage,plain.damage);near(config.patterns.rearBarrage.bossDamageMultiplier,.85);
});
test('new elite waves gain bounded HP without extra damage or changing existing wounded units',()=>{
 const g=scene();g.time=780;g.northernSpawn=()=>({x:1500,y:6200});
 const old=baseline(()=>g.spawnRoomEnemy('stagBeetle')),now=g.spawnRoomEnemy('stagBeetle');near(now.hp,old.hp*1.12);near(now.maxHp,g.stats(now).hp);near(g.stats(now).damage,g.stats(old).damage);
 const ant=g.spawnRoomEnemy('ant');a.equal(ant.evolutionWaveHp,undefined);near(ant.maxHp,baseline(()=>g.stats(ant).hp));
 old.hp*=.4;const hp=old.hp;g.time=900;near(old.hp,hp);a.equal(old.evolutionWaveHp,undefined);
 now.hp*=.4;const ratio=now.hp/now.maxHp;g.time=960;g.syncEnemyGrowth();near(now.hp/now.maxHp,ratio);near(now.maxHp,g.stats(now).hp);
 const restored=unpack(scene(),JSON.parse(JSON.stringify(pack(g)))),copy=restored.units.find(u=>u.id===now.id);near(copy.evolutionWaveHp,1.12);near(copy.hp,now.hp);near(copy.maxHp,now.maxHp);
});
test('the actual weighted spawner increases melee elite share without multiplying mage escort groups',()=>{
 function run(enabled){const before=pacing.enabled;pacing.enabled=enabled;try{const g=scene();g.time=780;g.roomBeat=()=>({density:1,name:'test'});g.northernSpawn=()=>({x:1500,y:6200});g.roomCanSpawnMageGroup=()=>false;g.roomCampaign.tankScheduleVersion=170;g.roomCampaign.tanksDone=config.tanks.map(()=>true);let seed=12345,elite=0,total=0;
  g.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let wave=0;wave<400;wave++){g.units=g.units.filter(u=>u.team===0);g.roomCampaign.nextSpawnAt=0;g.updateRoomWaves();const spawned=g.units.filter(u=>u.team!==0&&u.roomWave);a.ok(spawned.length<=g.roomWavePlan().count);total+=spawned.length;elite+=spawned.filter(u=>pacing.eliteTypes.includes(u.type)).length;}
  return{elite,total};}finally{pacing.enabled=before;}}
 const old=run(false),now=run(true);a.equal(now.total,old.total);a.ok(now.elite>old.elite*1.08,JSON.stringify({old,now}));
});
test('desktop spawns gain a gradual ground wave cadence while boss pressure and type limits remain bounded',()=>{
 const g=scene('desktop');g.activeBoss=()=>null;
 for(const time of [60,119,599,610,660,720,780,1140]){g.time=time;const old=baseline(()=>g.pressure()),now=g.pressure(),pace=g.evolutionPace(),density=pace.relief?pacing.reliefDensity:pace.spawnScale;near(now.swarmInterval,old.swarmInterval/density);a.ok(now.combatCap<=Math.ceil(old.combatCap*1.18)+4);}
 g.time=780;g.desktopEntry=()=>({x:1200,y:400});g.swarm.spawned=7;g.swarm.nextAt=0;g.updateSwarm();const elites=g.units.filter(u=>u.team!==0&&pacing.eliteTypes.includes(u.type));a.ok(elites.length>0);for(const u of elites){near(u.evolutionWaveHp,1.12);near(u.maxHp,g.stats(u).hp);}
 const boss=g.addUnit(2,'rhinoBeetle',1200,400,true);boss.boss=true;g.activeBoss=()=>boss;const old=baseline(()=>g.pressure());a.deepEqual(g.pressure(),old);
});
test('cooperative pacing keeps the existing shared one-point-eight spawn accounting',()=>{
 const g=new CoopGame();g.start();g.units=g.units.filter(u=>u.team===0);g.time=780;g.roomBeat=()=>({density:1,name:'test'});const solo=scene('livingroom-star');solo.time=g.time;solo.roomBeat=g.roomBeat;
 near(g.roomWavePlan().interval,solo.roomWavePlan().interval);a.equal(g.roomWaveCap(),Math.ceil(solo.roomWaveCap()*1.8));let count=0;
 for(let i=0;i<5;i++){const base=solo.roomWavePlan().count;count+=g.roomWavePlan().count;g.coopSpawnRemainder=(base*1.8+g.coopSpawnRemainder)%1;}
 near(count,solo.roomWavePlan().count*5*1.8);
});
