'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
require('./public/support-toys.js');require('./public/sword-boss.js');
const {pose}=require('./public/hit-feedback.js');
function game(){const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=[];g.obstacles=[];g.defenses=[];g.buildings=[];g.structures=[];g.effects=[];return g;}
test('every ordinary boss and mini boss gains exactly ten percent while troops retain health',()=>{
 const g=game(),r=globalThis.FrontRoomCampaign.config;
 for(const type of ['stagBeetle','bayonetCaptain','bladeGuard','rhinoBeetle','bikeRaider','hornet','crimsonAce'])for(const miniBoss of [false,true]){
  const u=g.addUnit(2,type,1500,6000);Object.assign(u,{boss:true,miniBoss});const old=g.stats(u).hp/1.1;u.maxHp=old;u.hp=old*.4;g.roomHealthVersion=139;g.refreshRoomEnemyHealth();a.ok(Math.abs(u.hp/u.maxHp-.4)<1e-8);a.ok(Math.abs(u.maxHp/old-1.1)<1e-8);const hp=u.hp;g.refreshRoomEnemyHealth();a.equal(u.hp,hp);
 }
 a.equal(r.combat.bossHpScale,1.485);const regular=g.addUnit(2,'ant',1500,6000);a.ok(Math.abs(g.enemyHealthScale(regular)-.9)<1e-8);
});
test('basic reinforcements add fifteen/twenty percent on the same wave clock and never bank blocked waves',()=>{
 for(const [time,expected]of [[299,0],[300,15],[599,15],[600,20],[1000,20]]){
  const g=game();g.time=time;const s=g.roomCampaign;s.nextSpawnAt=0;s.phaseAt=g.roomPhase().at;g.upgradeRoomCampaign=()=>{};g.updateRoomScheduledTanks=()=>{};g.roomWavePlan=()=>({count:5,interval:1,forced:[],surge:false});g.roomCanSpawnMageGroup=()=>false;
  g.roomCanSpawn=()=>true;g.spawnRoomEnemy=type=>{const u={id:++g.serial,type,hp:1};g.units.push(u);return u;};
  for(let i=0;i<20;i++){s.nextSpawnAt=0;g.updateRoomWaves();}
  const extra=g.units.filter(u=>u.weakReinforcement);a.equal(extra.length,expected);a.ok(extra.every(u=>['ant','rifle'].includes(u.type)));a.equal(g.units.filter(u=>!u.weakReinforcement).length,100);
  g.spawnRoomEnemy=()=>null;for(let i=0;i<10;i++){s.nextSpawnAt=0;g.updateRoomWaves();}a.ok((s.weakWaveCredit||0)<1);
 }
});
test('electric stun reuses groggy presentation for one second without enabling vulnerability',()=>{
 const g=game();const c=g.addUnit(0,'leader',1500,6000),u=g.addSupportToy('toyStunner'),t=g.addUnit(1,'rifle',1600,6000);Object.assign(u,{x:c.x,y:c.y,toyNextAt:0});g.visible=g.lineClear=()=>true;g.random=()=>.99;
 const hp=t.hp;a.ok(g.useSupportToy(u));a.equal(t.hp,hp);a.equal(t.toyStunUntil,1);a.equal(t.groggyUntil,undefined);const e=g.effects.find(e=>e.kind==='bossGroggy');a.equal(e.target,t);a.equal(e.stun,true);a.equal(e.max,1);a.ok(pose(t,.5));a.equal(pose(t,1),null);
 const x=t.x;g.time=.999;g.move(t,100,0,.1,100);a.equal(t.x,x);g.time=1;g.move(t,100,0,.1,100);a.notEqual(t.x,x);
});
