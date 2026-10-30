'use strict';
const crypto=require('node:crypto');
const names=['','달무티','대주교','시종장','남작부인','수녀원장','기사','재봉사','석공','요리사','양치기','광부','농노','광대'];
const need=(v,m)=>{if(!v)throw Error(m);};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const makeDeck=()=>Array.from({length:13},(_,i)=>Array.from({length:i===12?2:i+1},(_,j)=>({id:'c'+(i+1)+'-'+j,rank:i+1}))).flat();
const role=(i,n)=>i===0?'대달무티':i===1?'소달무티':i===n-1?'대노예':i===n-2?'소노예':'상인';
function event(g,type,actor,message,cards=[],extra={}){g.sequence++;g.events.push({n:g.sequence,type,actor,message,cards,...extra});g.events=g.events.slice(-35);g.log.push(message);g.log=g.log.slice(-70);}
const sorted=cards=>cards.slice().sort((a,b)=>a.rank-b.rank||a.id.localeCompare(b.id));
function initialSeats(members){
 let deck=shuffle(makeDeck()),draws=members.map(p=>({...p,draw:[deck.pop().rank]}));
 for(let step=0;step<30;step++){const tied=new Map();for(const p of draws){const k=p.draw.join(',');if(!tied.has(k))tied.set(k,[]);tied.get(k).push(p);}const groups=[...tied.values()].filter(x=>x.length>1);if(!groups.length)break;for(const group of groups)for(const p of group){if(!deck.length)deck=shuffle(makeDeck());p.draw.push(deck.pop().rank);}}
 return draws.sort((a,b)=>{for(let i=0;i<Math.max(a.draw.length,b.draw.length);i++){const d=(a.draw[i]||0)-(b.draw[i]||0);if(d)return d;}return 0;});
}
function newGame(members,options={}){
 need(members.length>=4&&members.length<=8,'달무티는 4~8명으로 시작해요. 빈자리에 컴퓨터를 추가해 주세요.');
 const players=initialSeats(members).map(p=>({id:p.id,name:p.name,bot:!!p.bot,initialDraw:p.draw,hand:[],wins:0}));
 const g={players,round:1,turn:1,current:0,phase:'revolution',options:{firstNoTax:!!options.firstNoTax},top:null,pile:[],discard:[],passed:[],finishes:[],taxJobs:[],taxSelections:{},taxRecord:{},revIndex:0,sequence:0,events:[],log:[],result:null};
 event(g,'seats',null,'카드 추첨으로 첫 계급을 정했어요. 낮은 숫자를 뽑은 사람이 높은 자리에 앉아요.');deal(g);return g;
}
function deal(g){
 const deck=shuffle(makeDeck());g.players.forEach(p=>p.hand=[]);deck.forEach((c,i)=>g.players[i%g.players.length].hand.push(c));g.players.forEach(p=>p.hand=sorted(p.hand));g.top=null;g.pile=[];g.discard=[];g.passed=[];g.finishes=[];g.taxRecord={};g.taxJobs=[];g.taxSelections={};g.result=null;g.phase='revolution';g.revIndex=0;g.current=0;
 event(g,'deal',null,g.round+'판 · 80장을 모두 나눴어요. 세금 전에 혁명 여부를 확인해요.');
}
function beginPlay(g){g.phase='playing';g.current=0;g.top=null;g.passed=[];g.turn++;event(g,'lead',g.players[0].id,g.players[0].name+'님이 대달무티로 먼저 내요. 같은 숫자 카드를 원하는 장수로 골라 주세요.');}
function beginTax(g){
 if(g.round===1&&g.options.firstNoTax){event(g,'tax-skip',null,'선택 규칙으로 첫 판 세금은 생략해요.');beginPlay(g);return;}
 const n=g.players.length;g.taxJobs=[{actor:g.players[0].id,target:g.players[n-1].id,count:2,tribute:sorted(g.players[n-1].hand).slice(0,2)},{actor:g.players[1].id,target:g.players[n-2].id,count:1,tribute:sorted(g.players[n-2].hand).slice(0,1)}];g.taxSelections={};g.phase='tax';g.current=0;g.turn++;
 event(g,'tax',null,'세금 교환 · 대노예는 가장 강한 2장, 소노예는 가장 강한 1장을 내요. 높은 계급은 대신 줄 카드를 고른 뒤 동시에 교환해요.');
}
function selection(g,p,ids){need(Array.isArray(ids)&&ids.length>0&&ids.length<=p.hand.length,'손에서 낼 카드를 골라 주세요.');need(ids.every(x=>typeof x==='string')&&new Set(ids).size===ids.length,'같은 카드를 중복해서 고를 수 없어요.');const cards=ids.map(id=>p.hand.find(c=>c.id===id));need(cards.every(Boolean),'지금 손에 있는 카드만 고를 수 있어요.');return cards;}
function analyze(cards){const numeric=[...new Set(cards.filter(c=>c.rank!==13).map(c=>c.rank))];need(numeric.length<=1,'숫자 카드는 모두 같은 숫자여야 해요. 광대만 함께 섞을 수 있어요.');return {rank:numeric[0]||13,count:cards.length};}
function legalPlays(g,p){
 const jesters=p.hand.filter(c=>c.rank===13),list=[];
 for(let rank=1;rank<=13;rank++){const same=p.hand.filter(c=>c.rank===rank);if(!same.length)continue;const max=same.length+(rank===13?0:jesters.length),counts=g.top?[g.top.count]:Array.from({length:max},(_,i)=>i+1);for(const count of counts){if(count<1||count>max||g.top&&rank>=g.top.rank)continue;const native=Math.min(same.length,count),cards=same.slice(0,native).concat(rank===13?[]:jesters.slice(0,count-native));if(cards.length===count)list.push({ids:cards.map(c=>c.id),rank,count,jokers:cards.filter(c=>c.rank===13).length});}}
 return list;
}
function nextAlive(g,start){for(let d=1;d<=g.players.length;d++){const i=(start+d)%g.players.length;if(g.players[i].hand.length)return i;}throw Error('다음 플레이어를 찾지 못했어요.');}
function endRound(g){const last=g.players.find(p=>p.hand.length);if(last&&!g.finishes.includes(last.id))g.finishes.push(last.id);g.phase='roundEnd';const ranking=g.finishes.map((id,i)=>{const p=g.players.find(p=>p.id===id);return {id,name:p.name,place:i+1,nextRole:role(i,g.players.length)};});g.players.find(p=>p.id===ranking[0].id).wins++;g.result={ranking};g.turn++;event(g,'round-end',ranking[0].id,ranking[0].name+'님이 이번 판 대달무티! 다음 판은 이 순서로 자리를 바꾸고 시작해요.');}
function clearTrick(g){const last=g.players.findIndex(p=>p.id===g.top.by),leader=g.players[last].hand.length?last:nextAlive(g,last);g.discard.push(...g.pile);g.pile=[];g.top=null;g.passed=[];g.current=leader;event(g,'clear',g.players[leader].id,'모두 연속 패스해서 바닥을 비웠어요. '+g.players[leader].name+'님이 새 묶음을 먼저 내요.');}
function act(g,id,a){
 const p=g.players[g.current];need(p&&p.id===id,'아직 내 선택 차례가 아니에요.');
 if(g.phase==='revolution'){
  need(a.type==='revolution'&&typeof a.declare==='boolean','혁명을 선언할지 확인하고 계속해 주세요.');
  if(a.declare){need(p.hand.filter(c=>c.rank===13).length===2,'광대 2장을 받은 사람만 혁명을 선언할 수 있어요.');const great=g.current===g.players.length-1;event(g,great?'great-revolution':'revolution',id,p.name+'님이 '+(great?'대혁명! 모든 계급이 반대로 바뀌고 세금도 없어요.':'혁명! 이번 판 세금을 걷지 않아요.'));if(great)g.players.reverse();beginPlay(g);return;}
  g.revIndex++;g.turn++;if(g.revIndex===g.players.length)beginTax(g);else g.current=g.revIndex;return;
 }
 if(g.phase==='tax'){
  need(a.type==='tax','손에서 대신 줄 카드를 골라 주세요.');const job=g.taxJobs.find(j=>j.actor===id&&!g.taxSelections[id]);need(job,'지금 선택할 세금 교환이 없어요.');const cards=selection(g,p,a.cards);need(cards.length===job.count,'정확히 '+job.count+'장을 골라 주세요.');g.taxSelections[id]=cards;
  const next=g.taxJobs.find(j=>!g.taxSelections[j.actor]);g.turn++;if(next){g.current=g.players.findIndex(x=>x.id===next.actor);return;}
  // Every outgoing card is chosen from the original hand. Incoming cards are revealed after both exchanges.
  const transfers=[];for(const j of g.taxJobs){transfers.push({from:j.actor,to:j.target,cards:g.taxSelections[j.actor]},{from:j.target,to:j.actor,cards:j.tribute});}
  for(const t of transfers){const owner=g.players.find(x=>x.id===t.from);need(t.cards.every(c=>owner.hand.some(x=>x.id===c.id)),'교환할 카드를 확인해 주세요.');owner.hand=owner.hand.filter(c=>!t.cards.some(x=>x.id===c.id));}
  for(const t of transfers){const recipient=g.players.find(x=>x.id===t.to);recipient.hand.push(...t.cards);for(const who of [t.from,t.to])if(!g.taxRecord[who])g.taxRecord[who]={given:[],received:[]};g.taxRecord[t.from].given.push(...t.cards);g.taxRecord[t.to].received.push(...t.cards);}
  g.players.forEach(x=>x.hand=sorted(x.hand));event(g,'tax-complete',null,'세금 교환을 동시에 마쳤어요. 내가 주고받은 카드는 내 손패 위에서 확인할 수 있어요.');beginPlay(g);return;
 }
 need(g.phase==='playing','지금은 카드를 낼 수 없어요.');
 if(a.type==='pass'){
  need(g.top,'바닥이 비었어요. 선 플레이어는 카드를 내야 해요.');g.passed.push(id);event(g,'pass',id,p.name+'님이 패스했어요. 다음 차례에는 다시 낼 수 있어요.');const others=g.players.filter(x=>x.hand.length&&x.id!==g.top.by);if(others.every(x=>g.passed.includes(x.id)))clearTrick(g);else g.current=nextAlive(g,g.current);g.turn++;return;
 }
 need(a.type==='play','카드를 내거나 패스해 주세요.');const cards=selection(g,p,a.cards),set=analyze(cards);if(g.top){need(set.count===g.top.count,'지금은 같은 장수인 '+g.top.count+'장을 내야 해요.');need(set.rank<g.top.rank,g.top.rank+'보다 낮은 숫자를 내야 해요. 낮은 숫자가 더 강해요.');}
 p.hand=p.hand.filter(c=>!a.cards.includes(c.id));g.pile.push(...cards);g.top={by:id,rank:set.rank,count:set.count,cards};g.passed=[];event(g,'play',id,p.name+'님이 '+(set.rank===13?'광대':set.rank+' '+names[set.rank])+' '+set.count+'장을 냈어요.',cards);
 if(!p.hand.length){g.finishes.push(id);event(g,'out',id,p.name+'님이 손패를 모두 냈어요! 이번 판 '+g.finishes.length+'등이에요.');}
 if(g.finishes.length===g.players.length-1){endRound(g);return;}
 g.current=nextAlive(g,g.current);g.turn++;
}
function nextRound(g){need(g.phase==='roundEnd','이번 판이 끝난 뒤 다음 판을 시작할 수 있어요.');g.players=g.finishes.map(id=>g.players.find(p=>p.id===id));g.round++;g.turn++;deal(g);}
function botStep(g){const p=g.players[g.current];need(p.bot,'컴퓨터 차례가 아니에요.');autoStep(g);}
function autoStep(g){const p=g.players[g.current];if(g.phase==='revolution'){act(g,p.id,{type:'revolution',declare:p.hand.filter(c=>c.rank===13).length===2});return;}if(g.phase==='tax'){const j=g.taxJobs.find(x=>x.actor===p.id),cards=p.hand.slice().sort((a,b)=>(b.rank===13?0:b.rank)-(a.rank===13?0:a.rank)).slice(0,j.count);act(g,p.id,{type:'tax',cards:cards.map(c=>c.id)});return;}const plays=legalPlays(g,p);if(!plays.length){act(g,p.id,{type:'pass'});return;}plays.sort((a,b)=>((b.count*8+b.rank*.3-b.jokers*3+(b.count===p.hand.length?100:0))-(a.count*8+a.rank*.3-a.jokers*3+(a.count===p.hand.length?100:0))));act(g,p.id,{type:'play',cards:plays[0].ids});}
function timeoutTurn(g,seconds=30){const p=g.players[g.current];event(g,'timeout',p.id,p.name+'님의 '+seconds+'초가 지나 컴퓨터가 이번 선택을 대신해요.');autoStep(g);invariant(g);}
function view(g,id){
 const p=g.players.find(x=>x.id===id);need(p,'참가자를 찾지 못했어요.');const active=['playing','revolution','tax'].includes(g.phase),myTurn=active&&g.players[g.current].id===id,job=g.phase==='tax'?g.taxJobs.find(x=>x.actor===id&&!g.taxSelections[id]):null;
 return {phase:g.phase,me:id,current:g.players[g.current]?.id,round:g.round,turn:g.turn,myTurn,top:g.top,pileCount:g.pile.length,discardCount:g.discard.length,passed:g.passed,finishes:g.finishes,hand:p.hand,players:g.players.map((x,i)=>({id:x.id,name:x.name,bot:x.bot,seat:i,role:role(i,g.players.length),count:x.hand.length,place:g.finishes.indexOf(x.id)+1,wins:x.wins,...(g.round===1?{draw:x.initialDraw}:{}),...(g.phase==='roundEnd'?{hand:x.hand}:{})})),canRevolt:g.phase==='revolution'&&p.hand.filter(c=>c.rank===13).length===2,tax:job?{count:job.count,to:job.target}:null,taxRecord:g.taxRecord[id]||null,options:g.options,legalPlays:g.phase==='playing'&&myTurn?legalPlays(g,p):[],events:g.events,log:g.log,result:g.result};
}
function invariant(g){const cards=g.players.flatMap(p=>p.hand).concat(g.pile,g.discard);need(cards.length===80&&new Set(cards.map(c=>c.id)).size===80,'카드 보존 오류');for(let r=1;r<=13;r++)need(cards.filter(c=>c.rank===r).length===(r===13?2:r),'숫자별 카드 수 오류');need(new Set(g.finishes).size===g.finishes.length,'순위 중복 오류');need(g.players.length>=4&&g.players.length<=8,'인원 오류');if(['playing','revolution','tax'].includes(g.phase))need(g.current>=0&&g.current<g.players.length,'차례 오류');if(g.phase==='playing')need(g.players[g.current].hand.length>0,'빈 손패 차례 오류');return true;}
module.exports={newGame,act,nextRound,view,botStep,timeoutTurn,invariant,makeDeck,analyze,legalPlays,role,names};
