'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');const {pose,transform,shake}=require('./public/hit-feedback.js');
function scene(){const g=new FrontGame();g.start();g.obstacles=[];g.buildings=[];g.units=[];return g;}
test('actual health damage creates directional feedback without changing coordinates, orders or damage rules',()=>{
 const g=scene(),target=g.addUnit(0,'rifle',800,1500),enemy=g.addUnit(2,'ant',700,1500),before={x:target.x,y:target.y,hp:target.hp},expected=20*g.defenseFactor(target,enemy);g.damage(target,20,enemy);
 a.equal(target.x,before.x);a.equal(target.y,before.y);a.equal(target.hp,before.hp-expected);a.equal(target.hitReaction.angle,Math.atan2(before.y-enemy.y,before.x-enemy.x));a.ok(pose(target,.04).x>0);a.equal(pose(target,.3),null);const stamp=JSON.stringify(target.hitReaction),calls=[];for(let i=0;i<30;i++)transform({translate:(...v)=>calls.push(v),rotate(){},scale(){}},target,.04);a.equal(JSON.stringify(target.hitReaction),stamp);a.deepEqual(calls[0],calls.at(-1));
});
test('protected and invulnerable targets do not create impact feedback; rapid hits stay bounded',()=>{
 const g=scene(),c=g.addUnit(0,'leader',800,1500),enemy=g.addUnit(2,'ant',700,1500);c.reviveProtectionUntil=3;g.damage(c,100,enemy);a.equal(c.hitReaction,undefined);a.equal(g.effects.filter(e=>e.kind==='hit').length,0);
 const t=g.addUnit(2,'ant',900,1500);t.hp=t.maxHp=1e6;for(let i=0;i<100;i++)g.damage(t,1,c);a.equal(g.effects.filter(e=>e.kind==='hit').length,1);a.ok(t.hp<1e6);
});
test('heavy hits recoil rigid vehicles gently and camera impact fades with the simulation clock and distance',()=>{
 const g=scene(),target=g.addUnit(2,'tank',800,1500),source=g.addUnit(0,'rocket',700,1500);g.camera={x:800,y:1500};g.damage(target,100,source);a.equal(target.hitReaction.heavy,true);a.ok(Math.abs(pose(target,.04).x)<3);g.time=.05;const first=shake(g);a.deepEqual(shake(g),first);a.ok(Math.abs(first.x)<=3);g.time=.3;a.deepEqual(shake(g),{x:0,y:0});g.time=.05;g.camera.x=3000;a.deepEqual(shake(g),{x:0,y:0});
});
