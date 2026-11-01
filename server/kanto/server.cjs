'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),G=require('../../play/pokemon-kanto/game.js'),Chat=require('../shared/room-chat.cjs');
function createHandler(){
 const rooms=new Map(),sessions=new Map(),ttl=2*60*60*1000;
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 function expire(r){for(const p of r.players)sessions.delete(p.token);for(const s of r.streams)s.res.end();rooms.delete(r.code);}
 function project(r,p){
  const meIndex=r.players.findIndex(x=>x.id===p.id);let game=null;
  if(r.game)game=G.view(r.game,meIndex);
  return{code:r.code,host:r.host,me:p.id,meIndex,version:r.version,gameNumber:r.gameNumber,serverNow:Date.now(),nextBeatAt:r.nextBeatAt||null,phase:game?game.phase:'lobby',players:r.players.map(x=>({id:x.id,name:x.name,partner:r.game||x.id===p.id?x.partner:null,left:!!x.left})),game};
 }
 function broadcast(r){for(const s of [...r.streams]){try{s.res.write('event: state\ndata: '+JSON.stringify(project(r,s.p))+'\n\n');}catch{r.streams.delete(s);}}}
 function start(r){r.game=G.newGame(r.players.map(p=>p.partner),crypto.randomInt(1,0x7fffffff),r.players.map(p=>p.name));r.gameNumber++;}
 const cleanup=setInterval(()=>{for(const r of rooms.values())if(Date.now()-r.updated>ttl)expire(r);},30000);cleanup.unref?.();
 return async function handle(req,res){
  const url=new URL(req.url,'http://local'),route=url.pathname;
  const allowed='https://junho3713.github.io';if(req.headers.origin===allowed){res.setHeader('Access-Control-Allow-Origin',allowed);res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){res.writeHead(req.headers.origin===allowed?204:403);res.end();return;}
  try{
   if(route==='/kanto'){res.writeHead(302,{Location:'/kanto/'+url.search});res.end();return;}
   const file={'/kanto/':['index.html','text/html; charset=utf-8'],'/kanto/app.js':['app.js','text/javascript; charset=utf-8'],'/kanto/game.js':['game.js','text/javascript; charset=utf-8'],'/kanto/style.css':['style.css','text/css; charset=utf-8'],'/kanto/NOTICE.md':['NOTICE.md','text/plain; charset=utf-8']}[route];
   if(req.method==='GET'&&file){res.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data: https://raw.githubusercontent.com; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(fs.readFileSync(path.join(__dirname,'../../play/pokemon-kanto',file[0])));return;}
   if(!route.startsWith('/kanto/api/')){json(res,404,{error:'페이지를 찾지 못했어요.'});return;}
   for(const r of rooms.values())if(Date.now()-r.updated>ttl)expire(r);
   let body={};if(req.method==='POST'){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>4096){json(res,413,{error:'요청이 너무 커요.'});return;}}try{body=JSON.parse(raw||'{}');}catch{json(res,400,{error:'요청 형식이 올바르지 않아요.'});return;}}
   if(req.method==='POST'&&['/kanto/api/create','/kanto/api/join'].includes(route)){
    const partner=Number(body.partner),name=String(body.name||'트레이너').trim().slice(0,16)||'트레이너';if(!G.starters.includes(partner))throw Error('파트너를 골라 주세요.');
    const p={id:crypto.randomUUID(),name,partner,token:crypto.randomBytes(24).toString('hex')};let r;
    if(route.endsWith('/create')){
     if(rooms.size>=40){json(res,503,{error:'방이 가득 찼어요. 잠시 뒤 다시 시도해 주세요.'});return;}
     let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
     r={code,host:p.id,players:[p],streams:new Set(),version:1,gameNumber:0,game:null,updated:Date.now(),timer:null,nextBeatAt:null};rooms.set(code,r);
    }else{r=rooms.get(String(body.code||'').trim().toUpperCase());if(!r)throw Error('방 코드를 확인해 주세요.');if(r.game||r.players.length>=2)throw Error('이미 두 명이 모였거나 시작한 방이에요.');r.players.push(p);r.version++;r.updated=Date.now();}
    sessions.set(p.token,{r,p});json(res,route.endsWith('/create')?201:200,{token:p.token,state:project(r,p)});broadcast(r);return;
   }
   const auth=sessions.get((req.headers.authorization||'').replace(/^Bearer /,''));if(!auth){json(res,401,{error:'방이 만료됐어요. 다시 입장해 주세요.'});return;}const {r,p}=auth,index=r.players.indexOf(p);
   if(route==='/kanto/api/chat'){Chat.respond(req,res,r,p,body,json);return;}
   if(req.method==='GET'&&route==='/kanto/api/state'){json(res,200,project(r,p));return;}
   if(req.method==='GET'&&route==='/kanto/api/events'){
    if(r.streams.size>=10){json(res,429,{error:'사용하지 않는 방 창을 닫아 주세요.'});return;}
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});const s={res,p};r.streams.add(s);res.write('event: state\ndata: '+JSON.stringify(project(r,p))+'\n\n');
    const heartbeat=setInterval(()=>{res.write(': keepalive\n\n');},20000);heartbeat.unref?.();res.on('close',()=>{clearInterval(heartbeat);r.streams.delete(s);});return;
   }
   if(req.method!=='POST'){json(res,405,{error:'지원하지 않는 요청이에요.'});return;}
   if(!['/kanto/api/action','/kanto/api/leave'].includes(route)&&body.version!==r.version){json(res,409,{error:'상태가 바뀌었어요. 새 화면에서 다시 선택해 주세요.',state:project(r,p)});return;}
   if(route==='/kanto/api/start'){if(p.id!==r.host||r.game||r.players.length!==2)throw Error('두 명이 모이면 방장이 시작할 수 있어요.');start(r);}
   else if(route==='/kanto/api/rematch'){if(p.id!==r.host||r.game?.phase!=='finished'||r.players.some(p=>p.left))throw Error('두 명이 남아 있을 때 방장이 다시 시작할 수 있어요.');start(r);}
   else if(route==='/kanto/api/action'){
    if(!r.game)throw Error('먼저 대전을 시작해 주세요.');
    if(body.turn!==r.game.turn||body.match!==r.gameNumber){json(res,409,{error:'턴이나 대전이 바뀌었어요. 새 화면에서 선택해 주세요.',state:project(r,p)});return;}
    G.act(r.game,index,body);G.assert(r.game);
   }else if(route==='/kanto/api/leave'){
    sessions.delete(p.token);for(const s of [...r.streams])if(s.p===p){s.res.end();r.streams.delete(s);}
    if(!r.game){r.players=r.players.filter(x=>x!==p);if(!r.players.length){expire(r);json(res,200,{ok:true});return;}r.host=r.players[0].id;}
    else{p.left=true;if(r.game.phase!=='finished'){r.game.phase='finished';r.game.result={winner:1-index,forfeit:true,reason:p.name+'님이 방을 나갔어요.'};r.game.pending=[null,null];r.game.replacements=[null,null];}}
    if(r.players.every(player=>player.left)){expire(r);json(res,200,{ok:true});return;}
    r.version++;broadcast(r);json(res,200,{ok:true});return;
   }else{json(res,404,{error:'요청을 찾지 못했어요.'});return;}
   r.updated=Date.now();r.version++;json(res,200,project(r,p));broadcast(r);
  }catch(e){if(!res.headersSent)json(res,400,{error:e.message||'처리하지 못했어요.'});else res.end();}
 };
}
module.exports={createHandler};

