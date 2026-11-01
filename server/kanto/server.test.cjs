'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),G=require('../../play/pokemon-kanto/game.js'),{createHandler}=require('./server.cjs');
test('two players share drafts and battle while private cards and commands stay protected',async()=>{
 const old={...G.CONFIG};G.CONFIG.introMs=180;G.CONFIG.beatMs=35;
 const server=http.createServer(createHandler());await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/kanto/api/';
 const stop=new AbortController();
 async function call(route,body,token){const res=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:res.status,data:await res.json()};}
 try{
  const host=(await call('create',{name:'Alpha',partner:25})).data,guest=(await call('join',{name:'Beta',partner:4,code:host.state.code})).data;
  assert.equal((await call('join',{name:'Third',partner:1,code:host.state.code})).status,400);
  assert.equal((await call('state')).status,401);assert.equal(guest.state.meIndex,1);
  assert.equal((await call('start',{version:guest.state.version},guest.token)).status,400);
  let state=(await call('start',{version:guest.state.version},host.token)).data;
  assert.equal(state.game.phase,'draft');assert.ok(!('rng' in state.game));assert.deepEqual(state.game.market[0].card,{kind:'hidden'});
  assert.equal((await call('action',{type:'draft',market:7,slot:0,version:-1},host.token)).status,409);
  assert.equal((await call('action',{type:'draft',market:7,slot:0,version:state.version},guest.token)).status,400);
  assert.equal((await call('action',{type:'draft',market:0,slot:0,version:state.version},host.token)).status,400);
  const stream=await fetch(base+'events',{headers:{Authorization:'Bearer '+guest.token},signal:stop.signal});const reader=stream.body.getReader();await reader.read();
  let checkedStream=false;
  while(state.game.phase!=='battle'){
   const index=state.game.current,token=index===0?host.token:guest.token;
   if(state.game.phase==='draft'){
    const market=state.game.market.findIndex((s,i)=>G.accessible(state.game,i)),card=state.game.market[market].card,p=state.game.players[index],same=p.team.findIndex(u=>u.species===card.species);
    const r=await call('action',{type:'draft',market,slot:same>=0?same:0,position:1,version:state.version},token);assert.equal(r.status,200);state=r.data;
    if(!checkedStream){const data=new TextDecoder().decode((await reader.read()).value);assert.ok(data.includes('Beta'));assert.ok(data.includes('"phase":"prepare"'));checkedStream=true;}
   }else{const r=await call('action',{type:'finishPrepare',version:state.version},token);assert.equal(r.status,200);state=r.data;}
  }
  assert.equal(state.game.battle.step,0);assert.ok(state.nextBeatAt>Date.now());
  const id=state.game.battle.id;
  assert.equal((await call('action',{type:'command',kind:'guard',battleId:'old',version:-1},host.token)).status,400);
  const guarded=await call('action',{type:'command',kind:'guard',battleId:id,version:-1},guest.token);assert.equal(guarded.status,200);assert.equal(guarded.data.game.battle.guard[1],18);
  assert.equal((await call('action',{type:'command',kind:'ultimate',battleId:id},guest.token)).status,400);
  for(let i=0;i<25;i++){state=(await call('state',undefined,host.token)).data;if(state.game.battle.step>0)break;await new Promise(r=>setTimeout(r,20));}
  assert.ok(state.game.battle.step>0);assert.ok(state.game.battle.lastMoves.length>0);
  assert.equal((await call('leave',{version:-99},host.token)).status,200);
  const end=(await call('state',undefined,guest.token)).data;assert.equal(end.phase,'finished');assert.equal(end.game.result.winner,1);assert.equal(end.game.result.forfeit,true);
  assert.equal((await call('state',undefined,host.token)).status,401);
  assert.equal((await call('leave',{},guest.token)).status,200);assert.equal((await call('join',{name:'Late',partner:1,code:host.state.code})).status,400);
  const cors=await fetch(base+'state',{method:'OPTIONS',headers:{Origin:'https://junho3713.github.io','Access-Control-Request-Method':'GET'}});
  assert.equal(cors.status,204);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),'https://junho3713.github.io');
  assert.equal((await fetch(base+'state',{method:'OPTIONS',headers:{Origin:'https://other.example'}})).status,403);
 }finally{stop.abort();Object.assign(G.CONFIG,old);server.closeAllConnections();await new Promise(r=>server.close(r));}
});
