'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,ROSTER,TYPES}=require('./public/engine.js');
require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
function scene(map='livingroom-star'){
 const g=new FrontGame({},undefined,{map});g.start();g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];return g;
}
const enemy={team:2,type:'ant'};
function elite(g,type,star=2){const u=g.addUnit(0,type,1500,7500);u.star=star;u.hp=u.maxHp=g.stats(u).hp;return u;}

test('warm-up uses ordinary cadence without refill in solo or cooperative play',()=>{
 for(const g of [scene(),new CoopGame()]){
  g.start();g.units=g.units.filter(u=>u.team===0);
  const s=g.roomCampaign;g.roomEntry=()=>({x:1500,y:6800});
  a.equal(g.roomWavePlan().interval,3.2);a.equal(g.roomWaveCap(),g.coop?18:10);
  g.updateRoomWaves();a.equal(s.nextSpawnAt,4);a.equal(g.roomEnemyCount(),0);
  g.time=3.99;g.updateRoomWaves();a.equal(g.roomEnemyCount(),0);
  g.time=4;a.equal(g.updateRoomWaves(),g.coop?3:2);
  g.time=4.05;g.updateRoomWaves();a.equal(s.nextSpawnAt,7.2);
  g.time=7.2;a.equal(g.updateRoomWaves(),g.coop?4:2);
  a.ok(g.units.filter(u=>u.roomWave).every(u=>u.type==='ant'));
 }
});

test('the 30-second phase uses three ants per wave and keeps rapid refill off before 90 seconds',()=>{
 const g=scene(),s=g.roomCampaign;g.roomEntry=()=>({x:1500,y:6800});
 g.time=29.99;g.updateRoomWaves();a.equal(g.roomWaveCap(),10);
 g.time=30;s.nextSpawnAt=33.19;g.updateRoomWaves();
 a.equal(g.roomWavePlan().count,3);a.equal(g.roomWavePlan().interval,2.8);a.equal(g.roomWaveCap(),14);
 a.equal(s.nextSpawnAt,32.8);a.equal(g.roomEnemyCount(),2);
 g.time=32.8;a.equal(g.updateRoomWaves(),3);a.ok(g.units.every(u=>u.type==='ant'));
 g.time=60;s.nextSpawnAt=64;g.updateRoomWaves();a.equal(s.nextSpawnAt,62.8);
 g.units=[];g.time=89.99;s.nextSpawnAt=95;g.updateRoomWaves();a.equal(s.nextSpawnAt,95);
});

test('refill starts at 90 seconds below 22% of the shared wave cap and waits 1.2 seconds',()=>{
 for(const g of [scene(),new CoopGame()]){
  g.start();g.units=g.units.filter(u=>u.team===0);g.time=90;
  const state=g.roomCampaign;
  state.phaseAt=60;state.nextSpawnAt=97;
  const countAtThreshold=Math.ceil(g.roomWaveCap()*.22);
  const ants=Array.from({length:countAtThreshold},()=>g.addUnit(2,'ant',1500,6800,true));
  ants.forEach(u=>u.roomWave=true);
  g.updateRoomWaves();a.equal(state.nextSpawnAt,97);
  ants[0].hp=0;
  g.updateRoomWaves();a.equal(state.nextSpawnAt,91.2);
  state.nextSpawnAt=97;state.recoveryUntil=96;
  g.updateRoomWaves();a.equal(state.nextSpawnAt,97);
  state.recoveryUntil=0;
  const boss=g.addUnit(2,'stagBeetle',1600,6800,true);boss.boss=true;
  g.updateRoomWaves();a.equal(state.nextSpawnAt,97);
 }
});

