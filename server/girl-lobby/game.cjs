'use strict';
const crypto=require('node:crypto');
const types=require('../../play/girl/cards.json');
const byType=Object.fromEntries(types.map(c=>[c.id,c]));
const ordinary=['president','class','genius','discipline','health','library','lady','newspaper'];
const need=(ok,message)=>{if(!ok)throw Error(message);};
const card=c=>({...byType[c.type],uid:c.uid});
const active=g=>g.players.filter(p=>!p.locked);
const player=(g,id)=>g.players.find(p=>p.id===id);
const log=(g,message)=>{g.log.push(message);if(g.log.length>100)g.log.shift();};
function remember(g,p,message,seen){p.intel.unshift({turn:g.turn,message,...(seen?{seen}:{})});p.intel=p.intel.slice(0,24);}
function emit(g,kind,from,to,front){g.events??=[];g.eventSequence=(g.eventSequence||0)+1;g.events.push({n:g.eventSequence,kind,from,to,...(front?{card:card(front)}:{})});g.events=g.events.slice(-60);}
function notice(p,kind,message){p.notices??=[];p.notices.push({id:crypto.randomUUID(),kind,message,at:Date.now()});p.notices=p.notices.slice(-12);}
function shuffled(a){for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function newGame(members){
 const n=members.length;need(n>=3&&n<=6,'3~6명이 필요해요.');
 const removed=n===3?['library','accomplice','genius','discipline','lady','newspaper','homecoming']:[4,6].includes(n)?['library']:[];
 const deck=shuffled(types.flatMap(t=>Array.from({length:t.copies-(removed.includes(t.id)?1:0)},()=>({type:t.id,uid:crypto.randomUUID()}))));
 const players=members.map((m,i)=>({id:m.id,name:m.name,bot:!!m.bot,hand:deck.slice(i*deck.length/n,(i+1)*deck.length/n),used:[],suspicions:[],locked:false,intel:[],notices:[]}));
 const first=players.find(p=>p.hand.some(c=>c.type==='president'));
 const g={players,pool:[],target:12-n,current:first.id,turn:1,version:1,phase:'playing',pending:null,log:[],events:[],eventSequence:0,total:deck.length};
 log(g,`${first.name}님이 학생회장을 가지고 있어 먼저 시작해요.`);return g;
}
function results(g){
 const total=g.pool.reduce((s,c)=>s+byType[c.type].mp,0),success=total>=g.target;
 const suspicion=g.players.map(p=>Math.max(0,p.suspicions.reduce((s,c)=>s+byType[c.type].mp,0)));
 const same=suspicion.every(x=>x===suspicion[0]),max=Math.max(...suspicion);
 const imprisoned=g.players.filter((p,i)=>!same&&suspicion[i]===max).map(p=>p.id);
 const role=p=>p.hand[0].type;let priority=null,winners=[];
 for(let rank=1;rank<=5;rank++){
  if(rank===1)winners=g.players.filter(p=>role(p)==='alien'&&imprisoned.includes(p.id));
  if(rank===2&&!success)winners=g.players.filter(p=>role(p)==='infected');
  if(rank===3){const criminal=g.players.find(p=>role(p)==='criminal'&&!imprisoned.includes(p.id));if(criminal)winners=g.players.filter(p=>['criminal','accomplice'].includes(role(p)));}
  if(rank===4&&success)winners=g.players.filter(p=>ordinary.includes(role(p)));
  if(rank===5)winners=g.players.filter(p=>role(p)==='homecoming');
  if(winners.length){priority=rank;break;}
 }
 return {total,target:g.target,success,priority,winners:winners.map(p=>p.id),imprisoned,pool:g.pool.map(card),players:g.players.map((p,i)=>({id:p.id,name:p.name,identity:card(p.hand[0]),suspicion:suspicion[i],cards:p.suspicions.map(card)})),reason:priority?`처음 승자가 나온 우선순위는 ${priority}번이에요.`:'조건을 만족한 정체가 없어 승자가 없어요.'};
}
function startTurn(g){
 const p=player(g,g.current);
 if(p.used.some(c=>c.type==='infected')&&g.pool.length){g.pending={kind:'infected',actor:p.id};log(g,`${p.name}님의 사용된 감염자가 다음 차례에 발동해요.`);}
}
function endTurn(g){
 const p=player(g,g.current);g.pending=null;
 if(p.hand.length===1){p.locked=true;log(g,`${p.name}님은 마지막 카드 1장이 남아 차례에서 빠져요. 의혹은 계속 받을 수 있어요.`);}
 if(g.players.every(p=>p.locked)){g.phase='finished';g.result=results(g);log(g,'모두 마지막 정체 1장을 남겼어요. 조합·감금·승리 조건을 판정해요.');return;}
 const idx=g.players.indexOf(p);for(let d=1;d<=g.players.length;d++){const next=g.players[(idx+d)%g.players.length];if(!next.locked){g.current=next.id;break;}}
 g.turn++;startTurn(g);
}
function reveal(g,p,message,seen){remember(g,p,message,seen);g.pending={kind:'ack',actor:p.id};}
function beginSkill(g,p,c){
 const others=active(g).filter(x=>x.id!==p.id);
 switch(c.type){
  case 'class':case 'lady':
   if(others.length)g.pending={kind:'target',skill:c.type,actor:p.id};else{log(g,'교환할 수 있는 상대가 없어 특기 효과를 건너뛰어요.');endTurn(g);}break;
  case 'discipline':g.pending={kind:'target',skill:c.type,actor:p.id};break;
  case 'health':
   if(g.players.some(x=>x.id!==p.id&&x.used.some(c=>c.type!=='health')))g.pending={kind:'health',actor:p.id};else{log(g,'다른 사람이 사용한 보건위원 이외의 카드가 없어 효과를 건너뛰어요.');endTurn(g);}break;
  case 'library':reveal(g,p,`조합 ${g.pool.length}장: ${g.pool.map(c=>byType[c.type].name+'('+byType[c.type].mp+')').join(' · ')||'없음'}. 당시 합계 ${g.pool.reduce((s,c)=>s+byType[c.type].mp,0)} MP.`,{kind:'pool',cards:g.pool.map(card)});break;
  case 'homecoming':
   if(g.pool.length)g.pending={kind:'homecoming',actor:p.id};else{log(g,'조합에 카드가 없어 교환 효과를 건너뛰어요.');endTurn(g);}break;
  case 'newspaper':g.pending={kind:'pass',actor:p.id,participants:active(g).map(x=>x.id),answers:{}};break;
  case 'accomplice':
   if(g.players.some(x=>x.suspicions.length))g.pending={kind:'move',actor:p.id};else{log(g,'옮길 의혹 카드가 없어 효과를 건너뛰어요.');endTurn(g);}break;
  case 'genius':{
   const holders=g.players.filter(x=>x.id!==p.id),responders=holders.filter(x=>x.hand.some(c=>c.type==='criminal')).map(x=>x.id);
   const aliens=holders.filter(x=>x.hand.some(c=>c.type==='alien')).map(x=>x.id);
   for(const x of holders){if(responders.includes(x.id))notice(x,'criminal-signal',`${p.name}님이 수재를 사용했어요. 범인 카드를 가지고 있어 혀 신호를 자동으로 보냈어요. 이 알림과 내 정체는 다른 사람에게 보이지 않아요.`);else if(aliens.includes(x.id))notice(x,'alien-choice',`${p.name}님이 수재를 사용했어요. 외계인(우주인)은 혀를 내밀지 선택할 수 있어요. 아래에서 신호를 골라 주세요.`);else notice(x,'eyes-closed',`${p.name}님이 수재를 사용했어요. 신호를 확인하는 동안 다른 사람의 혀 신호는 보이지 않아요.`);}
   g.pending={kind:'signal',actor:p.id,participants:aliens,responders,answers:{}};
   if(!aliens.length)finishSignals(g);break;
  }
  default:log(g,c.type==='infected'?'감염자는 지금이 아니라 다음 내 차례 시작에 발동해요.':'이 카드의 특기에는 지금 처리할 효과가 없어요.');endTurn(g);
 }
}
function finishSignals(g){const q=g.pending,p=player(g,q.actor),ids=[...new Set(q.responders.concat(q.participants.filter(id=>q.answers[id]==='yes')))];reveal(g,p,`수재가 확인한 신호: ${ids.map(id=>player(g,id).name).join(', ')||'없음'}. 우주인은 범인인 척할 수 있으므로 신호만으로 범인을 확정할 수 없어요.`,{kind:'signals',players:ids});g.pending.signalReveal=true;g.pending.deadline=Date.now()+10000;}
function playInternal(g,id,action){
 need(g.phase==='playing'&&!g.pending,'진행 중인 특기 선택부터 마쳐 주세요.');need(g.current===id,'아직 내 차례가 아니에요.');const p=player(g,id);
 const idx=p.hand.findIndex(c=>c.uid===action.card);need(idx>=0,'내 손패의 카드를 골라 주세요.');const c=p.hand[idx];need(p.hand.length>1&&!p.locked,'마지막 카드 1장은 사용할 수 없어요.');need(c.type!=='criminal','범인은 특기·조합·의혹으로 낼 수 없어요.');need(['skill','embalm','accuse'].includes(action.mode),'행동을 골라 주세요.');
 let target;if(action.mode==='accuse'){target=player(g,action.target);need(target&&target.id!==id,'의혹을 받을 다른 사람을 골라 주세요.');}
 p.hand.splice(idx,1);
 if(action.mode==='skill'){p.used.push(c);emit(g,'play',{zone:'hand',player:id,index:idx},{zone:'used',player:id,index:p.used.length-1},c);log(g,`${p.name}: ${byType[c.type].name}을(를) 특기로 사용했어요.`);beginSkill(g,p,c);}
 if(action.mode==='embalm'){g.pool.push(c);emit(g,'play',{zone:'hand',player:id,index:idx},{zone:'pool',index:g.pool.length-1});remember(g,p,`조합에 ${byType[c.type].name} (${byType[c.type].mp} MP)을 넣었어요. 이후 교환·회수될 수 있어요.`);log(g,`${p.name}: 조합에 뒷면 카드 1장을 넣었어요.`);endTurn(g);}
 if(action.mode==='accuse'){target.suspicions.push(c);emit(g,'play',{zone:'hand',player:id,index:idx},{zone:'suspicion',player:target.id,index:target.suspicions.length-1});remember(g,p,`${target.name}님에게 ${byType[c.type].name} (${byType[c.type].mp} MP)을 의혹으로 보냈어요. 이후 이동할 수 있어요.`);log(g,`${p.name}: ${target.name}님에게 의혹 카드 1장을 보냈어요.`);endTurn(g);}
}
function answerInternal(g,id,a){
 const q=g.pending;need(q,'선택할 특기가 없어요.');const p=player(g,id),actor=player(g,q.actor);need(p,'참가자를 찾지 못했어요.');
 if(['exchange','pass','signal'].includes(q.kind)){need(q.participants.includes(id)&&!Object.hasOwn(q.answers,id),'지금 내 선택이 아니에요.');}
 else need(q.actor===id,'이 선택은 다른 참가자의 선택이에요.');
 const chooseOwn=()=>{const idx=p.hand.findIndex(c=>c.uid===a.card);need(idx>=0,'내 손패에서 골라 주세요.');return idx;};
 if(q.kind==='ack'){endTurn(g);return;}
 if(q.kind==='target'){
  const target=player(g,a.target);need(target&&target!==actor,'다른 사람을 골라 주세요.');if(q.skill!=='discipline')need(!target.locked,'마지막 카드가 보호된 사람은 교환할 수 없어요.');
  if(q.skill==='class')g.pending={kind:'exchange',actor:actor.id,participants:[actor.id,target.id],answers:{}};
  if(q.skill==='lady')g.pending={kind:'draw',actor:actor.id,target:target.id,order:shuffled(target.hand.map(c=>c.uid))};
  if(q.skill==='discipline')reveal(g,actor,`${target.name}님의 당시 손패: ${target.hand.map(c=>byType[c.type].name).join(' · ')}.`,{kind:'hand',player:target.id,cards:target.hand.map(card)});
  return;
 }
 if(q.kind==='draw'){
  const slot=Number(a.draw);need(Number.isInteger(slot)&&slot>=0&&slot<q.order.length,'상대의 뒷면 카드 한 장을 골라 주세요.');const target=player(g,q.target),idx=target.hand.findIndex(c=>c.uid===q.order[slot]);need(idx>=0,'상대 손패가 바뀌었어요. 다시 선택해 주세요.');const drawn=target.hand.splice(idx,1)[0];actor.hand.push(drawn);emit(g,'draw',{zone:'hand',player:target.id,index:slot},{zone:'hand',player:actor.id,index:actor.hand.length-1});remember(g,actor,`${target.name}님의 섞인 뒷면 카드 중 ${slot+1}번째를 골라 ${byType[drawn.type].name}을 가져왔어요. 이제 돌려줄 카드를 골라 주세요.`);g.pending={kind:'return',actor:actor.id,target:target.id};return;
 }
 if(q.kind==='exchange'||q.kind==='pass'){
  chooseOwn();q.answers[id]=a.card;if(!q.participants.every(x=>Object.hasOwn(q.answers,x)))return;
  const indexes=q.participants.map(x=>player(g,x).hand.findIndex(c=>c.uid===q.answers[x]));
  const chosen=q.participants.map((x,i)=>player(g,x).hand.splice(indexes[i],1)[0]);
  q.participants.forEach((x,i)=>{const receiver=player(g,q.participants[(i+1)%q.participants.length]);receiver.hand.push(chosen[i]);emit(g,'exchange',{zone:'hand',player:x,index:indexes[i]},{zone:'hand',player:receiver.id,index:receiver.hand.length-1});remember(g,receiver,`교환으로 ${byType[chosen[i].type].name}을(를) 받았어요.`);});
  log(g,q.kind==='pass'?'차례에서 빠진 사람을 건너뛰고 각자 왼쪽 사람에게 동시에 1장을 넘겼어요.':'두 사람이 각자 고른 카드 1장을 뒷면으로 교환했어요.');endTurn(g);return;
 }
 if(q.kind==='return'){const idx=chooseOwn(),c=p.hand.splice(idx,1)[0],target=player(g,q.target);target.hand.push(c);emit(g,'exchange',{zone:'hand',player:id,index:idx},{zone:'hand',player:target.id,index:target.hand.length-1});remember(g,target,`${p.name}님에게서 ${byType[c.type].name}을 돌려받았어요.`);log(g,'섞인 뒷면 카드 중 한 장을 가져온 뒤, 선택한 카드 1장을 돌려줬어요.');endTurn(g);return;}
 if(q.kind==='signal'){need(['yes','no'].includes(a.signal),'신호 여부를 골라 주세요.');q.answers[id]=a.signal;if(q.participants.every(x=>Object.hasOwn(q.answers,x)))finishSignals(g);return;}
 if(q.kind==='homecoming'||q.kind==='infected'){
  const index=Number(a.pool);need(Number.isInteger(index)&&index>=0&&index<g.pool.length,'뒷면 조합 카드 번호를 골라 주세요.');
  if(q.kind==='homecoming'){const idx=chooseOwn(),c=p.hand[idx];p.hand[idx]=g.pool[index];g.pool[index]=c;emit(g,'exchange',{zone:'hand',player:id,index:idx},{zone:'pool',index});emit(g,'exchange',{zone:'pool',index},{zone:'hand',player:id,index:idx});remember(g,p,`귀가부로 조합에서 ${byType[p.hand[idx].type].name}을 가져오고 ${byType[c.type].name}을 넣었어요.`);log(g,'앞면을 보지 않고 고른 조합 카드와 손패를 교환했어요.');endTurn(g);}
  else {const c=g.pool.splice(index,1)[0];p.hand.push(c);emit(g,'draw',{zone:'pool',index},{zone:'hand',player:id,index:p.hand.length-1});remember(g,p,`감염자 효과로 조합에서 ${byType[c.type].name}을 가져왔어요.`);log(g,`${p.name}님이 조합에서 뒷면 카드 1장을 가져왔어요. 이제 일반 행동을 해요.`);g.pending=null;}
  return;
 }
 if(q.kind==='health'){
  let owner,index;for(const x of g.players){const i=x.used.findIndex(c=>c.uid===a.used&&c.type!=='health');if(x.id!==id&&i>=0){owner=x;index=i;break;}}need(owner,'다른 사람이 사용한 보건위원 이외의 카드를 골라 주세요.');const c=owner.used.splice(index,1)[0];p.hand.push(c);emit(g,'recover',{zone:'used',player:owner.id,index},{zone:'hand',player:id,index:p.hand.length-1},c);log(g,`${p.name}님이 ${owner.name}님의 사용된 ${byType[c.type].name}을(를) 손으로 회수했어요. 능력은 다시 사용해야 발동해요.`);endTurn(g);return;
 }
 if(q.kind==='move'){
  const target=player(g,a.target);need(target&&target.id!==id,'나 이외의 목적지를 골라 주세요.');let owner,index;for(const x of g.players){const i=x.suspicions.findIndex(c=>c.uid===a.suspicion);if(i>=0){owner=x;index=i;break;}}need(owner&&owner!==target,'출발지와 다른 사람 앞으로 옮겨 주세요.');target.suspicions.push(owner.suspicions.splice(index,1)[0]);emit(g,'move',{zone:'suspicion',player:owner.id,index},{zone:'suspicion',player:target.id,index:target.suspicions.length-1});log(g,`${owner.name}님의 의혹 1장을 ${target.name}님에게 뒷면으로 옮겼어요.`);endTurn(g);return;
 }
}
function pendingContent(g,id){
 const q=g.pending;if(!q)return null;const p=player(g,id),actor=player(g,q.actor);
 const participant=['exchange','pass','signal'].includes(q.kind)?q.participants.includes(id)&&!Object.hasOwn(q.answers,id):q.actor===id;
 if(!participant)return {waiting:true,title:`${actor.name}님의 특기를 처리하는 중이에요.`,help:'필요한 참가자가 선택하면 차례가 이어져요.'};
 const own={key:'card',label:'내 손에서 넘길 카드',options:p.hand.map(c=>({value:c.uid,label:byType[c.type].name+' · MP '+byType[c.type].mp}))};
 const targets={key:'target',label:'상대 선택',options:g.players.filter(x=>x.id!==id&&(q.skill==='discipline'||!x.locked)).map(x=>({value:x.id,label:x.name+(x.locked?' · 마지막 1장':' · '+x.hand.length+'장')}))};
 const pool={key:'pool',label:'앞면을 보지 않고 조합 카드 선택',options:g.pool.map((c,i)=>({value:String(i),label:`뒷면 조합 ${i+1}번`}))};
 if(q.kind==='ack')return {title:'나만 확인한 정보를 읽어 주세요.',help:p.intel[0].message,preview:p.intel[0].seen,fields:[],submit:'확인했어요'};
 if(q.kind==='target')return {title:byType[q.skill].name+' · 상대를 골라 주세요.',help:q.skill==='discipline'?'선택한 사람의 손패는 나만 확인해요.':'마지막 손패가 보호된 사람은 교환 대상에서 제외돼요.',fields:[targets]};
 if(q.kind==='exchange'||q.kind==='pass'||q.kind==='return')return {title:q.kind==='pass'?'신문부 · 왼쪽으로 넘길 카드를 골라요.':q.kind==='return'?'아가씨 · 돌려줄 카드를 골라요.':'학급위원 · 내가 넘길 카드를 골라요.',help:q.kind==='return'?'방금 가져온 카드를 그대로 돌려줘도 돼요.':'다른 사람이 고른 카드는 선택이 끝나기 전까지 알 수 없어요.',fields:[own]};
 if(q.kind==='draw')return {title:'아가씨 · 상대의 뒷면 카드 한 장을 골라요.',help:'상대 손패를 다시 무작위로 섞어 보여줘요. 그림을 보지 않고 한 장을 고르면 내 손으로 가져와요.',fields:[{key:'draw',label:'상대 손패 중 한 장',options:q.order.map((_,i)=>({value:String(i),label:`뒷면 손패 ${i+1}번`}))}]};
 if(q.kind==='signal')return {title:'우주인 · 범인인 척할까요?',help:'수재를 쓴 사람만 내 신호를 확인해요. 신호를 보내지 않아도 돼요.',fields:[{key:'signal',label:'보낼 신호',options:[{value:'yes',label:'범인인 척 신호 보내기'},{value:'no',label:'신호 보내지 않기'}]}]};
 if(q.kind==='homecoming'||q.kind==='infected')return {title:q.kind==='infected'?'감염자 · 조합에서 1장을 가져와요.':'귀가부 · 조합과 손패를 교환해요.',help:'조합의 앞면은 고르기 전에 볼 수 없어요.',fields:q.kind==='infected'?[pool]:[own,pool]};
 if(q.kind==='health')return {title:'보건위원 · 회수할 카드를 골라요.',help:'다른 사람이 특기로 사용한 카드만 가져와요. 보건위원은 제외예요.',fields:[{key:'used',label:'사용된 앞면 카드',options:g.players.filter(x=>x.id!==id).flatMap(x=>x.used.filter(c=>c.type!=='health').map(c=>({value:c.uid,label:x.name+' · '+byType[c.type].name})))}]};
 if(q.kind==='move')return {title:'공범자 · 의혹을 옮겨요.',help:'나에게 옮길 수 없고, 출발지와 목적지는 달라야 해요.',fields:[{key:'suspicion',label:'옮길 뒷면 의혹',options:g.players.flatMap(x=>x.suspicions.map((c,i)=>({value:c.uid,owner:x.id,label:x.name+'님의 의혹 '+(i+1)+'번'})))},{key:'target',label:'옮길 목적지',options:g.players.filter(x=>x.id!==id).map(x=>({value:x.id,label:x.name}))}]};
}
function pendingView(g,id){const result=pendingContent(g,id);if(!result)return null;const q=g.pending;return {...result,...(q.signalReveal?{signalReveal:true,deadline:q.deadline,...(!result.waiting?{submit:'확인했습니다'}:{})}:{}),kind:q.kind,actor:q.actor,...(q.target?{target:q.target}:q.kind==='exchange'?{target:q.participants.find(x=>x!==q.actor)}:{})};}
function view(g,id){
 const me=player(g,id);need(me,'참가자를 찾지 못했어요.');return {serverNow:Date.now(),phase:g.phase,version:g.version,turn:g.turn,target:g.target,current:g.current,me:id,myTurn:g.current===id&&!g.pending&&g.phase==='playing',poolCount:g.pool.length,players:g.players.map(p=>({id:p.id,name:p.name,bot:p.bot,cards:p.hand.length,locked:p.locked,used:p.used.map(card),suspicionCount:p.suspicions.length})),hand:me.hand.map(card),pending:pendingView(g,id),intel:me.intel,notices:me.notices||[],events:(g.events||[]).map(e=>({...e,from:{...e.from,...(e.from.zone==='hand'&&e.from.player!==id?{index:undefined}:{})},to:{...e.to,...(e.to.zone==='hand'&&e.to.player!==id?{index:undefined}:{})}})),log:g.log,...(g.phase==='finished'?{result:g.result}:{})};
}
// Bot decisions receive this same per-player projection, never the full game.
function roleValues(v){
 const self=v.players.find(p=>p.id===v.me),max=Math.max(...v.players.map(p=>p.suspicionCount)),guess=v.poolCount*.9,likely=guess>=v.target-1;
 return {alien:self.suspicionCount===max&&max>0?8:1.5,infected:likely?2:7,criminal:self.suspicionCount<max?8:4,accomplice:4,homecoming:likely?2:3,...Object.fromEntries(ordinary.map(x=>[x,likely?7:5]))};
}
function botDecision(v){
 const values=roleValues(v),self=v.players.find(p=>p.id===v.me),others=v.players.filter(p=>p.id!==v.me),remaining=c=>Math.max(...v.hand.filter(x=>x.uid!==c.uid).map(x=>values[x.id]));
 let best=null;for(const c of v.hand.filter(c=>c.id!=='criminal'))for(const mode of ['embalm','accuse','skill']){
  const keep=remaining(c),last=v.hand.length===2;let score=(last?2.5:.35)*keep;
  if(mode==='embalm'){score+=c.mp*1.6+(v.poolCount*.9<v.target?2:-2);if(self.used.some(x=>x.id==='infected'))score-=12;}
  if(mode==='accuse')score+=1+Math.max(0,c.mp)*.4+(v.poolCount*.9>=v.target?2:0);
  if(mode==='skill'){const early=v.hand.length>=3;score+=({president:-6,alien:-4,infected:early&&v.poolCount>0?3:-5,library:early?4:0,discipline:early?4:0,genius:early?4:0,class:2,lady:3,health:v.players.some(p=>p.id!==v.me&&p.used.some(c=>c.id!=='health'))?3:-6,newspaper:1,homecoming:v.poolCount?1:-5,accomplice:v.players.some(p=>p.suspicionCount)?2:-4})[c.id]||0;}
  // A small random tie-breaker avoids a scripted identical opening.
  score+=crypto.randomInt(100)/1000;
  if(!best||score>best.score){const targets=[...others].sort((a,b)=>b.suspicionCount-a.suspicionCount);best={card:c.uid,mode,target:targets[0].id,score};}
 }
 return {action:best,reason:best.mode==='embalm'?'공개된 조합 카드 수를 보고 목표 달성 가능성을 높이려 해요.':best.mode==='accuse'?'의혹 카드가 모인 상대에게 더 보내 감금 후보를 좁히려 해요.':'현재 손패에서 사용할 수 있는 특기로 정보나 교환 기회를 얻으려 해요.'};
}
function botAnswer(v){
 const q=v.pending,answer={};if(!q||q.waiting)return null;const values=roleValues(v);
 for(const f of q.fields||[]){let opts=f.options;need(opts.length,'선택지가 없어요.');let selected=opts[0];
  if(f.key==='card'){const rank=c=>Math.max(...v.hand.filter(x=>x.uid!==c.uid).map(x=>values[x.id]));selected=[...opts].sort((a,b)=>rank(v.hand.find(c=>c.uid===b.value))-rank(v.hand.find(c=>c.uid===a.value)))[0];}
  if(f.key==='pool'||f.key==='draw')selected=opts[crypto.randomInt(opts.length)];
  if(f.key==='target'){const candidates=opts.map(o=>({o,p:v.players.find(p=>p.id===o.value)}));selected=candidates.sort((a,b)=>b.p.cards-a.p.cards)[0].o;}
  if(f.key==='used'){selected=[...opts].sort((a,b)=>{const find=o=>v.players.flatMap(p=>p.used).find(c=>c.uid===o.value);return values[find(b).id]+find(b).mp-values[find(a).id]-find(a).mp;})[0];}
  if(f.key==='suspicion')selected=opts.find(o=>o.owner===v.me)||opts[0];
  answer[f.key]=selected.value;
 }
 if(answer.suspicion&&answer.target){const source=q.fields.find(f=>f.key==='suspicion').options.find(o=>o.value===answer.suspicion).owner;if(answer.target===source)answer.target=q.fields.find(f=>f.key==='target').options.find(o=>o.value!==source).value;}
 return answer;
}
function drainBotChoices(g){for(let i=0;i<50&&g.pending;i++){const q=g.pending;if(q.signalReveal)break;const ids=['exchange','pass','signal'].includes(q.kind)?q.participants.filter(id=>!Object.hasOwn(q.answers,id)):[q.actor],id=ids.find(id=>player(g,id).bot);if(!id)break;answerInternal(g,id,botAnswer(view(g,id)));}}
function play(g,id,a){playInternal(g,id,a);drainBotChoices(g);g.version++;}
function answer(g,id,a){answerInternal(g,id,a);drainBotChoices(g);g.version++;}
function shuffleHand(g,id){const p=player(g,id);need(g.phase==='playing'&&p&&!p.locked&&p.hand.length>1,'섞을 수 있는 손패가 없어요.');shuffled(p.hand);emit(g,'shuffle',{zone:'hand',player:id},{zone:'hand',player:id});g.version++;}
function botStep(g){need(g.phase==='playing','게임이 끝났어요.');const p=player(g,g.current);if(g.pending?.signalReveal&&player(g,g.pending.actor).bot){answer(g,g.pending.actor,{});return;}need(!g.pending&&p.bot,'컴퓨터 차례가 아니에요.');const choice=botDecision(view(g,p.id));log(g,`${p.name}의 생각: ${choice.reason}`);play(g,p.id,choice.action);}
function tick(g,now=Date.now()){if(g.phase==='playing'&&g.pending?.signalReveal&&now>=g.pending.deadline){log(g,'수재의 신호 확인 시간 10초가 지나 다음 차례로 진행해요.');endTurn(g);drainBotChoices(g);g.version++;return true;}return false;}
function assertInvariant(g){const all=g.players.flatMap(p=>[...p.hand,...p.used,...p.suspicions]).concat(g.pool);need(all.length===g.total&&new Set(all.map(c=>c.uid)).size===g.total,'카드 보존 오류');need(g.players.every(p=>p.hand.length>=1),'손패 보호 오류');return true;}
module.exports={newGame,view,play,answer,shuffleHand,botStep,tick,botDecision,botAnswer,results,assertInvariant};
