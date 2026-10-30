'use strict';
const RoomChat=require('../shared/room-chat.cjs');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),G=require('./game.cjs');
function createHandler(){const rooms=new Map(),sessions=new Map(),ttl=2*60*60*1000;
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const player=(name,bot=false)=>({id:crypto.randomUUID(),name,bot,token:bot?null:crypto.randomBytes(32).toString('hex')});
 function project(r,p){return {code:r.code,host:r.host,capacity:r.capacity,turnSeconds:r.turnSeconds,...(r.game?G.view(r.game,p.id):{phase:'lobby',me:p.id,version:r.version,players:r.players.map(({id,name,bot})=>({id,name,bot}))})};}
 function broadcast(r){for(const c of r.clients){try{c.res.write('data: '+JSON.stringify(project(r,c.p))+'\n\n');}catch{r.clients.delete(c);}}}
 function schedule(r){r.nextBot=Date.now()+1100;}
 function addBot(r){if(r.game)throw Error('시작 전까지만 추가할 수 있어요.');if(r.players.length>=r.capacity)throw Error('설정한 인원이 모두 찼어요.');r.players.push(player('컴퓨터 '+(r.players.filter(p=>p.bot).length+1),true));r.version++;}
 const ticker=setInterval(()=>{for(const [code,r]of rooms){if(Date.now()-r.updated>ttl){for(const c of r.clients)c.res.end();for(const p of r.players)if(p.token)sessions.delete(p.token);rooms.delete(code);continue;}if(!r.game||r.game.phase!=='playing')continue;try{if(r.game.deadline&&Date.now()>=r.game.deadline){G.timeout(r.game);schedule(r);broadcast(r);}else if(r.game.players[r.game.current].bot&&Date.now()>=r.nextBot){G.botStep(r.game);schedule(r);broadcast(r);}}catch(e){console.error('Yacht:',e.message);}}},300);ticker.unref();
 const ping=setInterval(()=>{for(const r of rooms.values())for(const c of r.clients){try{c.res.write(': ping\n\n');}catch{r.clients.delete(c);}}},20000);ping.unref();
 return async function handle(req,res){try{const url=new URL(req.url,'http://local'),route=url.pathname.replace(/^\/yacht/,'')||'/';
  if(!route.startsWith('/api/')){if(url.pathname==='/yacht'){res.writeHead(308,{Location:'/yacht/'+url.search});return res.end();}const file={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/app.css':['app.css','text/css; charset=utf-8'],'/credits':['NOTICE.md','text/plain; charset=utf-8'],'/license':['LICENSE.upstream','text/plain; charset=utf-8']}[route];if(!file)return json(res,404,{error:'페이지를 찾지 못했어요.'});res.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'"});return res.end(fs.readFileSync(path.join(__dirname,file[0])));}
  let body={};if(req.method==='POST'){let raw='';for await(const c of req){raw+=c;if(Buffer.byteLength(raw)>4096)return json(res,413,{error:'요청이 너무 커요.'});}try{body=JSON.parse(raw||'{}');}catch{return json(res,400,{error:'요청 형식이 올바르지 않아요.'});}}
  if(['/api/create','/api/solo'].includes(route)&&req.method==='POST'){
   if(rooms.size>=40)throw Error('방이 가득 찼어요. 잠시 뒤 다시 시도해 주세요.');const name=String(body.name||'나').trim().slice(0,16)||'나',p=player(name);let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));const r={code,players:[p],host:p.id,capacity:4,turnSeconds:30,updated:Date.now(),version:1,clients:new Set(),nextBot:0};
   if(route==='/api/solo'){const bots=Number(body.bots??1);if(!Number.isInteger(bots)||bots<1||bots>9)throw Error('컴퓨터는 1~9명을 골라 주세요.');r.capacity=bots+1;r.turnSeconds=0;for(let i=0;i<bots;i++)addBot(r);r.game=G.newGame(r.players,0);schedule(r);}rooms.set(code,r);sessions.set(p.token,{r,p});return json(res,201,{token:p.token,state:project(r,p)});
  }
  if(route==='/api/join'&&req.method==='POST'){
   const r=rooms.get(String(body.code||'').trim().toUpperCase());if(!r)throw Error('방 코드를 확인해 주세요. 서버 재시작 후에는 새 방을 만들어야 해요.');if(r.game)throw Error('이미 시작한 방이에요.');if(r.players.length>=r.capacity)throw Error('방이 가득 찼어요.');const p=player(String(body.name||'나').trim().slice(0,16)||'나');r.players.push(p);r.updated=Date.now();r.version++;sessions.set(p.token,{r,p});broadcast(r);return json(res,200,{token:p.token,state:project(r,p)});
  }
  const session=sessions.get((req.headers.authorization||'').replace(/^Bearer /,''));if(!session)return json(res,401,{error:'이름과 방 코드로 다시 입장해 주세요.'});const {r,p}=session;
  if(route==='/api/chat'){RoomChat.respond(req,res,r,p,body,json);return;}
  if(route==='/api/state')return json(res,200,project(r,p));
  if(route==='/api/stream'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});const c={res,p};r.clients.add(c);res.write('data: '+JSON.stringify(project(r,p))+'\n\n');req.on('close',()=>r.clients.delete(c));return;}
  if(req.method!=='POST')return json(res,405,{error:'지원하지 않는 요청이에요.'});
  if(['/api/settings','/api/add-bot','/api/fill-bots','/api/start','/api/rematch'].includes(route)){
   if(p.id!==r.host)throw Error('방장만 선택할 수 있어요.');if(r.game&&!(route==='/api/rematch'&&r.game.phase==='finished'))throw Error('시작 전까지만 바꿀 수 있어요.');
   if(route==='/api/settings'){if(body.capacity!==undefined){if(!Number.isInteger(body.capacity)||body.capacity<2||body.capacity>10||body.capacity<r.players.length)throw Error('현재 인원 이상, 최대 10명으로 설정해 주세요.');r.capacity=body.capacity;}if(body.seconds!==undefined){if(![15,30,45,60,90,120,180].includes(body.seconds))throw Error('제한시간을 다시 골라 주세요.');r.turnSeconds=body.seconds;}r.version++;}
   if(route==='/api/add-bot')addBot(r);if(route==='/api/fill-bots')while(r.players.length<r.capacity)addBot(r);
   if(route==='/api/start'||route==='/api/rematch'){r.game=G.newGame(r.players,r.turnSeconds);schedule(r);}
  }else if(route==='/api/action'){
   if(!r.game)throw Error('먼저 게임을 시작해 주세요.');if(body.version!==r.game.version)return json(res,409,{error:'상태가 바뀌었어요. 최신 화면에서 다시 골라 주세요.',state:project(r,p)});
   if(r.game.deadline&&Date.now()>=r.game.deadline){G.timeout(r.game);schedule(r);broadcast(r);return json(res,409,{error:'시간이 끝나 자동으로 기록했어요.',state:project(r,p)});}G.act(r.game,p.id,body);schedule(r);
  }else return json(res,404,{error:'지원하지 않는 요청이에요.'});r.updated=Date.now();broadcast(r);return json(res,200,project(r,p));
 }catch(e){if(!res.headersSent)json(res,400,{error:e.message||'처리하지 못했어요.'});else res.end();}};
}
module.exports={createHandler};
