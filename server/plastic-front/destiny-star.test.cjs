'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
const wave=require('./public/wave-test.js');

function game(map='livingroom-star'){
 const g=new FrontGame({},undefined,{map});g.start();return g;
}
function addTwos(g,type,count){
 const leader=g.commander(0);
 return Array.from({length:count},()=>{
  const u=g.addUnit(0,type,leader.x,leader.y);
  u.star=2;u.hp=u.maxHp=g.stats(u).hp;return u;
 });
}
const destiny=g=>g.pickups.find(p=>p.destinyStar);
function defeat(g,boss){g.damage(boss,1e9,g.commander(0));assert.equal(boss.hp,0);}

for(const map of ['livingroom-star'])test(map+' drops separate stars from the 9-minute mini and the 14-minute boss',()=>{
 const g=game(map);g.time=539.99;g.roomCampaign.bossCursor=3;
 g.roomEntry=g.northernSpawn=()=>({x:1500,y:6000});
 g.updateRoomBosses();
 assert.ok(!g.units.some(u=>u.miniBossMinute===9));
 g.time=540;g.updateRoomBosses();
 const mini=g.units.find(u=>u.type==='rhinoBeetle'&&u.miniBoss);
 assert.equal(mini.miniBossMinute,9);assert.equal(destiny(g),undefined);
 // A surviving mini retains the drop after the full version spawns and dies.
 g.time=600;g.updateRoomBosses();
 const boss=g.units.find(u=>u.type==='rhinoBeetle'&&u.boss&&!u.miniBoss);
 assert.equal(boss.bossScheduleIndex,3);
 defeat(g,boss);assert.equal(g.bossState.rewards,1);assert.equal(destiny(g),undefined);
 g.time=620;defeat(g,mini);const p=destiny(g);
 assert.ok(p.active);assert.ok(g.freePosition(p.x,p.y,24));assert.equal(g.bossState.rewards,1);
 g.time=720;g.updateRoomBosses();defeat(g,g.units.find(u=>u.type==='bikeRaider'&&u.boss&&!u.miniBoss));
 g.time=840;g.updateRoomBosses();defeat(g,g.units.find(u=>u.type==='hornet'&&u.boss&&!u.miniBoss));
 assert.equal(g.bossState.rewards,3);
 assert.deepEqual(g.pickups.filter(p=>p.destinyStar).map(p=>p.destinySource),[540,840]);
});

test('the standard desk defense does not drop a room destiny star',()=>{
 const regular=game('desktop');regular.time=840;
 regular.bossState.spawned=6;regular.updateBosses();
 defeat(regular,regular.units.find(u=>u.boss&&u.hp>0));assert.equal(destiny(regular),undefined);
});

test('a resumed room past a blocked preview can still earn its first star from that mini',()=>{
 const g=game();
 g.time=540;g.roomCampaign.bossCursor=3;
 g.roomEntry=g.northernSpawn=()=>({x:1500,y:6000});
 const prior=g.addUnit(2,'bladeGuard',1500,6000,true);
 Object.assign(prior,{boss:true,bossScheduleIndex:2});
 g.updateRoomBosses();assert.ok(!g.units.some(u=>u.miniBossMinute===9));
 g.time=595;defeat(g,prior);g.updateRoomBosses();
 assert.ok(!g.units.some(u=>u.miniBossMinute===9));
 const checkpoint=pack(g);delete checkpoint.fields.roomCampaign.destinyMiniSpawned;
 const restored=unpack(game(),checkpoint);
 restored.roomEntry=restored.northernSpawn=()=>({x:1500,y:6000});
 restored.time=612;
 restored.updateRoomBosses();
 const mini=restored.units.find(u=>u.type==='rhinoBeetle'&&u.miniBoss);
 assert.equal(mini.miniBossMinute,9);
 defeat(restored,mini);assert.equal(destiny(restored).active,true);
});

test('a restored consumed star stays consumed and the 14-minute boss grants its own star',()=>{
 const g=game();g.time=840;g.roomCampaign.bossCursor=5;
 const c=g.commander(0);g.pickups.push({x:c.x,y:c.y,destinyStar:true,active:false});
 const restored=unpack(game(),pack(g));
 restored.roomEntry=restored.northernSpawn=()=>({x:1500,y:6000});
 restored.updateRoomBosses();
 assert.ok(!restored.units.some(u=>u.miniBossMinute===9));
 defeat(restored,restored.units.find(u=>u.type==='hornet'&&u.boss&&!u.miniBoss));
 assert.equal(restored.bossState.rewards,1);
 const stars=restored.pickups.filter(p=>p.destinyStar);
 assert.equal(stars.length,2);
 assert.equal(stars[0].active,false);
 assert.equal(stars[1].destinySource,840);
 assert.equal(stars[1].active,true);
 restored.dropDestinyStar(restored.units.find(u=>u.type==='hornet'&&u.boss&&!u.miniBoss));
 assert.equal(restored.pickups.filter(p=>p.destinyStar).length,2);
});

test('legacy co-op checkpoints retain one living 9-minute boss and award one shared star on defeat',()=>{
 const g=new CoopGame();g.start();g.time=540;
 g.roomEntry=()=>({x:1500,y:6000});g.updateRoomMiniBosses();
 const checkpoint=pack(g);delete checkpoint.fields.roomCampaign.destinyMiniSpawned;
 const restored=unpack(new CoopGame(),checkpoint);
 restored.roomEntry=()=>({x:1500,y:6000});
 for(const owner of [0,1])restored.withOwner(owner,()=>restored.updateRoomMiniBosses());
 const eligible=restored.units.filter(u=>u.miniBossMinute===9);
 assert.equal(eligible.length,1);
 restored.withOwner(1,()=>defeat(restored,eligible[0]));
 assert.equal(restored.pickups.filter(p=>p.destinyStar).length,1);
 restored.updateRoomMiniBosses();
 assert.equal(restored.units.filter(u=>u.miniBossMinute===9).length,1);
});

