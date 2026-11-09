'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function scene(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();
 g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];g.effects=[];
 for(const c of g.units)Object.assign(c,{x:1500,y:6000,cooldown:1e6});g.random=()=>.99;
 for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck','updateMageQuest','updateLaserQuest'])g[key]=()=>{};
 const u=g.addSupportToy('toyTurtle');Object.assign(u,{x:1400,y:6000,toyNextAt:0});return{g,u};
}
function target(g,x=1700,y=6000,type='ant'){const t=g.addUnit(2,type,x,y,true);t.hp=t.maxHp=1e6;return t;}

test('water visibly slides a pursuing enemy back 144 pixels and prevents immediate forward movement in the real update loop',()=>{
 const {g,u}=scene(),t=target(g),x=t.x,hp=t.hp;assert.equal(g.useSupportToy(u),true);near(t.x,x);
 g.update(.05);assert.ok(t.x>x&&t.x<x+144);const positions=[t.x];
 for(let i=0;i<8;i++){g.update(.05);positions.push(t.x);}
 for(let i=1;i<positions.length;i++)assert.ok(positions[i]>=positions[i-1]);near(t.x,x+144);near(t.hp,hp);
 for(let i=0;i<5;i++)g.update(.05);assert.ok(t.x<x+144,'pursuit resumes after the water releases the target');
});

test('all three water tiers finish their full push in every direction and retain normal-shot boss immunity',()=>{
 for(const [tier,push]of [[0,144],[1,192],[2,288]])for(let direction=0;direction<8;direction++){
  const {g,u}=scene(),angle=direction*Math.PI/4,t=target(g,u.x+Math.cos(angle)*200,u.y+Math.sin(angle)*200),from={x:t.x,y:t.y};
  g.random=()=>[.99,.15,.02][tier];assert.equal(g.useSupportToy(u),true);for(let i=1;i<=80;i++){g.time=i*.02;g.updateSupportWaves();g.updateSupportKnockback(t);}
  near(Math.hypot(t.x-from.x,t.y-from.y),push);assert.ok(g.freePosition(t.x,t.y,g.collisionRadius(t)));
 }
 const {g,u}=scene(),boss=target(g,1600,6000,'crimsonAce');boss.boss=true;g.random=()=>.99;assert.equal(g.useSupportToy(u),true);assert.equal(boss.toyKnockback,undefined);
});

test('tsunami catches near and far targets only when the shared wave front reaches them and carries them forward once',()=>{
 const {g,u}=scene(),close=target(g,1550,6000),far=target(g,1850,6000),beyond=target(g,2000,6000),side=target(g,1400,6350);g.random=()=>.02;
 assert.equal(g.useSupportToy(u),true);assert.equal(close.toyKnockback,undefined);assert.equal(far.toyKnockback,undefined);
 g.time=.2;g.updateSupportWaves();assert.equal(close.toyKnockback.surf,true);assert.equal(far.toyKnockback,undefined);const started=close.toyKnockback.startedAt;
 g.time=.4;g.updateSupportWaves();g.updateSupportKnockback(close);assert.ok(close.x>1550&&close.x<1838);assert.equal(close.toyKnockback.startedAt,started);assert.equal(far.toyKnockback,undefined);
 g.time=.75;g.updateSupportWaves();assert.equal(far.toyKnockback.surf,true);assert.equal(beyond.toyKnockback,undefined);assert.equal(side.toyKnockback,undefined);
 for(const t of [close,far]){g.time=1.5;g.updateSupportKnockback(t);}near(close.x,1550+288);near(far.x,1850+288);assert.equal(g.effects.filter(e=>e.kind==='toyWaterCarry').length,2);
});

test('a launched tsunami survives owner toy replacement and a saved in-progress front without recapturing enemies',()=>{
 const {g,u}=scene(true),close=target(g,1550,6000),far=target(g,1850,6000);g.random=()=>.02;g.useSupportToy(u);g.time=.2;g.updateSupportWaves();g.updateSupportKnockback(close);
 u.toyRetired=true;u.hp=0;const copy=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));
 for(let i=11;i<=80;i++)for(const game of [g,copy]){game.time=i*.02;game.updateSupportWaves();for(const t of game.units)game.updateSupportKnockback(t);}
 for(const id of [close.id,far.id]){const a=g.units.find(t=>t.id===id),b=copy.units.find(t=>t.id===id);near(a.x,b.x);near(a.y,b.y);assert.equal(b.toyKnockback,undefined);}
 assert.equal(g.effects.filter(e=>e.kind==='toyWaterCarry').length,2);assert.equal(copy.effects.filter(e=>e.kind==='toyWaterCarry').length,2);assert.deepEqual(copy.supportWaves,[]);
});

