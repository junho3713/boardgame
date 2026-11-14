'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(t=>t.type==='leader');for(const k of ['obstacles','defenses','structures','buildings','pickups','effects'])g[k]=[];for(const c of g.units)Object.assign(c,{x:1500,y:6000});g.visible=g.lineClear=g.freePosition=()=>true;g.navigate=()=>{};return g;}
function enemy(g,x,y){const t=g.addUnit(2,'ant',x,y,true);t.hp=t.maxHp=1e6;return t;}
function cast(g,type,tier){const u=g.addSupportToy(type);u.toyNextAt=0;g.random=()=>[.99,.15,.02][tier];return u;}
function drop(g,type){a.equal(g.collectSupportToy({active:true,x:1500,y:6000},type),true);}

test('all three attack toys hit exactly 3/5 targets and jackpot hits every one of 24 in range',()=>{
 for(const type of ['toyDecoyMaker','toyTurtle','toyStunner'])for(const tier of [0,1,2]){
  const g=scene(),u=cast(g,type,tier),targets=Array.from({length:24},(_,i)=>enemy(g,u.x+120+i*2,u.y));
  const ally=g.addUnit(0,'rifle',u.x+120,u.y,true),allyHP=ally.hp;
  a.equal(g.useSupportToy(u),true);
  let affected;
  if(type==='toyDecoyMaker'){
   const b=g.supportBursts[0];Object.assign(targets[0],{x:b.x+30,y:b.y});g.time=.35;g.updateSupportBursts();a.equal(b.state,'breaching');g.time=b.impactAt;g.updateSupportBursts();affected=targets.filter(t=>t.hp<t.maxHp).length;
   const hp=targets.map(t=>t.hp);g.updateSupportBursts();a.deepEqual(targets.map(t=>t.hp),hp);
  }else if(type==='toyTurtle'){
   for(let i=1;i<=70;i++){g.time=i*.02;g.updateSupportWaves();}affected=targets.filter(t=>t.toyKnockback).length;
  }else affected=targets.filter(t=>t.toyStunUntil===tier+1).length;
  a.equal(affected,[3,5,24][tier],`${type} tier ${tier}`);a.equal(ally.hp,allyHP);a.equal(ally.toyKnockback,undefined);a.equal(ally.toyStunUntil,undefined);
 }
});

test('jackpot thunder is centered on its selected enemy, honors the area boundary and excludes blocked/immune threats',()=>{
 const g=scene(),u=cast(g,'toyStunner',2),primary=enemy(g,u.x+100,u.y),edge=enemy(g,primary.x+360,primary.y),outside=enemy(g,primary.x+360.01,primary.y),wall=enemy(g,primary.x+200,primary.y),immune=enemy(g,primary.x+210,primary.y);
 immune.toyControlReadyAt=10;g.lineClear=(from,t)=>t!==wall;a.equal(g.useSupportToy(u),true);a.equal(edge.toyStunUntil,3);for(const t of [outside,wall,immune])a.equal(t.toyStunUntil,undefined);
 const storm=g.effects.find(e=>e.kind==='toyThunder');near(storm.x,primary.x);near(storm.y,primary.y);a.equal(storm.areaRadius,360);
});

test('large shark and tsunami exclude outside, wall-blocked and invisible targets',()=>{
 for(const type of ['toyDecoyMaker','toyTurtle']){
  const g=scene(),u=cast(g,type,2);enemy(g,u.x+100,u.y);g.useSupportToy(u);const area=type==='toyTurtle'?g.supportWaves[0]:g.supportBursts[0];
  const nearTarget=enemy(g,area.x+80,area.y),outside=enemy(g,area.x+(area.radius||area.range)+60,area.y),wall=enemy(g,area.x+100,area.y),invisible=enemy(g,area.x+110,area.y);g.lineClear=(from,t)=>t!==wall;g.visible=t=>t!==invisible;
  if(type==='toyDecoyMaker'){g.time=.35;g.updateSupportBursts();g.time=area.impactAt;g.updateSupportBursts();a.ok(nearTarget.hp<nearTarget.maxHp);for(const t of [outside,wall,invisible])a.equal(t.hp,t.maxHp);}
  else{for(let i=1;i<=70;i++){g.time=i*.02;g.updateSupportWaves();}a.ok(nearTarget.toyKnockback);for(const t of [outside,wall,invisible])a.equal(t.toyKnockback,undefined);}
 }
});

