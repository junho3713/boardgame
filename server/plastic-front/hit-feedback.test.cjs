'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');const {pose,transform,shake}=require('./public/hit-feedback.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
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

test('continuous incoming fire deals full damage while body reactions restart only every half second',()=>{
 for(const team of [0,2]){const g=scene(),target=g.addUnit(team,'rifle',800,1500),source=g.addUnit(team?0:2,'rifle',700,1500);target.hp=target.maxHp=1e6;let expected=target.hp;const x=target.x,y=target.y,hit=()=>{expected-=10*g.defenseFactor(target,source);g.damage(target,10,source);};
  hit();const first=target.hitReaction;for(let i=1;i<50;i++){g.time=i*.01;hit();a.equal(target.hitReaction,first);}a.equal(pose(target,.3),null);a.ok(Math.abs(target.hp-expected)<1e-6);g.time=.5;hit();a.notEqual(target.hitReaction,first);a.equal(target.hitReaction.at,.5);a.equal(target.x,x);a.equal(target.y,y);
 }
});
test('Hwarin, Shion and Rina hurt poses share the half-second interval instead of restarting on each hit',()=>{
 for(const [type,appearance,flameSkin]of [['leader','blaze','hwarin'],['leader','shion',null],['medic','rina',null]]){const g=scene(),u=g.addUnit(0,type,800,1500),e=g.addUnit(2,'rifle',700,1500);Object.assign(u,{appearance,flameSkin,hp:1e6,maxHp:1e6});g.damage(u,10,e);const until=u.hurtUntil,start=u.hurtStartedAt;g.time=.1;g.damage(u,10,e);a.equal(u.hurtUntil,until);a.equal(u.hurtStartedAt,start);g.time=.5;g.damage(u,10,e);a.equal(u.hurtUntil,until+.5);}
});
test('camera impacts share a half-second interval across different heavy-hit targets',()=>{
 const g=scene(),source=g.addUnit(0,'rocket',700,1500),targets=[800,1000,1200].map(x=>g.addUnit(2,'tank',x,1500));for(const u of targets)u.hp=u.maxHp=1e6;g.damage(targets[0],10,source);const first=g.impactPulse;g.time=.1;g.damage(targets[1],10,source);a.equal(g.impactPulse,first);a.equal(targets[1].hitReaction.at,.1);g.time=.5;g.damage(targets[2],10,source);a.notEqual(g.impactPulse,first);a.equal(g.impactPulse.at,.5);
});
test('reaction intervals survive saves and cooperative packets without sharing a unit cooldown',()=>{
 const g=new CoopGame();g.start();g.obstacles=[];const green=g.withOwner(0,()=>g.commander(0)),blue=g.withOwner(1,()=>g.commander(0)),source=g.addUnit(2,'rifle',green.x-100,green.y);for(const u of [green,blue])u.hp=u.maxHp=1e6;g.damage(green,10,source);g.time=.1;g.damage(blue,10,source);a.equal(blue.hitReaction.at,.1);const restored=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g)))),u=restored.withOwner(0,()=>restored.commander(0));restored.time=.3;restored.damage(u,10,restored.units.find(v=>v.id===source.id));a.equal(u.hitReaction.at,0);restored.time=.5;restored.damage(u,10,restored.units.find(v=>v.id===source.id));a.equal(u.hitReaction.at,.5);
 restored.time=0;restored.damage(u,10,restored.units.find(v=>v.id===source.id));a.equal(u.hitReaction.at,0);
});
