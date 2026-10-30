'use strict';
const RoomChat=require('../shared/room-chat.cjs');
// GPL-3.0-only. Rule reducer and generated artwork: anicolao/rebelprincess.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const enginePromise=import('./vendor/rules.mjs');
function createHandler(){
 const sessions=new Map(),rooms=new Map();let E;
 const limits=[0,15,30,45,60,90,120,180],ttl=2*60*60*1000;
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const hidden=()=>({suit:'hidden',rank:0});
 function project(r,uid){
  const g=structuredClone(r.g);g.seed=g.seed?'server-dealt':null;g.roundIds=g.roundIds.map((id,i)=>i<=g.roundIndex||g.gameComplete?id:'');
  for(const p of g.players){if(p.uid!==uid){g.princessOptions[p.uid]=[];if(g.hands?.[p.uid])g.hands[p.uid]=g.hands[p.uid].map(c=>g.revealedSuits[p.uid]===c.suit?c:hidden());}}
  for(const k of ['passSubmissions','roundActionSubmissions','roundCardSubmissions','retainedCards'])for(const id of Object.keys(g[k]))if(id!==uid&&!g.roundComplete)g[k][id]=Array.isArray(g[k][id])?g[k][id].map(hidden):hidden();
  if(g.pendingPower&&g.pendingPower.powerId!=='sleeping-beauty'&&g.pendingPower.actorUid!==uid)g.pendingPower.cards=g.pendingPower.cards.map(x=>({...x,card:hidden()}));
  if(g.trick&&g.roundIds[g.roundIndex]==='masquerade-ball')for(const play of g.trick.plays)if(play.uid!==uid&&play.uid!==g.trick.leaderUid){play.card=hidden();delete play.effectiveRank;}
  g.settings={turnSeconds:r.turnSeconds};g.version=r.events.length;g.botUids=[...r.bots];
  g.deadlines=Object.fromEntries([...r.deadlines].filter(([id])=>E.actionOwnership(r.g,id).state==='active').map(([id,v])=>[id,v.at]));return g;
 }
 function broadcast(r){for(const client of r.clients){try{client.res.write('data: '+JSON.stringify(project(r,client.uid))+'\n\n');}catch{r.clients.delete(client);}}}
 function phaseKey(g,uid){return [g.gameNumber,g.roundIndex,g.completedTricks,g.passComplete?'passed':'passing',g.awaitingRoundAction||'',g.pendingMulanUid||'',g.pendingPower?.powerId||'',g.pendingPower?.cards.length===g.players.length?'collected':'collect',g.trick?.plays.length||0,uid].join(':');}
 function clocks(r){for(const p of r.g.players){if(!r.g.hands||r.g.roundComplete||E.actionOwnership(r.g,p.uid).state!=='active')continue;const key=phaseKey(r.g,p.uid),old=r.deadlines.get(p.uid);if(old?.key!==key)r.deadlines.set(p.uid,{key,at:Date.now()+(r.bots.has(p.uid)?1400:(r.turnSeconds||86400)*1000)});}}
 function accept(r,uid,type,payload={}){
  let revealKey='';
  if(type==='player/configured'){
   revealKey='princess:'+r.g.gameNumber+':'+uid;
   if(r.g.hands||r.reveals.has(revealKey)||!r.g.players.every(p=>r.g.princessCommitments[p.uid])||!r.g.princessOptions[uid]?.includes(payload.princessId)||payload.ready!==true||E.choiceCommitment(E.princessChoiceScope(r.code,r.g.gameNumber,uid),payload.princessId,payload.nonce||'')!==r.g.princessCommitments[uid])throw Error('공주 선택 확정을 확인하지 못했어요.');
  }
  if(type==='round/suit-revealed'){
   revealKey='suit:'+r.g.gameNumber+':'+r.g.roundIndex+':'+uid;
   if(r.g.awaitingRoundAction!=='reveal-suit'||r.reveals.has(revealKey)||!r.g.players.every(p=>r.g.suitCommitments[p.uid])||!r.g.hands[uid]?.some(c=>c.suit===payload.suit)||E.choiceCommitment(E.crystalClearChoiceScope(r.code,r.g.gameNumber,r.g.roundIndex,uid),payload.suit,payload.nonce||'')!==r.g.suitCommitments[uid])throw Error('무늬 선택 확정을 확인하지 못했어요.');
  }
  if(type==='player/princess-committed'&&(r.g.hands||r.g.princessCommitments[uid]||r.g.players.length<3))throw Error('이미 공주를 확정했어요.');
  if(type==='pass/submitted'){
   const cards=payload.cards,hand=r.g.hands?.[uid],count=E.passInstruction(r.g.roundIds[r.g.roundIndex]).count;
   if(!hand||r.g.passComplete||r.g.passSubmissions[uid]||!Array.isArray(cards)||cards.length!==count||new Set(cards.map(E.cardLabel)).size!==count||!cards.every(c=>hand.some(h=>h.suit===c.suit&&h.rank===c.rank)))throw Error('안내된 장수만큼 내 손패에서 골라 주세요.');
  }
  if(type==='pass/retracted'&&(!r.g.hands||r.g.passComplete||!r.g.passSubmissions[uid]))throw Error('이미 전달이 끝났어요.');
  const event={id:'E'+String(r.events.length+1).padStart(10,'0'),actorUid:uid,type,payload:{...payload,gameId:r.code},createdAt:null,clientSeq:r.events.length+1,schemaVersion:1,reducerVersion:1};
  if(!E.isGameEvent(event))throw Error('선택 형식이 올바르지 않아요.');
  const next=E.deriveGame([...r.events,event]);
  if(JSON.stringify(next)===JSON.stringify(r.g)&&!revealKey)throw Error('지금 할 수 없는 선택이에요. 현재 안내를 확인해 주세요.');
  if(revealKey)r.reveals.add(revealKey);
  r.events.push(event);r.g=next;r.updated=Date.now();clocks(r);return next;
 }
 function addBot(r){if(r.g.hands||Object.keys(r.g.princessCommitments).length)throw Error('공주 확정 전까지만 컴퓨터를 추가할 수 있어요.');if(r.g.players.length>=6)throw Error('최대 6명이에요.');const uid='bot-'+crypto.randomUUID();accept(r,uid,'player/joined',{displayName:'컴퓨터 '+(r.bots.size+1)});r.bots.add(uid);}
 function sealedBots(r){
  let changed=false;const g=r.g;
  if(!g.hands&&Object.keys(g.princessCommitments).length&&g.players.length>=3){
   for(const uid of r.bots)if(!r.g.princessCommitments[uid]){const choice=r.g.princessOptions[uid][0],nonce=crypto.randomUUID();r.secrets.set('princess:'+uid,{choice,nonce});accept(r,uid,'player/princess-committed',{commitment:E.choiceCommitment(E.princessChoiceScope(r.code,r.g.gameNumber,uid),choice,nonce)});changed=true;}
   if(r.g.players.every(p=>r.g.princessCommitments[p.uid]))for(const uid of r.bots){const s=r.secrets.get('princess:'+uid);if(s&&!r.g.players.find(p=>p.uid===uid).ready){try{accept(r,uid,'player/configured',{princessId:s.choice,nonce:s.nonce,ready:true});changed=true;}catch{}}}
  }
  if(r.g.awaitingRoundAction==='reveal-suit'&&r.g.players.every(p=>r.g.suitCommitments[p.uid]))for(const uid of r.bots){const s=r.secrets.get('suit:'+uid);if(s&&!r.g.revealedSuits[uid]){try{accept(r,uid,'round/suit-revealed',{suit:s.choice,nonce:s.nonce});changed=true;}catch{}}}
  return changed;
 }
 function automatic(r,uid){
  const g=r.g,hand=g.hands?.[uid]||[],roundId=g.roundIds[g.roundIndex],power=g.pendingPower;
  if(!hand.length&&!(power?.powerId==='sleeping-beauty'&&power.cards.length===g.players.length))return false;
  let type,payload={};
  if(!g.passComplete){type='pass/submitted';payload.cards=hand.slice(-E.passInstruction(roundId).count);}
  else if(g.awaitingRoundAction){
   if(g.awaitingRoundAction==='reveal-suit'){
    if(!r.bots.has(uid))return false;
    const choice=hand[0].suit,nonce=crypto.randomUUID();r.secrets.set('suit:'+uid,{choice,nonce});type='round/suit-committed';payload.commitment=E.choiceCommitment(E.crystalClearChoiceScope(r.code,g.gameNumber,g.roundIndex,uid),choice,nonce);
   }else if(g.awaitingRoundAction==='split-hand'){type='round/half-selected';payload.cards=hand.slice(0,hand.length/2);}
   else if(g.awaitingRoundAction==='haggle')type='round/haggle-declined';
   else{type=g.awaitingRoundAction==='set-aside'?'round/card-set-aside':g.awaitingRoundAction==='wedding-gift'?'round/gift-submitted':'round/pass-submitted';payload.card=hand[hand.length-1];}
  }else if(g.pendingMulanUid){type='power/declined';payload.powerId='mulan';}
  else if(power){payload.powerId=power.powerId;
   if(power.powerId==='sleeping-beauty'){if(power.cards.length===g.players.length){type='power/activated';payload.cards=power.cards.map(x=>x.card);}else{type='power/contributed';payload.card=hand[0];}}
   else if(power.powerId==='ice-princess'){type='power/activated';payload.card=power.cards[0].card;}
   else type='power/declined';
  }else{
   const forced=g.forcedCards[uid],legal=E.roundLegalCards(hand,g.trick,g.princesBroken,roundId,g.powerIdsThisTrick.includes('pea-princess'));
   // Preserve Prince/Frog penalty cards when following, otherwise use the lowest legal card.
   const card=forced||[...legal].sort((a,b)=>(a.suit==='princes'?30:0)+(a.suit==='pets'&&a.rank===8?50:0)+a.rank-((b.suit==='princes'?30:0)+(b.suit==='pets'&&b.rank===8?50:0)+b.rank))[0];
   if(!card)return false;type='card/played';payload.card=card;
  }
  accept(r,uid,type,payload);return true;
 }
 const ticker=setInterval(()=>{if(!E)return;for(const [code,r]of rooms){if(Date.now()-r.updated>ttl){for(const c of r.clients)c.res.end();rooms.delete(code);continue;}try{let changed=sealedBots(r);clocks(r);for(const p of r.g.players){if(E.actionOwnership(r.g,p.uid).state!=='active')continue;const clock=r.deadlines.get(p.uid);if(clock&&Date.now()>=clock.at&&(r.bots.has(p.uid)||r.turnSeconds)){if(automatic(r,p.uid)){changed=true;break;}}}if(changed){sealedBots(r);clocks(r);broadcast(r);}}catch(err){console.error('Princess automatic action:',err.message);}}},300);ticker.unref();
 const heartbeats=setInterval(()=>{for(const r of rooms.values())for(const c of r.clients){try{c.res.write(': keepalive\n\n');}catch{r.clients.delete(c);}}for(const [token,s]of sessions)if(Date.now()-s.at>ttl*2)sessions.delete(token);},20000);heartbeats.unref();
 return async function handler(req,res){
  try{E=await enginePromise;const url=new URL(req.url,'http://local'),p=url.pathname.replace(/^\/princess/,'')||'/';
   if(!url.pathname.startsWith('/princess/api/')){
    if(req.method!=='GET')return json(res,405,{error:'지원하지 않는 요청이에요.'});
    if(url.pathname==='/princess'){res.writeHead(308,{Location:'/princess/'+url.search});return res.end();}
    const file=p==='/'?'index.html':p.slice(1);if(!/^(?:index\.html|app\.js|app\.css|assets\/[a-z-]+\.webp)$/.test(file))return json(res,404,{error:'페이지를 찾지 못했어요.'});
    const target=path.join(__dirname,'public',file),mime=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'image/webp';
    if(!fs.existsSync(target))return json(res,404,{error:'파일을 찾지 못했어요.'});res.writeHead(200,{'Content-Type':mime,'Cache-Control':mime==='image/webp'?'public, max-age=86400':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});return res.end(fs.readFileSync(target));
   }
   const token=(req.headers.authorization||'').replace(/^Bearer /,''),session=sessions.get(token);
   if(p==='/api/session'){if(req.method==='GET')return json(res,session?200:401,session?{uid:session.uid}:{error:'다시 연결해 주세요.'});if(req.method==='POST'){if(sessions.size>1000)return json(res,503,{error:'잠시 뒤 다시 연결해 주세요.'});const uid=crypto.randomUUID(),newToken=crypto.randomBytes(32).toString('hex');sessions.set(newToken,{uid,at:Date.now()});return json(res,201,{uid,token:newToken});}}
   if(!session)return json(res,401,{error:'새로고침해서 다시 입장해 주세요.'});session.at=Date.now();const uid=session.uid;
   let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)return json(res,413,{error:'요청이 너무 커요.'});}try{body=JSON.parse(raw||'{}');}catch{return json(res,400,{error:'요청 형식이 올바르지 않아요.'});}}
   const code=E.normalizeGameId(body.gameId||url.searchParams.get('game')||'');let r=rooms.get(code);
   if(p==='/api/event'&&body.type==='game/created'){
    if(!code||r)throw Error('이미 사용 중인 방 코드예요. 다시 만들어 주세요.');if(rooms.size>=40)throw Error('방이 가득 찼어요. 잠시 뒤 다시 시도해 주세요.');const name=String(body.payload?.displayName||'').trim().slice(0,30);if(!name)throw Error('이름을 입력해 주세요.');
    r={code,events:[],g:null,bots:new Set(),secrets:new Map(),reveals:new Set(),clients:new Set(),deadlines:new Map(),turnSeconds:body.payload?.solo?0:30,updated:Date.now(),dealNonce:crypto.randomUUID()};
    accept(r,uid,'game/created',{displayName:name});rooms.set(code,r);if(body.payload?.solo){addBot(r);addBot(r);}return json(res,201,{ok:true});
   }
   if(!r)return json(res,404,{error:'방을 찾지 못했어요. 서버가 재시작되면 새 방을 만들어 주세요.'});
   const member=r.g.players.some(p=>p.uid===uid),host=r.g.players[0].uid===uid;
   if(p==='/api/state'&&req.method==='GET')return json(res,200,project(r,uid));
   if(p==='/api/event'&&body.type==='player/joined'){
    if(member)return json(res,200,{ok:true});if(r.g.hands||Object.keys(r.g.princessCommitments).length)throw Error('공주 선택이 확정된 방이에요. 새 방을 만들어 주세요.');if(r.g.players.length>=6)throw Error('6명이 모두 입장했어요.');const name=String(body.payload?.displayName||'').trim().slice(0,30);if(!name)throw Error('이름을 입력해 주세요.');accept(r,uid,'player/joined',{displayName:name});broadcast(r);return json(res,200,{ok:true});
   }
   if(!member)return json(res,403,{error:'이름과 방 코드를 입력해 먼저 입장해 주세요.'});
   if(p==='/api/chat'){const player=r.g.players.find(player=>player.uid===uid);RoomChat.respond(req,res,r,{id:uid,name:player.displayName},body,json);return;}
   if(p==='/api/stream'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});const client={res,uid};r.clients.add(client);res.write('data: '+JSON.stringify(project(r,uid))+'\n\n');req.on('close',()=>r.clients.delete(client));return;}
   if((p==='/api/bots'||p==='/api/settings')&&req.method==='POST'){if(!host)throw Error('방장만 설정할 수 있어요.');if(r.g.hands||Object.keys(r.g.princessCommitments).length)throw Error('공주 확정 전까지만 변경할 수 있어요.');if(p==='/api/bots')addBot(r);else{if(!limits.includes(body.turnSeconds))throw Error('제한시간을 다시 선택해 주세요.');r.turnSeconds=body.turnSeconds;}broadcast(r);return json(res,200,{ok:true});}
   if(p==='/api/event'&&req.method==='POST'){
    let payload=body.payload||{};if(typeof payload!=='object'||Array.isArray(payload))throw Error('잘못된 선택이에요.');
    if(['game/created','player/joined'].includes(body.type))throw Error('잘못된 요청이에요.');
    if(['game/rematched','game/dealt'].includes(body.type)&&!host)throw Error('방장만 시작할 수 있어요.');
    if(body.type==='game/dealt'){
     if(r.g.players.length<3||!r.g.players.every(p=>p.ready)||r.g.gameComplete||(r.g.hands&&!r.g.roundComplete))throw Error('모두 공주를 확정한 뒤 시작해 주세요.');
     const seed=crypto.randomUUID();payload={seed,roundIds:r.g.hands?r.g.roundIds:E.roundPowersForGame(r.dealNonce),hands:E.dealForPlayers(r.g.players.map(p=>p.uid),seed)};
    }
    if(body.type==='game/rematched'&&!r.g.gameComplete)throw Error('다섯 라운드가 끝나야 다시 시작할 수 있어요.');
    accept(r,uid,body.type,payload);if(body.type==='game/rematched'){r.secrets.clear();r.deadlines.clear();r.dealNonce=crypto.randomUUID();}sealedBots(r);clocks(r);broadcast(r);return json(res,200,{ok:true});
   }
   return json(res,404,{error:'지원하지 않는 요청이에요.'});
  }catch(err){if(!res.headersSent)json(res,400,{error:err.message||'처리하지 못했어요.'});else res.end();}
 };
}
module.exports={createHandler};
