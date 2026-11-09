'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {FrontGame,TYPES}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
const {applySnapshot}=require('./public/coop-state.js');
const wave=require('./public/wave-test.js');
const rolls=[.99,.15,.02];
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,actual+' != '+expected);
function scene(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});
 g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];g.effects=[];
 for(const c of g.units)Object.assign(c,{x:1500,y:6000});
 g.random=()=>.99;g.visible=g.lineClear=()=>true;g.navigate=()=>{};
 return g;
}
function enemy(g,x,y,type='ant'){const t=g.addUnit(2,type,x,y);t.hp=t.maxHp=1e6;return t;}
function ready(g,type,tier=0){const u=g.addSupportToy(type);u.toyNextAt=g.time;g.random=()=>rolls[tier];return u;}

test('each toy makes one exclusive 70/25/5 roll with exact probability boundaries',()=>{
 const g=scene();
 for(const type of Object.keys(globalThis.FrontSupportToys.toys)){
  const u={type},counts=[0,0,0];
  for(let i=0;i<10000;i++){g.random=()=>(i+.5)/10000;counts[g.rollSupportToyTier(u)]++;}
  assert.deepEqual(counts,[7000,2500,500]);
  for(const [roll,tier]of [[0,2],[.049999,2],[.05,1],[.299999,1],[.30,0],[.999999,0]]){g.random=()=>roll;assert.equal(g.rollSupportToyTier(u),tier);}
 }
});

test('idle active toys do not spend a cooldown or reroll when there is no valid target',()=>{
 for(const type of ['toyDecoyMaker','toyTurtle','toyStunner']){
  const g=scene(),u=ready(g,type);let calls=0;g.random=()=>{calls++;return .02;};
  assert.equal(g.useSupportToy(u),false);assert.equal(calls,0);assert.equal(u.toyNextAt,0);
 }
});

test('rabbit rolls every thirty seconds and the accepted boosts last exactly ten seconds',()=>{
 for(const tier of [0,1,2]){
  const g=scene(),rifle=g.addUnit(0,'rifle',1500,6000),base=g.stats(rifle),u=g.addSupportToy('toyDrum');
  g.random=()=>rolls[tier];assert.equal(u.toyNextAt,30);
  g.time=29.99;assert.equal(g.useSupportToy(u),false);near(g.stats(rifle).speed/base.speed,1.05);
  g.time=30;assert.equal(g.useSupportToy(u),true);assert.equal(u.toyNextAt,60);
  near(g.stats(rifle).speed/base.speed,[1.05,1.15,1.3][tier]);
  near(base.rate/g.stats(rifle).rate,[1.03,1.1,1.25][tier]);
  g.time=39.99;near(g.stats(rifle).speed/base.speed,[1.05,1.15,1.3][tier]);
  g.time=40;near(g.stats(rifle).speed/base.speed,1.05);assert.equal(g.useSupportToy(u),false);
 }
});

test('rabbit auras choose the strongest nearby cooperative boost while medic and roulette clocks stay stable',()=>{
 const g=scene(true),rifle=g.addUnit(0,'rifle',1500,6000),medic=g.addUnit(0,'medic',1500,6000),lucky=g.addUnit(0,'lucky',1500,6000),base=g.stats(rifle),interval=g.updateLuckyInterval(lucky);
 const a=g.withOwner(0,()=>ready(g,'toyDrum',1));g.withOwner(0,()=>g.useSupportToy(a));
 const b=g.withOwner(1,()=>ready(g,'toyDrum',2));g.withOwner(1,()=>g.useSupportToy(b));
 near(g.stats(rifle).speed,base.speed*1.3);near(base.rate/g.stats(rifle).rate,1.25);near(g.stats(medic).rate,1);assert.equal(g.updateLuckyInterval(lucky),interval);
 b.x+=1000;near(g.stats(rifle).speed,base.speed*1.15);
 g.disableSupportEntity(a);near(g.stats(rifle).speed,base.speed);
 g.time=20;g.updateSupportToys(.05);assert.ok(a.hp>0);assert.equal(a.toyNextAt,50);
});

