const {test}=require('node:test'),A=require('node:assert/strict'),G=require('./game.js');
function playTo(g,phase,limit=350){for(let n=0;g.phase!==phase&&g.phase!=='finished'&&n<limit;n++){const a=G.ai(g);A.ok(a,'No legal action in '+g.phase);G.act(g,g.current,a);G.assert(g);}return g;}
test('base and Pantheon AI games finish without deadlocks, hidden choices leaking or invalid money',()=>{
 for(const pantheon of [false,true])for(let seed=1;seed<=12;seed++){
  const g=G.newGame(pantheon,seed);playTo(g,'finished');A.equal(g.phase,'finished',JSON.stringify({phase:g.phase,tasks:g.tasks,turn:g.turn}));
  A.ok(g.turn<=90);A.ok(g.result.scores.every(s=>Number.isInteger(s.total)));
 }
});
test('hidden cards, future Wonders, progress box and initial god choices are private',()=>{
 const g=G.newGame(true,13),v=G.view(g,1);A.equal(v.market[2].id,null);A.ok(!v.box);A.ok(!v.mythDecks);A.ok(!v.draft.rest);A.ok(!('rng'in v));
});
test('cost calculation prices opponent raw production, flexible production, chain and discounts correctly',()=>{
 const g=G.newGame(false,1);g.phase='play';g.players[0].city=['brown_quarry'];g.players[1].city=['brown_shelf_quarry'];let c=G.cost(g,0,'blue_aqueduct');A.equal(c.trade,8);
 g.players[0].city.push('yellow_stone_reserve');A.equal(G.cost(g,0,'blue_aqueduct').total,2);
 g.players[0].city.push('blue_baths');A.equal(G.cost(g,0,'blue_aqueduct').total,0);A.equal(G.cost(g,0,'blue_aqueduct').chain,true);
 g.players[0].city=[];g.players[0].tokens=['token_masonry'];A.equal(G.cost(g,0,'blue_aqueduct').total,4);
 g.players[0].tokens=['engineering'];A.equal(G.cost(g,0,'blue_aqueduct').total,1);
});
test('offerings are discounts, sanctuary applies once, gate doubles slot and invalid offering indexes fail',()=>{
 const g=G.newGame(true,2);g.age=2;g.pantheonSlots[0]={id:'gate',used:false};g.players[0].offerings=[2,3,4];
 A.equal(G.invokeCost(g,0,0),6);A.equal(G.invokeCost(g,1,0),16);A.equal(G.invokeCost(g,0,0,[0,1]),1);
 g.players[0].wonders=[{id:'sanctuary',built:true}];A.equal(G.invokeCost(g,0,0,[0]),2);A.throws(()=>G.invokeCost(g,0,0,[0,0]));A.throws(()=>G.invokeCost(g,0,0,[-1]));
});
test('temple sets, blue tie breaker inputs, Astarte and mysticism score correctly',()=>{
 const g=G.newGame(true,1),p=g.players[0];p.city=['temple_greece','temple_rome'];p.coins=8;p.astarte=5;p.tokens=['mysticism'];p.myths=['greece'];p.offerings=[2,3];
 const s=G.score(g,0);A.equal(s.temples,12);A.equal(s.coins,7);A.equal(s.progress,6);A.equal(s.total,25);
});
test('military supremacy ends instantly and Minerva blocks before its square',()=>{
 const g=G.newGame(true,2);g.phase='play';g.current=0;g.age=2;g.pawn=7;g.pantheonSlots[0]={id:'mars',used:false};g.players[0].coins=30;G.act(g,0,{type:'invoke',slot:0});A.equal(g.result.winner,0);
 const h=G.newGame(true,2);h.phase='play';h.current=0;h.age=2;h.pawn=7;h.minerva=9;h.pantheonSlots[0]={id:'mars',used:false};h.players[0].coins=30;G.act(h,0,{type:'invoke',slot:0});A.equal(h.pawn,8);A.equal(h.minerva,null);A.notEqual(h.phase,'finished');
});
test('science victory, law pair progress and Enki work',()=>{
 const g=G.newGame(true,1);g.phase='play';g.current=0;g.age=2;g.players[0].coins=30;g.players[0].city=['green_scriptorium','green_pharmacist','green_workshop','green_apothecary','green_university'];g.pantheonSlots[0]={id:'ishtar',used:false};G.act(g,0,{type:'invoke',slot:0});A.equal(g.result.reason,'과학 패권');
 const h=G.newGame(true,1);h.phase='play';h.age=2;h.current=0;h.players[0].coins=30;h.players[0].tokens=['token_law'];h.pantheonSlots[0]={id:'ishtar',used:false};G.act(h,0,{type:'invoke',slot:0});A.equal(h.phase,'choice');A.equal(h.tasks[0].kind,'progress');
});
test('all fifteen divine effects can resolve, including empty targets and choice continuations',()=>{
 for(const id of Object.keys(G.C).filter(id=>G.C[id].type==='god'&&id!=='gate')){
  const g=G.newGame(true,50);g.phase='play';g.current=0;g.age=2;g.players.forEach(p=>{p.coins=100;p.city=['brown_lumber_yard','gray_press','green_workshop'];p.wonders=[{id:p===g.players[0]?'wonder_the_pyramids':'wonder_the_sphinx',built:false,removed:false,under:null}];});
  g.pantheonSlots[0]={id,used:false};g.discard=['blue_altar'];g.enki=id==='enki'?g.box.splice(0,2):[];
  G.act(g,0,{type:'invoke',slot:0});let count=0;while(g.phase==='choice'&&count++<15)G.act(g,g.current,G.ai(g));
  A.ok(count<15,id);G.assert(g);A.ok(g.players[0].gods.includes(id));
 }
});
test('Age I myth identity does not appear in opponent view or log',()=>{
 const g=G.newGame(true,21);g.phase='choice';g.current=0;g.flow={actor:0,replay:false};g.tasks=[{id:999,player:0,kind:'myth',options:['mars','minerva'],myth:'rome',title:'신 선택'}];g.mythDecks.rome=['neptune'];
 G.act(g,0,{type:'choice',task:999,value:'minerva',position:5});const v=G.view(g,1);A.equal(v.pantheonSlots[5].id,null);A.ok(!JSON.stringify(v.log).includes('미네르바'));A.equal(G.view(g,0).pantheonSlots[5].id,'minerva');
});

