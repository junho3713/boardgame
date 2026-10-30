'use strict';
const {test,mock}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const game=require('./game.cjs'),{createHandler}=require('./server.cjs');
test('room chat stays independent of turns; the host can rematch a finished game in the same room',async()=>{
 const original=game.newGame;let fixture;
 const spy=mock.method(game,'newGame',(...args)=>(fixture=original(...args)));
 const server=http.createServer(createHandler());await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const root='http://127.0.0.1:'+server.address().port+'/splendor3/api/';
 async function call(route,body,token){const response=await fetch(root+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:response.status===204?null:await response.json()};}
 const controller=new AbortController();
 try{
  const host=(await call('create',{name:'방장'})).data,guest=(await call('join',{name:'친구',code:host.state.code})).data,other=(await call('create',{name:'다른 방'})).data;
  assert.equal((await call('chat',{text:'권한 없음'})).status,401);
  let state=(await call('start',{version:guest.state.version},host.token)).data;
  state=(await call('action',{version:state.version,type:'take',tokens:{white:1,blue:1,green:1}},host.token)).data;
  const version=state.version,deadline=state.turnDeadline;
  const stream=await fetch(root+'events',{headers:{Authorization:'Bearer '+guest.token},signal:controller.signal});
  const reader=stream.body.getReader();await reader.read();
  const text='<img src=x onerror=alert(1)> 안녕!';
  const sent=await call('chat',{text,version:-1},host.token);
  assert.equal(sent.status,200);assert.equal(sent.data.version,version);assert.equal(sent.data.turnDeadline,deadline);
  const delivered=new TextDecoder().decode((await reader.read()).value);
  assert.ok(delivered.includes('event: state'));assert.ok(delivered.includes(text));
  const second=await call('chat',{text:'반가워!',version:-1},guest.token);
  assert.equal(second.status,200);assert.equal(second.data.chat.messages.length,2);
  assert.equal((await call('state',undefined,other.token)).data.chat.messages.length,0);
  assert.ok(second.data.players.every(p=>!('token' in p)));assert.ok(!JSON.stringify(second.data.chat).includes(host.token));
  assert.equal((await call('chat',{text:'x'.repeat(301)},host.token)).status,400);
  assert.equal((await call('chat',{text:'   '},host.token)).status,400);
  assert.equal((await call('chat',{text:'연속 전송'},host.token)).status,429);
  assert.equal((await call('restart',{version},host.token)).status,400);
  fixture.phase='finished';fixture.pending=null;fixture.result={ranking:fixture.players.map(p=>({id:p.id,name:p.name,points:0,evolved:0,cards:0})),winners:[host.state.me]};
  assert.equal((await call('restart',{version},guest.token)).status,400);
  assert.equal((await call('restart',{version:-1},host.token)).status,409);
  const restarted=await call('restart',{version},host.token),next=restarted.data;
  assert.equal(restarted.status,200);assert.equal(next.code,host.state.code);assert.equal(next.me,host.state.me);assert.equal(next.host,host.state.me);
  assert.deepEqual(next.players.map(p=>p.id),state.players.map(p=>p.id));assert.equal(next.phase,'playing');assert.equal(next.round,1);assert.equal(next.gameNumber,state.gameNumber+1);
  assert.equal(next.chat.messages.length,2);assert.equal(next.chat.messages[0].text,text);
  assert.ok(next.players.every(p=>Object.values(p.tokens).every(n=>n===0)&&p.cards.length===0&&p.points===0));
  assert.ok(next.turnDeadline>Date.now());assert.equal(next.turnLimitSeconds,30);game.invariant(fixture);
  const guestState=(await call('state',undefined,guest.token)).data;assert.equal(guestState.me,guest.state.me);assert.equal(guestState.gameNumber,next.gameNumber);
 }finally{controller.abort();spy.mock.restore();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