test('old passive drummers migrate to a thirty-second draw without changing the restored formation',()=>{
 const g=scene(),u=g.addSupportToy('toyDrum');delete u.toyBeatStartedAt;u.toyNextAt=.8;
 g.time=100;const before=g.units.length;assert.equal(g.useSupportToy(u),false);assert.equal(u.toyNextAt,130);assert.equal(g.units.length,before);
 const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));copy.time=129.9;assert.equal(copy.useSupportToy(copy.supportToys()[0]),false);
});

test('fishing bait takes aggro only after landing and never redirects an existing projectile',()=>{
 const g=scene(),u=ready(g,'toyDecoyMaker'),targets=Array.from({length:4},(_,i)=>enemy(g,1600+i*20,6000)),shot={target:g.commander(0)};g.shots=[shot];
 assert.equal(g.useSupportToy(u),true);const bait=g.units.find(t=>t.type==='toyDecoy');
 assert.equal(g.supportDecoyTarget(targets[0]),null);assert.equal(g.canTarget(targets[0],bait),false);
 g.time=.35;assert.equal(targets.filter(t=>g.supportDecoyTarget(t)===bait).length,2);assert.equal(shot.target,g.commander(0));assert.equal(bait.toyExpires,3.35);
});

test('sharks circle a landed bait without attacking and breach only after an enemy reaches the eighty-pixel trigger',()=>{
 const g=scene(),u=ready(g,'toyDecoyMaker',1),t=enemy(g,1800,6000);g.useSupportToy(u);const burst=g.supportBursts[0],hp=t.hp;
 g.time=.34;g.updateSupportBursts();assert.equal(g.effects.some(e=>e.kind==='toySharkFin'),false);
 g.time=.35;g.updateSupportBursts();assert.equal(g.effects.filter(e=>e.kind==='toySharkFin').length,1);assert.equal(burst.state,'circling');assert.equal(burst.impactAt,undefined);
 g.time=1.8;g.updateSupportBursts();assert.equal(burst.state,'circling');assert.equal(t.hp,hp);assert.equal(g.effects.some(e=>e.kind==='toyShark'),false);
 t.x=burst.x+70;t.y=burst.y;g.updateSupportBursts();assert.equal(burst.state,'breaching');near(burst.breachAt,1.92);near(burst.impactAt,2.4);
 g.time=2.399;g.updateSupportBursts();assert.equal(t.hp,hp);g.time=2.4;g.updateSupportBursts();assert.ok(t.hp<hp);assert.equal(t.toyKnockback.popHeight,28);
 g.time=2.82;g.updateSupportKnockback(t);near(t.x,burst.x+70+144);
});

test('an expired or broken bait cancels a waiting shark without a remote attack',()=>{
 for(const broken of [false,true]){const g=scene(),u=ready(g,'toyDecoyMaker',2),t=enemy(g,1800,6000);g.useSupportToy(u);const burst=g.supportBursts[0];if(broken){burst.bait.hp=0;g.time=.6;}else g.time=burst.bait.toyExpires;g.updateSupportBursts();assert.deepEqual(g.supportBursts,[]);assert.equal(t.hp,t.maxHp);assert.equal(g.effects.some(e=>e.kind==='toyShark'),false);}
});

test('a lured ranged enemy actually walks into the bait and receives visible shark knockback in the ordinary update loop',()=>{
 const g=scene(),u=ready(g,'toyDecoyMaker',2);Object.assign(u,{x:1400,y:6000});const t=enemy(g,1800,6000,'rifle');t.patrol=true;t.cooldown=1e6;g.commander(0).cooldown=1e6;g.navigate=FrontGame.prototype.navigate;
 for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck','updateMageQuest','updateLaserQuest'])g[key]=()=>{};
 g.useSupportToy(u);const burst=g.supportBursts[0],x=t.x;for(let i=0;i<100&&burst.state==='circling';i++)g.update(.025);assert.ok(t.x<x);assert.notEqual(burst.state,'circling');assert.ok(g.time<burst.bait.toyExpires);
 for(let i=0;i<60&&!t.toyKnockback?.popHeight;i++)g.update(.025);assert.equal(t.toyKnockback.popHeight,44);const from={x:t.x,y:t.y},until=t.toyKnockback.until;
 g.time=until;g.updateSupportKnockback(t);near(Math.hypot(t.x-from.x,t.y-from.y),240);
});

