'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),G=require('./game.js');
function battle(leads=[6,9],seed=1){const g=G.newGame([4,7],seed);g.phase='choose';g.players.forEach((p,i)=>{p.active=Math.max(0,[6,9,3].indexOf(leads[i]));p.team.forEach((u,to)=>{u.species=[6,9,3][to];u.maxHp=120;});});return g;}
const move=n=>({kind:'move',move:n}),commit=(g,i,action)=>G.act(g,i,{type:'commit',action});
function exchange(g,a,b){commit(g,0,a);commit(g,1,b);G.assert(g);return g.last;}
function next(g){G.act(g,0,{type:'ready'});G.act(g,1,{type:'ready'});if(g.phase==='replace')for(let i=0;i<2;i++)if(G.active(g,i).hp===0)G.act(g,i,{type:'replace',to:G.replacement(g,i)});}
test('first commit conceals choices and costs; only the owner sees their pending action',()=>{
 const g=battle();commit(g,0,move(1));const v=G.view(g,1);A.equal(v.pending[0],null);A.equal(v.locked[0],true);A.equal(v.players[0].team[0].energy,3);A.equal(v.players[0].team[0].hp,100);A.ok(!('rng'in v));A.deepEqual(G.view(g,0).pending[0],move(1));A.equal(v.history.length,0);A.throws(()=>commit(g,0,move(0)));commit(g,1,{kind:'guard'});A.equal(g.phase,'reveal');A.equal(g.last.names[0],'화염방사');
});
test('pierce rewards guard prediction and wrong reads are weak',()=>{
 const g=battle([6,6]),h=battle([6,6]);
 A.equal(exchange(g,move(2),{kind:'guard'}).hits[0].damage,38);
 A.equal(exchange(h,move(2),{kind:'focus'}).hits[0].damage,10);
 A.equal(g.last.hits[0].blocked,0);A.equal(g.last.hits[0].read,'success');A.equal(h.last.hits[0].read,'miss');
});
test('guard fatigue is 75%, 40%, 0 and resets after another action',()=>{
 const g=battle([6,6]);
 [14,8,0].forEach(blocked=>{A.equal(exchange(g,move(0),{kind:'guard'}).hits[0].blocked,blocked);next(g);});
 exchange(g,{kind:'focus'},{kind:'focus'});next(g);A.equal(exchange(g,move(0),{kind:'guard'}).hits[0].blocked,14);
});
test('switch costs incoming energy and changes type; pursuit punishes a switch',()=>{
 const g=battle([6,6]);let h=exchange(g,move(1),{kind:'switch',to:1});A.equal(h.hits[0].type,-6);A.equal(h.hits[0].damage,30);A.equal(h.hits[1],null);A.equal(G.active(g,1).energy,3);
 const p=battle([6,6]);h=exchange(p,move(0),{kind:'switch',to:1});A.equal(h.hits[0].counter,24);A.equal(h.hits[0].damage,36);A.equal(h.hits[0].read,'success');
});
test('burst exposure starts next turn and expires after one exchange',()=>{
 const g=battle([6,6]);let h=exchange(g,move(1),move(0));A.equal(h.hits[1].exposed,0);A.equal(G.active(g,0).exposed,1);next(g);
 h=exchange(g,{kind:'focus'},move(0));A.equal(h.hits[1].exposed,8);A.equal(G.active(g,0).exposed,0);
});
test('simultaneous damage allows double knockout; forced replacements are private and free',()=>{
 const g=battle([6,6]);G.active(g,0).hp=10;G.active(g,1).hp=10;exchange(g,move(0),move(0));A.equal(G.active(g,0).hp,0);A.equal(G.active(g,1).hp,0);nextWithoutReplace(g);
 A.equal(g.phase,'replace');G.act(g,0,{type:'replace',to:1});A.equal(G.view(g,1).replacements[0],null);A.equal(g.players[0].active,0);G.act(g,1,{type:'replace',to:2});A.equal(g.phase,'choose');A.equal(g.players[0].active,1);A.equal(G.active(g,0).energy,4);A.equal(g.turn,2);
});
function nextWithoutReplace(g){G.act(g,0,{type:'ready'});G.act(g,1,{type:'ready'});}
test('energy floor/ceiling, illegal switch and unaffordable move are enforced',()=>{
 const g=battle();G.active(g,0).energy=0;A.throws(()=>commit(g,0,move(0)));A.throws(()=>commit(g,0,{kind:'switch',to:0}));exchange(g,{kind:'focus'},{kind:'focus'});A.equal(G.active(g,0).energy,3);A.equal(G.active(g,1).energy,4);G.assert(g);
});
test('all KO draw and turn-limit tie-break are deterministic',()=>{
 const g=battle([6,6]);g.players.forEach(p=>p.team.forEach(u=>u.hp=0));G.active(g,0).hp=5;G.active(g,1).hp=5;exchange(g,move(0),move(0));A.equal(g.phase,'finished');A.equal(g.result.winner,null);
 const h=battle();h.turn=30;exchange(h,{kind:'guard'},{kind:'guard'});A.equal(h.phase,'finished');A.equal(h.result.winner,null);
 const j=battle();j.turn=30;j.players[0].team[2].hp=80;exchange(j,{kind:'guard'},{kind:'guard'});A.equal(j.result.winner,1);
});
test('AI cannot read the current secret action',()=>{
 const a=battle(),b=battle();a.pending[0]=move(2);b.pending[0]={kind:'switch',to:2};A.deepEqual(G.ai(a,1),G.ai(b,1));
});
test('12 short AI matches terminate with valid HP and energy in at most 30 turns',()=>{
 for(let seed=1;seed<=12;seed++){
  const g=battle([G.starters[seed%3],G.starters[(seed+1)%3]],seed);let steps=0;
  while(g.phase!=='finished'&&steps++<150){
   if(g.phase==='choose'){const a=G.ai(g,0),b=G.ai(g,1);exchange(g,a,b);}
   else if(g.phase==='reveal')next(g);
   else if(g.phase==='replace')for(let i=0;i<2;i++)if(G.active(g,i).hp===0)G.act(g,i,{type:'replace',to:G.replacement(g,i)});
   G.assert(g);
  }A.equal(g.phase,'finished');A.ok(g.turn<=30);
 }
});


