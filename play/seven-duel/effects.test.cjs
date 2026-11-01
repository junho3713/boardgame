const {test}=require('node:test'),A=require('node:assert/strict'),G=require('./game.js');
test('a divine action preserves the card structure, and Astarte coins survive ordinary losses',()=>{
 const g=G.newGame(true,7);g.phase='play';g.current=0;g.age=2;g.players[0].coins=20;g.pantheonSlots[0]={id:'astarte',used:false};const before=JSON.stringify(g.market);G.act(g,0,{type:'invoke',slot:0});A.equal(JSON.stringify(g.market),before);A.equal(g.players[0].astarte,7);A.equal(g.current,1);
 g.pantheonSlots[5]={id:'neptune',used:false};g.players[1].coins=20;G.act(g,1,{type:'invoke',slot:5});G.act(g,1,{type:'choice',task:g.tasks[0].id,value:'east2'});g.players[0].coins=2;G.act(g,1,{type:'choice',task:g.tasks[0].id,value:'east5'});A.equal(g.players[0].coins,0);A.equal(g.players[0].astarte,7);
});
test('Isis constructs free, Anubis retains immediate shields, and the unused eighth Wonder is removed',()=>{
 const g=G.newGame(true,4);g.phase='play';g.current=0;g.age=2;g.players[0].coins=10;g.players[0].wonders=[{id:'wonder_the_colossus',built:false,removed:false,under:null}];g.pantheonSlots[0]={id:'isis',used:false};g.discard=['blue_baths'];
 G.act(g,0,{type:'invoke',slot:0});G.act(g,0,{type:'choice',task:g.tasks[0].id,value:'wonder_the_colossus'});G.act(g,0,{type:'choice',task:g.tasks[0].id,value:'blue_baths'});A.equal(g.players[0].coins,7);A.equal(g.pawn,2);A.equal(g.players[0].wonders[0].built,true);A.equal(g.discard.length,0);
 g.pantheonSlots[5]={id:'anubis',used:false};g.players[1].coins=20;G.act(g,1,{type:'invoke',slot:5});G.act(g,1,{type:'choice',task:g.tasks[0].id,value:{owner:0,id:'wonder_the_colossus'}});A.equal(g.pawn,2);A.equal(g.players[0].wonders[0].built,false);A.ok(g.discard.includes('blue_baths'));A.equal(G.score(g,0).wonders,0);
 const h=G.newGame(false,3);h.phase='play';h.current=1;const ids=G.D.decks.wonders.slice(0,8);h.players[0].wonders=ids.slice(0,4).map(id=>({id,built:true,removed:false,under:'blue_altar'}));h.players[1].wonders=ids.slice(4).map((id,j)=>({id,built:j<2,removed:false,under:j<2?'blue_baths':null}));h.players[1].coins=100;G.act(h,1,{type:'wonder',slot:h.market.findIndex((s,j)=>G.available(h,j)),wonder:ids[6]});A.equal(h.players[1].wonders[3].removed,true);G.assert(h);
});
test('Gate costs twice its slot and only removes the selected god from its deck',()=>{
 const g=G.newGame(true,1);g.phase='play';g.age=2;g.current=0;g.players[0].coins=100;g.pantheonSlots[0]={id:'gate',used:false};const total=Object.values(g.mythDecks).reduce((n,a)=>n+a.length,0);G.act(g,0,{type:'invoke',slot:0});A.equal(g.players[0].coins,94);const choice=g.tasks[0].options[0];G.act(g,0,{type:'choice',task:g.tasks[0].id,value:choice});for(let n=0;g.phase==='choice'&&n<10;n++)G.act(g,0,G.ai(g));A.equal(Object.values(g.mythDecks).reduce((n,a)=>n+a.length,0),total-1);A.ok(g.players[0].gods.includes(choice));
});

