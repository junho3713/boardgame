'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),game=require('./game.cjs');
function createHandler(){
 const rooms=new Map(),sessions=new Map(),ttl=2*60*60*1000;
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 const person=(name,bot=false)=>({id:crypto.randomUUID(),token:crypto.randomBytes(24).toString('hex'),name,bot});
 const project=(r,p)=>({code:r.code,host:r.host,version:r.version,serverNow:Date.now(),turnLimitSeconds:r.timed?30:null,turnDeadline:r.deadline??null,...(r.game?game.view(r.game,p.id):{phase:'lobby',me:p.id,players:r.players.map(p=>({id:p.id,name:p.name,bot:p.bot})),first:r.first})});
 function expire(r){clearTimeout(r.timer);clearTimeout(r.turnTimer);for(const p of r.players)sessions.delete(p.token);for(const s of r.streams)s.res.end();rooms.delete(r.code);}
 function broadcast(r){for(const s of [...r.streams]){try{s.res.write('event: state\ndata: '+JSON.stringify(project(r,s.player))+'\n\n');}catch{r.streams.delete(s);}}}
 function syncDeadline(r){
  if(!r.timed||!r.game||r.game.phase!=='playing'||r.game.players[r.game.current].bot){r.deadline=null;r.deadlineTurn=null;return;}
  if(r.deadlineTurn!==r.game.turn){r.deadlineTurn=r.game.turn;r.deadline=Date.now()+30000;}
 }
 function enforceDeadline(r){
  if(!r.game||r.game.phase!=='playing'||r.deadline==null||Date.now()<r.deadline)return false;
  game.timeoutTurn(r.game);r.version++;schedule(r);broadcast(r);return true;
 }
 function schedule(r){
  clearTimeout(r.timer);clearTimeout(r.turnTimer);syncDeadline(r);
  if(!r.game||r.game.phase!=='playing')return;
  if(r.game.players[r.game.current].bot){
   r.timer=setTimeout(()=>{try{game.botStep(r.game);game.invariant(r.game);r.version++;schedule(r);broadcast(r);}catch(e){r.game.log.push('컴퓨터 진행을 멈췄어요: '+e.message);broadcast(r);}},1550);r.timer.unref?.();
  }else if(r.deadline!=null){
   r.turnTimer=setTimeout(()=>{try{if(!enforceDeadline(r))schedule(r);}catch(e){r.game.log.push('시간 종료 처리 오류: '+e.message);broadcast(r);}},Math.max(0,r.deadline-Date.now()));r.turnTimer.unref?.();
  }
 }
 return async function handle(req,res){
  const url=new URL(req.url,'http://localhost'),route=url.pathname;
  const origin=process.env.PUBLIC_ORIGIN;if(origin){const target=new URL(origin);if(req.headers.host!==target.host){res.writeHead(307,{Location:target.origin+url.pathname+url.search,'Cache-Control':'no-store'});res.end();return;}}
  try{
   if(route==='/splendor'){res.writeHead(302,{Location:'/splendor/'});res.end();return;}
   const files={'/splendor/art-2d.webp':['assets/art-2d.webp','image/webp'],'/splendor/':['index.html','text/html; charset=utf-8'],'/splendor/app.js':['app.js','text/javascript; charset=utf-8'],'/splendor/app.css':['app.css','text/css; charset=utf-8'],'/splendor/credits':['NOTICE.txt','text/plain; charset=utf-8'],'/splendor/license':['LICENSE.cards','text/plain; charset=utf-8']};
   if(req.method==='GET'&&files[route]){const [file,mime]=files[route];res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});res.end(fs.readFileSync(path.join(__dirname,file)));return;}
   if(!route.startsWith('/splendor/api/')){json(res,404,{error:'페이지를 찾지 못했어요.'});return;}
   for(const r of rooms.values())if(Date.now()-r.created>ttl)expire(r);
   let body={};if(req.method==='POST'){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>3072){json(res,413,{error:'요청이 너무 커요.'});return;}}try{body=JSON.parse(raw||'{}');}catch{json(res,400,{error:'요청 형식을 확인해 주세요.'});return;}}
   if(req.method==='POST'&&['/splendor/api/create','/splendor/api/solo'].includes(route)){
    if(rooms.size>=40){json(res,503,{error:'무료 서버의 방이 가득 찼어요. 잠시 후 다시 시도해 주세요.'});return;}const name=String(body.name||'나').trim().slice(0,16)||'나',p=person(name),bots=route.endsWith('/solo')?Number(body.bots??1):0;if(!Number.isInteger(bots)||bots<0||bots>3){json(res,400,{error:'컴퓨터는 1~3명으로 골라 주세요.'});return;}let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));const r={code,host:p.id,first:p.id,created:Date.now(),version:1,players:[p],streams:new Set(),game:null,timer:null,turnTimer:null,timed:!route.endsWith('/solo'),deadline:null,deadlineTurn:null};for(let i=0;i<bots;i++)r.players.push(person('컴퓨터 '+(i+1),true));rooms.set(code,r);sessions.set(p.token,{r,p});if(bots){r.game=game.newGame(r.players,r.first);schedule(r);}json(res,201,{token:p.token,state:project(r,p)});return;
   }
   if(req.method==='POST'&&route==='/splendor/api/join'){
    const r=rooms.get(String(body.code||'').trim().toUpperCase());if(!r){json(res,404,{error:'방이 없거나 만료됐어요. 코드를 확인해 주세요.'});return;}if(r.game||r.players.length>=4){json(res,409,{error:r.game?'이미 시작한 방이에요.':'4명이 모두 모였어요.'});return;}const p=person(String(body.name||'플레이어').trim().slice(0,16)||'플레이어');r.players.push(p);r.version++;sessions.set(p.token,{r,p});broadcast(r);json(res,200,{token:p.token,state:project(r,p)});return;
   }
   const auth=sessions.get((req.headers.authorization||'').replace(/^Bearer /,''));if(!auth){json(res,401,{error:'방이 만료됐어요. 새 방을 만들거나 다시 입장해 주세요.'});return;}const {r,p}=auth;enforceDeadline(r);
   if(req.method==='GET'&&route==='/splendor/api/state'){if(url.searchParams.get('v')===String(r.version)){res.writeHead(204,{'Cache-Control':'no-store'});res.end();}else json(res,200,project(r,p));return;}
   if(req.method==='GET'&&route==='/splendor/api/events'){
    if(r.streams.size>=16){json(res,429,{error:'이 방의 연결이 너무 많아요. 사용하지 않는 창을 닫아 주세요.'});return;}res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});const stream={res,player:p};r.streams.add(stream);res.write('event: state\ndata: '+JSON.stringify(project(r,p))+'\n\n');const heartbeat=setInterval(()=>{if(Date.now()-r.created>ttl){expire(r);return;}res.write(': keepalive\n\n');},20000);heartbeat.unref?.();res.on('close',()=>{clearInterval(heartbeat);r.streams.delete(stream);});return;
   }
   if(req.method!=='POST'){json(res,405,{error:'지원하지 않는 요청이에요.'});return;}
   if(body.version!==r.version){json(res,409,{error:'다른 플레이어의 행동으로 상태가 바뀌었어요. 새 화면에서 다시 선택해 주세요.',state:project(r,p)});return;}
   if(route==='/splendor/api/start'){if(p.id!==r.host||r.game)throw Error('대기방의 방장만 시작할 수 있어요.');r.game=game.newGame(r.players,r.first);}
   else if(route==='/splendor/api/add-bot'){if(p.id!==r.host||r.game||r.players.length>=4)throw Error('대기방의 방장이 빈자리에 컴퓨터를 넣을 수 있어요.');r.players.push(person('컴퓨터 '+(r.players.filter(p=>p.bot).length+1),true));}
   else if(route==='/splendor/api/fill-bots'){if(p.id!==r.host||r.game||r.players.length>=4)throw Error('대기방의 방장만 빈자리를 채울 수 있어요.');while(r.players.length<4)r.players.push(person('컴퓨터 '+(r.players.filter(p=>p.bot).length+1),true));}
   else if(route==='/splendor/api/first'){if(p.id!==r.host||r.game||!r.players.some(p=>p.id===body.player))throw Error('대기방에서 선 플레이어를 골라 주세요.');r.first=body.player;}
   else if(route==='/splendor/api/action'){if(!r.game)throw Error('먼저 게임을 시작해 주세요.');game.act(r.game,p.id,body);game.invariant(r.game);}
   else if(route==='/splendor/api/answer'){if(!r.game)throw Error('선택할 행동이 없어요.');game.answer(r.game,p.id,body);game.invariant(r.game);}
   else{json(res,404,{error:'요청을 찾을 수 없어요.'});return;}
   r.version++;schedule(r);json(res,200,project(r,p));broadcast(r);
  }catch(e){if(!res.headersSent)json(res,400,{error:e.message||'요청을 처리하지 못했어요.'});else res.end();}
 };
}
module.exports={createHandler};