test('shark and megalodon use the approved damage and radii, and their delayed impacts happen once',()=>{
 for(const tier of [1,2]){
  const g=scene(),u=ready(g,'toyDecoyMaker',tier);enemy(g,1600,6000);assert.equal(g.useSupportToy(u),true);
  const burst=g.supportBursts[0];assert.equal(burst.radius,[0,140,240][tier]);near(burst.damage,g.stats(g.commander(0)).damage*[0,2,4][tier]);
  const victim=enemy(g,burst.x+40,burst.y),outside=enemy(g,burst.x+burst.radius+TYPES.ant.r+10,burst.y),friendly=g.addUnit(0,'rifle',burst.x,burst.y),hp=victim.hp,allyHp=friendly.hp,x=victim.x;
  g.time=.35;g.updateSupportBursts();assert.equal(burst.state,'breaching');
  g.time=burst.impactAt-.001;g.updateSupportBursts();assert.equal(victim.hp,hp);
  g.time=burst.impactAt;g.updateSupportBursts();near(hp-victim.hp,burst.damage*g.defenseFactor(victim,u));assert.ok(victim.toyKnockback.popHeight>0);g.time+=.56;g.updateSupportKnockback(victim);assert.ok(victim.x>x);assert.equal(outside.hp,outside.maxHp);assert.equal(friendly.hp,allyHp);
  const hitHp=victim.hp;g.updateSupportBursts();assert.equal(victim.hp,hitHp);
 }
});

test('sharks honor walls, invulnerable bosses and existing boss control resistance',()=>{
 const g=scene(),u=ready(g,'toyDecoyMaker',2);enemy(g,1600,6000);g.useSupportToy(u);const burst=g.supportBursts[0];
 const shielded=enemy(g,burst.x+30,burst.y,'hornet');Object.assign(shielded,{boss:true,bossPattern:'venomDive',bossAction:{phase:'high'}});
 const tank=enemy(g,burst.x+50,burst.y,'crimsonAce');tank.boss=true;
 const wall=enemy(g,burst.x+70,burst.y),x=tank.x;g.lineClear=(from,target)=>target!==wall;
 g.time=.35;g.updateSupportBursts();
 g.time=burst.impactAt;g.updateSupportBursts();assert.equal(shielded.hp,shielded.maxHp);assert.equal(wall.hp,wall.maxHp);assert.ok(tank.hp<tank.maxHp);assert.equal(tank.x,x);
});

test('a launched shark survives source retirement and cooperative snapshots without duplicating damage',()=>{
 const g=scene(true),u=g.withOwner(1,()=>ready(g,'toyDecoyMaker',2));enemy(g,1600,6000);g.withOwner(1,()=>g.useSupportToy(u));
 const burst=g.supportBursts[0],victim=enemy(g,burst.x+30,burst.y);
 g.time=.35;g.updateSupportBursts();
 u.toyRetired=true;u.hp=0;g.units=g.units.filter(t=>t!==u);const snapshot=JSON.parse(JSON.stringify(pack(g)));
 const client=scene(true);applySnapshot(client,snapshot,unpack);client.visible=client.lineClear=()=>true;
 const target=client.units.find(t=>t.id===victim.id),hp=target.hp;
 client.time=burst.impactAt;client.updateSupportBursts();assert.ok(target.hp<hp);assert.equal(client.supportBursts[0].source.coopOwner,1);
 const restored=unpack(scene(true),JSON.parse(JSON.stringify(pack(client))));restored.visible=restored.lineClear=()=>true;
 const after=restored.units.find(t=>t.id===victim.id),afterHp=after.hp;restored.updateSupportBursts();assert.equal(after.hp,afterHp);
});