test('jackpot geometry does not change with device viewport or zoom and covers about half the reference view',()=>{
 const rules=globalThis.FrontSupportToys.rules;near(Math.PI*rules.jackpot.radius**2/(1080*720),.5235987755982988);a.ok(rules.water.range[2]**2*rules.water.arc[2]/2/(1080*720)>.45);
 for(const type of ['toyDecoyMaker','toyTurtle','toyStunner']){
  const measures=[];for(const width of [390,1080,2400]){const g=scene(),u=cast(g,type,2);g.viewport={width,height:720,zoom:width/1080};enemy(g,u.x+100,u.y);g.useSupportToy(u);measures.push(type==='toyDecoyMaker'?g.supportBursts[0].radius:type==='toyTurtle'?g.supportWaves[0].range:g.effects.find(e=>e.kind==='toyThunder').areaRadius);}a.deepEqual(measures,[measures[0],measures[0],measures[0]]);
 }
});

test('keep upgrades exactly one randomly selected toy, preserves slots and cannot resolve the offer twice',()=>{
 for(const roll of [0,.999999]){const g=scene(),first=g.addSupportToy('toyTurtle'),second=g.addSupportToy('toyStunner');drop(g,'toyDrum');g.random=()=>roll;const selected=roll?second:first,other=roll?first:second;
  a.equal(g.resolveSupportToyOffer('keep'),true);a.equal(g.supportToyStars(selected),2);a.equal(g.supportToyStars(other),1);a.deepEqual(g.supportToys().map(t=>t.id),[first.id,second.id]);a.equal(g.resolveSupportToyOffer('keep'),false);a.equal(g.supportToyStars(selected),2);
 }
});

test('keep skips a maxed toy, upgrades the other to three stars and has a safe all-maxed outcome',()=>{
 const g=scene(),first=g.addSupportToy('toyTurtle'),second=g.addSupportToy('toyStunner');drop(g,first.type);drop(g,first.type);g.random=()=>0;
 for(let i=0;i<3;i++){drop(g,'toyDrum');a.equal(g.resolveSupportToyOffer('keep'),true);a.equal(g.supportToyStars(first),3);a.equal(g.supportToyStars(second),Math.min(i+2,3));}
 near(g.supportToyCooldown(first),4);near(g.supportToyCooldown(second),8);a.equal(g.supportToys().length,2);
});

test('old five-percent cooldown saves migrate once while keeping progress, health and stars after restoration',()=>{
 const g=scene(),u=g.addSupportToy('toyDrum');Object.assign(u,{toyUpgradeLevel:2,toyCooldown:27,toyNextAt:37,hp:50});g.time=10;g.refreshSupportToyCooldown(u);near(u.toyNextAt,34);g.refreshSupportToyCooldown(u);near(u.toyNextAt,34);
 const restored=unpack(scene(),JSON.parse(JSON.stringify(pack(g)))),copy=restored.supportToys()[0];a.equal(restored.supportToyStars(copy),3);near(copy.toyCooldown,24);near(copy.toyNextAt,34);near(copy.hp,50);
});

test('a cooperative keep upgrade uses only its own toys and survives JSON serialization',()=>{
 const g=scene(true);for(const owner of [0,1])g.withOwner(owner,()=>{g.addSupportToy('toyTurtle');g.addSupportToy('toyStunner');});g.withOwner(1,()=>{drop(g,'toyDrum');g.random=()=>.9;g.resolveSupportToyOffer('keep');});const copy=unpack(scene(true),JSON.parse(JSON.stringify(pack(g))));
 a.deepEqual(copy.withOwner(0,()=>copy.supportToys().map(t=>copy.supportToyStars(t))),[1,1]);a.deepEqual(copy.withOwner(1,()=>copy.supportToys().map(t=>copy.supportToyStars(t))),[1,2]);
});
