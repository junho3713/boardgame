'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
function arena(stack=false,coop=false){
 const settings={map:'livingroom-star',captainStackHpMode:stack,realtimeSummons:true};
 const g=coop?new CoopGame({},settings):new FrontGame({},undefined,settings);
 g.phase='playing';g.time=270;g.random=()=>.37;g.units=g.units.filter(u=>u.team===0&&u.type==='leader');return g;
}
const ninjas=g=>g.units.filter(u=>u.type==='assassin'&&u.hp>0);
function group(g){g.spawnAssassinGroup();const all=ninjas(g);return {body:all.find(u=>!u.assassinClone),copies:all.filter(u=>u.assassinClone)};}
test('room encounter starts at 270, surrounds a captain at 260–320 and respects time/portal/body caps in solo and co-op',()=>{
 for(const coop of [false,true]){
  const g=arena(false,coop);g.time=269.999;g.spawnAssassinGroup();assert.equal(ninjas(g).length,0);
  g.time=270;const {body,copies}=group(g);assert.equal(copies.length,3);
  const c=g.units.find(u=>u.id===body.assassinCaptain);
  const angles=new Set();
  for(const u of [body,...copies]){const d=Math.hypot(u.x-c.x,u.y-c.y);
   assert(d>=260&&d<=320);angles.add(Math.floor((Math.atan2(u.y-c.y,u.x-c.x)+Math.PI)/(Math.PI/2)));
   assert.equal(u.groupId,body.groupId);assert.equal(u.maxHp,body.maxHp);}
  assert.equal(angles.size,4);
  g.time=297.999;g.spawnAssassinGroup();assert.equal(ninjas(g).length,4);
  g.time=298;g.spawnAssassinGroup();assert.equal(ninjas(g).length,coop?8:4);
  g.time=599.99;g.spawnAssassinGroup();assert.equal(ninjas(g).length,coop?8:4);
  g.time=600;g.spawnAssassinGroup();assert.equal(ninjas(g).length,coop?12:8);
  for(const u of ninjas(g))u.hp=0;
  g.bases[1].hp=0;g.time=639.19;g.spawnAssassinGroup();assert.equal(ninjas(g).length,0);
  g.time=639.2;g.roomCampaign.recoveryUntil=642;g.spawnAssassinGroup();assert.equal(ninjas(g).length,0);
  g.time=642;g.spawnAssassinGroup();assert.equal(ninjas(g).length,4);
 }
});
test('only the real figure pays the kill reward, and clearing one group leaves another alive',()=>{
 const g=arena(),c=g.commander(0),{body,copies}=group(g),gold=g.cash[0],kills=g.kills;
 g.time=600;g.spawnAssassinGroup();g.damage(copies[0],10,c);
 assert.equal(copies[0].cloneBlinkAt,600);
 g.time=600.1;g.damage(copies[0],10,c);assert.equal(copies[0].cloneBlinkAt,600);
 g.time=600.45;g.damage(copies[0],10,c);assert.equal(copies[0].cloneBlinkAt,600.45);
 g.damage(copies[0],1e7,c);assert.equal(g.cash[0],gold);assert.equal(g.experienceDrops.length,0);assert.equal(g.kills,kills);
 assert(g.effects.some(e=>e.kind==='assassinDecoy'));
 g.damage(body,1e7,c);g.damage(body,1e7,c);assert.equal(g.cash[0],gold+22);
 assert.equal(g.kills,kills+1);assert.equal(g.experienceDrops.reduce((n,d)=>n+d.amount,0),55);
 assert.equal(ninjas(g).length,4);assert(ninjas(g).every(u=>u.groupId!==body.groupId));
});
test('HP matches across a group, follows room spawn scaling, and the half-HP permutation survives checkpoints',()=>{
 const g=arena(),c=g.commander(0),{body,copies}=group(g);
 const members=[body,...copies],before=members.map(u=>[u.x,u.y]);
 assert(Math.abs(body.maxHp/g.stats({...body,type:'pirateCannon'}).hp-TYPES.assassin.hp/TYPES.pirateCannon.hp)<1e-8);
 g.damage(body,body.maxHp*.51/g.defenseFactor(body,c),c);const hp=body.hp;
 assert(g.units.filter(u=>u.groupId===body.groupId).every(u=>!g.visible(u)&&!g.canTarget(c,u)));
 g.damage(body,1e5,c);assert.equal(body.hp,hp);
 const restored=unpack(arena(),pack(g));restored.time=270.35;
 for(const [i,old] of members.entries()){
  const u=restored.units.find(v=>v.id===old.id);restored.updateAssassin(u,0,restored.stats(u));
  assert.notDeepEqual([u.x,u.y],before[i]);assert(before.some(([x,y])=>u.x===x&&u.y===y));assert(restored.visible(u));
 }
 const recovered=restored.units.find(v=>v.id===body.id);
 restored.damage(recovered,1,c);assert(recovered.assassinShuffled);assert(!recovered.assassinHiddenUntil);
 for(const t of [480,720]){
  const same={...body,spawnedAt:t};const scale=g.roomSpawnScaling(same);
  assert.equal(scale.hp,t===480?1.25:1.4);
  assert(Math.abs(g.stats(same).hp-g.stats({...same,type:'bubbleOctopus'}).hp/TYPES.bubbleOctopus.hp*TYPES.assassin.hp)<1e-8);
 }
});
test('two-to-three shuriken fly after the tell; clones never touch the damage pipeline, shields, or hit reactions',()=>{
 for(const stacked of [false,true]){
  const g=arena(stacked),c=g.commander(0),{body,copies}=group(g),clone=copies[0];
  g.freePosition=()=>true;g.lineClear=()=>true;
  let calls=0;const damage=g.damage.bind(g);g.damage=(...args)=>{calls++;return damage(...args);};
  for(const [n,u] of [clone,body].entries()){
   u.x=c.x-220;u.y=c.y;u.nextStarAt=g.time;u.nextSlashAt=Infinity;
   g.updateAssassin(u,.05,g.stats(u));assert.equal(u.assassinAction.phase,'throw');
   g.time=u.assassinAction.until-.001;g.updateAssassin(u,0,g.stats(u));assert.equal(g.roomCampaign.assassinStars?.length||0,0);
   g.random=()=>n?.9:.1;g.time=u.assassinAction.until;g.updateAssassin(u,0,g.stats(u));
   const stars=g.roomCampaign.assassinStars;assert.equal(stars.length,n?3:2);
   assert(Math.abs(stars[1].launchAt-stars[0].launchAt-.09)<1e-8);
   c.droneShield={hp:5,maxHp:5,until:999};const previous=c.hp;
   for(let i=0;i<25;i++){g.time+=.05;g.updateAssassinStars(.05);}
   if(!n){assert.equal(calls,0);assert.equal(c.hp,previous);assert.equal(c.droneShield.hp,5);assert(!c.hitReaction&&!c.stackGuardUntil&&!g.impactPulse);assert(g.effects.some(e=>e.kind==='assassinPuff'));}
   else{assert(calls>0);assert(c.hp<previous);assert(!c.droneShield);}
  }
 }
});
test('dash follows the locked warning, can be dodged, and only real contact applies ordinary stack damage',()=>{
 for(const stack of [false,true])for(const fake of [false,true])for(const dodge of [false,true]){
  const g=arena(stack),c=g.commander(0),{body,copies}=group(g),u=fake?copies[0]:body;
  u.x=c.x-210;u.y=c.y;u.nextSlashAt=g.time;g.freePosition=()=>true;g.lineClear=()=>true;
  g.updateAssassin(u,.05,g.stats(u));assert.equal(u.assassinAction.phase,'warn');assert.equal(u.assassinAction.until,270.75);
  const expected=g.stats(u).damage*3*g.defenseFactor(c,u)*(stack?2:1),hp=c.hp;
  if(dodge)c.y+=100;
  for(let i=0;i<10;i++){g.time=270.75+i*.05;g.updateAssassin(u,.05,g.stats(u));}
  assert(Math.abs(hp-c.hp-(fake||dodge?0:expected))<1e-7);
  assert.equal(u.assassinAction.phase,'retreat');
  if(fake)assert(!c.hitReaction&&!g.impactPulse&&!c.stackGuardUntil);
 }
});

