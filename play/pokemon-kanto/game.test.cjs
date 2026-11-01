'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('./game.js');
test('only first-generation Pokemon are used and every starter opens a valid 16-card expedition',()=>{
 for(const id of Object.keys(G.data))assert.ok(Number(id)>=1&&Number(id)<=151);
 for(const partner of G.starters){const g=G.newGame(partner,37);assert.equal(g.players[0].hand[0].id,partner);assert.equal(g.players[0].hand.length,5);assert.equal(g.players[0].deck.length,11);assert.equal(g.players[0].energy,1);G.assert(g);}
});
test('energy, capacity and turn ownership are enforced without losing cards',()=>{
 const g=G.newGame(25,99),p=g.players[0];p.energy=0;
 assert.throws(()=>G.act(g,0,{type:'play',uid:p.hand[0].uid,lane:0}),/에너지/);assert.equal(p.hand.length,5);
 assert.throws(()=>G.act(g,1,{type:'play',uid:g.players[1].hand[0].uid,lane:0}),/차례/);
 g.round=6;p.energy=6;for(let i=0;i<3;i++)G.act(g,0,{type:'play',uid:p.hand[0].uid,lane:0});
 assert.throws(()=>G.act(g,0,{type:'play',uid:p.hand[0].uid,lane:0}),/3마리/);G.assert(g);
});
test('evolution keeps identity and cheer, costs energy, and is limited to once per round',()=>{
 const g=G.newGame(4,1),p=g.players[0],uid=p.hand[0].uid;g.round=6;p.energy=6;
 G.act(g,0,{type:'play',uid,lane:2});G.act(g,0,{type:'cheer',uid});G.act(g,0,{type:'evolve',uid,to:5});
 const evolved=G.find(g,0,uid).unit;assert.equal(evolved.id,5);assert.equal(evolved.boost,2);assert.deepEqual(evolved.history,[4]);assert.equal(p.energy,2);
 assert.throws(()=>G.act(g,0,{type:'evolve',uid,to:6}),/한 번/);assert.throws(()=>G.act(g,0,{type:'cheer',uid}),/한 번/);G.assert(g);
});
test('Eevee branching evolution and location bonuses are explicit',()=>{
 const g=G.newGame(1,3),p=g.players[0];g.round=6;p.energy=6;p.hand[0].id=133;const uid=p.hand[0].uid;
 G.act(g,0,{type:'play',uid,lane:1});G.act(g,0,{type:'evolve',uid,to:134});assert.equal(G.find(g,0,uid).unit.id,134);
 assert.equal(G.scores(g).totals[0][1],12);G.assert(g);
});
test('eight complete matches terminate and remain valid after save/restore',()=>{
 for(let seed=1;seed<=8;seed++){
  let g=G.newGame(G.starters[seed%4],seed);
  for(let round=1;round<=6;round++){assert.equal(g.round,round);G.autoPlay(g,0);G.finishRound(g);G.assert(g);g=JSON.parse(JSON.stringify(g));G.assert(g);}
  assert.equal(g.phase,'finished');assert.ok([-1,0,1].includes(g.result.winner));assert.throws(()=>G.finishRound(g),/지금/);
 }
});
