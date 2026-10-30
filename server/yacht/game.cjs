'use strict';
const {randomInt}=require('node:crypto');
// Modern 12-row Yacht categories, also documented by kali1402/yacht_dice (MIT).
const categories=[['aces','에이스','1의 눈을 모두 더해요.'],['deuces','듀얼','2의 눈을 모두 더해요.'],['threes','트리플','3의 눈을 모두 더해요.'],['fours','쿼드','4의 눈을 모두 더해요.'],['fives','펜타','5의 눈을 모두 더해요.'],['sixes','헥사','6의 눈을 모두 더해요.'],['choice','초이스','주사위 5개의 합. 어떤 조합이든 가능해요.'],['fourKind','포카드','같은 눈이 4개 이상이면 주사위 5개의 합.'],['fullHouse','풀 하우스','같은 눈 3개와 다른 같은 눈 2개면 주사위 5개의 합. 5개가 전부 같으면 해당하지 않아요.'],['smallStraight','스몰 스트레이트','서로 다른 연속된 눈 4개면 15점. 중복 주사위가 있어도 돼요.'],['largeStraight','라지 스트레이트','서로 다른 연속된 눈 5개면 30점.'],['yacht','요트','5개의 눈이 전부 같으면 50점.']];
const keys=categories.map(c=>c[0]);
const need=(ok,msg)=>{if(!ok)throw Error(msg);};
function score(dice,key){
 if(!Array.isArray(dice)||dice.length!==5||dice.some(n=>!Number.isInteger(n)||n<1||n>6))return 0;
 const counts=Array(7).fill(0);for(const n of dice)counts[n]++;const total=dice.reduce((a,b)=>a+b,0),idx=keys.indexOf(key);
 if(idx>=0&&idx<6)return counts[idx+1]*(idx+1);
 if(key==='choice')return total;
 if(key==='fourKind')return Math.max(...counts)>=4?total:0;
 if(key==='fullHouse')return counts.includes(3)&&counts.includes(2)?total:0;
 if(key==='smallStraight')return [1,2,3].some(start=>[0,1,2,3].every(i=>counts[start+i]))?15:0;
 if(key==='largeStraight')return [1,2].some(start=>[0,1,2,3,4].every(i=>counts[start+i]))?30:0;
 if(key==='yacht')return counts.includes(5)?50:0;return 0;
}
function totals(p){const upper=keys.slice(0,6).reduce((n,k)=>n+(p.scores[k]??0),0),bonus=upper>=63?35:0;return {upper,bonus,total:keys.reduce((n,k)=>n+(p.scores[k]??0),0)+bonus,filled:keys.filter(k=>p.scores[k]!==null).length};}
function addEvent(g,message,kind,extra={}){g.events.push({n:++g.eventSeq,message,kind,...extra});g.events=g.events.slice(-35);}
function newGame(players,turnSeconds=30){const g={phase:'playing',players:players.map(p=>({id:p.id,name:p.name,bot:!!p.bot,scores:Object.fromEntries(keys.map(k=>[k,null]))})),current:0,turn:1,round:1,rolls:0,dice:[null,null,null,null,null],held:[false,false,false,false,false],version:1,eventSeq:0,events:[],turnSeconds,deadline:turnSeconds?Date.now()+turnSeconds*1000:null,result:null};need(g.players.length>=2&&g.players.length<=10,'2~10명으로 시작해 주세요.');addEvent(g,g.players[0].name+'님의 차례예요. 주사위 5개를 굴려 주세요.','turn');return g;}
function turnPlayer(g,id){need(g.phase==='playing','이미 게임이 끝났어요.');need(g.players[g.current].id===id,'지금은 다른 플레이어의 차례예요.');return g.players[g.current];}
function act(g,id,a){const p=turnPlayer(g,id);
 if(a.type==='roll'){
  need(g.rolls<3,'이번 차례에는 이미 3번 굴렸어요. 점수를 기록해 주세요.');need(g.rolls===0||g.held.some(v=>!v),'모두 고정했어요. 고정을 풀거나 점수를 기록하세요.');for(let i=0;i<5;i++)if(!g.held[i])g.dice[i]=randomInt(1,7);g.rolls++;addEvent(g,p.name+'님이 '+g.rolls+'번째로 굴렸어요. '+g.dice.join(' · '),'roll',{actor:id,dice:[...g.dice],held:[...g.held]});
 }else if(a.type==='hold'){
  need(g.rolls>0&&g.rolls<3,'굴린 뒤 남은 굴림이 있을 때 고정할 수 있어요.');need(Number.isInteger(a.index)&&a.index>=0&&a.index<5,'주사위를 다시 골라 주세요.');g.held[a.index]=!g.held[a.index];
 }else if(a.type==='score'){
  need(g.rolls>0,'먼저 주사위를 굴려 주세요.');need(keys.includes(a.category)&&p.scores[a.category]===null,'아직 비어 있는 점수 칸을 골라 주세요.');const value=score(g.dice,a.category),before=totals(p);p.scores[a.category]=value;const after=totals(p);addEvent(g,p.name+'님이 '+categories.find(c=>c[0]===a.category)[1]+'에 '+value+'점 기록'+(!before.bonus&&after.bonus?' · 상단 보너스 +35점!':''),'score',{actor:id,category:a.category,score:value,dice:[...g.dice]});
  if(g.players.every(p=>totals(p).filled===12)){g.phase='finished';g.deadline=null;const best=Math.max(...g.players.map(p=>totals(p).total));g.result={winners:g.players.filter(p=>totals(p).total===best).map(p=>p.id),best};addEvent(g,g.players.filter(p=>g.result.winners.includes(p.id)).map(p=>p.name).join(', ')+' 승리 · '+best+'점','finish');}
  else{g.current=(g.current+1)%g.players.length;g.turn++;g.round=Math.floor((g.turn-1)/g.players.length)+1;g.rolls=0;g.dice=[null,null,null,null,null];g.held=[false,false,false,false,false];g.deadline=g.turnSeconds?Date.now()+g.turnSeconds*1000:null;}
 }else throw Error('할 수 없는 행동이에요.');g.version++;
}
function utility(p,dice,key){const value=score(dice,key),idx=keys.indexOf(key);if(idx<6)return value*1.3+(idx<3?-1:1);return value-(key==='choice'?9:0)+(value>0?2:0);}
function bestSlot(p,dice){return keys.filter(k=>p.scores[k]===null).map(k=>({key:k,value:score(dice,k),utility:utility(p,dice,k)})).sort((a,b)=>b.utility-a.utility||keys.indexOf(a.key)-keys.indexOf(b.key))[0];}
function botStep(g){if(g.phase!=='playing')return;const p=g.players[g.current];if(!g.rolls){act(g,p.id,{type:'roll'});return;}
 const current=bestSlot(p,g.dice);if(g.rolls>=3||current.value===50){act(g,p.id,{type:'score',category:current.key});return;}
 let bestMask=31,best=current.utility;const sample=[...g.dice];
 for(let mask=0;mask<31;mask++){
  let total=0,n=0;function visit(i){if(i===5){total+=bestSlot(p,sample).utility;n++;return;}if(mask&(1<<i)){sample[i]=g.dice[i];visit(i+1);}else for(let v=1;v<=6;v++){sample[i]=v;visit(i+1);}}visit(0);const expected=total/n;
  if(expected>best+.05){best=expected;bestMask=mask;}
 }
 if(bestMask===31){act(g,p.id,{type:'score',category:current.key});return;}
 g.held=g.held.map((_,i)=>!!(bestMask&(1<<i)));act(g,p.id,{type:'roll'});
}
function timeout(g){if(g.phase!=='playing')return;const p=g.players[g.current];if(!g.rolls)act(g,p.id,{type:'roll'});act(g,p.id,{type:'score',category:bestSlot(p,g.dice).key});}
function view(g,id){return {...g,players:g.players.map(p=>({...p,...totals(p)})),me:id,current:g.players[g.current].id,myTurn:g.phase==='playing'&&g.players[g.current].id===id,previews:g.rolls?Object.fromEntries(keys.map(k=>[k,score(g.dice,k)])):null,serverNow:Date.now()};}
module.exports={categories,keys,score,totals,newGame,act,botStep,timeout,view};
