'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const cardTypes=JSON.parse(fs.readFileSync(path.join(__dirname,'../../play/girl/cards.json'),'utf8'));
const game=require('./game.cjs');
function createApp(){
 const splendorHandler=require('../splendor/server.cjs').createHandler();
 const rooms=new Map(), sessions=new Map();const ttl=2*60*60*1000;
 function prune(){for(const [code,r]of rooms)if(Date.now()-r.created>ttl){rooms.delete(code);for(const p of r.players)sessions.delete(p.token);}}
 function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
 function player(name){return {id:crypto.randomUUID(),token:crypto.randomBytes(32).toString('hex'),name,hand:[]};}
 function project(r,p){if(r.game)game.tick(r.game);return r.game?{code:r.code,host:r.host,...game.view(r.game,p.id)}:{code:r.code,phase:r.phase,host:r.host,me:p.id,players:r.players.map(x=>({id:x.id,name:x.name,cards:0})),hand:[]};}
 const server=http.createServer(async(req,res)=>{
  try{
   if(req.url.startsWith('/splendor')){await splendorHandler(req,res);return;}
   if(req.url==='/healthz'&&req.method==='GET')return json(res,200,{ok:true});
   if(req.url==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});return res.end(fs.readFileSync(path.join(__dirname,'index.html')));}
   const staticFiles={'/table.js':['table.js','text/javascript; charset=utf-8'],'/table.css':['table.css','text/css; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/app.css':['app.css','text/css; charset=utf-8'],'/cards.json':['../../play/girl/cards.json','application/json; charset=utf-8'],'/assets/ordinary.png':['../../play/girl/assets/ordinary.png','image/png'],'/assets/criminals.png':['../../play/girl/assets/criminals.png','image/png'],'/assets/official-roles.jpg':['../../play/girl/assets/official-roles.jpg','image/jpeg']};
   if(req.method==='GET'&&staticFiles[req.url]){const [file,mime]=staticFiles[req.url];res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cache-Control':mime.startsWith('image/')?'public, max-age=86400':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,file)));}
   if(!req.url.startsWith('/api/'))return json(res,404,{error:'페이지를 찾지 못했어요.'});prune();
   let body={};if(req.method==='POST'){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>2048)return json(res,413,{error:'요청이 너무 커요.'});}try{body=JSON.parse(raw||'{}');}catch{return json(res,400,{error:'요청 형식이 올바르지 않아요.'});}}
   if(['/api/rooms','/api/solo'].includes(req.url)&&req.method==='POST'){
    if(rooms.size>=50)return json(res,503,{error:'시험용 방이 가득 찼어요. 나중에 다시 시도해 주세요.'});
    const name=String(body.name||'').trim().slice(0,16);if(!name)return json(res,400,{error:'이름을 입력해 주세요.'});let code;do{code=crypto.randomBytes(4).toString('hex').toUpperCase();}while(rooms.has(code));
    const p=player(name),r={code,created:Date.now(),phase:'lobby',host:p.id,players:[p]};
    if(req.url==='/api/solo'){const bots=Number(body.bots??2);if(!Number.isInteger(bots)||bots<2||bots>5)return json(res,400,{error:'컴퓨터는 2~5명을 골라 주세요.'});for(let i=0;i<bots;i++)r.players.push({...player('컴퓨터 '+(i+1)),bot:true});r.game=game.newGame(r.players);r.phase='playing';}
    rooms.set(code,r);sessions.set(p.token,{r,p});return json(res,201,{token:p.token,state:project(r,p)});
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
    r.game=game.newGame(r.players);r.phase='playing';return json(res,200,project(r,p));
   }
   if(['/api/action','/api/answer','/api/bot-step','/api/shuffle'].includes(req.url)&&req.method==='POST'){
    if(!r.game)return json(res,409,{error:'아직 게임을 시작하지 않았어요.'});game.tick(r.game);if(body.version!==r.game.version)return json(res,409,{error:'상태가 바뀌었어요. 최신 화면에서 다시 골라 주세요.'});
    try{if(req.url==='/api/action')game.play(r.game,p.id,body);if(req.url==='/api/answer')game.answer(r.game,p.id,body);if(req.url==='/api/bot-step')game.botStep(r.game);if(req.url==='/api/shuffle')game.shuffleHand(r.game,p.id);game.assertInvariant(r.game);}catch(e){return json(res,400,{error:e.message});}
    return json(res,200,project(r,p));
   }
   return json(res,404,{error:'지원하지 않는 요청이에요.'});
  }catch{if(!res.headersSent)json(res,500,{error:'요청을 처리하지 못했어요. 다시 시도해 주세요.'});else res.end();}
 });return server;
}
if(require.main===module){const port=Number(process.env.PORT)||5176;createApp().listen(port,'0.0.0.0',()=>console.log(`Free lobby test: http://127.0.0.1:${port}`));}
module.exports={createApp};
