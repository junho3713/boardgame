'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),{PlayLab}=require('./public/combat-lab.js');
function step(g,seconds){for(let i=0;i<Math.round(seconds/.025);i++)g.update(.025);}
test('the commander can walk and the selected unit follows without resetting the arena',()=>{
 const g=new PlayLab({autoSkills:false}),c=g.commander(0),x=c.x,y=c.y,actor=g.actor.x;g.input={x:1,y:0};step(g,2);a.ok(c.x>x+200);a.equal(c.y,y);a.ok(g.actor.x>actor);a.ok(Math.hypot(c.x-g.actor.x,c.y-g.actor.y)<300);a.equal(g.result().time>1.9,true);
});
test('click move orders use the production movement rules and enemies approach from all four sides',()=>{
 const g=new PlayLab({autoSkills:false}),c=g.commander(0),x=c.x,y=c.y,before=new Map(g.labTargets.map(t=>[t.id,Math.hypot(t.x-c.x,t.y-c.y)]));a.deepEqual([...new Set(g.waveSides)].sort(),[0,1,2,3]);step(g,1);
 a.ok(g.labTargets.every(t=>Math.hypot(t.x-c.x,t.y-c.y)<before.get(t.id)));g.setMoveOrder(x+150,y-120,false);step(g,2.05);a.ok(c.x>x+50);a.ok(c.y<y-30);a.ok(g.result().waves>=2);
});
test('five-second skills keep the same units, clock, projectiles and cumulative stats across casts',()=>{
 const g=new PlayLab({highHealth:true}),actor=g.actor,casts=[],original=g.cast;g.cast=function(){const result=original.call(this);if(result)casts.push(this.time);return result;};step(g,11);
 a.equal(g.actor,actor);a.equal(casts.length,3);for(let i=1;i<casts.length;i++)a.ok(Math.abs(casts[i]-casts[i-1]-5)<.001);a.ok(g.result().damage>0);a.ok(g.result().spawned>8);a.ok(g.time>10.9);a.equal(g.lab.highHealth,true);
});
test('automatic skills can be turned off and pause freezes movement, reinforcements and cooldown',()=>{
 const g=new PlayLab({autoSkills:false});step(g,7);a.equal(g.result().casts,0);g.autoSkills=true;step(g,.05);a.equal(g.result().casts,1);g.phase='paused';const before=g.result();g.input={x:1,y:0};step(g,8);a.deepEqual(g.result(),before);
});
test('the spawn cap stays bounded and waves are outside the current view after the opening wave',()=>{
 const g=new PlayLab({count:24,autoSkills:false});g.viewport={width:1000,height:700};const start=g.labTargets.length;g.spawnWave();const wave=g.labTargets.slice(start);a.equal(wave.length,24);for(const t of wave)a.ok(Math.abs(t.x-g.camera.x)>500||Math.abs(t.y-g.camera.y)>350);for(let i=0;i<100;i++)g.spawnWave();a.equal(g.units.filter(t=>t.team!==0&&t.hp>0).length,80);
});
test('five-second decoy skills replace the oldest practice bait instead of being blocked after three',()=>{
 const g=new PlayLab({mode:'support',toy:'toyDecoyMaker',tier:2,highHealth:true,autoSkills:false});for(let i=0;i<5;i++){g.spawnWave(true);g.actor.x=g.commander(0).x;g.actor.y=g.commander(0).y;const t=g.labTargets.at(-1);t.x=g.actor.x+150;t.y=g.actor.y;g.time=i*5;a.equal(g.cast(),true);}a.ok(g.supportBaits().length<=3);a.equal(g.result().casts,5);
});
test('practice squad is invulnerable and manual skills do not restart the arena or interrupt movement',()=>{
 const g=new PlayLab(),leader=g.commander(0),hp=leader.hp,source=g.labTargets[0];g.damage(leader,1e9,source);a.equal(leader.hp,hp);g.input={x:0,y:1};step(g,1);const time=g.time;g.cast();a.equal(g.time,time);a.equal(g.commander(0),leader);a.deepEqual(g.input,{x:0,y:1});a.equal(g.phase,'playing');
});
