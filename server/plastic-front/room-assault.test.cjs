'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
require('./public/two-star.js');
require('./public/sword-boss.js');
const {pack,unpack}=require('./public/autoplay.js');

const fresh=()=>{
 const game=new FrontGame({},undefined,{map:'livingroom-assault'});
 game.phase='playing';
 return game;
};
const bosses=game=>game.units.filter(u=>u.boss&&!u.roadCaptain).map(u=>u.type);
const tickBoss=(game,time)=>{game.time=time;game.updateRoomBosses();};

test('the three opening bosses have 20 percent less health, including on an older checkpoint',()=>{
 const game=fresh(),reference=new FrontGame({},undefined,{map:'livingroom-star'});
 for(const at of [180,330,480])tickBoss(game,at);
 const opening=game.units.filter(u=>u.boss&&!u.roadCaptain);
 assert.equal(opening.length,3);
 for(const boss of opening)assert.equal(boss.maxHp,reference.stats(boss).hp*.8);
 game.startRoomAssault();tickBoss(game,510);
 const rhino=game.units.find(u=>u.boss&&u.type==='rhinoBeetle');
 assert.equal(rhino.maxHp,reference.stats(rhino).hp);
 const boss=opening[0],newHp=boss.maxHp;
 boss.maxHp=reference.stats(boss).hp;boss.hp=boss.maxHp*.35;
 const saved=pack(game);saved.fields.roomHealthVersion--;
 const restored=unpack(fresh(),saved).units.find(u=>u.id===boss.id);
 assert.equal(restored.maxHp,newHp);
 assert.ok(Math.abs(restored.hp/newHp-.35)<1e-10);
});

test('portal destruction starts one rush and its bosses spawn on time even with survivors',()=>{
 const game=fresh(),portal=game.bases[1];
 assert.equal(game.battlefieldId(),'livingroom-assault');
 assert.equal(game.starExperiment,true);
 assert.equal(game.bossState.nextAt,180);
 for(const time of [179,180,330,480])tickBoss(game,time);
 assert.deepEqual(bosses(game),['stagBeetle','bayonetCaptain','bladeGuard']);
 game.time=500;
 game.damage(portal,1e9,game.commander(0));
 game.roomPortalDestroyed();
 const stars=game.pickups.filter(p=>p.destinyStar);
 assert.equal(stars.length,1);
 assert.ok(Math.hypot(stars[0].x-portal.x,stars[0].y-portal.y)<100);
 assert.equal(game.experienceDrops.reduce((sum,p)=>sum+p.amount,0),360);
 assert.equal(game.pickups.filter(p=>p.combatDrop==='gold').reduce((sum,p)=>sum+p.amount,0),200);
 assert.equal(game.roomAssaultRemaining(),180);
 assert.equal(game.roomWaveCap(),64);
 tickBoss(game,529);
 assert.equal(bosses(game).length,3);
 for(const time of [530,575,630,679.99])tickBoss(game,time);
 assert.deepEqual(bosses(game).slice(3),['rhinoBeetle','bikeRaider','hornet','crimsonAce']);
 tickBoss(game,680);
 tickBoss(game,681);
 assert.equal(bosses(game).filter(type=>type==='swordEmpress').length,1);
 assert.equal(game.roomFever(),false);
 const empress=game.trialBoss;
 empress.swords.blades.forEach(s=>s.mode='attack');
 game.damage(empress,1e9,game.commander(0));
 assert.equal(game.result,'win');
 assert.equal(game.resumeRoomEndless(),true);
 assert.equal(game.phase,'playing');
 assert.equal(game.resumeRoomEndless(),false);
 tickBoss(game,999);
 assert.equal(bosses(game).filter(type=>type==='swordEmpress').length,1);
});

test('the final boss lands an attack on a nearby commander despite repeated Retona flashes',()=>{
 const game=fresh();game.time=100;game.startRoomAssault();game.roomCampaign.assaultRushCursor=3;
 const commander=game.commander(0);
 game.units=[commander];game.updateSwarm=()=>{};game.updateDefenses=()=>{};
 game.updateRareSupplies=()=>{};game.levelCheck=()=>{};
 tickBoss(game,280);
 const boss=game.trialBoss,source={team:0,type:'lucky',x:commander.x,y:commander.y};
 commander.x=boss.x;commander.y=boss.y+70;
 const hp=commander.hp;
 while(game.bossIntro.remaining>0)game.update(.05);
 let flashes=0;
 for(let i=0;i<130&&game.trialStats.attacks===0;i++){
  if(i%16===0&&game.applyLuckyFlash(boss,{evolved:false,source}))flashes++;
  game.update(.05);
 }
 assert.equal(flashes,1);
 assert.equal(game.trialStats.attacks,1);assert.ok(commander.hp<hp);
});

test('the 12 minute overload drops the star near the commander and survives save/restore',()=>{
 let game=fresh();
 game.time=720;
 game.updateRoomMission(0);
 assert.equal(game.bases[1].hp,0);
 const star=game.pickups.find(p=>p.destinyStar),leader=game.commander(0);
 assert.ok(Math.hypot(star.x-leader.x,star.y-leader.y)<120);
 const snapshot=pack(game);
 game=new FrontGame();
 unpack(game,snapshot);
 assert.equal(game.battlefieldId(),'livingroom-assault');
 assert.equal(game.roomAssaultRemaining(),180);
 tickBoss(game,750);
 assert.deepEqual(bosses(game),['rhinoBeetle']);
});

test('fever multiplies combat rewards and front-phase rare supplies spawn upfield',()=>{
 const game=fresh();
 game.time=120;
 game.updateRareSupplies();
 const supply=game.pickups.find(p=>p.rareSupply);
 assert.ok(supply&&supply.y<game.commander(0).y);
 game.startRoomAssault();
 const ant=game.addUnit(2,'ant',850,6600,true);
 const cash=game.cash[0];
 game.damage(ant,1e9,game.commander(0));
 assert.ok(Math.abs(game.cash[0]-cash-8)<1e-8);
 assert.equal(game.experienceDrops.find(p=>!p.boss).amount,7*1.6);
 const gold=game.pickups.find(p=>p.combatDrop==='gold');
 Object.assign(game.commander(0),{x:gold.x,y:gold.y});
 const before=game.cash[0];
 assert.equal(game.collectFieldSupply(gold),true);
 assert.equal(game.cash[0]-before,40);
 assert.equal(game.collectFieldSupply(gold),false);
});
