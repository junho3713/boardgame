'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createCoopHandler}=require('./coop-server.cjs');
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
  const t=g.time;clock+=4000;handler.step();assert.equal(g.time,t);assert.equal(r.paused,true);
  await call('/state',null,a.token);await call('/state',null,b.token);
  assert.equal((await call('/command',{action:'resume'},b.token)).status,200);handler.step();assert.ok(g.time>t);
  assert.equal((await call('/command',{action:'input',x:9,y:0},a.token)).status,400);
  const raw=await fetch(origin+'/state',{headers:{Authorization:'Bearer '+b.token,'Accept-Encoding':'gzip'}});assert.equal(raw.headers.get('content-encoding'),'gzip');assert.equal((await raw.json()).owner,1);
 }finally{handler.close();await new Promise(r=>app.close(r));}
});
