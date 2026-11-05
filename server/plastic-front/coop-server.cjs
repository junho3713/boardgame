'use strict';
const crypto=require('node:crypto'),zlib=require('node:zlib');
const {CoopGame}=require('./public/coop-engine.js');
const {pack}=require('./public/autoplay.js');
const PREFIX='/plastic-front/api/coop';
function createCoopHandler({now=Date.now,automatic=true}={}){
 const rooms=new Map(),sessions=new Map(),creation=new Map();
 function fail(status,message){throw Object.assign(new Error(message),{status});}
 function json(req,res,status,data){const raw=Buffer.from(JSON.stringify(data));const gzip=raw.length>1024&&/\bgzip\b/.test(req.headers['accept-encoding']||'');res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Accept-Encoding',...(gzip?{'Content-Encoding':'gzip'}:{})});res.end(gzip?zlib.gzipSync(raw,{level:1}):raw);}
 function prune(){for(const [code,r]of rooms)if(now()-r.touched>10*60*1000){rooms.delete(code);for(const p of r.players)sessions.delete(p.token);}}
 function connected(p){return now()-p.seen<3500;}
 function publicRoom(r,p,includeGame=true){
  const data={code:r.code,owner:p.owner,host:p.owner===0,phase:r.started?r.game.phase:'lobby',started:r.started,paused:r.paused,pauseReason:r.pauseReason,round:r.started?r.game.coopRounds[p.owner]:0,choosing:r.started&&r.game.coopChoosing[p.owner],invulnerable:r.started?Math.max(0,r.game.coopInvulnerable[p.owner]-r.game.time):0,players:r.players.map(q=>({owner:q.owner,name:q.name,color:q.owner?'blue':'green',connected:connected(q)})),events:r.events.filter(e=>e.owner===undefined||e.owner===p.owner).slice(-30)};
  if(includeGame&&r.started){r.game.coopSelectOwner(p.owner);if(!r.cached||now()-r.cachedAt>=100){r.cached={};r.cachedAt=now();}if(!r.cached[p.owner])r.cached[p.owner]=pack(r.game);data.game=r.cached[p.owner];r.game.coopSelectOwner(0);}
  return data;
 }
 function player(r,name){const p={owner:r.players.length,name,token:crypto.randomBytes(32).toString('hex'),seen:now(),rateAt:now(),requests:0};r.players.push(p);sessions.set(p.token,{r,p});return p;}
 function events(r){return Object.fromEntries(['toast','level','end','fire','explosion'].map(type=>[type,data=>{
   if(type==='level'||type==='end')r.cached=null;
   if(type==='level')r.round++;
   const value=type==='toast'?String(data):type==='end'?{result:data.result,reason:data.reason}:type==='fire'?{type:data.type,team:data.team,x:data.x,y:data.y,appearance:data.appearance}:type==='explosion'?{x:data.x,y:data.y,kind:data.kind,team:data.team}:null;
   if(type!=='level'){r.events.push({id:++r.eventId,type,data:value,...(type==='toast'?{owner:r.game?.coopOwner}: {})});if(r.events.length>45)r.events.shift();}
 }]));}
 function step(){prune();for(const r of rooms.values()){
   if(!r.started||r.game.phase==='ended')continue;
   if(r.players.length!==2||r.players.some(p=>!connected(p))){r.paused=true;r.pauseReason='친구의 연결을 기다립니다. 재접속 후 함께 재개하세요.';}
   if(!r.paused){try{for(const p of r.players)if(now()-(p.inputAt||0)>500)r.game.withOwner(p.owner,()=>{r.game.input={x:0,y:0};});r.game.coopSelectOwner(0);r.game.update(.05);}catch(error){r.paused=true;r.pauseReason='작전 처리 오류로 멈췄습니다. 새 방에서 다시 시작해 주세요.';console.error('Plastic Front coop simulation failed',error.stack);}}
  }}
 const timer=automatic?setInterval(step,50):null;timer?.unref();
 async function handler(req,res){
  try{
   const url=new URL(req.url,'http://localhost'),route=url.pathname.slice(PREFIX.length);
   if(!['GET','POST'].includes(req.method))fail(405,'지원하지 않는 요청입니다.');
   let body={};if(req.method==='POST'){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>8192)fail(413,'요청이 너무 큽니다.');}try{body=JSON.parse(raw||'{}');}catch{fail(400,'요청을 읽지 못했습니다.');}if(!body||Array.isArray(body)||typeof body!=='object')fail(400,'잘못된 요청입니다.');}
   prune();
   if(req.method==='POST'&&['/rooms','/join'].includes(route)){
    const name=String(body.name||'대장').trim().slice(0,16)||'대장';
    if(route==='/rooms'){
     const ip=req.socket.remoteAddress||'unknown',limit=creation.get(ip);if(limit&&now()-limit.at<60000&&limit.n>=10)fail(429,'잠시 후 방을 만들어 주세요.');
     if(creation.size>1000)creation.clear();creation.set(ip,limit&&now()-limit.at<60000?{at:limit.at,n:limit.n+1}:{at:now(),n:1});
     if(rooms.size>=3)fail(503,'협동 시험방이 모두 사용 중입니다. 잠시 후 다시 시도해 주세요.');
     let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
     const r={code,players:[],touched:now(),started:false,paused:false,pauseReason:'',round:0,events:[],eventId:0,cached:null};const p=player(r,name);rooms.set(code,r);return json(req,res,201,{token:p.token,state:publicRoom(r,p)});
    }
    const r=rooms.get(String(body.code||'').trim().toUpperCase());if(!r)fail(404,'방 코드를 확인해 주세요.');if(r.started)fail(409,'이미 출격한 방입니다.');if(r.players.length>=2)fail(409,'2명이 모두 입장했습니다.');const p=player(r,name);r.touched=now();return json(req,res,200,{token:p.token,state:publicRoom(r,p)});
   }
   const token=(req.headers.authorization||'').replace(/^Bearer /,''),session=sessions.get(token);if(!session)fail(401,'방에 다시 입장해 주세요.');const {r,p}=session;
   if(now()-p.rateAt>=1000){p.rateAt=now();p.requests=0;}if(++p.requests>45)fail(429,'조작 요청이 너무 빠릅니다.');p.seen=now();r.touched=now();
   if(route==='/state'&&req.method==='GET')return json(req,res,200,publicRoom(r,p));
   if(route==='/leave'&&req.method==='POST'){
    if(!r.started){if(p.owner===0){rooms.delete(r.code);for(const q of r.players)sessions.delete(q.token);}else{r.players=r.players.filter(q=>q!==p);sessions.delete(p.token);}}
    else{p.seen=-Infinity;r.paused=true;r.pauseReason='친구가 방을 나갔습니다.';}
    return json(req,res,200,{ok:true});
   }
   if(route!=='/command'||req.method!=='POST')fail(404,'지원하지 않는 요청입니다.');
   const action=body.action;
   if(action==='start'){
    if(p.owner!==0)fail(403,'초록 방장만 출격할 수 있습니다.');if(r.started)fail(409,'이미 출격했습니다.');if(r.players.length!==2||r.players.some(q=>!connected(q)))fail(409,'두 대장이 연결되면 출격할 수 있습니다.');
    r.game=new CoopGame(events(r));r.started=true;r.game.start();
   }else{
    if(!r.started)fail(409,'아직 출격하지 않았습니다.');const g=r.game;
    if(action==='pause'){r.paused=true;r.pauseReason='대장이 작전을 일시정지했습니다.';}
    else if(action==='resume'){if(r.players.some(q=>!connected(q)))fail(409,'친구가 다시 연결되면 재개할 수 있습니다.');r.paused=false;r.pauseReason='';}
    else if(action==='input'){
     const x=Number(body.x),y=Number(body.y);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1||Math.abs(y)>1)fail(400,'잘못된 이동 입력입니다.');g.withOwner(p.owner,()=>{g.input={x,y};});p.inputAt=now();return json(req,res,200,{ok:true});
    }else{
     if(r.paused||r.players.some(q=>!connected(q)))fail(409,'연결 후 작전을 재개해 주세요.');
     g.withOwner(p.owner,()=>{
      let ok=false;const worldPhase=g.phase;try{
      if(action==='move')ok=g.setMoveOrder(body.x,body.y,false);
      else if(action==='follow')ok=g.followCommander();
      else if(action==='focus'){const target=body.target==='enemy-base'?g.bases[1]:[...g.units,...g.structures,...g.defenses].find(u=>u.id===body.target);ok=g.setFocus(target);}
      else if(action==='ultimate')ok=g.useUltimate();
      else if(action==='recovery')ok=g.beginRecovery();
      else if(action==='cancelRecovery'){if(g.coopChoosing[p.owner]&&g.choiceKind==='recovery'){g.phase='choice';ok=g.cancelRecovery();if(ok)g.coopChoosing[p.owner]=false;}}
      else if(action==='build')ok=g.build(body.kind);
      else if(action==='stage'){
       if(body.round!==g.coopRounds[p.owner]||!g.coopChoosing[p.owner])fail(409,'강화 선택이 갱신되었습니다.');g.phase='choice';
       ok=g.stageChoice(body.type,body.queue);
      }else if(action==='confirm'){
       if(body.round!==g.coopRounds[p.owner]||!g.coopChoosing[p.owner])fail(409,'강화 선택이 갱신되었습니다.');g.phase='choice';ok=g.confirmChoice();if(ok)g.coopChoosing[p.owner]=false;
      }
      if(!ok)fail(409,'현재 상태에서 실행할 수 없습니다.');
      }finally{if(g.phase!=='ended')g.phase=worldPhase;}
     });
    }
   }
   r.cached=null;return json(req,res,200,publicRoom(r,p));
  }catch(error){json(req,res,error.status||500,{error:error.status?error.message:'협동 서버 요청을 처리하지 못했습니다.'});}
 }
 handler.close=()=>clearInterval(timer);handler.step=step;handler.rooms=rooms;
 return handler;
}
module.exports={createCoopHandler,PREFIX};
