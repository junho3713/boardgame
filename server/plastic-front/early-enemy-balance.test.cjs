'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js'),{config}=require('./public/room-campaign.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.buildings=[];g.structures=[];g.defenses=[];g.pickups=[];for(const c of g.units)Object.assign(c,{x:1500,y:6000});return g;}
test('bayonet infantry loses half its HP, a quarter of its damage and four base armor while the shield blade has its separate durability buff',()=>{
 const g=scene();g.time=120;const b=g.addUnit(2,'bayonet',1500,6000,true),v=g.addUnit(2,'bladeGuard',1700,6000,true),s=g.stats(b);
 a.equal(TYPES.bayonet.hp,160);a.equal(TYPES.bayonet.damage,18);near(s.hp,178.56);near(s.damage,37.125);a.equal(s.defense,12);near(g.stats(v).hp,178.56);a.equal(TYPES.bladeGuard.hp,160);a.equal(TYPES.bayonetCaptain.hp,640);a.equal(TYPES.bayonetCaptain.damage,32);
 a.ok(s.hp/g.stats(v).hp<1.2);a.ok(s.defense<g.stats(v).defense);
});
test('bayonets, bees and machine gunners obey distinct wave introduction times in solo and co-op',()=>{
 for(const coop of [false,true])for(const [type,at]of [['bayonet',180],['honeybee',240],['machinegun',360]]){const g=scene(coop);g.time=at-.01;a.equal(g.roomCanSpawn(type),false,`${coop} ${type}`);a.equal(g.spawnRoomEnemy(type),null);g.time=at;a.ok(g.roomCanSpawn(type));a.ok(g.spawnRoomEnemy(type));}
});
test('early bees and bayonets have bounded living counts and co-op scales the same introduction caps',()=>{
 for(const coop of [false,true])for(const [type,time,base]of [['bayonet',180,3],['honeybee',240,2],['honeybee',360,4],['honeybee',480,8]]){const g=scene(coop);g.time=time;const cap=coop?Math.ceil(base*g.coopSpawnScale):base;for(let i=0;i<cap;i++)a.ok(g.spawnRoomEnemy(type));a.equal(g.spawnRoomEnemy(type),null);a.equal(g.roomEnemyCount(type),cap);}
});
test('two-minute normal waves use rifles and blades with a gradual count and cap increase',()=>{
 const g=scene();g.time=119.99;a.equal(g.roomWaveCap(),16);g.time=120;const plan=g.roomWavePlan();a.equal(plan.count,3);a.equal(plan.interval,5);a.equal(g.roomWaveCap(),24);a.deepEqual(Object.keys(g.roomPhase().mix).sort(),['ant','bladeGuard','rifle']);
 a.equal(config.phases[0].mix.ant,1);a.equal(config.phases.find(p=>p.at===60).mix.rifle,2);a.ok(config.surges.rosters.filter(r=>r.at<360).every(r=>!r.types.includes('machinegun')));
});
test('the actual scheduler does not leak early bayonets, bees or machine gunners through forced surge choices',()=>{
 const g=scene();g.upgradeRoomCampaign=()=>false;g.updateRoomScheduledTanks=()=>{};const seen=new Set();let seed=112358;g.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let tick=0;tick<1440;tick++){g.time=tick/4;g.units=g.units.filter(u=>u.team===0);g.updateRoomWaves();for(const u of g.units.filter(u=>u.roomWave)){seen.add(u.type);if(g.time<180)a.ok(!['bayonet','honeybee','machinegun'].includes(u.type));else if(g.time<240)a.ok(!['honeybee','machinegun'].includes(u.type));else a.notEqual(u.type,'machinegun');}}
 a.ok(seen.has('rifle'));a.ok(seen.has('bayonet'));a.ok(seen.has('bombBug'));
});
test('early rare supplies and their approach guards use rifles instead of machine gunners',()=>{
 for(const time of [120,240]){const g=scene();g.time=time;g.nextRareSupply=time;g.updateRareSupplies();const p=g.pickups.find(p=>p.rareSupply);a.ok(p);const guards=g.rareSupplyGuards(p);a.ok(guards.some(u=>u.type==='rifle'));a.ok(guards.every(u=>u.type!=='machinegun'));if(time===120)a.ok(guards.every(u=>u.type!=='bayonet'));
  Object.assign(g.commander(0),{x:p.x,y:p.y});g.updateRareSupplySecurity();a.equal(p.ambushPending,false);a.ok(g.rareSupplyGuards(p).every(u=>u.type!=='machinegun'));}
});
test('saved infantry health migrates proportionally once and never heals dead troops or changes boss HP',()=>{
 const g=scene();g.time=240;const b=g.addUnit(2,'bayonet',1500,6000,true),dead=g.addUnit(2,'bayonet',1550,6000,true),boss=g.addUnit(2,'bayonetCaptain',1700,6000,true);boss.boss=true;boss.bossPattern='soldierDash';boss.hp=boss.maxHp=g.stats(boss).hp;
 const expected=g.stats(b).hp;for(const u of [b,dead])u.maxHp*=2;b.hp=b.maxHp*.4;dead.hp=0;g.roomHealthVersion=140;const bossHp=boss.hp;g.refreshRoomEnemyHealth();near(b.maxHp,expected);near(b.hp/b.maxHp,.4);a.equal(dead.hp,0);near(boss.hp,bossHp);a.equal(g.roomHealthVersion,config.combat.healthVersion);a.equal(g.refreshRoomEnemyHealth(),false);
 const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));near(copy.units.find(u=>u.id===b.id).hp/expected,.4);
});
test('near-start garrison gunner changes to a rifle without resurrecting or healing an existing guard',()=>{
 const g=scene();g.time=120;const u=g.addUnit(1,'machinegun',1500,5600,true);Object.assign(u,{guardianId:'room-garrison-approach-2',roomGarrison:true});u.hp=u.maxHp*.4;g.roomFortificationVersion=121;g.setupRoomFortifications();a.equal(u.type,'rifle');near(u.hp/u.maxHp,.4);a.equal(g.units.filter(t=>t.guardianId===u.guardianId).length,1);
 const h=scene(),v=h.addUnit(1,'machinegun',1500,5600,true);Object.assign(v,{guardianId:'room-garrison-approach-2',roomGarrison:true,hp:0});h.roomFortificationVersion=121;h.setupRoomFortifications();a.equal(v.hp,0);a.equal(v.type,'rifle');
});
test('the existing boss order keeps the bayonet captain ahead of the blade captain',()=>{a.deepEqual(config.bosses.slice(0,3).map(b=>[b.at,b.type]),[[240,'stagBeetle'],[360,'bayonetCaptain'],[480,'bladeGuard']]);});

