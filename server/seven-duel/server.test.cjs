'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),http=require('node:http'),G=require('../../play/seven-duel/game.js'),{createHandler}=require('./server.cjs');
test('two players finish Pantheon: private SSE, invalid-action rollback, rematch, auth and CORS',async()=>{
 const server=http.createServer(createHandler());await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/seven-duel/api/',stop=new AbortController();
 async function call(route,body,token){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,data:await r.json()};}
 try{
 const h=(await call('create',{name:'Alpha',pantheon:true})).data,j=(await call('join',{name:'Beta',code:h.state.code,pantheon:false})).data;A.equal(j.state.pantheon,true);A.equal((await call('state')).status,401);A.equal((await call('join',{code:h.state.code})).status,400);
 let state=(await call('start',{version:j.state.version},h.token)).data;A.equal(state.game.phase,'wonderDraft');A.ok(!state.game.box);A.ok(!state.game.mythDecks);A.equal(state.game.market[2].id,null);A.ok(!state.game.draft.rest);
 const tokens=[h.token,j.token],stream=await fetch(base+'events',{headers:{Authorization:'Bearer '+j.token},signal:stop.signal}),reader=stream.body.getReader();const initial=new TextDecoder().decode((await reader.read()).value);A.ok(initial.includes('"id":null'));
 const before=state.version;A.equal((await call('action',{type:'draft',id:'nope',version:state.version,match:1},tokens[state.game.current])).status,400);A.equal((await call('state',undefined,h.token)).data.version,before);
 A.equal((await call('action',{...G.actions(state.game)[0],version:-1,match:1},tokens[state.game.current])).status,409);A.equal((await call('action',{...G.actions(state.game)[0],version:state.version,match:1},tokens[1-state.game.current])).status,400);
 let steps=0;while(state.game.phase!=='finished'&&steps++<300){const actor=state.game.current,action=G.ai(state.game,actor),r=await call('action',{...action,version:state.version,match:state.gameNumber},tokens[actor]);A.equal(r.status,200,JSON.stringify(r.data));state=r.data;if(state.game.phase==='choice'&&state.game.tasks[0].kind==='myth'){const other=(await call('state',undefined,tokens[1-actor])).data;A.deepEqual(other.game.tasks[0].options,[]);}}
 A.equal(state.game.phase,'finished');A.ok(steps<300);A.equal(state.game.result.scores.length,2);A.equal((await call('chat',{text:'테스트'},h.token)).status,200);
 state=(await call('rematch',{version:state.version},h.token)).data;A.equal(state.gameNumber,2);A.equal(state.game.phase,'wonderDraft');A.equal(state.game.pantheon,true);
 A.equal((await call('action',{...G.actions(state.game)[0],version:state.version,match:1},tokens[state.game.current])).status,409);
 await call('leave',{},j.token);state=(await call('state',undefined,h.token)).data;A.equal(state.game.result.winner,0);A.equal(state.game.result.forfeit,true);A.equal((await call('state',undefined,j.token)).status,401);await call('leave',{},h.token);A.equal((await call('join',{code:h.state.code})).status,400);
 const cors=await fetch(base+'state',{method:'OPTIONS',headers:{Origin:'https://junho3713.github.io'}});A.equal(cors.status,204);A.equal(cors.headers.get('Access-Control-Allow-Origin'),'https://junho3713.github.io');A.equal((await fetch(base+'state',{method:'OPTIONS',headers:{Origin:'https://elsewhere.example'}})).status,403);
 }finally{stop.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