test('the early phases alternate their own batch sizes on successful waves across save restore',()=>{
 const g=scene(),s=g.roomCampaign,entry=()=>({x:1500,y:6800});g.roomEntry=entry;
 g.time=60;s.nextSpawnAt=60;g.random=()=>.99;
 a.equal(g.roomWaveCap(),20);a.equal(g.roomWavePlan().interval,2.8);
 a.equal(g.updateRoomWaves(),3);a.equal(g.roomWavePlan().count,4);
 a.ok(g.units.some(u=>u.roomWave&&u.type!=='ant'));
 g.time=s.nextSpawnAt;g.roomEntry=()=>null;
 a.equal(g.updateRoomWaves(),0);a.equal(g.roomWavePlan().count,4);
 const restored=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
 restored.time=restored.roomCampaign.nextSpawnAt;restored.roomEntry=entry;
 a.equal(restored.updateRoomWaves(),4);a.equal(restored.roomWavePlan().count,3);
 restored.roomCampaign.alternatingWaves=1;
 for(const [at,count,interval,cap] of [[120,4,2.8,26],[180,10,5.4,44]]){
  restored.time=at;
  a.equal(restored.roomWavePlan().count,count);a.equal(restored.roomWavePlan().interval,interval);a.equal(restored.roomWaveCap(),cap);
 }
});

test('uncleared opening waves respect their caps and co-op advances its 1.8x allowance on actual waves',()=>{
 for(const g of [scene(),new CoopGame()]){
  g.start();g.units=g.units.filter(u=>u.team===0);g.roomEntry=()=>({x:1500,y:6800});
  for(let tick=0;tick<2400;tick++){g.time=tick/20;g.updateRoomWaves();a.ok(g.roomEnemyCount()<=g.roomWaveCap());}
  a.equal(g.roomEnemyCount(),g.coop?Math.ceil(20*1.8):20);
 }
 const g=new CoopGame();g.start();g.roomEntry=()=>({x:1500,y:6800});let count=0;
 for(let i=0;i<10;i++){
  g.time=i*10;g.roomCampaign.nextSpawnAt=g.time;g.units=g.units.filter(u=>u.team===0);
  count+=g.updateRoomWaves();
 }
 a.equal(count,52);a.ok(Math.abs(g.coopSpawnRemainder-.2)<1e-8);
});

test('5:30 uses the denser quiet beat and the floor retries low living waves outside boss combat and recovery',()=>{
 const g=scene(),s=g.roomCampaign;g.time=330;
 a.equal(g.roomBeat().name,'전진·재정비');a.equal(g.roomBeat().density,.55);
 a.ok(Math.abs(g.roomWavePlan().interval-3.84/.55*1.415)<1e-8);
 s.nextSpawnAt=340;
 for(let i=0;i<3;i++)Object.assign(g.addUnit(2,'rifle',1500,4000),{rareSupplyGuard:true});
 for(let i=0;i<8;i++)g.addUnit(2,'ant',1500,4000).roomWave=true;
 g.updateRoomWaves();a.equal(s.nextSpawnAt,331.2);
 s.nextSpawnAt=340;s.recoveryUntil=334;
 g.updateRoomWaves();a.equal(s.nextSpawnAt,340);a.equal(g.roomBeat().density,.3);
 s.recoveryUntil=0;g.addUnit(2,'stagBeetle',1500,4000).boss=true;
 g.updateRoomWaves();a.equal(s.nextSpawnAt,340);a.equal(g.roomBeat().name,'보스 전투');

 const blocked=scene(),bs=blocked.roomCampaign,entry=blocked.roomEntry;bs.nextSpawnAt=0;blocked.roomEntry=()=>null;
 blocked.updateRoomWaves();a.equal(bs.nextSpawnAt,2);
 blocked.time=1;blocked.roomEntry=entry;blocked.updateRoomWaves();a.equal(bs.nextSpawnAt,2);a.equal(blocked.roomEnemyCount(),0);
 blocked.time=2;a.equal(blocked.updateRoomWaves(),2);
});

