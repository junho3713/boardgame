'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('./game.js');
function pick(g,index,market){const c=g.market[market].card,p=g.players[index];const same=p.team.findIndex(u=>u.species===c.species);G.draft(g,index,{market,slot:same<0?0:same,position:1});G.finishPrepare(g,index);}
test('weak first-generation teams and covered-card draft are enforced',()=>{
 const g=G.newGame([25,4],1);G.assert(g);assert.ok(g.players.every(p=>p.team.length===3&&p.team.every(u=>u.species<=151&&G.stage(u.species)===0)));
 assert.equal(G.accessible(g,3),false);assert.throws(()=>G.draft(g,0,{market:3,slot:0}),/덮이지/);
 pick(g,0,7);pick(g,1,8);assert.equal(G.accessible(g,3),true);assert.equal(g.market[3].hidden,false);G.assert(g);
});
test('evolution needs both the correct card and experience; training remains',()=>{
 const g=G.newGame([25,4],2),u=g.players[0].team[0];g.phase='prepare';g.current=0;u.xp=2;u.training=1;
 assert.throws(()=>G.evolve(g,0,0,26),/진화 카드/);g.players[0].evolutions.push(26);u.xp=1;assert.throws(()=>G.evolve(g,0,0,26),/경험치/);
 u.xp=2;G.evolve(g,0,0,26);assert.equal(u.species,26);assert.equal(u.xp,0);assert.equal(u.training,1);assert.equal(g.players[0].evolutions.length,0);G.assert(g);
});
test('new skills are inserted without shuffling existing program entries',()=>{
 const g=G.newGame([1,7],3),before=JSON.parse(JSON.stringify(g.players[0].program));g.market[7].card={kind:'move',move:'combo'};
 G.draft(g,0,{market:7,slot:0,position:1});const p=g.players[0].program;assert.deepEqual(p[1],{slot:0,move:'combo'});assert.deepEqual([p[0],...p.slice(2)],before);G.assert(g);
});
test('each team may intervene once per battle and old battle commands are rejected',()=>{
 const g=G.newGame([25,4],4);for(let i=0;i<8;i++)G.botDraft(g,g.current);assert.equal(g.phase,'battle');
 assert.throws(()=>G.command(g,0,{kind:'guard',battleId:'old'}),/현재 배틀/);
 G.command(g,0,{kind:'guard',battleId:g.battle.id});assert.equal(g.battle.guard[0],18);assert.throws(()=>G.command(g,0,{kind:'ultimate',battleId:g.battle.id}),/이미 개입/);
 G.command(g,1,{kind:'ultimate',battleId:g.battle.id});assert.equal(g.battle.ultimate[1],true);G.stepBattle(g);G.assert(g);
});
test('twelve seeded matches finish within five battles with conserved valid teams',()=>{
 for(let seed=1;seed<=12;seed++){const g=G.newGame([G.starters[seed%4],G.starters[(seed+1)%4]],seed);
  for(let safety=0;safety<600&&g.phase!=='finished';safety++){
   if(g.phase==='draft')G.botDraft(g,g.current);
   else if(g.phase==='battle'){G.botCommand(g,0);G.botCommand(g,1);G.stepBattle(g);}
   else if(g.phase==='battleResult'){G.continueGame(g,0);G.continueGame(g,1);}
   else throw Error('stalled '+g.phase);
   G.assert(g);
  }assert.equal(g.phase,'finished','seed '+seed);assert.equal(Math.max(...g.points),3);assert.ok(g.round<=5);
 }
});
