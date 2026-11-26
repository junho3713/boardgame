'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');

function field(coop=false,map='livingroom-star'){
 const game=coop?new CoopGame():new FrontGame({},undefined,{map});
 game.start();
 game.units=game.units.filter(u=>u.team===0&&u.type==='leader');
 game.obstacles=[];game.pickups=[];game.structures=[];game.buildings=[];game.defenses=[];
 return game;
}

test('regular room support starts at 4:30, shares the wave budget and stays independent of supply guards',()=>{
 for(const coop of [false,true]){
  const game=field(coop);
  game.time=240;game.updateRareSupplies();
  const guard=game.rareSupplyGuards(game.pickups[0]).find(u=>u.type==='bubbleOctopus');
  assert.ok(guard);
  game.time=269.99;
  assert.equal(game.roomCanSpawn('bubbleOctopus'),false);
  game.time=270;game.roomCampaign.antWaveCursor=1;game.roomCampaign.nextSpawnAt=game.time;
  const budget=game.roomWavePlan().count;
  game.updateRoomWaves();
  const wave=game.units.filter(u=>u.roomWave);
  const octopuses=wave.filter(u=>u.type==='bubbleOctopus');
  assert.equal(octopuses.length,1);
  assert.equal(wave.length,budget);
  assert.equal(octopuses[0].team,2);
  game.time=335;
  assert.equal(game.roomCanSpawn('bubbleOctopus'),false);
  octopuses[0].hp=0;
  const restored=unpack(field(coop),JSON.parse(JSON.stringify(pack(game))));
  restored.time=334.99;assert.equal(restored.roomCanSpawn('bubbleOctopus'),false);
  restored.time=335;assert.equal(restored.roomCanSpawn('bubbleOctopus'),true);
 }
});

test('a normal non-room swarm gives a roaming octopus full XP crystals and combat gold',()=>{
 const game=field(false,'backyard');
 game.phase='playing';game.time=270;game.swarm.nextAt=270;
 game.updateSwarm();
 const octopus=game.units.find(u=>u.type==='bubbleOctopus');
 assert.ok(octopus?.assault);
 const commander=game.commander(0),cash=game.cash[0],gold=game.profile.gold;
 game.damage(octopus,1e6,commander);
 assert.equal(game.cash[0]-cash,20);
 assert.equal(game.profile.gold-gold,6);
 assert.equal(game.experienceDrops.at(-1).amount,32);
});

test('rare supply octopuses withdraw once with their squad and release their shields without a kill',()=>{
 const game=field(),released=[];
 game.releaseOctopusShields=u=>released.push(u.id);
 game.time=120;game.updateRareSupplies();
 const supply=game.pickups[0],octopus=game.rareSupplyGuards(supply).find(u=>u.type==='bubbleOctopus');
 const kills=game.kills;
 game.time=supply.expires;game.expireRareSupplies();game.expireRareSupplies();
 assert.deepEqual(released,[octopus.id]);
 assert.equal(game.kills,kills);
});