test('swept infantry visibly lifts and tilts while rigid vehicles retain a restrained pose',()=>{
 const {pose}=require('./public/hit-feedback.js'),surf={surf:true,startedAt:0,until:1,dx:288,dy:0},infantry={type:'rifle',toyKnockback:surf},tank={type:'tank',toyKnockback:surf};
 const a=pose(infantry,.5),b=pose(tank,.5);assert.ok(a.y<-8);assert.ok(a.angle>.15);assert.ok(Math.abs(b.y)<Math.abs(a.y));assert.ok(Math.abs(b.angle)<Math.abs(a.angle));assert.equal(pose(infantry,1),null);
});

test('water interrupts a normal charge, stops at newly blocked terrain and never pushes through a map edge',()=>{
 const {g,u}=scene(),t=target(g,1600,6000,'bikeRaider');t.bikeAttack={phase:'charge',origin:{x:t.x,y:t.y}};t.bayonetAttack={};t.sniperAim={};
 assert.equal(g.useSupportToy(u),true);assert.equal(t.bikeAttack,null);assert.equal(t.bayonetAttack,null);assert.equal(t.sniperAim,null);
 g.obstacles.push({x:1660,y:5900,w:50,h:200,solid:true});g.time=.2;g.updateSupportKnockback(t);assert.ok(t.x<1660-g.collisionRadius(t));assert.ok(g.freePosition(t.x,t.y,g.collisionRadius(t)));
 const b=g.bounds();u.x=b.width-260;u.y=6000;t.x=b.width-55;t.y=6000;t.toyControlReadyAt=0;delete t.toyKnockback;g.time=4;
 assert.equal(g.pushSupportTarget(u,t,4,{duration:.48}),true);g.time=5;g.updateSupportKnockback(t);near(t.x,b.width-45);
});

test('a mid-push cooperative snapshot resumes the same remaining distance without repeating the initial shove',()=>{
 const {g,u}=scene(true),t=target(g),x=t.x;g.useSupportToy(u);g.time=.1;g.updateSupportKnockback(t);const partial=t.x;
 const copy=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g)))),next=copy.units.find(v=>v.id===t.id);near(next.x,partial);
 for(const game of [g,copy]){game.time=.4;game.updateSupportKnockback(game.units.find(v=>v.id===t.id));}
 near(t.x,x+144);near(next.x,t.x);copy.time=.6;copy.updateSupportKnockback(next);assert.equal(next.toyKnockback,undefined);
});

test('turtle speed stays ten percent below an unevolved rifle and firing positions keep distance and a clear lane',()=>{
 const {g,u}=scene(),rifle=g.addUnit(0,'rifle',1520,6010);near(TYPES.toyTurtle.speed,TYPES.rifle.speed*.9);near(g.stats(u).speed,g.stats(rifle).speed*.9);
 g.abilities.speed=3;g.profile.upgrades.speed=2;near(g.stats(u).speed,g.stats(rifle).speed*.9);
 const c=g.commander(0),enemy=target(g,1500,5700);g.formationFacing=-Math.PI/2;const goal=g.turtleSupportGoal(u,c);
 assert.ok(Math.hypot(goal.x-c.x,goal.y-c.y)<=250);assert.ok(Math.hypot(goal.x-enemy.x,goal.y-enemy.y)>=190);assert.ok(Math.hypot(goal.x-enemy.x,goal.y-enemy.y)<=350);assert.ok(g.lineClear(goal,enemy,0,{fireTeam:0}));
 assert.ok(Math.abs(goal.x-c.x)>=90,'fires from the side instead of walking through the commander');
 const same=g.turtleSupportGoal(u,c);assert.equal(same,goal);enemy.y=5990;g.time=1;const retreat=g.turtleSupportGoal(u,c);assert.ok(retreat.y>c.y,'retreats when enemies close in from the north');
});
