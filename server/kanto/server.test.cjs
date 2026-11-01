'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),http=require('node:http'),{createHandler}=require('./server.cjs');
test('two humans submit concurrently; SSE, secrecy, stale turns, auth, rematch and cleanup',async()=>{
 const server=http.createServer(createHandler());await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/kanto/api/',stop=new AbortController();
 async function call(route,body,token){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,data:await r.json()};}
 try{
  const host=(await call('create',{name:'Alpha',partner:6})).data,guest=(await call('join',{name:'Beta',partner:9,code:host.state.code})).data;
  A.equal(guest.state.players[0].partner,null);A.equal(host.state.players[0].partner,6);A.equal((await call('state')).status,401);
  A.equal((await call('start',{version:guest.state.version},guest.token)).status,400);
  let state=(await call('start',{version:guest.state.version},host.token)).data;A.equal(state.game.phase,'choose');A.equal(state.players[1].partner,9);
  const stream=await fetch(base+'events',{headers:{Authorization:'Bearer '+guest.token},signal:stop.signal}),reader=stream.body.getReader();await reader.read();
  const body={type:'commit',action:{kind:'move',move:1},turn:1,match:state.gameNumber,version:state.version,player:1};
  let response=await call('action',body,host.token);A.equal(response.status,200);A.equal(response.data.game.pending[0].move,1);
  let other=(await call('state',undefined,guest.token)).data;A.equal(other.game.pending[0],null);A.equal(other.game.players[0].team[0].energy,3);
  const event=new TextDecoder().decode((await reader.read()).value);A.ok(event.includes('"locked":[true,false]'));A.ok(event.includes('"pending":[null,null]'));
  A.equal((await call('action',body,host.token)).status,400);
  // Guest's old room version must still be accepted: both players began at the same snapshot.
  response=await call('action',{...body,action:{kind:'guard'}},guest.token);A.equal(response.status,200);A.equal(response.data.game.phase,'reveal');A.equal(response.data.game.last.actions[0].move,1);
  A.equal((await call('action',{type:'ready',turn:1,match:-1},host.token)).status,409);
  const both=await Promise.all([call('action',{type:'ready',turn:1,match:1},host.token),call('action',{type:'ready',turn:1,match:1},guest.token)]);both.forEach(r=>A.equal(r.status,200));
  state=(await call('state',undefined,host.token)).data;A.equal(state.game.turn,2);A.equal((await call('action',body,host.token)).status,409);
  const cmd={type:'commit',turn:2,match:1,action:{kind:'focus'},version:state.version};
  const simultaneous=await Promise.all([call('action',cmd,host.token),call('action',cmd,guest.token)]);simultaneous.forEach(r=>A.equal(r.status,200));
  A.equal((await call('chat',{text:'테스트'},host.token)).status,200);
  A.equal((await call('leave',{},guest.token)).status,200);state=(await call('state',undefined,host.token)).data;A.equal(state.game.result.forfeit,true);A.equal(state.game.result.winner,0);
  A.equal((await call('rematch',{version:state.version},host.token)).status,400);A.equal((await call('state',undefined,guest.token)).status,401);
  A.equal((await call('leave',{},host.token)).status,200);A.equal((await call('join',{partner:3,code:state.code})).status,400);
  const h2=(await call('create',{partner:6})).data,g2=(await call('join',{partner:3,code:h2.state.code})).data;
  state=(await call('start',{version:g2.state.version},h2.token)).data;
  for(let turn=1;turn<=30;turn++){
   await Promise.all([h2.token,g2.token].map(token=>call('action',{type:'commit',action:{kind:'guard'},turn,match:1},token)));
   if(turn<30)await Promise.all([h2.token,g2.token].map(token=>call('action',{type:'ready',turn,match:1},token)));
  }
  state=(await call('state',undefined,h2.token)).data;A.equal(state.game.phase,'finished');
  state=(await call('rematch',{version:state.version},h2.token)).data;A.equal(state.gameNumber,2);A.equal(state.game.turn,1);A.equal(state.game.phase,'choose');
  A.equal((await call('action',{type:'commit',action:{kind:'guard'},turn:1,match:1},h2.token)).status,409);
  await call('leave',{},h2.token);await call('leave',{},g2.token);
  const cors=await fetch(base+'state',{method:'OPTIONS',headers:{Origin:'https://junho3713.github.io'}});A.equal(cors.status,204);A.equal(cors.headers.get('Access-Control-Allow-Origin'),'https://junho3713.github.io');
  A.equal((await fetch(base+'state',{method:'OPTIONS',headers:{Origin:'https://other.example'}})).status,403);
 }finally{stop.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

