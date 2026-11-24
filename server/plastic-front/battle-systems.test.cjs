'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {FrontGame} = require('./public/engine.js');
require('./public/two-star.js');
const {CoopGame} = require('./public/coop-engine.js');
const {pack, unpack} = require('./public/autoplay.js');

const pre = ['refreshTwoStarHealth', 'autoFuseUnits', 'updateSupplyStrikes', 'expireRareSupplies', 'updateRareSupplySecurity', 'captureBlockMineTargets'];
const simulation = ['updateLuckyFlashes', 'updateMission', 'updateSwarm', 'updateBosses', 'updateEvolutionCombat', 'updateSupportToys', 'updateMedicHealing', 'collectFieldSupply', 'updateMortars', 'levelCheck'];
const post = ['updateBlockMines', 'updateRareSupplies'];

function field(game = new FrontGame({}, undefined, {map:'livingroom-star'})) {
 game.start();
 const leader = game.commander(0);
 game.units = game.units.filter(u => u.team === 0 && u.type === 'leader');
 const ant = game.addUnit(2, 'ant', leader.x + 360, leader.y);
 const medic = game.addUnit(0, 'medic', leader.x - 32, leader.y + 36);
 game.pickups = [{x:leader.x, y:leader.y, active:true}];
 game.blockMines = [{source:leader}];
 return {game, ant, medic};
}

function trace(game, hooks = {}) {
 const seen = [];
 for (const name of [...pre, ...simulation, ...post]) {
  const original = game[name];
  assert.equal(typeof original, 'function', name);
  game[name] = function (...args) {
   assert.equal(this, game);
   seen.push(name);
   if (name === 'captureBlockMineTargets') return original.call(this);
   if (hooks[name]) return hooks[name](...args);
  };
 }
 return seen;
}

test('public battle tick runs each stage once, honors the delta cap, and resolves mines against pre-movement coordinates', () => {
 const {game, ant, medic} = field(), start = game.time, before = {x:ant.x, y:ant.y}, pickup = game.pickups[0];
 const seen = trace(game, {
  updateMission(dt) { assert.equal(dt,.05); assert.equal(game.time,start+.05); ant.x += 22; },
  updateSupportToys(dt) { assert.equal(dt,.05); },
  updateMedicHealing(u) { assert.equal(u,medic); },
  collectFieldSupply(p) { assert.equal(p,pickup); },
  updateBlockMines(previous,since) { assert.equal(since,start); assert.deepEqual(previous.get(ant),before); }
 });
 game.update(.4);
 assert.deepEqual(seen,[...pre,...simulation,...post]);
});

test('a running boss intro only consumes its countdown; an already open choice pauses the simulation clock', () => {
 const {game} = field();
 game.bossIntro = {remaining:.5};
 const seen = trace(game);
 game.update(.2);
 assert.deepEqual(seen,[...pre,'updateRareSupplies']);
 assert.equal(game.time,0);
 assert.equal(game.bossIntro.remaining,.45);
 seen.length = 0;
 game.phase = 'choice';
 game.update(.2);
 assert.deepEqual(seen,['captureBlockMineTargets','updateRareSupplies']);
 assert.equal(game.bossIntro.remaining,.45);
 assert.equal(game.time,0);
});

test('a boss intro starting mid-tick and a level choice both run post-tick mine checks after elapsed time', () => {
 for (const stop of ['updateBosses','levelCheck']) {
  const {game} = field();
  const seen = trace(game,{[stop]() {
   if (stop === 'updateBosses') game.bossIntro = {remaining:1};
   else game.phase = 'choice';
  }});
  game.update(.025);
  assert.equal(game.time,.025);
  assert.deepEqual(seen,[...pre,...simulation.slice(0,simulation.indexOf(stop)+1),...post]);
 }
});

test('interleaved games and an old-format save retain independent clocks and mine target identities', () => {
 const a = field(), b = field();
 a.game.time = 8; b.game.time = 21;
 const saved = JSON.parse(JSON.stringify(pack(b.game)));
 assert.ok(!Object.hasOwn(saved.fields,'systems') && !Object.hasOwn(saved.fields,'battleSystems'));
 const restored = unpack(new FrontGame(),saved);
 const restoredAnt = restored.units.find(u => u.id === b.ant.id);
 assert.notEqual(restoredAnt,b.ant);
 assert.equal(restored.blockMines[0].source,restored.commander(0));
 const restoredCalls = trace(restored,{updateBlockMines(previous,since) {
  assert.equal(since,21); assert.ok(previous.has(restoredAnt)); assert.ok(!previous.has(a.ant));
 }});
 const outerCalls = trace(a.game,{
  updateMission() { restored.update(.025); },
  updateBlockMines(previous,since) {
   assert.equal(since,8); assert.ok(previous.has(a.ant)); assert.ok(!previous.has(restoredAnt));
  }
 });
 a.game.update(.05);
 assert.equal(outerCalls.filter(name => name === 'updateBlockMines').length,1);
 assert.equal(restoredCalls.filter(name => name === 'updateBlockMines').length,1);
 assert.equal(a.game.time,8.05); assert.equal(restored.time,21.025); assert.equal(b.game.time,21);
});

test('co-op heal and pickup stages use their original player contexts', () => {
 const {game} = field(new CoopGame());
 game.withOwner(1,() => game.addUnit(0,'medic',game.commander(0).x,game.commander(0).y));
 const healOwners = [], pickupOwners = [];
 trace(game,{updateMedicHealing(medic) { healOwners.push([medic.coopOwner,game.coopOwner]); }});
 game.coopCollectPickups = () => pickupOwners.push(game.coopOwner);
 game.update(.025);
 assert.deepEqual(healOwners,[[0,0],[1,1]]);
 assert.deepEqual(pickupOwners,[0]); assert.equal(game.coopOwner,0);
});