test('ordinary shield blades gain HP and armor while captain and mini-captain HP, armor and damage stay unchanged',()=>{
 const g=scene();g.time=480;const u=g.addUnit(2,'bladeGuard',1500,6000,true),ordinary=g.stats(u);a.equal(ordinary.defense,38);
 near(ordinary.hp,160*(1+.12*8)*1.2);const boss={...u,boss:true,bossPattern:'wideSlash'},s=g.stats(boss);
 near(s.hp,140*(1+.12*8)*18*2*(config.patterns.wideSlash.hpScale||1)*config.combat.bossHpScale);a.equal(s.defense,32);near(g.stats({...boss,miniBoss:true}).hp,s.hp*.3);a.equal(TYPES.bladeGuard.damage,14);a.equal(TYPES.bladeGuard.rate,1.7);
});

test('a resumed shield blade keeps its health fraction through the durability migration without reviving corpses',()=>{
 const g=scene();g.time=120;const u=g.addUnit(2,'bladeGuard',1500,6000,true),dead=g.addUnit(2,'bladeGuard',1600,6000,true);u.maxHp=156.24;u.hp=u.maxHp*.4;dead.hp=0;g.roomHealthVersion=141;g.refreshRoomEnemyHealth();near(u.maxHp,178.56);near(u.hp/u.maxHp,.4);a.equal(dead.hp,0);a.equal(g.refreshRoomEnemyHealth(),false);
});
