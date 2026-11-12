'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const config=require('./public/room-campaign.js').config;
function scene(map='livingroom-star'){const g=new FrontGame({},undefined,{map});g.start();g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.mission.stage=3;return g;}
test('enemy mortars prefer a reachable infantry cluster over a close tank, respecting minimum and maximum range',()=>{
 const g=scene(),m=g.addUnit(2,'mortar',1500,6000),tank=g.addUnit(0,'tank',1500,6200),infantry=['rifle','medic','sniper'].map((t,i)=>g.addUnit(0,t,1470+i*30,6420));m.roomWave=true;
 a.ok(infantry.includes(g.selectEnemyMortarTarget(m)));for(const t of infantry)t.y=6050;a.equal(g.selectEnemyMortarTarget(m),null);for(const t of infantry)t.y=6800;a.equal(g.selectEnemyMortarTarget(m),null);a.ok(tank.hp>0);
});
test('the actual enemy mortar attack lands at the infantry cluster, with the existing two-second warning',()=>{
 const g=scene(),m=g.addUnit(2,'mortar',1500,6000);m.roomWave=true;m.cooldown=0;g.addUnit(0,'leader',1500,6500);g.addUnit(0,'tank',1500,6200);for(const x of [1470,1500,1530])g.addUnit(0,'rifle',x,6420);
 g.updateRoomWaves=()=>{};g.updateBosses=()=>{};g.updateMission=()=>{};g.update(.05);const shell=g.mortarShells.find(p=>p.source===m);a.ok(shell);a.equal(shell.y,6420);a.ok(Math.abs(shell.landAt-g.time-2)<1e-7);
});
test('midgame wave pressure applies only to solo two-star troops, while mortar damage and count stay bounded',()=>{
 const g=scene(),u=g.addUnit(2,'ant',1500,6000);u.roomWave=true;g.time=599;const base=g.stats(u).damage;g.time=600;a.ok(Math.abs(g.stats(u).damage-base*1.2)<1e-7);u.roomWave=false;a.equal(g.stats(u).damage,base);u.roomWave=true;g.coop=true;a.equal(g.stats(u).damage,base);g.coop=false;
 for(const map of ['livingroom','livingroom-star3']){const other=scene(map),e=other.addUnit(2,'ant',1500,6000);e.roomWave=true;other.time=599;const damage=other.stats(e).damage;other.time=600;a.equal(other.stats(e).damage,damage);}
 const m=g.addUnit(2,'mortar',1500,6000);m.roomWave=true;a.ok(Math.abs(g.enemyDamageScale(m)-1.25*.6)<1e-7);a.equal(config.caps.mortar,4);
});
test('late portal surges remain stronger than closed waves with a reduced spike',()=>{
 const g=scene();g.time=900;g.roomBeat=()=>({density:1,name:'test'});g.bases[1].hp=g.bases[1].maxHp;const open=g.roomWavePlan();g.bases[1].hp=0;const closed=g.roomWavePlan();a.ok(open.count>closed.count);a.ok(open.interval<closed.interval);a.ok(open.count<=17);a.equal(config.lateWaves.openExtra,2);a.equal(config.lateWaves.openInterval,.8);
});
test('mortar escorts have a one-minute spawn interval and restart cleanly in the wave lab',()=>{
 const wave=require('./public/wave-test.js'),g=scene();g.time=600;g.northernSpawn=()=>({x:1500,y:6000});a.equal(g.spawnRoomMageGroup().length,5);g.units=[];g.time=659.999;a.equal(g.spawnRoomMageGroup(),null);g.time=660;a.equal(g.spawnRoomMageGroup().length,5);
 g.waveTest=true;wave.seek(g,720);a.equal(g.roomCampaign.nextMageEscortAt,720);a.equal(g.roomCampaign.waveSpawnDebt,0);
});
