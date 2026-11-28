'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{config,drawRotation}=require('./public/room-campaign.js');
require('./public/sword-boss.js');require('./public/two-star.js');
const {pack,unpack}=require('./public/autoplay.js');
function arena(stack=false){
 const game=new FrontGame({},undefined,{map:'livingroom-assault',captainStackHpMode:stack});
 const captain=game.commander(0);game.units=[captain];game.obstacles=[];game.structures=[];game.defenses=[];
 Object.assign(captain,{x:1500,y:3100});game.phase='playing';return game;
}
function spawn(g,type,preview=false){
 g.time=preview?420:480;g.spawnRoomAssaultBoss(type,null,2,preview);return g.activeBoss();
}
const copy=g=>unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
const countClones=(g,b)=>g.units.filter(u=>u.ninjaOwner===b.id&&u.assassinClone&&u.hp>0).length;
test('test switch, relocatable slots, full rotation and saved draws',()=>{
 let state=12345;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
 const pools=config.rotation.pools,seen=new Set(),orders=new Set();
 for(let i=0;i<120;i++){
  const order=drawRotation(random);assert.equal(new Set(order).size,4);orders.add(order.slice(2).join('/'));
  assert.deepEqual(order.slice(2).sort(),['kraken','ninjaAssassin']);
  const early=drawRotation(random,true,[0,1]);assert.deepEqual(early.slice(0,2).sort(),['kraken','ninjaAssassin']);
  const full=drawRotation(random,false);assert.equal(new Set(full).size,4);
  full.forEach((type,j)=>assert.ok(pools[j>>1].includes(type)));seen.add(full.slice(2).join('/'));
 }
 assert.equal(seen.size,12);assert.equal(orders.size,2);
 const g=arena();assert.deepEqual(copy(g).roomCampaign.rotation.order,g.roomCampaign.rotation.order);
 assert.equal(g.bossState.nextAt,240);
});
for(const stack of [false,true]){
 test('four previews, four formal slots, one star and one 12-minute finale, stack='+stack,()=>{
  const g=arena(stack),plan=g.roomCampaign.rotation,player=g.commander(0);
  const slotHP=[4400,9360,18240,29760];
  for(const [i,slot] of config.rotation.slots.entries()){
   for(const mini of [true,false]){
    g.time=slot.at-(mini?60:0);g.updateRoomMission(0);g.updateRoomBosses();
    const b=g.activeBoss();assert.equal(b.type,plan.order[i]);assert.equal(!!b.miniBoss,mini);
    const scale=mini?.3:1,trait=config.rotation.traits[b.type];
    assert.equal(b.maxHp*(b.ninjaLives||1),Math.round(slotHP[i]*trait[0]*scale));
    assert.equal(g.stats(b).damage,slot.damage*trait[1]*scale);
    while(b.hp>0){g.damage(b,1e8,player);g.time+=.36;}
   }
  }
  assert.equal(g.pickups.filter(p=>p.destinyStar).length,1);
  g.time=719.99;g.updateRoomBosses();assert.equal(g.finalBattle.spawned,false);
  g.time=720;g.updateRoomBosses();g.updateRoomBosses();assert.equal(g.trialBoss.maxHp,108000);
  assert.equal(g.units.filter(u=>u.finalBoss).length,1);
  for(const blade of g.trialBoss.swords.blades)blade.mode='attack';
  g.damage(g.trialBoss,1e8,player);assert.equal(g.result,'win');
 });
 test('all four clone hit paths are smoke-only even with a shield, stack='+stack,()=>{
  const g=arena(stack),b=spawn(g,'ninjaAssassin'),clone=g.units.find(u=>u.assassinClone),c=g.commander(0);
  c.droneShield={hp:65,maxHp:65,until:g.time+20};
  const hp=c.hp,cash=g.cash[0],effects=()=>g.effects.filter(e=>e.kind==='assassinPuff').length;
  for(const kind of ['star','windmill','dash','cross']){
   Object.assign(clone,{x:c.x-8,y:c.y,assassinHiddenUntil:0});
   const before=effects();
   if(kind==='star'||kind==='windmill'){
    g.roomCampaign.rotation.hazards=[{kind,source:clone,angle:0,x:clone.x,y:c.y,left:420,stage:'out',hit:[]}];
    g.updateRotationHazards(.05);
   }else{
    clone.assassinAction={phase:kind,until:g.time,angle:0,left:30,length:30,hit:[],point:{x:c.x,y:c.y}};
    g.updateNinjaBoss(clone,.05,g.stats(clone));
   }
   assert.ok(effects()>before);assert.equal(c.hp,hp);assert.equal(c.droneShield.hp,65);
   assert.equal(c.stackGuardUntil,undefined);assert.equal(c.hitReaction,undefined);assert.equal(g.impactPulse,undefined);
  }
  g.damage(clone,1e8,c);assert.equal(countClones(g,b),2);assert.equal(g.cash[0],cash);
  assert.equal(g.kills,0);assert.equal(g.experienceDrops.length,0);
  const when=b.ninjaRespawn[clone.ninjaIndex];assert.ok(when-g.time>=2.5&&when-g.time<=3);
  g.time=when+.001;g.updateNinjaBoss(b,.05,g.stats(b));assert.equal(countClones(g,b),3);
 });
 test('wet lanes, dry gaps, knockback and airborne immunity rules, stack='+stack,()=>{
  const g=arena(stack),c=g.commander(0),b=spawn(g,'kraken'),troop=g.addUnit(0,'tank',c.x,c.y);
  const h={kind:'tide',source:b,horizontal:true,direction:0,sign:1,length:3000,start:g.time,front:c.x-10,hit:[],offset:c.y-230};
  g.roomCampaign.rotation.hazards=[h];const before=troop.hp;
  g.time+=.05;g.updateRotationHazards(.05);assert.equal(troop.hp,before);assert.ok(!c.toyKnockback);
  h.offset=c.y-85;h.front=c.x-10;g.updateRotationHazards(.05);assert.ok(c.toyKnockback.dx>0);
  if(stack){assert.equal(troop.toyKnockback,undefined);assert.ok(troop.hp<before);}else assert.ok(troop.toyKnockback.dx>0);
  g.time+=2;g.roomCampaign.rotation.hazards=[{kind:'geyser',source:b,points:[{x:c.x,y:c.y}],start:g.time,at:g.time+1}];
  delete c.toyKnockback;g.time+=.99;g.updateRotationHazards(.05);assert.ok(!c.toyKnockback);
  g.time+=.02;g.updateRotationHazards(.05);assert.ok(Math.abs(c.toyKnockback.until-g.time-1.2)<1e-8);
  const x=c.x;g.move(c,100,0,.1,175);assert.equal(c.x,x);
 });
}
test('ninja drops a log per phase, keeps stagger across checkpoint and retires illusions without rewards',()=>{
 let g=arena(),b=spawn(g,'ninjaAssassin'),clones=g.units.filter(u=>u.assassinClone);
 assert.equal(clones.length,3);let prev=b.ninjaNext;
 for(const v of clones){assert.ok(v.ninjaNext-prev>=.9&&v.ninjaNext-prev<=1.2);prev=v.ninjaNext;}
 for(let life=3;life>=1;life--){
  g.damage(b,1e8,g.commander(0));assert.equal(b.ninjaLives,life);assert.equal(b.hp,b.maxHp);
  assert.equal(countClones(g,b),life-1);assert.equal(g.kills,0);
  g.damage(b,1e8,g.commander(0));assert.equal(b.ninjaLives,life);
  assert.ok(g.effects.some(e=>e.kind==='substitutionLog'&&e.max===2));
  g=copy(g);b=g.activeBoss();g.time+=.36;g.updateNinjaBoss(b,.05,g.stats(b));
 }
 g.damage(b,1e8,g.commander(0));assert.equal(g.kills,1);assert.equal(g.bossState.killed,1);
});
test('six-way shuriken have a separate half-second tell after each dash',()=>{
 for(const lives of [4,1]){
  let g=arena(),b=spawn(g,'ninjaAssassin');b.ninjaLives=lives;
  b.assassinAction={phase:'dash',until:g.time,length:1,left:1,angle:0,hit:[]};
  g.updateNinjaBoss(b,.05,g.stats(b));
  assert.equal(b.assassinAction.phase,'burst');assert.equal(b.assassinAction.until-g.time,.5);
  g=copy(g);b=g.activeBoss();const until=b.assassinAction.until,position=[b.x,b.y];
  g.time=until-.001;g.updateNinjaBoss(b,.05,g.stats(b));
  assert.equal(g.roomCampaign.rotation.hazards?.length??0,0);assert.deepEqual([b.x,b.y],position);
  g.time=until;g.updateNinjaBoss(b,.05,g.stats(b));
  const blades=g.roomCampaign.rotation.hazards.filter(h=>h.kind==='star');
  assert.equal(blades.length,6);assert.equal(b.assassinAction,null);
  for(let i=0;i<6;i++)assert.ok(Math.abs(blades[i].angle-i*Math.PI/3)<1e-8);
 }
});
test('7 minute preview can time out and the third formal slot still awards exactly one star',()=>{
 const g=arena(),plan=g.roomCampaign.rotation;plan.cursor=2;plan.order[2]='kraken';
 g.time=420;g.updateRoomBosses();const mini=g.activeBoss();
 g.time=480;g.updateRoomBosses();assert.equal(mini.hp,0);assert.equal(g.kills,0);assert.equal(g.pickups.filter(p=>p.destinyStar).length,0);
 g.damage(g.activeBoss(),1e8,g.commander(0));assert.equal(g.pickups.filter(p=>p.destinyStar).length,1);
});
test('Kraken opens from the north, then covers all four edges across a checkpoint',()=>{
 let g=arena(),b=spawn(g,'kraken');
 const directions=[];
 for(let cast=0;cast<5;cast++){
  if(cast===2){g=copy(g);b=g.activeBoss();}
  g.commander(0).hp=g.commander(0).maxHp;
  g.updateKraken(b,.05,g.stats(b));
  g.time=b.krakenClock.water;g.updateKraken(b,.05,g.stats(b)); // water bombs
  g.time=b.krakenClock.water;g.updateKraken(b,.05,g.stats(b));
  const wave=g.roomCampaign.rotation.hazards.find(h=>h.kind==='tide');
  assert.ok(wave,'expected a tide on cast '+cast);
  directions.push(wave.direction);
  const view=g.viewport??{width:1200,height:860},captain=g.commander(0);
  const span=wave.horizontal?view.width:view.height,center=wave.horizontal?captain.x:captain.y-.16*span;
  const viewCenter=Math.max(span/2,Math.min(wave.length-span/2,center));
  const viewEdge=viewCenter-wave.sign*span/2,crestAt=wave.breakAt-wave.sign*(wave.profile[3].distance-wave.profile[2].distance);
  assert.ok(Math.abs((crestAt-viewEdge)*wave.sign/span-.15)<1e-8);
  if(cast===0){
   assert.equal(wave.horizontal,false);assert.equal(wave.front,0);assert.equal(wave.sign,1);
   const c=g.commander(0);
   c.x=wave.offset+2*310+75;c.y=58;
   g.time=wave.start+.1;g.updateRotationHazards(.1);
   assert.ok(c.toyKnockback.dy>0);
  }
  wave.front=wave.sign>0?wave.length:0;g.time=Math.max(g.time,wave.start)+.1;g.updateRotationHazards(.1);
 }
 assert.equal(directions[0],1);assert.equal(directions[2],3);assert.equal(directions[4],1);
 assert.deepEqual(directions.slice(0,4).sort(),[0,1,2,3]);
});
test('kraken rage chains from a different edge, casts five bombs and accelerates shield and foam',()=>{
 const g=arena(),b=spawn(g,'kraken'),c=g.commander(0);Object.assign(b,{x:c.x+60,y:c.y});
 b.hp=b.maxHp/2;g.updateKraken(b,.05,g.stats(b));g.time+=2.5;g.updateKraken(b,.05,g.stats(b));
 assert.ok(b.bubbleShield.hp>0);assert.equal(b.krakenClock.shield-g.time,8);assert.equal(b.krakenClock.foam-g.time,4);
 assert.equal(g.roomCampaign.rotation.hazards.find(h=>h.kind==='geyser').points.length,5);
 g.time=b.krakenClock.water;g.updateKraken(b,.05,g.stats(b));
 const wave=g.roomCampaign.rotation.hazards.find(h=>h.kind==='tide');assert.ok(wave.again);
 wave.front=wave.sign>0?wave.length:0;g.time=wave.start+.1;g.updateRotationHazards(.1);
 const next=g.roomCampaign.rotation.hazards.find(h=>h.kind==='tide');assert.notEqual(next.horizontal,wave.horizontal);assert.equal(next.again,false);assert.ok(Math.abs(next.start-g.time-1.2)<1e-7);
});
test('the swell crests 15% into the locked view, then a low wash sweeps across the captain once',()=>{
 const g=arena(),b=spawn(g,'kraken'),c=g.commander(0),water=globalThis.FrontTideRules;
 c.y=520;g.viewport={width:1200,height:800};g.camera={x:c.x,y:500};g.updateKraken(b,.05,g.stats(b));
 for(let i=0;i<2;i++){g.time=b.krakenClock.water;g.updateKraken(b,.05,g.stats(b));}
 const plan=g.roomCampaign.rotation,h=plan.hazards.find(v=>v.kind==='tide');
 plan.hazards=[h];const station=c.y;
 assert.ok(Math.abs(h.start-g.time-1.2)<1e-8);
 const lockedBreak=h.breakAt,crest=h.breakAt-(h.profile[3].distance-h.profile[2].distance);
 assert.equal(crest,220);
 c.y+=90;g.camera.y+=90;g.updateKraken(b,.02,g.stats(b));
 assert.equal(h.breakAt,lockedBreak);
 c.y=station;h.offset=c.x-50;
 const saved=copy(g),savedTide=saved.roomCampaign.rotation.hazards.find(v=>v.kind==='tide');
 const tick=(game,end,step)=>{
  while(game.time<end-1e-9){const dt=Math.min(step,end-game.time);game.time+=dt;game.updateRotationHazards(dt);}
 };
 const start=h.start;tick(g,start,.073);assert.equal(h.front,0);
 // Track all phases at native speed and capture the first instant of contact.
 const hp=c.hp;let riseAt,crestAt,breakAt,hitAt,hitHp;
 for(let i=1;i<=440;i++){
  tick(g,start+i/180,1/180);
  const pose=water.motion(h);
  if(riseAt===undefined&&pose.rise>0)riseAt=g.time;
  if(crestAt===undefined&&pose.fall>0){crestAt=g.time;assert.ok(pose.height>.998);assert.ok(Math.abs(h.front-crest)<2);}
  if(breakAt===undefined&&pose.fall>=1){breakAt=g.time;assert.ok(h.front+water.width<station);}
  if(hitAt===undefined&&c.hp<hp){
   hitAt=g.time;hitHp=c.hp;
   assert.ok(pose.fall===1&&pose.impact<.001&&pose.height===0);
   assert.ok(Math.abs(h.front+water.width-station)<4);
   assert.ok(c.toyKnockback.dy>0);
  }
 }
 assert.ok(Math.abs((crestAt-riseAt)-.58)<.012);
 assert.ok(Math.abs((breakAt-crestAt)-.24)<.012);
 assert.equal(c.hp,hitHp);assert.deepEqual(h.hit,[c.id]);
 assert.equal(water.motion(h).wash,1);
 tick(saved,g.time,.173);
 assert.equal(savedTide.breakAt,h.breakAt);
 assert.ok(Math.abs(savedTide.front-h.front)<1e-6);
 assert.deepEqual(savedTide.hit,h.hit);
});
test('boomerang pauses for 1.3 seconds, turns to its moving owner and can hit again on return',()=>{
 const g=arena(),b=spawn(g,'ninjaAssassin'),c=g.commander(0);Object.assign(b,{x:c.x-120,y:c.y});
 const h={kind:'windmill',source:b,x:c.x-8,y:c.y,angle:0,stage:'out',left:50,hit:[]};
 g.roomCampaign.rotation.hazards=[h];g.updateRotationHazards(.15);assert.equal(h.stage,'hold');assert.ok(h.hit.includes(c.id));
 const hp=c.hp,end=h.x;g.time+=1.29;g.updateRotationHazards(.05);assert.equal(h.x,end);
 b.x-=35;g.time+=.02;g.updateRotationHazards(.12);assert.equal(h.stage,'back');assert.ok(h.x<end&&c.hp<hp);
});

test('each heavy pattern carries through one extra stack line and spares the third',()=>{
 for(const kind of ['tide','geyser','cross']){
  const g=arena(true),c=g.commander(0),b=spawn(g,kind==='cross'?'ninjaAssassin':'kraken');
  const troops=['rifle','machinegun','sniper'].map(type=>g.addUnit(0,type,c.x+64,c.y));
  for(const t of troops)t.hp=1;
  if(kind==='cross'){
   b.assassinAction={phase:'cross',point:{x:c.x,y:c.y},angle:0,until:g.time};
   g.updateNinjaBoss(b,.05,g.stats(b));
  }else{
   g.roomCampaign.rotation.hazards=kind==='geyser'?[{kind,source:b,points:[{x:c.x,y:c.y}],at:g.time}]:
    [{kind,source:b,horizontal:true,sign:1,length:3000,direction:0,offset:c.y-60,front:c.x-3,start:g.time-.1,hit:[]}];
   g.updateRotationHazards(.05);
  }
  assert.equal(troops.filter(t=>t.hp===0).length,2);
  assert.ok(c.stackGuardUntil>g.time);assert.equal(c.hp,c.maxHp);
 }
});
