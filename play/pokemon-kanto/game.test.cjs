'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),G=require('./game.js');
const move=n=>({kind:'move',move:n}),commit=(g,i,action)=>G.act(g,i,{type:'commit',action});
function exchange(g,a,b){commit(g,0,a);commit(g,1,b);G.assert(g);return g.last;}
function next(g){G.act(g,0,{type:'ready'});G.act(g,1,{type:'ready'});if(g.phase==='replace')for(let i=0;i<2;i++)if(G.active(g,i).hp===0)G.act(g,i,{type:'replace',to:G.replacement(g,i)});}
test('first commit conceals choices and costs; only the owner sees their pending action',()=>{
 const g=G.newGame();commit(g,0,move(1));const v=G.view(g,1);A.equal(v.pending[0],null);A.equal(v.locked[0],true);A.equal(v.players[0].team[0].energy,3);A.equal(v.players[0].team[0].hp,100);A.ok(!('rng'in v));A.deepEqual(G.view(g,0).pending[0],move(1));A.equal(v.history.length,0);A.throws(()=>commit(g,0,move(0)));commit(g,1,{kind:'guard'});A.equal(g.phase,'reveal');A.equal(g.last.names[0],'화염방사');
});
test('pierce rewards guard prediction and wrong reads are weak',()=>{
 const g=G.newGame([6,6]),h=G.newGame([6,6]);
 A.equal(exchange(g,move(2),{kind:'guard'}).hits[0].damage,32);
 A.equal(exchange(h,move(2),{kind:'focus'}).hits[0].damage,10);
 A.equal(g.last.hits[0].blocked,0);A.equal(g.last.hits[0].read,'success');A.equal(h.last.hits[0].read,'miss');
});
test('guard fatigue is 75%, 40%, 0 and resets after another action',()=>{
 const g=G.newGame([6,6]);
 [14,8,0].forEach(blocked=>{A.equal(exchange(g,move(0),{kind:'guard'}).hits[0].blocked,blocked);next(g);});
 exchange(g,{kind:'focus'},{kind:'focus'});next(g);A.equal(exchange(g,move(0),{kind:'guard'}).hits[0].blocked,14);
});
test('switch costs incoming energy and changes type; pursuit punishes a switch',()=>{
 const g=G.newGame([6,6]);let h=exchange(g,move(1),{kind:'switch',to:1});A.equal(h.hits[0].type,-6);A.equal(h.hits[0].damage,30);A.equal(h.hits[1],null);A.equal(G.active(g,1).energy,3);
 const p=G.newGame([6,6]);h=exchange(p,move(0),{kind:'switch',to:1});A.equal(h.hits[0].counter,18);A.equal(h.hits[0].damage,30);A.equal(h.hits[0].read,'success');
});
test('burst exposure starts next turn and expires after one exchange',()=>{
 const g=G.newGame([6,6]);let h=exchange(g,move(1),move(0));A.equal(h.hits[1].exposed,0);A.equal(G.active(g,0).exposed,1);next(g);
 h=exchange(g,{kind:'focus'},move(0));A.equal(h.hits[1].exposed,8);A.equal(G.active(g,0).exposed,0);
});
test('simultaneous damage allows double knockout; forced replacements are private and free',()=>{
 const g=G.newGame([6,6]);G.active(g,0).hp=10;G.active(g,1).hp=10;exchange(g,move(0),move(0));A.equal(G.active(g,0).hp,0);A.equal(G.active(g,1).hp,0);nextWithoutReplace(g);
 A.equal(g.phase,'replace');G.act(g,0,{type:'replace',to:1});A.equal(G.view(g,1).replacements[0],null);A.equal(g.players[0].active,0);G.act(g,1,{type:'replace',to:2});A.equal(g.phase,'choose');A.equal(g.players[0].active,1);A.equal(G.active(g,0).energy,4);A.equal(g.turn,2);
});
function nextWithoutReplace(g){G.act(g,0,{type:'ready'});G.act(g,1,{type:'ready'});}
test('energy floor/ceiling, illegal switch and unaffordable move are enforced',()=>{
 const g=G.newGame();G.active(g,0).energy=0;A.throws(()=>commit(g,0,move(0)));A.throws(()=>commit(g,0,{kind:'switch',to:0}));exchange(g,{kind:'focus'},{kind:'focus'});A.equal(G.active(g,0).energy,3);A.equal(G.active(g,1).energy,4);G.assert(g);
});
test('all KO draw and turn-limit tie-break are deterministic',()=>{
 const g=G.newGame([6,6]);g.players.forEach(p=>p.team.forEach(u=>u.hp=0));G.active(g,0).hp=5;G.active(g,1).hp=5;exchange(g,move(0),move(0));A.equal(g.phase,'finished');A.equal(g.result.winner,null);
 const h=G.newGame();h.turn=30;exchange(h,{kind:'guard'},{kind:'guard'});A.equal(h.phase,'finished');A.equal(h.result.winner,null);
 const j=G.newGame();j.turn=30;j.players[0].team[2].hp=80;exchange(j,{kind:'guard'},{kind:'guard'});A.equal(j.result.winner,1);
});
test('AI cannot read the current secret action',()=>{
 const a=G.newGame(),b=G.newGame();a.pending[0]=move(2);b.pending[0]={kind:'switch',to:2};A.deepEqual(G.ai(a,1),G.ai(b,1));
});
test('12 short AI matches terminate with valid HP and energy in at most 30 turns',()=>{
 for(let seed=1;seed<=12;seed++){
  const g=G.newGame([G.starters[seed%3],G.starters[(seed+1)%3]],seed);let steps=0;
  while(g.phase!=='finished'&&steps++<150){
   if(g.phase==='choose'){const a=G.ai(g,0),b=G.ai(g,1);exchange(g,a,b);}
   else if(g.phase==='reveal')next(g);
   else if(g.phase==='replace')for(let i=0;i<2;i++)if(G.active(g,i).hp===0)G.act(g,i,{type:'replace',to:G.replacement(g,i)});
   G.assert(g);
  }A.equal(g.phase,'finished');A.ok(g.turn<=30);
 }
});

