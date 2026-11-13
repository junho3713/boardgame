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

test('the real opening spawner eases in for two minutes, with no first-minute crisis spike',()=>{
 const g=scene();g.northernSpawn=()=>({x:1500,y:6800});const totals=[0,0],maxBatch=[0,0];
 for(let tick=0;tick<2400;tick++){
  g.time=tick/20;g.units=[];const before=g.roomCampaign.spawned;g.updateRoomWaves();
  const minute=Math.floor(g.time/60),added=g.roomCampaign.spawned-before;totals[minute]+=added;maxBatch[minute]=Math.max(maxBatch[minute],added);
  a.equal(g.roomBeat().density,1);a.ok(g.roomEnemyCount()<=g.roomWaveCap());
 }
 a.deepEqual(maxBatch,[1,2]);a.ok(totals[0]===6);a.ok(totals[1]>=20&&totals[1]<=22);
 g.time=119.95;a.equal(g.roomWaveCap(),16);g.time=120;a.equal(g.roomWaveCap(),24);a.equal(g.roomWavePlan().count,3);a.equal(g.roomWavePlan().interval,5);
});

test('uncleared opening waves respect the lower caps and co-op keeps its 1.8x spawn accounting',()=>{
 for(const g of [scene(),new CoopGame()]){
  g.start();g.units=g.units.filter(u=>u.team===0);g.northernSpawn=()=>({x:1500,y:6800});
  for(let tick=0;tick<2400;tick++){g.time=tick/20;g.updateRoomWaves();a.ok(g.roomEnemyCount()<=g.roomWaveCap());}
  a.equal(g.roomEnemyCount(),g.coop?Math.ceil(16*1.8):16);
 }
 const g=new CoopGame();let count=0;for(let i=0;i<5;i++){count+=g.roomWavePlan().count;g.coopSpawnRemainder=(1*1.8+g.coopSpawnRemainder)%1;}a.equal(count,9);
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
 const three=scene('livingroom-star3');for(let i=0;i<3;i++)elite(three,'rifle');three.autoFuseUnits();a.equal(three.alive(0).length,1);a.equal(three.alive(0)[0].star,3);a.equal(three.losses[0],0);
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