test('electric tiers stun at most one, three and eight valid targets with the same one-second duration',()=>{
 for(const [tier,count]of [[0,1],[1,3],[2,8]]){
  const g=scene(),u=ready(g,'toyStunner',tier),targets=Array.from({length:10},(_,i)=>enemy(g,u.x+80+i*8,u.y)),boss=enemy(g,u.x+70,u.y,'rhinoBeetle');boss.boss=true;
  assert.equal(g.useSupportToy(u),true);assert.equal(targets.filter(t=>t.toyStunUntil===1).length,count);assert.equal(boss.toyStunUntil,undefined);assert.equal(g.effects.filter(e=>e.kind==='toyZap').length,count);assert.equal(u.toyNextAt,10);
  const links=g.effects.filter(e=>e.kind==='toyZap');for(let i=1;i<links.length;i++)assert.equal(links[i].from,links[i-1].target);
  const storm=g.effects.find(e=>e.kind==='toyThunder');assert.equal(!!storm,tier===2);if(storm)assert.deepEqual(storm.targets,links.map(e=>e.target));
 }
});

test('Ramjwi Thunder keeps eight target references and a one-time stun through a saved cooperative storm',()=>{
 const g=scene(true),u=g.withOwner(1,()=>ready(g,'toyStunner',2));
 const targets=Array.from({length:9},(_,i)=>enemy(g,u.x+100+i*10,u.y));g.withOwner(1,()=>g.useSupportToy(u));
 assert.equal(TYPES.toyStunner.name,'람쥐썬더');assert.equal(u.toyActionUntil,1.2);
 const copy=unpack(scene(true),JSON.parse(JSON.stringify(pack(g)))),storm=copy.effects.find(e=>e.kind==='toyThunder');
 assert.equal(storm.source.coopOwner,1);assert.equal(storm.targets.length,8);
 for(const target of storm.targets){assert.equal(copy.units.find(t=>t.id===target.id),target);assert.equal(target.toyStunUntil,1);}
 const hp=copy.units.filter(t=>targets.some(v=>v.id===t.id)).map(t=>t.hp);copy.time=.5;copy.updateSupportToys(0);
 assert.deepEqual(copy.units.filter(t=>targets.some(v=>v.id===t.id)).map(t=>t.hp),hp);
 assert.equal(copy.effects.filter(e=>e.kind==='toyThunder').length,1);
});

test('water tiers push three, five and eight targets with progressively broader reach and force',()=>{
 for(const [tier,count,push]of [[0,3,144],[1,5,192],[2,8,288]]){
  const g=scene(),u=ready(g,'toyTurtle',tier),targets=Array.from({length:10},(_,i)=>enemy(g,u.x+100+i*10,u.y)),positions=targets.map(t=>t.x);
  assert.equal(g.useSupportToy(u),true);for(let i=1;i<=80;i++){g.time=i*.02;g.updateSupportWaves();for(const t of targets)g.updateSupportKnockback(t);}assert.equal(targets.filter((t,i)=>t.x>positions[i]).length,count);
  near(targets[0].x-positions[0],push);assert.equal(g.effects.some(e=>e.kind==='toyTsunami'),tier===2);
 }
 const g=scene(),u=ready(g,'toyTurtle',2);enemy(g,u.x+120,u.y);
 const wide=enemy(g,u.x+Math.cos(1)*440,u.y+Math.sin(1)*440),x=wide.x;g.useSupportToy(u);for(let i=1;i<=80;i++){g.time=i*.02;g.updateSupportWaves();g.updateSupportKnockback(wide);}assert.ok(wide.x>x);
});

test('clock jumps preserve buff time and cancel queued breaches, and old saves safely update without them',()=>{
 const g=scene(),drum=ready(g,'toyDrum',2);g.useSupportToy(drum);
 const otter=ready(g,'toyDecoyMaker',2);enemy(g,1600,6000);g.useSupportToy(otter);assert.ok(g.supportBursts.length);
 g.time=3;g.waveTest=true;wave.seek(g,300);
 assert.deepEqual(g.supportBursts,[]);near(drum.toyBoostUntil-g.time,7);assert.equal(g.units.some(u=>u.type==='toyDecoy'),false);
 const old=JSON.parse(JSON.stringify(pack(scene())));delete old.fields.supportBursts;const restored=unpack(scene(),old);restored.updateSupportBursts();assert.deepEqual(restored.supportBursts,[]);
});
