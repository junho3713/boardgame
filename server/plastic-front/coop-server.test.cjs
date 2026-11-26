'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createCoopHandler}=require('./coop-server.cjs');
 async function selectOpening(get,token){
  const reply=await get('/state',null,token);
  const {round,game,choosing,phase}=reply.data;
  assert(choosing);assert.equal(phase,'choice');
  const type=game.fields.currentOptions.includes('rifle')?'rifle':game.fields.currentOptions[0];
  const result=await get('/command',{action:'chooseInitial',round,type},token);
  assert.equal(result.status,200);
  return type;
 }

test('legacy co-op reinforcement settings do not purchase at clock boundaries',async()=>{
 const handler=createCoopHandler({automatic:false,now:()=>10000}),app=http.createServer(handler);
 await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+app.address().port+'/plastic-front/api/coop';
 async function call(route,body,token){
  const res=await fetch(origin+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:res.status,data:await res.json()};
 }
 try{
  const reinforcementPlan={enabled:true,targets:{rifle:3}};
  const green=(await call('/rooms',{name:'green',reinforcementPlan})).data;
  const blue=(await call('/join',{code:green.state.code,name:'blue',reinforcementPlan})).data;
  assert.equal((await call('/command',{action:'start'},green.token)).status,200);
  await selectOpening(call,green.token);await selectOpening(call,blue.token);
  const g=handler.rooms.get(green.state.code).game;
  g.time=.6;g.updateDropPods();
  assert.equal((await call('/command',{action:'reinforcementPlan',plan:reinforcementPlan},blue.token)).status,409);
  for(const owner of [0,1])g.withOwner(owner,()=>{g.cash[0]=1000;g.supplyState().reinforcementPlan=reinforcementPlan;});
  g.time=30;handler.step();g.time=60;handler.step();
  assert.equal(g.dropPods.length,0);
  for(const owner of [0,1])g.withOwner(owner,()=>assert.ok(g.cash[0]>=1000));
  assert.equal((await call('/command',{action:'summon',slot:6},blue.token)).status,200);
  assert.ok(g.dropPods.length>0&&g.dropPods.every(p=>p.coopOwner===1));
 }finally{handler.close();await new Promise(r=>app.close(r));}
});
test('two clients authenticate, grow independently without pausing, reconnect and reject stale choices',async()=>{
 let clock=10000;const handler=createCoopHandler({automatic:false,now:()=>clock});const app=http.createServer(handler);await new Promise(r=>app.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${app.address().port}/plastic-front/api/coop`;
 async function call(route,body,token){const response=await fetch(origin+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
 try{
  const a=(await call('/rooms',{name:'초록',medicSkin:'rina'})).data,b=(await call('/join',{name:'파랑',medicSkin:'invalid',code:a.state.code})).data;
  assert.equal(a.state.owner,0);assert.equal(b.state.owner,1);assert.ok(!('token' in b.state.players[0]));
  assert.equal((await call('/join',{code:a.state.code})).status,409);assert.equal((await call('/state')).status,401);
  assert.equal((await call('/command',{action:'start'},b.token)).status,403);
  assert.equal((await call('/command',{action:'start'},a.token)).status,200);
  const r=handler.rooms.get(a.state.code),g=r.game;
  const seed=(await call('/state',null,b.token)).data;
  assert.equal((await call('/command',{action:'skipLevelUpgrade',round:seed.round},b.token)).status,409);
  const rolled=await call('/command',{action:'reroll',round:seed.round},b.token);assert.equal(rolled.status,200);assert.equal(rolled.data.game.fields.rerollCount,2);
  assert.equal((await call('/command',{action:'reroll',round:seed.round},b.token)).status,409);
  await selectOpening(call,a.token);handler.step();assert.equal(g.time,0);
  await selectOpening(call,b.token);assert.equal(g.phase,'playing');
  g.time=Math.max(...g.dropPods.map(p=>p.landAt));g.updateDropPods();
  g.withOwner(1,()=>{g.summonSlots[0]='rifle';g.tech[0].rifle=1;});
  assert.equal(g.withOwner(0,()=>g.addUnit(0,'medic',800,900)).appearance,'rina');
  assert.equal(g.withOwner(1,()=>g.addUnit(0,'medic',1000,900)).appearance,'classic');
  g.withOwner(0,()=>{g.xp=g.neededXP();});handler.step();
  const green=(await call('/state',null,a.token)).data,blue=(await call('/state',null,b.token)).data;
  assert.equal(green.choosing,true);assert.equal(blue.choosing,false);assert.equal(green.phase,'playing');assert.equal(blue.game.fields.level,1);assert.equal(green.game.fields.level,2);assert.ok(green.invulnerable>4.9);
  const option=green.game.fields.currentOptions.find(x=>x!=='fieldSupply')||green.game.fields.currentOptions[0];
  assert.equal((await call('/command',{action:'stage',round:green.round,type:option},a.token)).status,200);
  assert.equal((await call('/command',{action:'confirm',round:green.round-1},a.token)).status,409);
  assert.equal((await call('/command',{action:'confirm',round:green.round},b.token)).status,409);
  assert.equal((await call('/command',{action:'confirm',round:green.round},a.token)).status,200);
  assert.equal(g.coopChoosing[0],false);assert.equal(g.phase,'playing');
  g.withOwner(0,()=>{g.xp=g.neededXP();});g.levelCheck();
  const nextRound=g.coopRounds[0],instant=g.currentOptions[0];
  assert.equal((await call('/command',{action:'chooseUpgrade',round:nextRound-1,type:instant},a.token)).status,409);
  assert.equal((await call('/command',{action:'chooseUpgrade',round:nextRound,type:instant},b.token)).status,409);
  const applied=await call('/command',{action:'chooseUpgrade',round:nextRound,type:instant},a.token);
  assert.equal(applied.status,200);assert.equal(applied.data.choosing,false);
  assert.equal(applied.data.game.fields.pendingChoice,null);
  assert.equal((await call('/command',{action:'chooseUpgrade',round:nextRound,type:instant},a.token)).status,409);
  g.withOwner(0,()=>{
   g.summonSlots=['rifle','tank','rocket','lucky','medic'];
   for(const type of g.summonSlots)g.tech[0][type]=1;
  });
  for(const owner of [0,1])g.withOwner(owner,()=>{g.xp=g.neededXP();});g.levelCheck();
  assert(g.currentOptions.every(type=>g.summonSlots.includes(type)||g.abilityKey(type)));
  const [greenCash,blueCash]=[0,1].map(owner=>g.withOwner(owner,()=>g.cash[0]));
  const greenRound=g.coopRounds[0],blueRound=g.coopRounds[1],blueCards=g.withOwner(1,()=>[...g.currentOptions]);
  let skipped=await call('/command',{action:'skipLevelUpgrade',round:greenRound-1},a.token);
  assert.equal(skipped.status,409);
  skipped=await call('/command',{action:'skipLevelUpgrade',round:greenRound},a.token);
  assert.equal(skipped.status,200);assert.equal(skipped.data.choosing,false);
  assert.equal(skipped.data.game.fields.cash[0],greenCash+30);assert.equal(g.phase,'playing');
  assert.equal(g.withOwner(1,()=>g.cash[0]),blueCash);assert(g.coopChoosing[1]);
  assert.deepEqual(g.withOwner(1,()=>g.currentOptions),blueCards);
  assert.equal((await call('/command',{action:'skipLevelUpgrade',round:greenRound},a.token)).status,409);
  assert.equal((await call('/command',{action:'skipLevelUpgrade',round:blueRound},b.token)).status,200);
  const input=(token,aim,x=0,y=0)=>call('/command',{action:'input',x,y,aim},token);
  const angle=owner=>g.withOwner(owner,()=>g.manualAimAngle());
  assert.equal((await input(a.token,{x:1,y:0},0,-1)).status,200);
  assert.equal(angle(0),0);assert.equal(angle(1),null);
  assert.deepEqual(g.withOwner(0,()=>g.input),{x:0,y:-1});
  const point={x:1100,y:1600};
  assert.equal((await input(b.token,{x:0,y:1,point})).status,200);
  assert.deepEqual(g.withOwner(1,()=>g.manualAim.point),point);
  assert.equal(g.withOwner(0,()=>g.manualAim.point),undefined);
  assert.equal((await input(b.token,{x:0,y:1,point:{x:Infinity,y:1600}})).status,400);
  assert.equal((await input(b.token,{x:0,y:1,point:{x:-1,y:1600}})).status,400);
  assert.equal(angle(0),0);assert.equal(angle(1),Math.PI/2);
  assert.equal((await input(a.token,{x:0,y:0})).status,400);
  assert.equal((await input(a.token,null)).status,200);
  assert.equal(angle(0),null);assert.equal(angle(1),Math.PI/2);
  clock+=501;handler.step();assert.equal(angle(1),null);
  assert.equal((await input(a.token,{x:-1,y:0})).status,200);
  assert.equal((await call('/command',{action:'pause'},b.token)).status,200);
  assert.equal(angle(0),null);assert.equal(angle(1),null);
  assert.equal((await input(a.token,{x:1,y:0})).status,200);assert.equal(angle(0),null);
  assert.equal((await call('/command',{action:'resume'},b.token)).status,200);
  const blueLeader=g.withOwner(1,()=>g.commander(0)),greenLeader=g.withOwner(0,()=>g.commander(0));blueLeader.hp=1;const greenHp=greenLeader.hp;
  g.withOwner(1,()=>{g.supplyState().medkits=1;g.supplyState().artillery=1;});
  assert.equal((await call('/command',{action:'medkit'},a.token)).status,409);
  assert.equal((await call('/command',{action:'medkit'},b.token)).status,200);assert.equal(blueLeader.hp,blueLeader.maxHp);assert.equal(greenLeader.hp,greenHp);
  assert.equal((await call('/command',{action:'artillery',x:-100,y:10},b.token)).status,409);
  assert.equal((await call('/command',{action:'artillery',x:blueLeader.x+100,y:blueLeader.y},b.token)).status,200);assert.equal(g.supplyStrikes[0].coopOwner,1);
  g.withOwner(1,()=>{g.supplyState().artillery=1;g.addUnit(2,'ant',blueLeader.x+160,blueLeader.y);});assert.equal((await call('/command',{action:'artillery'},b.token)).status,200);assert.equal(g.supplyStrikes.at(-1).coopOwner,1);assert.equal(g.withOwner(1,()=>g.supplyState().artillery),0);

  g.withOwner(1,()=>{g.supplyState().pendingSupport=1;});g.levelCheck();
  assert.equal(g.coopChoosing[1],false);assert.equal(g.phase,'playing');
  const held=g.withOwner(1,()=>g.cash[0]);g.withOwner(1,()=>{g.cash[0]=300;});
  assert.equal((await call('/command',{action:'summon',slot:'1'},b.token)).status,409);
  assert.equal((await call('/command',{action:'summon',slot:1},b.token)).status,200);
  const pod=g.dropPods.find(p=>p.coopOwner===1);assert(pod);assert.equal(g.withOwner(1,()=>g.cash[0]),240);
  g.time=pod.landAt;g.updateDropPods();assert(g.owned(1).some(u=>u.summonLandedAt===pod.landAt));
  g.withOwner(1,()=>{g.cash[0]=held;});
  g.withOwner(0,()=>{g.addSupportToy('toyDrum');g.addSupportToy('toyTurtle');g.supplyState().toyOffer={type:'toyStunner',at:g.time};});
  const greenToy=g.withOwner(0,()=>g.supportToys()[0]);
  assert.equal((await call('/command',{action:'supportToy',id:greenToy.id},b.token)).status,409);
  assert.equal((await call('/command',{action:'supportToy',id:greenToy.id},a.token)).status,200);
  assert.equal(g.withOwner(0,()=>g.supportToys()[0].type),'toyStunner');
  const t=g.time;clock+=4000;handler.step();assert.equal(g.time,t);assert.equal(r.paused,true);
  await call('/state',null,a.token);await call('/state',null,b.token);
  assert.equal((await call('/command',{action:'resume'},b.token)).status,200);handler.step();assert.ok(g.time>t);
  assert.equal((await call('/command',{action:'input',x:9,y:0},a.token)).status,400);
  const raw=await fetch(origin+'/state',{headers:{Authorization:'Bearer '+b.token,'Accept-Encoding':'gzip'}});assert.equal(raw.headers.get('content-encoding'),'gzip');assert.equal((await raw.json()).owner,1);
  g.withOwner(0,()=>{g.xp=g.neededXP();});g.levelCheck();
  assert.equal(g.coopChoosing[0],true);
  g.withOwner(0,()=>{
   for(const type of g.summonSlots)g.tech[0][type]=5;
   const {ABILITIES}=require('./public/engine.js');
   const keys=[...new Set([...g.selectedAbilities(),...Object.keys(ABILITIES)])].slice(0,5);
   for(const key of keys)g.abilities[key]=5;
  });
  const round=g.coopRounds[0],cash=g.withOwner(0,()=>g.cash[0]),rerolls=g.withOwner(0,()=>g.rerollCount);
  const rerolled=await call('/command',{action:'reroll',round},a.token);
  assert.equal(rerolled.status,200);
  assert.equal(rerolled.data.choosing,false);
  assert.equal(rerolled.data.game.fields.cash[0],cash+30);
  assert.equal(rerolled.data.game.fields.rerollCount,rerolls);
  assert.equal((await call('/command',{action:'reroll',round},a.token)).status,409);
 }finally{handler.close();await new Promise(r=>app.close(r));}
});
