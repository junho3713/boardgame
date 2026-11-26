'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');

function field(){
 const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();
 const leader=g.commander(0);g.units=[leader];
 Object.assign(g,{obstacles:[],defenses:[],structures:[],buildings:[],pickups:[],camera:{x:1500,y:6000}});
 Object.assign(leader,{x:1500,y:6000,cooldown:99});
 for(const k of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','levelCheck'])g[k]=()=>{};
 const octopus=g.addUnit(2,'bubbleOctopus',1240,6000,true);
 return {g,leader,octopus};
}
function tick(g,seconds){for(let i=0;i<Math.round(seconds/.025);i++)g.update(.025);}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-6,`${actual} vs ${expected}`);}
function cast(g,u){g.updateBubbleOctopus(u,.025,g.stats(u));}

test('one cast protects six nearby hostiles across enemy teams including distant high-priority targets',()=>{
 const {g,leader,octopus:o}=field();
 const ordinary=Array.from({length:7},(_,i)=>g.addUnit(2,'ant',o.x+8+i*8,o.y));
 const special=g.addUnit(1,'pirateCannon',o.x+170,o.y);
 const beetle=g.addUnit(2,'stagBeetle',o.x+178,o.y);
 const outside=g.addUnit(2,'ant',o.x+181,o.y), ally=g.addUnit(0,'tank',o.x+18,o.y);
 cast(g,o);
 assert.deepEqual(g.units.filter(t=>t.bubbleShield).map(t=>t.id),[...ordinary.slice(0,4),special,beetle].map(t=>t.id));
 for(const t of [outside,ally,o,leader])assert.equal(t.bubbleShield,undefined);
 const hp=special.hp,max=hp*.35;
 close(special.bubbleShield.hp,max);
 const factor=g.defenseFactor(special,leader);
 g.damage(special,10/factor,leader);
 close(special.hp,hp);close(special.bubbleShield.hp,max-10);
 g.time=6.99;cast(g,o);close(special.bubbleShield.hp,max-10);
 g.time=7;cast(g,o);close(special.bubbleShield.hp,max);
 g.damage(special,(max+5)/factor,leader);
 assert.equal(special.bubbleShield,undefined);close(special.hp,hp-5);
 assert.equal(g.effects.filter(e=>e.kind==='bubbleShieldPop').length,1);
});

test('killing a source removes just its shields immediately, even if their recipients have left its radius',()=>{
 const {g,leader,octopus:a}=field(),b=g.addUnit(2,'bubbleOctopus',a.x+336,a.y);
 const first=g.addUnit(2,'ant',a.x+10,a.y),second=g.addUnit(2,'ant',b.x+10,b.y);
 const shared=g.addUnit(1,'pirateCannon',a.x+168,a.y);cast(g,a);cast(g,b);
 assert.equal(shared.bubbleShield.sourceId,a.id);assert.equal(second.bubbleShield.sourceId,b.id);
 first.y+=600;
 g.damage(a,99999,leader);
 assert.ok(a.hp<=0);assert.equal(shared.bubbleShield,undefined);assert.equal(first.bubbleShield,undefined);
 assert.equal(second.bubbleShield.sourceId,b.id);
 assert.equal(g.effects.filter(e=>e.kind==='bubbleShieldPop').length,2);
 g.damage(a,99999,leader);assert.equal(g.effects.filter(e=>e.kind==='bubbleShieldPop').length,2);
});

test('octopus retreats when crowded, approaches to support distance and guards stay with their supply',()=>{
 const {g,leader,octopus:o}=field();o.nextFoamAt=Infinity;
 o.x=leader.x-110;cast(g,o);assert.ok(o.x<leader.x-110);
 o.x=leader.x-430;cast(g,o);assert.ok(o.x>leader.x-430);
 o.x=leader.x-260;const y=o.y;cast(g,o);assert.notEqual(o.y,y);
 Object.assign(o,{rareSupplyGuard:true,homeX:o.x,homeY:o.y,supplyAnchorX:o.x,supplyAnchorY:o.y});
 leader.x-=1000;const parked={x:o.x,y:o.y};cast(g,o);
 assert.deepEqual({x:o.x,y:o.y},parked);
});

