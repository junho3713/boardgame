'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,LUCKY}=require('./public/engine.js');
require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];return g;}
function forceRoll(g,kinds,owner=0){return g.withOwner?g.withOwner(owner,()=>roll(g,kinds)):roll(g,kinds);}
function roll(g,kinds){const u=g.addUnit(0,'lucky',1500,7000);u.star=2;u.face=0;u.luckyInterval=LUCKY.interval;u.nextLuckyAt=4;u.luckyChannels=kinds.map(kind=>({roll:{kind,startedAt:0,endsAt:.6,resolved:false},next:4}));g.time=.6;g.updateLuckyUnit(u);return u;}
function separated(mines){for(let i=0;i<mines.length;i++)for(let j=i+1;j<mines.length;j++)a.ok(Math.hypot(mines[i].x-mines[j].x,mines[i].y-mines[j].y)>=26-1e-8,'mines must not stack');}

test('each winning two-star reel places a separate armed mine, once, in solo and both coop squads',()=>{
 for(const coop of [false,true])for(const owner of coop?[0,1]:[0])for(const kinds of [['mine','mine','blank'],['mine','blank','mine'],['blank','mine','mine'],['mine','mine','mine']]){
  const g=scene(coop),u=forceRoll(g,kinds,owner),count=kinds.filter(k=>k==='mine').length;
  a.equal(g.luckyMines.length,count);separated(g.luckyMines);
  a.deepEqual(g.luckyMines.map(m=>m.rouletteChannel),kinds.map((k,i)=>k==='mine'?i:-1).filter(i=>i>=0));
  for(const mine of g.luckyMines){a.equal(mine.source,u);a.equal(mine.damage,LUCKY.mineDamage*g.luckyScale(u));a.equal(mine.expires-g.time,60);a.ok(g.freePosition(mine.x,mine.y,10));}
  const again=()=>g.updateLuckyUnit(u);if(coop)g.withOwner(owner,again);else again();a.equal(g.luckyMines.length,count);
  const restored=unpack(scene(coop),pack(g));a.equal(restored.luckyMines.length,count);separated(restored.luckyMines);a.ok(restored.luckyMines.every(m=>m.source===restored.units.find(v=>v.id===u.id)));
 }
});

test('mine placement finds clear alternate lanes around blocked positions and existing mines',()=>{
 const g=scene();g.freePosition=(x,y)=>y<=7000&&x<=1565;g.lineClear=()=>true;
 const u=forceRoll(g,['mine','mine','mine']);a.equal(g.luckyMines.length,3);separated(g.luckyMines);
 g.time=4.6;for(const ch of u.luckyChannels){ch.roll={kind:'mine',endsAt:4.6,resolved:false};ch.next=8;}g.updateLuckyUnit(u);
 a.equal(g.luckyMines.length,6);separated(g.luckyMines);a.ok(g.luckyMines.every(m=>g.freePosition(m.x,m.y)));
 const target=g.addUnit(2,'ant',g.luckyMines[0].x,g.luckyMines[0].y);target.hp=target.maxHp=1e6;g.time+=.4;const hp=target.hp;g.updateLuckyObjects(.05);a.ok(target.hp<hp);a.ok(g.luckyMines.length<6);
});