test('the normal campaign tick spawns the encounter; a blue co-op captain owns its payout and stack damage',()=>{
 const g=arena(true,true),green=g.commander(0),blue=g.withOwner(1,()=>g.commander(0));
 const blueTroop=g.withOwner(1,()=>g.addUnit(0,'tank',blue.x,blue.y));
 g.time=269.98;g.update(.05);
 const body=ninjas(g).find(u=>!u.assassinClone);assert(body);
 const greenHp=green.hp,blueHp=blue.hp,hp=blueTroop.hp,expected=12*2*g.defenseFactor(blueTroop,body);
 g.damage(blue,12,body);assert(Math.abs(hp-blueTroop.hp-expected)<1e-7);
 assert.equal(green.hp,greenHp);assert.equal(blue.hp,blueHp);
 const greenCash=g.withOwner(0,()=>g.cash[0]),blueCash=g.withOwner(1,()=>g.cash[0]);
 g.damage(body,1e7,blue);assert.equal(g.withOwner(0,()=>g.cash[0]),greenCash);
 assert.equal(g.withOwner(1,()=>g.cash[0]),blueCash+22);
 assert(g.experienceDrops.some(drop=>drop.owner===1&&drop.amount===55));
});

test('nearby clones spread out while circling and retreating without moving a locked throw',()=>{
 const g=arena(true),{copies}=group(g),leader=g.commander(0);
 g.obstacles=[];g.structures=[];g.defenses=[];g.buildings=[];
 const [a,b,c]=copies;
 for(const [u,x] of [[a,0],[b,18],[c,39]])Object.assign(u,{x:leader.x+x,y:leader.y-258,nextStarAt:Infinity,nextSlashAt:Infinity});
 a.assassinAction={phase:'retreat',until:g.time+.5};
 const separation=(u,v)=>Math.hypot(u.x-v.x,u.y-v.y);
 for(let i=0;i<27;i++){
  g.time+=.05;
  for(const u of copies)g.updateAssassin(u,.05,g.stats(u));
 }
 for(const [u,v] of [[a,b],[b,c],[a,c]])assert(separation(u,v)>=104);
 Object.assign(c,{x:b.x+27,y:b.y});
 b.assassinAction={phase:'throw',aimX:leader.x,aimY:leader.y,angle:Math.PI/2,until:g.time+.45};
 const start={x:b.x,y:b.y};
 g.updateAssassin(b,.05,g.stats(b));
 assert.deepEqual({x:b.x,y:b.y},start);
 assert.equal(b.assassinAction.phase,'throw');
});
