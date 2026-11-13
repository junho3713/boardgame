'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js'),wave=require('./public/wave-test.js'),{config}=require('./public/room-campaign.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];g.roomEntry=g.northernSpawn=()=>({x:1500,y:6000});return g;}
const minis=g=>g.units.filter(u=>u.miniBoss&&u.hp>0);
test('eligible minutes preview the next main boss once and exclude main-boss minutes and the late rush',()=>{
 const g=scene(),expected={3:'stagBeetle',5:'bayonetCaptain',7:'bladeGuard',9:'rhinoBeetle',11:'bikeRaider',13:'hornet'};
 for(let minute=0;minute<=20;minute++){g.units=g.units.filter(u=>u.team===0);g.time=minute*60;g.updateRoomMiniBosses();a.equal(minis(g).length,expected[minute]?1:0,`minute ${minute}`);if(expected[minute])a.equal(minis(g)[0].type,expected[minute]);g.updateRoomMiniBosses();a.ok(minis(g).length<=1);}
 a.equal(g.bossState.spawned,0);a.equal(g.bossState.killed,0);
});
test('all mini bosses have exactly thirty percent of main-boss HP and attack damage at the same time and keep pattern timing',()=>{
 const g=scene();for(const minute of [3,5,7,9,11,13]){g.units=g.units.filter(u=>u.team===0);g.time=minute*60;g.updateRoomMiniBosses();const u=minis(g)[0],full={...u,miniBoss:false},small=g.stats(u),large=g.stats(full);near(small.hp,large.hp*.3);near(u.maxHp,small.hp);near(small.damage,large.damage*.3);near(small.rate,large.rate);near(small.speed,large.speed);near(small.defense,large.defense);}
 a.equal(config.combat.bossHpScale,1.485);
});
test('mini kills give ordinary resources without extra upgrade cards, boss kills, or main-boss delays',()=>{
 const g=scene();g.time=180;g.updateRoomMiniBosses();a.ok(g.objective().progress.includes('자원·경험치'));a.ok(!g.objective().progress.includes('추가 강화'));const u=minis(g)[0],before={...g.bossState},ready=g.roomCampaign.bossReadyAt,recovery=g.roomCampaign.recoveryUntil,cash=g.cash[0];g.damage(u,1e9,g.commander(0));a.equal(u.hp,0);a.deepEqual(g.bossState,before);a.equal(g.roomCampaign.bossReadyAt,ready);a.equal(g.roomCampaign.recoveryUntil,recovery);a.ok(g.cash[0]>cash);a.equal(g.kills,1);
});
test('a living mini keeps its health and attacks through the warning and coexists with the on-time main boss',()=>{
 const g=scene();g.time=180;g.updateRoomMiniBosses();const u=minis(g)[0];u.hp*=.6;const hp=u.hp;g.shots.push({source:u});g.mortarShells.push({source:u});
 for(const time of [210,232,240,241]){g.time=time;g.updateRoomBosses();a.equal(u.hp,hp);a.equal(minis(g).length,1);a.equal(u.miniBossWithdrawn,undefined);a.equal(g.shots.length,1);a.equal(g.mortarShells.length,1);}
 const main=g.units.find(v=>v.boss&&!v.miniBoss&&v.hp>0);a.ok(main);a.equal(g.bossState.spawned,1);a.equal(g.activeBoss(),main);a.equal(g.objective().target,main);a.ok(g.objective().progress.includes('미드 보스는 자원·경험치'));a.equal(g.kills,0);
 g.time=300;g.updateRoomMiniBosses();a.equal(minis(g).length,1);a.equal(minis(g)[0].id,u.id);
});
test('spawn failure retries only in its fifty-second minute window and pause never spawns',()=>{
 const g=scene();g.time=180;g.phase='paused';g.updateRoomMiniBosses();a.equal(minis(g).length,0);g.phase='playing';g.roomEntry=()=>null;g.updateRoomMiniBosses();a.equal(g.roomCampaign.miniMinute,0);g.time=225;g.roomEntry=()=>({x:1500,y:6000});g.updateRoomMiniBosses();a.equal(minis(g).length,1);g.units=g.units.filter(u=>u.team===0);g.time=351;g.updateRoomMiniBosses();a.equal(minis(g).length,0);g.time=420;g.updateRoomMiniBosses();a.equal(minis(g).length,1);
});
test('co-op uses one shared mini schedule and save restore does not duplicate or replay old minutes',()=>{
 const g=scene(true);g.time=180;g.updateRoomMiniBosses();for(const owner of [0,1])g.withOwner(owner,()=>g.updateRoomMiniBosses());a.equal(minis(g).length,1);const copy=unpack(scene(true),JSON.parse(JSON.stringify(pack(g))));copy.updateRoomMiniBosses();a.equal(minis(copy).length,1);near(copy.stats(minis(copy)[0]).hp,copy.stats({...minis(copy)[0],miniBoss:false}).hp*.3);
 const old=pack(scene());old.fields.time=305;delete old.fields.roomCampaign.miniMinute;const migrated=unpack(scene(),old);migrated.updateRoomMiniBosses();a.equal(minis(migrated).length,1);migrated.updateRoomMiniBosses();a.equal(minis(migrated).length,1);
});
test('wave lab exact-minute seeks rebuild the mini schedule in both directions without old enemies',()=>{
 const g=wave.fork(scene());g.roomEntry=g.northernSpawn=()=>({x:1500,y:6000});for(const [time,type]of [[300,'bayonetCaptain'],[780,'hornet'],[180,'stagBeetle']]){g.roomCampaign.antWaveCursor=99;wave.seek(g,time);a.equal(g.roomCampaign.antWaveCursor,0);a.equal(minis(g).length,0);g.phase='playing';g.updateRoomMiniBosses();a.equal(minis(g)[0].type,type);g.updateRoomMiniBosses();a.equal(minis(g).length,1);}
});
test('mini rhino and hornet percentage strikes use thirty percent too, including armor bypass',()=>{
 const g=scene();g.units=[];g.time=540;const t=g.addUnit(0,'rifle',1500,6000);t.hp=t.maxHp=1000;g.updateRoomMiniBosses();const rhino=minis(g)[0];Object.assign(rhino,{x:1440,y:6000,bikeAttack:{phase:'charge',angle:0,remaining:360,traveled:0,hit:[]}});g.updateBike(rhino,.1,g.bossPatternRules(rhino));near(1000-t.hp,150);
 g.units=[t];t.hp=1000;g.time=780;g.updateRoomMiniBosses();const hornet=minis(g)[0];hornet.bossAction={phase:'dive',started:g.time-.1,until:g.time,target:t,x:t.x,y:t.y,fromX:t.x,fromY:t.y};g.updateVenomDive(hornet,g.bossPatternRules(hornet));near(1000-t.hp,150);near(t.poisonDps,g.stats({...hornet,miniBoss:false}).damage*.3*config.patterns.venomDive.poisonPerSecond);
});
test('a mini keeps ordinary wave cadence and caps rather than imposing the main-boss reinforcement limit',()=>{
 const g=scene();g.time=780;const before=g.roomWavePlan(),cap=g.roomWaveCap();g.updateRoomMiniBosses();a.equal(minis(g).length,1);a.deepEqual(g.roomWavePlan(),before);a.equal(g.roomWaveCap(),cap);
});

test('jumping past a main warning keeps the live mini and other maps never spawn room minis',()=>{
 const g=scene();g.time=180;g.updateRoomMiniBosses();const mini=minis(g)[0],hp=mini.hp;g.time=241;g.updateRoomBosses();a.equal(minis(g).length,1);a.equal(mini.hp,hp);a.equal(g.units.filter(u=>u.boss&&!u.miniBoss&&u.hp>0).length,1);
 for(const map of ['backyard','desktop']){const other=new FrontGame({},undefined,{map});other.start();other.time=60;other.updateRoomMiniBosses();a.equal(minis(other).length,0);}
});

test('new games do not spawn minis before three minutes and existing saved minis are not forcibly removed',()=>{
 const g=scene();for(const time of [0,59.99,60,90,120,150,179.99]){g.time=time;g.updateRoomMiniBosses();a.equal(minis(g).length,0);}g.time=180;g.updateRoomMiniBosses();a.equal(minis(g).length,1);
 const old=scene(),u=old.addUnit(2,'stagBeetle',1500,6000,true);Object.assign(u,{boss:true,miniBoss:true,midBossVersion:1,miniBossMinute:1,bossPattern:'rhinoCharge'});old.time=120;const hp=u.hp;old.updateRoomMiniBosses();a.equal(u.hp,hp);a.equal(u.miniBossWithdrawn,undefined);a.equal(old.kills,0);
});

test('hornet previews once at thirteen minutes and the full fourteen-minute boss spawns beside a surviving preview',()=>{
 for(const killPreview of [false,true]){
  const g=scene();g.roomCampaign.bossCursor=5;g.time=779.99;g.updateRoomBosses();a.equal(minis(g).length,0);g.time=780;g.updateRoomBosses();const mini=minis(g)[0];a.equal(mini.type,'hornet');if(killPreview)g.damage(mini,1e9,g.commander(0));else mini.hp*=.4;const hp=mini.hp;
  const saved=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));saved.time=810;saved.updateRoomBosses();a.equal(saved.units.filter(u=>u.miniBoss&&u.type==='hornet').length,1);
  saved.time=840;saved.updateRoomBosses();const main=saved.units.filter(u=>u.boss&&!u.miniBoss&&u.hp>0);a.equal(main.length,1);a.equal(main[0].type,'hornet');a.equal(main[0].bossScheduleIndex,5);a.equal(saved.roomCampaign.bossCursor,6);near(main[0].hp,saved.stats(main[0]).hp);a.equal(saved.units.find(u=>u.id===mini.id).hp,hp);a.equal(minis(saved).length,killPreview?0:1);a.equal(saved.activeBoss(),main[0]);saved.updateRoomBosses();a.equal(saved.bossState.spawned,1);
  saved.time=900;saved.updateRoomBosses();a.equal(saved.bossState.spawned,1);a.equal(saved.units.filter(u=>u.miniBoss&&u.type==='hornet').length,1);
 }
});

