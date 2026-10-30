'use strict';
const crypto=require('node:crypto'),data=require('./cards.json');
const colors=['white','blue','green','red','black'],all=[...colors,'gold'];
const names={white:'다이아몬드',blue:'사파이어',green:'에메랄드',red:'루비',black:'오닉스',gold:'황금'};
const need=(ok,message)=>{if(!ok)throw Error(message);};
const zeros=()=>Object.fromEntries(all.map(c=>[c,0]));
const total=t=>all.reduce((n,c)=>n+t[c],0);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
const bonuses=p=>Object.fromEntries(colors.map(c=>[c,p.cards.filter(x=>x.color===c).length]));
const points=p=>p.cards.concat(p.nobles).reduce((n,c)=>n+c.points,0);
const cost=(p,c)=>{const b=bonuses(p);return Object.fromEntries(colors.map(k=>[k,Math.max(0,c.cost[k]-b[k])]));};
function payment(p,c){const result=zeros(),price=cost(p,c);for(const k of colors){result[k]=Math.min(price[k],p.tokens[k]);result.gold+=price[k]-result[k];}return result.gold<=p.tokens.gold?result:null;}
function event(g,type,from,to,card,message,extra={}){g.sequence++;g.events.push({n:g.sequence,type,from,to,...(card?{card}:{}),message,...extra});g.events=g.events.slice(-45);if(message){g.log.push(message);g.log=g.log.slice(-60);}}
function newGame(members,firstId){
 need(members.length>=2&&members.length<=4,'2~4명이 모여야 시작할 수 있어요.');
 const first=Math.max(0,members.findIndex(p=>p.id===firstId)),ordered=members.slice(first).concat(members.slice(0,first));
 const n=ordered.length,count=n===2?4:n===3?5:7,bank=Object.fromEntries(all.map(c=>[c,c==='gold'?5:count]));
 const decks=Object.fromEntries([1,2,3].map(t=>[t,shuffle(data.filter(c=>c.tier===t))])),market={};for(const t of [1,2,3])market[t]=decks[t].splice(0,4);
 return {players:ordered.map(p=>({id:p.id,name:p.name,bot:!!p.bot,tokens:zeros(),cards:[],reserved:[],nobles:[]})),bank,initialBank:{...bank},decks,market,nobles:shuffle(data.filter(c=>!c.tier)).slice(0,n+1),nobleTotal:n+1,current:0,round:1,turn:1,phase:'playing',pending:null,finalRound:false,events:[],sequence:0,log:[ordered[0].name+'님부터 시계 방향으로 시작해요.'],result:null};
}
function eligible(g,p){const b=bonuses(p);return g.nobles.filter(n=>colors.every(k=>b[k]>=n.cost[k]));}
function refill(g,t,index){const c=g.decks[t].shift();if(c)g.market[t][index]=c;else g.market[t].splice(index,1);}
function finishTurn(g){
 const p=g.players[g.current];g.pending=null;if(points(p)>=15&&!g.finalRound){g.finalRound=true;event(g,'final-round',null,null,null,p.name+'님이 15점 이상에 도달했어요. 이번 라운드의 마지막 플레이어까지 진행해요.');}
 if(g.finalRound&&g.current===g.players.length-1){g.phase='finished';const ranked=g.players.map(p=>({id:p.id,name:p.name,points:points(p),cards:p.cards.length})).sort((a,b)=>b.points-a.points||a.cards-b.cards);g.result={ranking:ranked,winners:ranked.filter(p=>p.points===ranked[0].points&&p.cards===ranked[0].cards).map(p=>p.id)};event(g,'finish',null,null,null,g.result.ranking.filter(p=>g.result.winners.includes(p.id)).map(p=>p.name).join(', ')+' 승리!');return;}
 g.current=(g.current+1)%g.players.length;if(!g.current)g.round++;g.turn++;
}
function grantNoble(g,p,n){g.nobles.splice(g.nobles.indexOf(n),1);p.nobles.push(n);event(g,'noble','noble:'+n.id,'nobles:'+p.id,n,p.name+'님에게 귀족이 방문했어요. 명성 +3점.');}
function checkNobles(g){const p=g.players[g.current],list=eligible(g,p);if(list.length>1){g.pending={kind:'noble',actor:p.id,options:list.map(n=>n.id)};return;}if(list.length===1)grantNoble(g,p,list[0]);finishTurn(g);}
function afterAction(g){const p=g.players[g.current],extra=total(p.tokens)-10;if(extra>0){g.pending={kind:'return',actor:p.id,count:extra};return;}checkNobles(g);}
function availableCards(g,p){return Object.values(g.market).flat().concat(p.reserved);}
function canReserve(g,p){return p.reserved.length<3&&(Object.values(g.market).some(a=>a.length)||Object.values(g.decks).some(a=>a.length));}
function canPass(g,p){return colors.every(c=>g.bank[c]===0)&&!canReserve(g,p)&&!availableCards(g,p).some(c=>payment(p,c));}
function act(g,id,a){
 need(g.phase==='playing','게임이 끝났어요. 새 방에서 다시 시작해 주세요.');const p=g.players[g.current];need(p.id===id,'아직 내 차례가 아니에요.');need(!g.pending,'반환할 보석이나 방문할 귀족 선택을 먼저 마쳐 주세요.');
 if(a.type==='take'){
  const pick=a.tokens;need(pick&&typeof pick==='object'&&!Array.isArray(pick),'가져올 보석을 골라 주세요.');need(Object.keys(pick).every(k=>colors.includes(k)),'황금은 카드 예약으로만 가져와요.');for(const c of colors)need(Number.isInteger(pick[c]??0)&&(pick[c]??0)>=0&&(pick[c]??0)<=g.bank[c],'남아 있는 보석 중에서 골라 주세요.');
  const chosen=colors.filter(c=>pick[c]>0),sum=chosen.reduce((n,c)=>n+pick[c],0),different=Math.min(3,colors.filter(c=>g.bank[c]>0).length);
  need((chosen.length===1&&sum===2&&g.bank[chosen[0]]>=4)||(chosen.length===different&&sum===different&&different>0&&chosen.every(c=>pick[c]===1)),'서로 다른 색은 가능한 색 중 3종을 골라요. 같은 색 2개는 그 색이 4개 이상 남았을 때만 가능해요.');
  for(const c of chosen){g.bank[c]-=pick[c];p.tokens[c]+=pick[c];}event(g,'tokens','bank','tokens:'+id,null,p.name+'님이 '+chosen.map(c=>names[c]+' '+pick[c]+'개').join(' · ')+'를 가져왔어요.',{tokens:{...pick}});afterAction(g);return;
 }
 if(a.type==='reserve'){
  need(p.reserved.length<3,'예약은 최대 3장까지예요. 예약한 카드를 구매하면 빈자리가 생겨요.');let c,index,t;
  if(a.blind){t=Number(a.tier);need([1,2,3].includes(t)&&g.decks[t].length,'이 레벨의 덱에는 남은 카드가 없어요.');c=g.decks[t][0];}
  else{t=[1,2,3].find(t=>g.market[t].some(c=>c.id===a.card));need(t,'공개된 카드 중 예약할 카드를 골라 주세요.');index=g.market[t].findIndex(c=>c.id===a.card);c=g.market[t][index];}
  if(a.blind)g.decks[t].shift();else refill(g,t,index);p.reserved.push(c);const gold=g.bank.gold>0?1:0;if(gold){g.bank.gold--;p.tokens.gold++;}
  event(g,'reserve',a.blind?'deck:'+t:'card:'+c.id,'reserved:'+id,a.blind?null:c,p.name+'님이 '+(a.blind?'레벨 '+t+' 덱에서 뒷면 카드':'공개 카드')+' 1장을 예약했어요.'+(gold?' 황금 1개를 받았어요.':' 황금이 없어 카드만 예약했어요.'));afterAction(g);return;
 }
 if(a.type==='buy'){
  let reserved=p.reserved.findIndex(c=>c.id===a.card),t=[1,2,3].find(t=>g.market[t].some(c=>c.id===a.card)),index=t?g.market[t].findIndex(c=>c.id===a.card):-1,c=reserved>=0?p.reserved[reserved]:t?g.market[t][index]:null;
  need(c,'구매할 수 있는 공개 카드 또는 내 예약 카드를 골라 주세요.');const price=cost(p,c),pay=a.payment||payment(p,c);need(pay&&typeof pay==='object'&&!Array.isArray(pay),'보석과 할인 보너스가 부족해서 아직 구매할 수 없어요.');need(Object.keys(pay).every(c=>all.includes(c)),'지불할 보석의 종류를 확인해 주세요.');
  for(const k of all)need(Number.isInteger(pay[k]??0)&&(pay[k]??0)>=0&&(pay[k]??0)<=p.tokens[k],'가지고 있는 보석만 지불할 수 있어요.');for(const k of colors)need((pay[k]??0)<=price[k],'할인 후 필요한 개수보다 더 지불할 수 없어요.');need((pay.gold??0)===colors.reduce((n,k)=>n+price[k]-(pay[k]??0),0),'부족한 색 보석만큼 황금으로 대신 지불해 주세요.');
  for(const k of all){p.tokens[k]-=pay[k]??0;g.bank[k]+=pay[k]??0;}if(reserved>=0)p.reserved.splice(reserved,1);else refill(g,t,index);p.cards.push(c);
  event(g,'buy',reserved>=0?'reserved:'+id:'card:'+c.id,'owned:'+id,c,p.name+'님이 '+names[c.color]+' 보너스 카드 1장을 구매했어요.'+(c.points?' 명성 +'+c.points+'점.':' 다음 구매부터 '+names[c.color]+' 1개를 할인해요.'),{payment:pay});afterAction(g);return;
 }
 if(a.type==='pass'){need(canPass(g,p),'가능한 행동이 있어요. 보석 가져오기·구매·예약 중 하나를 골라 주세요.');event(g,'pass',null,null,null,p.name+'님은 가능한 행동이 없어 차례를 넘겨요.');finishTurn(g);return;}
 throw Error('보석 가져오기·카드 구매·카드 예약 중 하나를 골라 주세요.');
}
function answer(g,id,a){
 need(g.phase==='playing'&&g.pending,'진행할 선택이 없어요.');const q=g.pending,p=g.players[g.current];need(q.actor===id,'이 선택은 현재 플레이어가 진행해요.');
 if(q.kind==='return'){const pick=a.tokens;need(pick&&typeof pick==='object'&&!Array.isArray(pick),'반환할 보석을 골라 주세요.');need(Object.keys(pick).every(c=>all.includes(c)),'반환할 보석 종류를 확인해 주세요.');for(const c of all)need(Number.isInteger(pick[c]??0)&&(pick[c]??0)>=0&&(pick[c]??0)<=p.tokens[c],'가진 보석 안에서 반환할 개수를 골라 주세요.');need(all.reduce((n,c)=>n+(pick[c]??0),0)===q.count,'정확히 '+q.count+'개를 반환해 총 10개로 맞춰 주세요.');for(const c of all){p.tokens[c]-=pick[c]??0;g.bank[c]+=pick[c]??0;}event(g,'return','tokens:'+id,'bank',null,p.name+'님이 보석 '+q.count+'개를 반환해 10개로 맞췄어요.',{tokens:pick});g.pending=null;checkNobles(g);return;}
 if(q.kind==='noble'){need(q.options.includes(a.noble),'방문 조건을 만족한 귀족 중 하나를 골라 주세요.');grantNoble(g,p,g.nobles.find(n=>n.id===a.noble));finishTurn(g);return;}
}
function view(g,id){
 const me=g.players.find(p=>p.id===id);need(me,'참가자를 찾을 수 없어요.');const myTurn=g.phase==='playing'&&g.players[g.current].id===id;
 return {phase:g.phase,me:id,current:g.players[g.current].id,round:g.round,turn:g.turn,finalRound:g.finalRound,myTurn:myTurn&&!g.pending,bank:g.bank,market:g.market,decks:Object.fromEntries([1,2,3].map(t=>[t,g.decks[t].length])),nobles:g.nobles,players:g.players.map(p=>({id:p.id,name:p.name,bot:p.bot,tokens:p.tokens,bonuses:bonuses(p),points:points(p),cards:p.cards,nobles:p.nobles,reservedCount:p.reserved.length,...(g.phase==='finished'?{reserved:p.reserved}:{})})),reserved:me.reserved,pending:g.pending?{...g.pending,waiting:g.pending.actor!==id}:null,affordable:availableCards(g,me).filter(c=>payment(me,c)).map(c=>c.id),canPass:myTurn&&!g.pending&&canPass(g,me),events:g.events,log:g.log,result:g.result};
}
function autoStep(g){
 const p=g.players[g.current];need(g.phase==='playing','게임이 진행 중이 아니에요.');if(g.pending){if(g.pending.kind==='noble')answer(g,p.id,{noble:g.pending.options[0]});else{const pick=zeros(),sorted=[...all].sort((a,b)=>(a==='gold')-(b==='gold')||p.tokens[b]-p.tokens[a]);let left=g.pending.count;for(const c of sorted){pick[c]=Math.min(left,p.tokens[c]);left-=pick[c];}answer(g,p.id,{tokens:pick});}return;}
 const v=view(g,p.id),afford=availableCards(g,p).filter(c=>payment(p,c));if(afford.length){const b=bonuses(p);afford.sort((a,c)=>(c.points*5+(b[c.color]<4?2:0)-Object.values(payment(p,c)).reduce((n,v)=>n+v,0)*.18)-(a.points*5+(b[a.color]<4?2:0)-Object.values(payment(p,a)).reduce((n,v)=>n+v,0)*.18));act(g,p.id,{type:'buy',card:afford[0].id});return;}
 const options=availableCards(g,p),b=bonuses(p);let target=options.map(c=>({c,need:cost(p,c)})).map(x=>({...x,missing:colors.reduce((n,k)=>n+Math.max(0,x.need[k]-p.tokens[k]),0)-p.tokens.gold})).sort((a,b)=>(a.missing-a.c.points*.6)-(b.missing-b.c.points*.6))[0];
 if(target){const wanted=colors.filter(c=>g.bank[c]>0&&target.need[c]>p.tokens[c]).sort((a,b)=>(target.need[b]-p.tokens[b])-(target.need[a]-p.tokens[a]));if(wanted.length===1&&g.bank[wanted[0]]>=4&&target.need[wanted[0]]-p.tokens[wanted[0]]>=2){act(g,p.id,{type:'take',tokens:{[wanted[0]]:2}});return;}const available=colors.filter(c=>g.bank[c]>0).sort((a,c)=>((target.need[c]-p.tokens[c])-(target.need[a]-p.tokens[a]))||b[a]-b[c]);if(available.length&&total(p.tokens)<10){act(g,p.id,{type:'take',tokens:Object.fromEntries(available.slice(0,3).map(c=>[c,1]))});return;}if(canReserve(g,p)&&!p.reserved.some(c=>c.id===target.c.id)&&g.bank.gold>0){act(g,p.id,{type:'reserve',card:target.c.id});return;}}
 const available=colors.filter(c=>g.bank[c]>0);if(available.length){act(g,p.id,{type:'take',tokens:Object.fromEntries(shuffle(available).slice(0,3).map(c=>[c,1]))});return;}if(canReserve(g,p)){const card=Object.values(g.market).flat()[0];if(card)act(g,p.id,{type:'reserve',card:card.id});else act(g,p.id,{type:'reserve',blind:true,tier:[1,2,3].find(t=>g.decks[t].length)});return;}act(g,p.id,{type:'pass'});
}
function botStep(g){need(g.players[g.current].bot,'컴퓨터 차례가 아니에요.');autoStep(g);}
function timeoutTurn(g,seconds=30){
 need(g.phase==='playing','게임이 진행 중이 아니에요.');const turn=g.turn,p=g.players[g.current];
 event(g,'timeout',null,null,null,p.name+'님의 '+seconds+'초가 지나 컴퓨터가 이번 차례의 남은 선택을 마쳐요.');
 for(let step=0;step<4&&g.phase==='playing'&&g.turn===turn;step++)autoStep(g);
 need(g.phase!=='playing'||g.turn!==turn,'시간 종료 처리를 완료하지 못했어요.');invariant(g);
}
function invariant(g){for(const k of all)need(g.bank[k]>=0&&g.bank[k]+g.players.reduce((n,p)=>n+p.tokens[k],0)===g.initialBank[k],'보석 보존 오류');const cards=Object.values(g.decks).flat().concat(Object.values(g.market).flat(),g.players.flatMap(p=>p.cards.concat(p.reserved)));need(cards.length===90&&new Set(cards.map(c=>c.id)).size===90,'카드 보존 오류');need(g.nobles.length+g.players.reduce((n,p)=>n+p.nobles.length,0)===g.nobleTotal,'귀족 보존 오류');need(g.players.every(p=>p.reserved.length<=3),'예약 제한 오류');return true;}
module.exports={newGame,act,answer,view,botStep,timeoutTurn,invariant,colors,all,names,bonuses,points,payment,cost};
