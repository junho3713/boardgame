'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');

function field(map='livingroom-star'){
 const g=map==='coop'?new CoopGame():new FrontGame({},undefined,{map});
 g.start();
 g.units=g.units.filter(u=>u.type==='leader'&&u.team===0);
 g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.pickups=[];
 g.camera={x:1100,y:1300};g.viewport={width:720,height:540};
 for(const c of g.units)Object.assign(c,{x:1100+(c.coopOwner||0)*120,y:1300,cooldown:99});
 for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','levelCheck'])g[key]=()=>{};
 return g;
}
function add(g,type,x,y,team=0){
 const unit=g.addUnit(team,type,x,y);
 unit.cooldown=team===0?0:99;
 return unit;
}
const from=(g,u)=>g.shots.find(p=>p.source===u);

test('all three star maps wait for a visible hostile, then fire parallel even when focused away',()=>{
 for(const map of ['livingroom-star','desktop-star','bedroom-star']){
  const g=field(map),c=g.commander(0),rifle=add(g,'rifle',1080,1325);
  g.input={x:1,y:0};g.update(.02);
  assert.equal(from(g,rifle),undefined,map);
  const enemy=add(g,'rifle',1100,200,1);
  g.update(.02);assert.equal(from(g,rifle),undefined,map);
  g.input={x:0,y:0};Object.assign(enemy,{x:985,y:1300});g.setFocus(enemy);c.cooldown=0;g.update(.02);
  for(const unit of [c,rifle]){
   const shot=from(g,unit);assert.equal(shot?.commandAngle,0,map);assert.ok(shot.x<shot.target.x);
  }
  assert.equal(enemy.hp,enemy.maxHp); // The enemy is behind both shooters.
 }
});

test('swept contact selects the first body along the ray and honors movement, range and cover',()=>{
 const g=field(),source=add(g,'rifle',1000,1300),rear=add(g,'rifle',1170,1300,1),front=add(g,'rifle',1100,1300,1);
 const make=()=>g.fireUnitProjectiles(source,g.commandFirePoint(source,250,0),{damage:10},g.stats(source))[0];
 const hit=make();g.advanceCommandShot(hit,.25,[rear,front]);
 assert.equal(hit.target,front);assert.ok(front.hp<front.maxHp);assert.equal(rear.hp,rear.maxHp);
 const miss=make();front.y+=80;rear.x+=100;g.advanceCommandShot(miss,.4,[rear,front]);
 assert.equal(miss.x,1250);assert.equal(miss.life,0);assert.equal(rear.hp,rear.maxHp);
 const crossing=make();g.advanceCommandShot(crossing,.05,[front]);front.y=1300;
 g.advanceCommandShot(crossing,.1,[front]);assert.equal(crossing.target,front);
 const covered=make(),hp=front.hp;g.obstacles=[{x:1050,y:1270,w:20,h:60}];
 g.advanceCommandShot(covered,.2,[front]);assert.equal(covered.life,0);assert.equal(front.hp,hp);
});

test('mortars keep targeting enemies behind the squad while snipers finish their directional windup',()=>{
 const g=field(),mortar=add(g,'mortar',1100,1300),sniper=add(g,'sniper',1100,1340),enemy=add(g,'rifle',850,1300,1);
 g.moveOrder={x:1400,y:1300,facing:0};g.update(.02);
 assert.ok(g.mortarShells.some(s=>s.source===mortar&&Math.abs(s.x-enemy.x)<5));
 assert.equal(sniper.sniperAim.target.commandShot,true);
 const fireAt=sniper.sniperAim.fireAt;
 g.update(.02);assert.equal(sniper.sniperAim.fireAt,fireAt);
 for(let i=0;i<60&&!from(g,sniper);i++)g.update(.025);
 assert.ok(from(g,sniper)?.target.commandShot);
});

test('each cooperative squad uses its own commander, with straight flight surviving save and restore',()=>{
 const g=field('coop'),a=add(g,'rifle',1090,1330),b=g.withOwner(1,()=>add(g,'rifle',1200,1340));
 add(g,'rifle',1130,1170,1);
 g.withOwner(0,()=>{g.input={x:1,y:0};});
 g.withOwner(1,()=>{g.input={x:0,y:1};});g.update(.02);
 assert.equal(from(g,a).commandAngle,0);assert.equal(from(g,b).commandAngle,Math.PI/2);
 const saved=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));
 const restored=saved.shots.find(p=>p.source.id===b.id);
 assert.equal(restored.commandAngle,Math.PI/2);assert.equal(restored.source.coopOwner,1);
 assert.equal(restored.travelLeft,from(g,b).travelLeft);
});

test('a distant cooperative squad reacts to its own play area with the other camera left behind',()=>{
 const g=field('coop'),first=add(g,'rifle',1090,1330),second=g.withOwner(1,()=>{
  Object.assign(g.commander(0),{x:1100,y:5500});
  return add(g,'rifle',1090,5530);
 });
 add(g,'rifle',1100,5420,1);g.update(.02);
 assert.equal(from(g,first),undefined);assert.ok(from(g,second)?.target.commandShot);
});

test('evolved rifle bursts finish in clear air and stop emitting when the last enemy disappears',()=>{
 const g=field(),rifle=add(g,'rifle',1100,1320),enemy=add(g,'rifle',980,1300,1);
 g.commander(0).commandFireFacing=0;g.evolved.rifle=true;
 g.update(.01);for(let i=0;i<4;i++)g.update(.05);
 assert.deepEqual(g.shots.filter(s=>s.source===rifle).map(s=>s.evoStyle),['burst','burst','burstFinal']);
 assert.ok(g.shots.filter(s=>s.source===rifle).every(s=>s.commandAngle===0));assert.equal(enemy.hp,enemy.maxHp);
 g.shots=[];rifle.cooldown=0;g.update(.01);enemy.hp=0;
 for(let i=0;i<4;i++)g.update(.05);assert.equal(g.shots.filter(s=>s.source===rifle).length,1);
});