test('a delayed hornet main boss waits for the previous boss and retries a blocked entry without skipping its schedule',()=>{
 const g=scene();g.time=720;g.roomCampaign.bossCursor=4;g.updateRoomBosses();const bike=g.units.find(u=>u.boss&&!u.miniBoss);a.equal(bike.type,'bikeRaider');g.time=840;g.updateRoomBosses();a.equal(g.roomCampaign.bossCursor,5);a.equal(g.units.filter(u=>u.type==='hornet').length,0);
 g.damage(bike,1e9,g.commander(0));g.time=855;g.updateRoomBosses();a.equal(g.roomCampaign.bossCursor,5);g.time=856;g.northernSpawn=()=>null;g.updateRoomBosses();a.equal(g.roomCampaign.bossCursor,5);g.northernSpawn=()=>({x:1500,y:6000});g.time=857;g.updateRoomBosses();a.equal(g.roomCampaign.bossCursor,6);a.ok(g.units.some(u=>u.type==='hornet'&&u.boss&&!u.miniBoss&&u.hp>0));
});

test('unbeaten minis survive sixteen minutes and the finale across solo and cooperative saves without giving false kill rewards',()=>{
 for(const coop of [false,true]){const g=scene(coop);g.time=780;g.updateRoomMiniBosses();const mini=minis(g)[0];mini.hp*=.35;const hp=mini.hp,id=mini.id;const copy=unpack(scene(coop),JSON.parse(JSON.stringify(pack(g))));const before={...copy.bossState},cash=copy.cash[0];
  for(const time of [832,840,900,960,1200,1260]){copy.time=time;copy.updateRoomMiniBosses();const u=copy.units.find(u=>u.id===id);a.equal(u.hp,hp);a.equal(u.miniBossWithdrawn,undefined);a.equal(minis(copy).length,1);}a.deepEqual(copy.bossState,before);a.equal(copy.cash[0],cash);
  const u=copy.units.find(u=>u.id===id);copy.damage(u,1e9,copy.commander(0));a.equal(u.hp,0);a.equal(minis(copy).length,0);a.equal(copy.bossState.rewards,before.rewards);a.equal(copy.bossState.killed,before.killed);a.ok(copy.cash[0]>cash);
 }
});
