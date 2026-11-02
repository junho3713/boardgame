'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),game=require('./game.cjs'),Chat=require('../shared/room-chat.cjs');
function createHandler(){
 const rooms=new Map(),sessions=new Map(),ttl=2*60*60*1000;
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 const person=(name,bot=false)=>({id:crypto.randomUUID(),token:crypto.randomBytes(24).toString('hex'),name,bot});
 const project=(r,p)=>({code:r.code,host:r.host,version:r.version,serverNow:Date.now(),turnLimitSeconds:r.timed?r.turnSeconds:null,turnDeadline:r.deadline??null,...(r.game?game.view(r.game,p.id):{phase:'lobby',me:p.id,players:r.players.map(p=>({id:p.id,name:p.name,bot:p.bot})),capacity:r.capacity,options:r.options})});
 function expire(r){clearTimeout(r.timer);clearTimeout(r.turnTimer);for(const p of r.players)sessions.delete(p.token);for(const s of r.streams)s.res.end();rooms.delete(r.code);}
 function broadcast(r){for(const s of [...r.streams]){try{s.res.write('event: state\ndata: '+JSON.stringify(project(r,s.player))+'\n\n');}catch{r.streams.delete(s);}}}
 function syncDeadline(r){
  if(!r.timed||!r.game||r.game.phase==='finished'){r.deadline=null;r.deadlineTurn=null;return;}
  if(r.deadlineTurn!==r.game.turn){r.deadlineTurn=r.game.turn;r.deadline=Date.now()+r.turnSeconds*1000;}
 }
 function enforceDeadline(r){if(!r.game||r.game.phase==='finished'||r.deadline==null||Date.now()<r.deadline)return false;game.timeout(r.game);game.invariant(r.game);r.version++;schedule(r);broadcast(r);return true;}
 function schedule(r){
  clearTimeout(r.timer);clearTimeout(r.turnTimer);syncDeadline(r);
  if(!r.game||r.game.phase==='finished')return;
  if(game.pending(r.game).some(id=>r.game.players.find(p=>p.id===id).bot)){
   r.timer=setTimeout(()=>{try{game.botStep(r.game);game.invariant(r.game);r.version++;schedule(r);broadcast(r);}catch(e){r.game.log.push('컴퓨터 선택 오류: '+e.message);broadcast(r);}},1600);r.timer.unref?.();
  }
  if(r.deadline!=null){r.turnTimer=setTimeout(()=>{try{if(!enforceDeadline(r))schedule(r);}catch(e){r.game.log.push('시간 종료 처리 오류: '+e.message);broadcast(r);}},Math.max(0,r.deadline-Date.now()));r.turnTimer.unref?.();}
 }
 const cleanup=setInterval(()=>{for(const r of rooms.values())if(Date.now()-r.created>ttl)expire(r);},30000);cleanup.unref?.();
 return async function handle(req,res){
  const url=new URL(req.url,'http://localhost'),route=url.pathname;
  const origin=process.env.PUBLIC_ORIGIN;if(origin){const target=new URL(origin);if(req.headers.host!==target.host){res.writeHead(307,{Location:target.origin+url.pathname+url.search,'Cache-Control':'no-store'});res.end();return;}}
  try{
   if(Chat.serve(req,res))return;
   if(route==='/avalon'){res.writeHead(302,{Location:'/avalon/'});res.end();return;}
   const files={'/avalon/':['index.html','text/html; charset=utf-8'],'/avalon/app.js':['app.js','text/javascript; charset=utf-8'],'/avalon/app.css':['app.css','text/css; charset=utf-8'],'/avalon/credits':['NOTICE.txt','text/plain; charset=utf-8'],'/avalon/license':['LICENSE.upstream','text/plain; charset=utf-8']};
   if(req.method==='GET'&&files[route]){const [file,mime]=files[route];res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});res.end(fs.readFileSync(path.join(__dirname,file)));return;}
   if(!route.startsWith('/avalon/api/')){json(res,404,{error:'페이지를 찾지 못했어요.'});return;}
   for(const r of rooms.values())if(Date.now()-r.created>ttl)expire(r);
   let body={};if(req.method==='POST'){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>3072){json(res,413,{error:'요청이 너무 커요.'});return;}}try{body=JSON.parse(raw||'{}');}catch{json(res,400,{error:'요청 형식을 확인해 주세요.'});return;}}
   if(req.method==='POST'&&['/avalon/api/create','/avalon/api/solo'].includes(route)){
    if(rooms.size>=40){json(res,503,{error:'무료 서버의 방이 가득 찼어요. 잠시 후 다시 시도해 주세요.'});return;}const name=String(body.name||'나').trim().slice(0,16)||'나',p=person(name),bots=route.endsWith('/solo')?Number(body.bots??4):0;if(!Number.isInteger(bots)||bots<0||route.endsWith('/solo')&&bots<4||bots>9){json(res,400,{error:'컴퓨터는 4~9명으로 골라 주세요.'});return;}let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));const r={code,host:p.id,capacity:bots?bots+1:5,created:Date.now(),version:1,options:{...game.DEFAULTS},players:[p],streams:new Set(),game:null,timer:null,turnTimer:null,timed:!route.endsWith('/solo'),turnSeconds:30,deadline:null,deadlineTurn:null};for(let i=0;i<bots;i++)r.players.push(person('컴퓨터 '+(i+1),true));rooms.set(code,r);sessions.set(p.token,{r,p});if(bots){r.game=game.newGame(r.players,r.options);schedule(r);}json(res,201,{token:p.token,state:project(r,p)});return;
   }
   if(req.method==='POST'&&route==='/avalon/api/join'){
    const r=rooms.get(String(body.code||'').trim().toUpperCase());if(!r){json(res,404,{error:'방이 없거나 만료됐어요. 코드를 확인해 주세요.'});return;}if(r.game||r.players.length>=r.capacity){json(res,409,{error:r.game?'이미 시작한 방이에요.':'이 방의 자리가 모두 찼어요.'});return;}const p=person(String(body.name||'플레이어').trim().slice(0,16)||'플레이어');r.players.push(p);r.version++;sessions.set(p.token,{r,p});broadcast(r);json(res,200,{token:p.token,state:project(r,p)});return;
   }
   const auth=sessions.get((req.headers.authorization||'').replace(/^Bearer /,''));if(!auth){json(res,401,{error:'방이 만료됐어요. 새 방을 만들거나 다시 입장해 주세요.'});return;}const {r,p}=auth;enforceDeadline(r);if(route==='/avalon/api/chat')return Chat.respond(req,res,r,p,body,json);
   if(req.method==='GET'&&route==='/avalon/api/state'){if(url.searchParams.get('v')===String(r.version)){res.writeHead(204,{'Cache-Control':'no-store'});res.end();}else json(res,200,project(r,p));return;}
   if(req.method==='GET'&&route==='/avalon/api/events'){
    if(r.streams.size>=16){json(res,429,{error:'이 방의 연결이 너무 많아요. 사용하지 않는 창을 닫아 주세요.'});return;}res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});const stream={res,player:p};r.streams.add(stream);res.write('event: state\ndata: '+JSON.stringify(project(r,p))+'\n\n');const heartbeat=setInterval(()=>{if(Date.now()-r.created>ttl){expire(r);return;}res.write(': keepalive\n\n');},20000);heartbeat.unref?.();res.on('close',()=>{clearInterval(heartbeat);r.streams.delete(stream);});return;
   }
   if(req.method!=='POST'){json(res,405,{error:'지원하지 않는 요청이에요.'});return;}
   if(!['/avalon/api/action','/avalon/api/chat'].includes(route)&&body.version!==r.version){json(res,409,{error:'다른 플레이어의 행동으로 상태가 바뀌었어요. 새 화면에서 다시 선택해 주세요.',state:project(r,p)});return;}
   if(route==='/avalon/api/start'){if(p.id!==r.host||r.game)throw Error('대기방의 방장만 시작할 수 있어요.');r.game=game.newGame(r.players,r.options);}
   else if(route==='/avalon/api/turn-limit'){if(p.id!==r.host||r.game)throw Error('대기방의 방장만 제한시간을 바꿀 수 있어요.');if(![15,30,45,60,90,120,180].includes(body.seconds))throw Error('목록에서 턴 제한시간을 골라 주세요.');r.turnSeconds=body.seconds;}
   else if(route==='/avalon/api/add-bot'){if(p.id!==r.host||r.game||r.players.length>=r.capacity)throw Error('대기방의 방장이 빈자리에 컴퓨터를 넣을 수 있어요.');r.players.push(person('컴퓨터 '+(r.players.filter(p=>p.bot).length+1),true));}
   else if(route==='/avalon/api/fill-bots'){if(p.id!==r.host||r.game||r.players.length>=r.capacity)throw Error('대기방의 방장만 빈자리를 채울 수 있어요.');while(r.players.length<r.capacity)r.players.push(person('컴퓨터 '+(r.players.filter(p=>p.bot).length+1),true));}
   else if(route==='/avalon/api/capacity'){if(p.id!==r.host||r.game)throw Error('대기방의 방장만 자리 수를 바꿀 수 있어요.');if(!Number.isInteger(body.capacity)||body.capacity<5||body.capacity>10||body.capacity<r.players.length)throw Error('참가 인원 이상인 5~10자리를 골라 주세요.');r.capacity=body.capacity;}
   else if(route==='/avalon/api/options'){if(p.id!==r.host||r.game)throw Error('대기방의 방장만 역할을 바꿀 수 있어요.');r.options=game.config(r.capacity,body.options||{});}
   else if(route==='/avalon/api/rematch'){if(p.id!==r.host||!r.game||r.game.phase!=='finished')throw Error('게임이 끝난 뒤 방장이 다시 시작할 수 있어요.');const nextTurn=r.game.turn+1;r.game=game.newGame(r.players,r.options);r.game.turn=nextTurn;r.deadlineTurn=null;}
   else if(route==='/avalon/api/suggest'){if(!r.game||r.game.phase!=='proposal'||r.game.players[r.game.leader].id!==p.id)throw Error('원정대장이 고를 때만 사용할 수 있어요.');json(res,200,{team:game.suggest(r.game,p.id)});return;}
   else if(route==='/avalon/api/action'){if(!r.game)throw Error('먼저 게임을 시작해 주세요.');if(body.turn!==r.game.turn){json(res,409,{error:'단계가 바뀌었어요. 현재 안내를 확인해 주세요.',state:project(r,p)});return;}game.act(r.game,p.id,body);game.invariant(r.game);}

   else{json(res,404,{error:'요청을 찾을 수 없어요.'});return;}
   r.version++;schedule(r);json(res,200,project(r,p));broadcast(r);
  }catch(e){if(!res.headersSent)json(res,400,{error:e.message||'요청을 처리하지 못했어요.'});else res.end();}
 };
}
module.exports={createHandler};