test('growth starts with basic forms and public layered cards; wrong turn, covered and stale picks do not mutate the game',()=>{
 const g=G.newGame([4,7],2);A.equal(g.phase,'growth');A.deepEqual(g.players[0].team.map(u=>u.species),[4,7,1]);A.equal(G.accessible(g,0),false);A.equal(G.accessible(g,7),true);
 const before=JSON.stringify(g);A.throws(()=>G.act(g,1,{type:'grow',card:7,to:0,pick:0}));A.throws(()=>G.act(g,0,{type:'grow',card:0,to:0,pick:0}));A.throws(()=>G.act(g,0,{type:'grow',card:7,to:0,pick:-1}));A.equal(JSON.stringify(g),before);
 const action=G.growthAI(g,0);G.act(g,0,action);A.equal(g.growth.current,1);A.equal(g.growth.picks,1);A.throws(()=>G.act(g,0,action));A.ok(!('rng'in G.view(g,1)));G.assert(g);
});
function setBottom(g,kinds){
 const available=g.growth.market.map(x=>x.kind);kinds.forEach((kind,j)=>{const at=available.indexOf(kind);A.ok(at>=0);available.splice(at,1);g.growth.market[j+7].kind=kind;});available.forEach((kind,j)=>g.growth.market[j].kind=kind);
}
test('two evolutions change art, HP, move power and tactical bonuses while retaining training',()=>{
 const g=G.newGame([4,7],2);setBottom(g,['pursuit','evolve','evolve','stamina','evolve']);
 G.act(g,0,{type:'grow',card:7,to:0,pick:0});G.act(g,1,{type:'grow',card:8,to:1,pick:1});
 G.act(g,0,{type:'grow',card:9,to:0,pick:2});A.equal(g.players[0].team[0].species,5);A.equal(G.moveStats(g.players[0].team[0],0).bonus,32);
 G.act(g,1,{type:'grow',card:10,to:1,pick:3});G.act(g,0,{type:'grow',card:11,to:0,pick:4});
 const u=g.players[0].team[0];A.equal(u.species,6);A.equal(u.hp,120);A.equal(G.maxHp(u),120);A.equal(u.traits.pursuit,true);A.equal(G.moveStats(u,0).power,18);A.equal(G.moveStats(u,2).bonus,28);A.equal(G.canGrow(u,'evolve'),false);A.equal(G.canGrow(u,'pursuit'),false);
 A.equal(G.accessible(g,3),true);G.assert(g);
});
test('training cannot be stacked twice and invalid growth does not take a card',()=>{
 const g=G.newGame([4,7],2);setBottom(g,['pierce','stamina','pierce','evolve','evolve']);
 G.act(g,0,{type:'grow',card:7,to:0,pick:0});G.act(g,1,{type:'grow',card:8,to:0,pick:1});
 const snap=JSON.stringify(g);A.throws(()=>G.act(g,0,{type:'grow',card:9,to:0,pick:2}));A.equal(JSON.stringify(g),snap);A.equal(G.moveStats(g.players[0].team[0],2).bonus,30);
});
test('evolution and training bonuses reward a correct read in actual combat',()=>{
 const g=battle([6,9]);g.players[0].team[0].traits.pierce=true;
 const hit=exchange(g,move(2),{kind:'guard'}).hits[0];A.equal(hit.counter,36);A.equal(hit.damage,40);A.equal(hit.blocked,0);
 const h=battle([6,6]);h.players[0].team[0].traits.pursuit=true;const pursuit=exchange(h,move(0),{kind:'switch',to:1}).hits[0];A.equal(pursuit.counter,32);A.equal(pursuit.damage,44);
});
test('four picks each, readiness barrier and growth-to-battle AI matches work across 12 seeds',()=>{
 for(let seed=1;seed<=12;seed++){
  const g=G.newGame([4,7],seed);while(g.phase==='growth'){const i=g.growth.current;G.act(g,i,G.growthAI(g,i));G.assert(g);}
  A.equal(g.phase,'growthReady');A.equal(g.growth.log.filter(h=>h.player===0).length,4);A.equal(g.growth.log.filter(h=>h.player===1).length,4);
  G.act(g,0,{type:'beginBattle'});A.equal(g.phase,'growthReady');A.throws(()=>G.act(g,0,{type:'beginBattle'}));G.act(g,1,{type:'beginBattle'});A.equal(g.phase,'choose');
  for(let steps=0;g.phase!=='finished'&&steps<150;steps++){if(g.phase==='choose')exchange(g,G.ai(g,0),G.ai(g,1));else if(g.phase==='reveal')next(g);G.assert(g);}
  A.equal(g.phase,'finished');A.equal(g.growth.picks,8);
 }
});