test('each two-star class returns one fresh one-star with current upgrades, and only its next death yields salvage',()=>{
 for(const type of ROSTER){
  const g=scene();g.tech[0][type]=5;g.abilities.health=5;g.evolved[type]=true;
  const u=elite(g,type),cash=g.cash[0],salvaged=g.salvaged;u.poisonUntil=50;u.luckyChannels=[{next:0}];
  g.damage(u,1e9,enemy);const survivors=g.alive(0);a.equal(survivors.length,1,type);const v=survivors[0];
  a.equal(u.hp,0);a.notEqual(v.id,u.id);a.equal(v.type,type);a.equal(v.star,1);a.equal(v.hp,g.stats(v).hp);a.equal(v.maxHp,v.hp);a.equal(v.poisonUntil,undefined);a.equal(v.luckyChannels,undefined);
  a.equal(g.cash[0],cash);a.equal(g.salvaged,salvaged);a.equal(g.losses[0],1);
  g.damage(u,1e9,enemy);a.equal(g.alive(0).length,1);
  g.damage(v,1e9,enemy);a.equal(g.alive(0).length,0);a.equal(g.losses[0],2);a.equal(g.cash[0],cash+Math.floor(TYPES[type].cost*.25));
 }
});

test('ordinary troops, three-stars, enemies, training and regular-room rules do not gain recovery',()=>{
 for(const [map,star,team,mode] of [['livingroom-star',1,0,'pve'],['livingroom-star3',3,0,'pve'],['livingroom',2,0,'pve'],['livingroom-star',2,2,'pve'],['livingroom-star',2,0,'duel']]){
  const g=scene(map);g.mode=mode;const u=elite(g,'rifle',star);u.team=team;g.damage(u,1e9,team===0?enemy:{team:0,type:'rifle'});a.equal(u.hp,0);a.equal(g.units.filter(v=>v.hp>0).length,0);
 }
});

test('fusion consumes units without creating survivors, and a recovered recruit can join the next fusion',()=>{
 const g=scene();for(let i=0;i<3;i++)g.addUnit(0,'rifle',1500+i*20,7500);g.autoFuseUnits();const u=g.alive(0)[0];a.equal(u.star,2);a.equal(g.alive(0).length,1);
 g.damage(u,1e9,enemy);for(let i=0;i<2;i++)g.addUnit(0,'rifle',1500+i*20,7500);g.autoFuseUnits();a.equal(g.alive(0).length,1);a.equal(g.alive(0)[0].star,2);a.equal(g.losses[0],1);
 const three=scene('livingroom-star3');for(let i=0;i<3;i++)elite(three,'rifle');three.autoFuseUnits();a.equal(three.alive(0).length,3);a.equal(three.twoStarCount('rifle'),3);a.equal(three.losses[0],0);
});

test('co-op recovery preserves the defeated squad owner, upgrades and skin while commander death spares survivors',()=>{
 const g=new CoopGame();g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];
 for(const owner of [0,1])g.withOwner(owner,()=>{g.medicSkinId=owner?'rina':'classic';g.tech[0].medic=owner?5:1;elite(g,'medic');});
 const blue=g.owned(1).find(u=>u.type==='medic'),greenCash=g.cash[0],blueCash=g.withOwner(1,()=>g.cash[0]);g.damage(blue,1e9,enemy);
 const survivor=g.owned(1).find(u=>u.type==='medic');a.ok(survivor);a.equal(survivor.star,1);a.equal(survivor.appearance,'rina');a.equal(survivor.hp,g.stats(survivor).hp);a.equal(g.owned(0).filter(u=>u.type==='medic').length,1);a.equal(g.cash[0],greenCash);a.equal(g.withOwner(1,()=>g.cash[0]),blueCash);a.equal(g.coopOwner,0);
 const green=g.owned(0).find(u=>u.type==='medic');g.damage(g.withOwner(0,()=>g.commander(0)),1e9,enemy);
 a.equal(green.hp,green.maxHp);a.equal(green.star,2);a.equal(g.owned(0).filter(u=>u.type==='medic'&&u.star===1).length,0);a.ok(survivor.hp>0);
});

test('saved operations and cooperative snapshots retain exactly one returned recruit',()=>{
 const g=scene();g.addUnit(0,'leader',1500,7600);const u=elite(g,'rifle');g.damage(u,1e9,enemy);const restored=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
 a.equal(restored.alive(0).filter(v=>v.type==='rifle').length,1);a.equal(restored.alive(0).find(v=>v.type==='rifle').star,1);restored.damage(restored.units.find(v=>v.id===u.id),1e9,enemy);a.equal(restored.alive(0).filter(v=>v.type==='rifle').length,1);
});