test('wave test can rewind between the two Destiny Star bosses',()=>{
 const g=wave.fork(game());
 g.roomEntry=g.northernSpawn=()=>({x:1500,y:6000});
 wave.seek(g,840);g.phase='playing';g.updateRoomBosses();
 assert.ok(!g.units.some(u=>u.miniBossMinute===9));
 defeat(g,g.units.find(u=>u.type==='hornet'&&u.boss&&!u.miniBoss));
 assert.equal(destiny(g).destinySource,840);
 wave.seek(g,540);g.phase='playing';g.updateRoomBosses();
 defeat(g,g.units.find(u=>u.type==='rhinoBeetle'&&u.miniBoss));
 assert.equal(destiny(g).active,true);
});

test('only collection promotes every eligible class, retains health and stats, and survives checkpoints',()=>{
 let g=game();const c=g.commander(0),rifles=addTwos(g,'rifle',3);
 addTwos(g,'medic',3);addTwos(g,'tank',2);
 rifles[0].hp*=.25;rifles[1].hp*=.5;rifles[2].hp*=.75;
 const p={active:true,destinyStar:true,x:c.x+100,y:c.y};g.pickups.push(p);
 g.autoFuseUnits();assert.equal(g.fuseUnit('rifle',2),null);
 assert.equal(g.threeStarCount('rifle'),0);assert.equal(g.collectFieldSupply(p),false);
 g=unpack(new FrontGame(),pack(g));const saved=destiny(g),leader=g.commander(0);
 leader.x=saved.x;leader.y=saved.y;
 assert.equal(g.collectFieldSupply(saved),true);assert.equal(g.collectFieldSupply(saved),false);
 assert.equal(g.twoStarCount('tank'),2);assert.equal(g.recruitmentRemaining('rifle'),0);
 for(const type of ['rifle','medic']){
  const u=g.fusionCandidates(type,3)[0],one=g.stats({...u,star:1});
  assert.equal(g.stats(u).damage,one.damage*8);assert.equal(u.maxHp,one.hp*5.5);
  assert.equal(g.stats(u).heal,one.heal*7.2);
  assert.ok(Math.abs(u.hp/u.maxHp-(type==='rifle'?.5:1))<1e-8);
 }
 const resumed=unpack(new FrontGame(),pack(g));assert.equal(destiny(resumed).active,false);assert.equal(resumed.threeStarCount('medic'),1);
});

test('a dead commander cannot collect a star and co-op never combines squads',()=>{
 const g=new CoopGame();g.start();
 const first=g.commander(0),second=g.withOwner(1,()=>g.commander(0));
 second.x=first.x+5;second.y=first.y;
 const p={active:true,destinyStar:true,x:first.x,y:first.y};g.pickups.push(p);
 addTwos(g,'tank',2);g.withOwner(1,()=>addTwos(g,'tank',1));
 first.hp=second.hp=0;g.coopCollectPickups();assert.ok(p.active);
 first.hp=first.maxHp;g.coopCollectPickups();
 assert.equal(p.active,false);assert.equal(g.hasDestinyFusion(),true);
 assert.equal(g.withOwner(1,()=>g.hasDestinyFusion()),false);
 assert.equal(g.threeStarCount('tank'),0);
 addTwos(g,'tank',1);g.autoFuseUnits();
 assert.equal(g.threeStarCount('tank'),1);assert.equal(g.withOwner(1,()=>g.twoStarCount('tank')),1);
});

test('an early Destiny Star unlock survives a checkpoint and later promotes three twos',()=>{
 let g=game('livingroom-assault');g.phase='playing';g.time=720;g.updateRoomMission(0);
 const p=destiny(g);Object.assign(g.commander(0),{x:p.x,y:p.y});
 assert.equal(g.destinyStarTypes().length,0);
 assert.equal(g.collectFieldSupply(p),true);
 g=unpack(game(),pack(g));assert.equal(g.hasDestinyFusion(),true);
 addTwos(g,'tank',2);g.autoFuseUnits();assert.equal(g.threeStarCount('tank'),0);
 const leader=g.commander(0);
 for(let i=0;i<3;i++)g.addUnit(0,'tank',leader.x,leader.y);
 g.autoFuseUnits();assert.equal(g.threeStarCount('tank'),1);assert.equal(g.twoStarCount('tank'),0);
});

test('promoted snipers keep evolved parallel fire and lucky jeeps keep their three-star roulette',()=>{
 const g=game(),c=g.commander(0);
 const [sniper]=addTwos(g,'sniper',3),[lucky]=addTwos(g,'lucky',3);
 g.evolved.sniper=true;
 const p={active:true,destinyStar:true,x:c.x,y:c.y};g.pickups.push(p);
 assert.equal(g.collectFieldSupply(p),true);
 const point=g.commandFirePoint(sniper,450,0),shots=g.fireUnitProjectiles(sniper,point,{damage:100});
 assert.equal(shots.length,2);
 assert.deepEqual(shots.map(s=>s.damage),[50,50]);assert.notEqual(shots[0].y,shots[1].y);
 assert.ok(shots.every(s=>s.target===point&&s.commandAngle===0&&s.evoStyle==='pierce'));
 assert.equal(g.luckyOdds(lucky).missiles,.06);g.evolved.lucky=true;assert.equal(g.luckyOdds(lucky).missiles,.14);
});
