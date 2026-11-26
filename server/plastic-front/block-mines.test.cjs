'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
function field(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();
 g.units=g.units.filter(u=>u.type==='leader'&&u.team===0);g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];
 for(const u of g.units)Object.assign(u,{x:1200,y:6000,cooldown:99});
 for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','levelCheck','move','separateCrowd'])g[key]=()=>{};
 return g;
}
function plant(g,u,t=g.commandFirePoint(u,g.stats(u).range,0)){
 return g.fireUnitProjectiles(u,t,{damage:80,critical:false},g.stats(u));
}
test('auto fire waits for a ground unit and manual retreat can prelay a mine directly under the soldier',()=>{
 const g=field(),u=g.addUnit(0,'rocket',1200,6000),fly=g.addUnit(2,'hornet',1230,6000);
 u.cooldown=0;g.update(.025);assert.equal(g.blockMines.length,0);
 const enemy=g.addUnit(2,'ant',1050,6000);g.update(.025);
 assert.equal(g.blockMines.length,1);
 const first=g.blockMines[0];
 assert.deepEqual([first.x,first.y,first.toX,first.toY],[u.x,u.y,u.x,u.y]);
 assert.ok(Math.abs(first.landAt-first.startedAt-.16)<1e-8);
 assert.ok(Math.abs(first.armAt-first.startedAt-.5)<1e-8);
 assert.equal(g.stats(u).rate,5);assert.equal(u.cooldown,5);
 assert.ok(!g.shots.some(s=>s.source===u));
 enemy.hp=fly.hp=0;g.setManualAim({x:0,y:1});u.cooldown=0;
 Object.assign(u,{x:1236,y:5990,aiEvade:{x:1300,y:5650,until:g.time+4}});
 g.move=(actor,dx,dy)=>{if(actor===u){actor.x+=Math.sign(dx)*4;actor.y+=Math.sign(dy)*4;}};
 g.update(.025);
 assert.equal(g.blockMines.length,2);assert.deepEqual([g.blockMines[1].toX,g.blockMines[1].toY],[1236,5990]);
 assert.deepEqual([u.x,u.y],[1240,5986]);
 g.setManualAim(null);u.cooldown=0;g.update(.025);assert.equal(g.blockMines.length,2);
});
test('a basic mine or an evolved high-explosive mine applies its own damage and radius',()=>{
 for(const [level,evolved,scale,radius] of [[1,false,3.2,88],[4,false,3.2,88],[5,false,3.2,88],[5,true,4.6,125]]){
  const g=field(),u=g.addUnit(0,'rocket',1200,6000);
  g.tech[0].rocket=level;g.evolved.rocket=evolved;
  const mines=plant(g,u);assert.equal(mines.length,1);
  assert.ok(Math.abs(mines[0].damage-80*scale)<1e-8);
  assert.equal(mines[0].evolved,evolved);
  assert.equal(mines[0].radius,radius);
 }
});
test('stacked mine layers stagger planting and retry after finding space',()=>{
 const g=field();g.setManualAim({x:1,y:0});
 const a=g.addUnit(0,'rocket',1200,6000),b=g.addUnit(0,'rocket',1200,6000);
 a.cooldown=b.cooldown=0;g.update(.025);
 assert.equal(g.blockMines.length,1);assert.equal(g.blockMines[0].source,a);
 assert.equal(a.cooldown,5);assert.equal(b.cooldown,.4);
 b.x+=30;g.update(.025);assert.equal(g.blockMines.length,1);
 b.cooldown=.01;g.update(.025);
 assert.equal(g.blockMines.length,2);assert.equal(g.blockMines[1].source,b);
 assert.equal(g.blockMines[1].toX,b.x);assert.equal(b.cooldown,5);
});
test('contact waits for arming, ignores allied feet and flying units, then hits each victim once',()=>{
 const g=field(),u=g.addUnit(0,'rocket',1200,6000),m=plant(g,u)[0];
 const enemy=g.addUnit(2,'ant',m.toX,m.toY),friend=g.addUnit(0,'rifle',m.toX,m.toY),fly=g.addUnit(2,'hornet',m.toX,m.toY);
 enemy.hp=enemy.maxHp=10000;
 const hp=enemy.hp,friendHp=friend.hp;g.time=m.armAt-.001;g.updateBlockMines();assert.equal(enemy.hp,hp);
 enemy.y+=120;g.time=m.armAt;g.updateBlockMines();assert.equal(m.spent,undefined);
 const targets=g.combatCandidates.bind(g);g.combatCandidates=()=>[...targets(),enemy];
 enemy.y=m.toY;const flyHp=fly.hp;g.updateBlockMines();
 assert.equal(m.spent,true);assert.ok(Math.abs((hp-enemy.hp)-m.damage*g.defenseFactor(enemy,u))<1e-7);
 assert.equal(friend.hp,friendHp);assert.ok(fly.hp<flyHp);assert.equal(g.effects.filter(e=>e.kind==='blockMineBlast').length,1);
 const after=enemy.hp;g.updateBlockMines();assert.equal(enemy.hp,after);
});
test('a fast unit crossing an armed tile between two frames also triggers it',()=>{
 const g=field(),u=g.addUnit(0,'rocket',1200,6000),m=plant(g,u)[0],t=g.addUnit(2,'rifle',m.toX+65,m.toY);
 const previous=new Map([[t,{x:m.toX-65,y:m.toY}]]);g.time=m.armAt+.25;
 g.updateBlockMines(previous,g.time-.05);assert.ok(m.spent);assert.ok(t.hp<t.maxHp);
});
test('evolved chains travel in distinct timed steps and never jump to the other cooperative owner',()=>{
 const g=field(true);
 const deploy=owner=>g.withOwner(owner,()=>{
  g.evolved.rocket=true;const u=g.addUnit(0,'rocket',1200,6000);
  return Array.from({length:3},(_,i)=>{u.x=1250+138*i;u.y=6000+owner*50;return plant(g,u)[0];});
 });
 const mines=deploy(0),other=deploy(1);
 assert.ok(other.every(m=>m.owner===1));
 mines[2].evolved=false;
 const t=g.addUnit(2,'ant',mines[0].toX,mines[0].toY);t.hp=t.maxHp=1e4;g.time=1;g.updateBlockMines();
 assert.ok(mines[0].spent);assert.ok(mines[1].chainAt>g.time);assert.equal(mines[2].chainAt,null);
 g.time=mines[1].chainAt-.001;g.updateBlockMines();assert.equal(mines[1].spent,undefined);
 g.time=mines[1].chainAt;g.updateBlockMines();assert.ok(mines[1].spent);assert.ok(mines[2].chainAt>g.time);
 const restored=unpack(field(true),JSON.parse(JSON.stringify(pack(g))));
 const third=restored.blockMines.find(m=>m.id===mines[2].id);
 assert.equal(third.source,restored.units.find(u=>u.id===third.source.id));restored.time=third.chainAt;restored.updateBlockMines();
 assert.equal(restored.effects.filter(e=>e.kind==='blockMineBlast'&&e.chain).length,2);
 assert.ok(restored.blockMines.every(m=>m.owner===1&&m.chainAt===null));
});
test('new mines last thirty seconds after landing and still trigger near the end of their lifespan',()=>{
 const g=field(),u=g.addUnit(0,'rocket',1200,6000),[first]=plant(g,u);
 u.x+=50;const [last]=plant(g,u);
 assert.equal(first.expiresAt,first.landAt+30);
 g.time=first.expiresAt-.01;g.updateBlockMines();assert.ok(g.blockMines.includes(first));
 const target=g.addUnit(2,'ant',first.toX,first.toY),hp=target.hp;
 g.updateBlockMines();assert.ok(first.spent);assert.ok(target.hp<hp);
 g.time=last.expiresAt;g.updateBlockMines();assert.ok(!g.blockMines.includes(last));
});
test('mine capacity belongs to each player, expiry clears the floor, and enemy launchers retain their original projectile',()=>{
 const g=field(true),one=g.addUnit(0,'rocket',1200,6000),two=g.withOwner(1,()=>g.addUnit(0,'rocket',1300,6000));
 for(let i=0;i<23;i++){one.x+=30;two.x+=30;plant(g,one);g.withOwner(1,()=>plant(g,two));}
 assert.equal(g.blockMines.filter(m=>m.owner===0).length,18);assert.equal(g.blockMines.filter(m=>m.owner===1).length,18);
 assert.equal(Math.min(...g.blockMines.map(m=>m.id)),11);
 const enemy=g.addUnit(1,'rocket',1400,6000),shots=plant(g,enemy,one);assert.equal(shots.length,1);assert.equal(shots[0].kind,'rocket');assert.ok(g.shots.includes(shots[0]));
 assert.equal(g.stats(enemy).rate,1.85);
 g.time=Math.max(...g.blockMines.map(m=>m.expiresAt));g.updateBlockMines();assert.equal(g.blockMines.length,0);
});