test('foam telegraphs for .4s, travels straight at 240 px/s, and misses a commander who sidesteps',()=>{
 const {g,leader:c,octopus:o}=field();o.nextFoamAt=0;g.update(.025);
 const fuse=o.foamWindup;
 assert.ok(fuse);close(fuse.fireAt-fuse.startedAt,.4);
 close(o.nextFoamAt-fuse.startedAt,4.5);
 c.y+=110;tick(g,.375);assert.equal(g.foamShots.length,0);
 g.update(.025);const shot=g.foamShots[0];assert.ok(shot);close(shot.angle,fuse.angle);
 const initial={x:shot.x,y:shot.y},hp=c.hp;tick(g,.5);
 close(shot.x,initial.x+120);close(shot.y,initial.y);
 tick(g,1.5);assert.equal(g.foamShots.length,0);assert.equal(c.hp,hp);
 assert.ok(!g.effects.some(e=>e.kind==='bubbleFoamImpact'));
});

test('a saved foam round survives its caster and shoves the commander and nearby troops along the barrel, once',()=>{
 const {g,leader,octopus:o}=field();o.nextFoamAt=0;g.update(.025);tick(g,.4);
 const guard=g.addUnit(0,'rifle',leader.x,leader.y+35),far=g.addUnit(0,'rifle',leader.x,leader.y+130);
 const state=unpack(field().g,JSON.parse(JSON.stringify(pack(g))));
 const [c,source,ally,outside]=[leader,o,guard,far].map(u=>state.units.find(t=>t.id===u.id));
 const shot=state.foamShots[0];assert.equal(shot.source,source);
 state.damage(source,99999,c);assert.ok(source.hp<=0);
 const hp=[c.hp,ally.hp,outside.hp];
 for(let i=0;i<60&&state.foamShots.length;i++){state.time+=.025;state.updateFoamShots(.025);}
 assert.equal(state.foamShots.length,0);
 assert.equal(state.effects.filter(e=>e.kind==='bubbleFoamImpact').length,1);
 assert.ok(c.hp<hp[0]&&ally.hp<hp[1]);close(outside.hp,hp[2]);
 const x=c.x,y=c.y;
 state.time+=.32;state.updateSupportKnockback(c);
 close(c.x-x,106);close(c.y,y);assert.equal(outside.toyKnockback,undefined);
 assert.ok(ally.toyKnockback.dx>100);
});

test('blindness and stun interrupt the warning without a delayed launch; solid cover blocks a launched bubble',()=>{
 for(const status of ['blind','stun']){
  const {g,leader,octopus:o}=field();o.nextFoamAt=0;g.update(.025);
  if(status==='blind')g.applyLuckyFlash(o,{source:leader,evolved:false});else o.toyStunUntil=g.time+2;
  tick(g,.5);assert.ok(!o.foamWindup);assert.equal(g.foamShots.length,0);
 }
 const {g,leader:c,octopus:o}=field();o.nextFoamAt=0;g.update(.025);tick(g,.4);
 g.obstacles=[{x:o.x+100,y:o.y-60,w:18,h:120}];const hp=c.hp;
 tick(g,1.3);assert.equal(g.foamShots.length,0);assert.equal(c.hp,hp);
});

test('co-op aims at the nearer commander and honors the other squad’s protected selection period in the splash',()=>{
 const g=new CoopGame();g.start();g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];
 const green=g.withOwner(0,()=>g.commander(0)),blue=g.withOwner(1,()=>g.commander(0));
 Object.assign(blue,{x:1500,y:6000});Object.assign(green,{x:1468,y:6035});
 const o=g.addUnit(2,'bubbleOctopus',1750,6000,true);
 g.units=[green,blue,o];g.coopInvulnerable=[6,0];o.nextFoamAt=0;
 cast(g,o);close(Math.abs(o.foamWindup.angle),Math.PI);
 g.time=.4;cast(g,o);assert.equal(g.foamShots.length,1);
 const before=[green.hp,blue.hp];
 for(let i=0;i<55&&g.foamShots.length;i++){g.time+=.025;g.updateFoamShots(.025);}
 assert.equal(green.hp,before[0]);assert.equal(green.toyKnockback,undefined);
 assert.ok(blue.hp<before[1]);assert.ok(blue.toyKnockback.dx<-100);
});
