'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createApp}=require('../girl-lobby/server.cjs');
test('chat and copy assets work across every room without changing game turns',async()=>{
 const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const root='http://127.0.0.1:'+server.address().port;
 async function call(prefix,route,body,token){
  const response=await fetch(root+prefix+'/api/'+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const type=response.headers.get('content-type')||'';
  return {status:response.status,data:type.includes('application/json')?await response.json():await response.text()};
 }
 try{
  for(const asset of ['/room-tools.js','/room-tools.css'])assert.equal((await fetch(root+asset)).status,200);
  for(const [prefix,count,start] of [['',3,'deal'],['/lexio',3,'start'],['/dalmuti',4,'start'],['/yacht',2,'start'],['/splendor',2,'start'],['/splendor2',2,'start']]){
   const host=(await call(prefix,prefix?'create':'rooms',{name:'방장'})).data;
   const peer=(await call(prefix,'join',{name:'친구',code:host.state.code})).data;
   for(let i=2;i<count;i++)assert.equal((await call(prefix,'join',{name:'참가자'+i,code:host.state.code})).status,200);
   let state=(await call(prefix,'state',undefined,host.token)).data;
   assert.equal((await call(prefix,start,{version:state.version},host.token)).status,200);
   state=(await call(prefix,'state',undefined,host.token)).data;
   const before=JSON.stringify({version:state.version,turn:state.turn,deadline:state.turnDeadline??state.deadline??state.pending?.deadline});
   assert.equal((await call(prefix,'chat')).status,401);
   assert.equal((await call(prefix,'chat',undefined,host.token)).data.chat.version,0);
   const text=('<b>안녕</b> '+prefix).trim();
   const sent=await call(prefix,'chat',{text,version:-1},host.token);assert.equal(sent.status,200,prefix);assert.equal(sent.data.chat.messages[0].text,text);
   const received=(await call(prefix,'chat',undefined,peer.token)).data;assert.equal(received.chat.messages[0].name,'방장');assert.equal(received.me,peer.state.me);
   const other=(await call(prefix,prefix?'create':'rooms',{name:'다른 방'})).data;
   assert.equal((await call(prefix,'chat',undefined,other.token)).data.chat.messages.length,0);
   assert.equal((await call(prefix,'chat',{text:'x'.repeat(301)},host.token)).status,400);
   assert.equal((await call(prefix,'chat',{text:'   '},host.token)).status,400);
   assert.equal((await call(prefix,'chat',{text:'연속 전송'},host.token)).status,429);
   state=(await call(prefix,'state',undefined,host.token)).data;
   assert.equal(JSON.stringify({version:state.version,turn:state.turn,deadline:state.turnDeadline??state.deadline??state.pending?.deadline}),before,prefix+' turn changed');
   assert.ok(!JSON.stringify(received).includes(host.token));
   const page=await (await fetch(root+(prefix||'')+'/')).text();
   assert.ok(page.includes('/room-tools.js'),prefix+' shared script');assert.ok(page.includes('/room-tools.css'),prefix+' shared style');
  }
  // Princess uses independent sessions and explicit room membership.
  const session=(await call('/princess','session',{})).data,peer=(await call('/princess','session',{})).data,outsider=(await call('/princess','session',{})).data;
  const code='CHAT'+Date.now().toString(36).slice(-4).toUpperCase();
  assert.equal((await call('/princess','event',{gameId:code,type:'game/created',payload:{displayName:'공주 방장'}},session.token)).status,201);
  assert.equal((await call('/princess','event',{gameId:code,type:'player/joined',payload:{displayName:'공주 친구'}},peer.token)).status,200);
  const before=(await call('/princess','state?game='+code,undefined,session.token)).data.version;
  assert.equal((await call('/princess','chat?game='+code,undefined,outsider.token)).status,403);
  assert.equal((await call('/princess','chat',{gameId:code,text:'공주 채팅'},session.token)).status,200);
  const chat=(await call('/princess','chat?game='+code,undefined,peer.token)).data;
  assert.equal(chat.chat.messages[0].name,'공주 방장');assert.equal(chat.chat.messages[0].text,'공주 채팅');
  assert.equal((await call('/princess','state?game='+code,undefined,session.token)).data.version,before);
  assert.ok((await (await fetch(root+'/princess/')).text()).includes('/room-tools.js'));
  const pokemonPage=await (await fetch(root+'/splendor3/')).text();assert.ok(pokemonPage.includes('/room-tools.js'));
  const room={code:'LIMIT'},req={method:'POST'};let response;
  const json=(_res,status,data)=>response={status,data};
  for(let i=0;i<90;i++)require('./room-chat.cjs').respond(req,{},room,{id:'p'+i,name:'참가자'}, {text:'메시지 '+i},json);
  assert.equal(response.data.chat.version,90);assert.equal(response.data.chat.messages.length,80);assert.equal(response.data.chat.messages[0].text,'메시지 10');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
