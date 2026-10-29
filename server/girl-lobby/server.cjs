'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const cardTypes=JSON.parse(fs.readFileSync(path.join(__dirname,'../../play/girl/cards.json'),'utf8'));
function createApp(){
 const rooms=new Map(), sessions=new Map();const ttl=2*60*60*1000;
 function prune(){for(const [code,r]of rooms)if(Date.now()-r.created>ttl){rooms.delete(code);for(const p of r.players)sessions.delete(p.token);}}
 function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
 function player(name){return {id:crypto.randomUUID(),token:crypto.randomBytes(32).toString('hex'),name,hand:[]};}
 function project(r,p){return {code:r.code,phase:r.phase,host:r.host,me:p.id,players:r.players.map(x=>({id:x.id,name:x.name,cards:x.hand.length})),hand:p.hand.map(id=>{const c=cardTypes.find(x=>x.id===id);return {id:c.id,name:c.name,mp:c.mp,ability:c.ability,win:c.win};})};}
 const server=http.createServer(async(req,res)=>{
  try{
   if(req.url==='/healthz'&&req.method==='GET')return json(res,200,{ok:true});
   if(req.url==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});return res.end(fs.readFileSync(path.join(__dirname,'index.html')));}
   if(!req.url.startsWith('/api/'))return json(res,404,{error:'페이지를 찾지 못했어요.'});prune();
   let body={};if(req.method==='POST'){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>2048)return json(res,413,{error:'요청이 너무 커요.'});}try{body=JSON.parse(raw||'{}');}catch{return json(res,400,{error:'요청 형식이 올바르지 않아요.'});}}
   if(req.url==='/api/rooms'&&req.method==='POST'){
    if(rooms.size>=50)return json(res,503,{error:'시험용 방이 가득 찼어요. 나중에 다시 시도해 주세요.'});
    const name=String(body.name||'').trim().slice(0,16);if(!name)return json(res,400,{error:'이름을 입력해 주세요.'});let code;do{code=crypto.randomBytes(4).toString('hex').toUpperCase();}while(rooms.has(code));
    const p=player(name),r={code,created:Date.now(),phase:'lobby',host:p.id,players:[p]};rooms.set(code,r);sessions.set(p.token,{r,p});return json(res,201,{token:p.token,state:project(r,p)});
   }
   if(req.url==='/api/join'&&req.method==='POST'){
    const r=rooms.get(String(body.code||'').trim().toUpperCase()),name=String(body.name||'').trim().slice(0,16);
    if(!r)return json(res,404,{error:'방을 찾지 못했어요. 코드를 확인해 주세요.'});if(r.phase!=='lobby')return json(res,409,{error:'이미 카드를 나눠준 방이에요. 새 방을 만들어 주세요.'});if(r.players.length>=6)return json(res,409,{error:'6명이 모두 입장했어요.'});if(!name)return json(res,400,{error:'이름을 입력해 주세요.'});
    const p=player(name);r.players.push(p);sessions.set(p.token,{r,p});return json(res,200,{token:p.token,state:project(r,p)});
   }
   const token=(req.headers.authorization||'').replace(/^Bearer /,''),session=sessions.get(token);if(!session)return json(res,401,{error:'방에 다시 입장해 주세요.'});const {r,p}=session;
   if(req.url==='/api/state'&&req.method==='GET')return json(res,200,project(r,p));
   if(req.url==='/api/deal'&&req.method==='POST'){
    if(p.id!==r.host)return json(res,403,{error:'방장만 카드를 나눠줄 수 있어요.'});if(r.phase!=='lobby')return json(res,409,{error:'이미 나눠줬어요.'});if(r.players.length<3)return json(res,409,{error:'3명 이상 입장하면 시작할 수 있어요.'});
    const n=r.players.length,removed=n===3?['library','accomplice','genius','discipline','lady','newspaper','homecoming']:[4,6].includes(n)?['library']:[];
    const deck=cardTypes.flatMap(c=>Array(c.copies-(removed.includes(c.id)?1:0)).fill(c.id));for(let i=deck.length-1;i>0;i--){const j=crypto.randomInt(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}r.players.forEach((x,i)=>x.hand=deck.slice(i*deck.length/n,(i+1)*deck.length/n));r.phase='dealt';return json(res,200,project(r,p));
   }
   return json(res,404,{error:'지원하지 않는 요청이에요.'});
  }catch{if(!res.headersSent)json(res,500,{error:'요청을 처리하지 못했어요. 다시 시도해 주세요.'});else res.end();}
 });return server;
}
if(require.main===module){const port=Number(process.env.PORT)||5176;createApp().listen(port,'0.0.0.0',()=>console.log(`Free lobby test: http://127.0.0.1:${port}`));}
module.exports={createApp};
