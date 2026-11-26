'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {pack,unpack}=require('./public/autoplay.js');

test('saved auto-reinforcement settings cannot spend gold or queue troops after resuming',()=>{
 const create=()=>new FrontGame({},undefined,{map:'livingroom-star',realtimeSummons:true});
 const original=create();
 original.phase='playing';
 original.summonSlots=['rifle'];
 original.tech[0].rifle=1;
 original.cash[0]=300;
 Object.assign(original.supplyState(),{
  reinforcementPlan:{enabled:true,mode:'priority',targets:{rifle:3},priority:['rifle']},
  pendingAutoCycle:1
 });

 const game=unpack(create(),JSON.parse(JSON.stringify(pack(original))));
 const deployed=game.alive(0).length;
 for(const time of [30,60,90]){
  game.time=time;
  game.levelCheck();
  assert.equal(game.cash[0],300);
  assert.equal(game.alive(0).length,deployed);
  assert.equal(game.dropPods.length,0);
  assert.equal(game.phase,'playing');
 }
 assert.equal(game.summon(1),true);
 assert.equal(game.dropPods.length,1);
 assert.equal(game.cash[0],240);
});
