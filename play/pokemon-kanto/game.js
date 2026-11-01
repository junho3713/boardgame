(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KantoGame=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const types={grass:{name:'풀',symbol:'✿',color:'#57916a'},fire:{name:'불꽃',symbol:'◆',color:'#ca7750'},water:{name:'물',symbol:'●',color:'#568fae'},electric:{name:'전기',symbol:'ϟ',color:'#c39a2e'},bug:{name:'벌레',symbol:'❋',color:'#8e9e50'},normal:{name:'노말',symbol:'◇',color:'#948a78'},psychic:{name:'에스퍼',symbol:'◎',color:'#aa759c'},fighting:{name:'격투',symbol:'✦',color:'#ad7456'},rock:{name:'바위',symbol:'⬡',color:'#96876b'},flying:{name:'비행',symbol:'≈',color:'#7b9dad'},ghost:{name:'고스트',symbol:'☾',color:'#87799f'},dragon:{name:'드래곤',symbol:'✧',color:'#758eae'}};
const effects={
 none:'기본 전투력으로 승부해요.',leaf:'같은 장소의 내 다른 포켓몬에 전투력 +1.',leaf2:'같은 장소의 내 다른 포켓몬에 전투력 +2.',
 rival:'같은 장소에 상대 포켓몬이 더 많으면 전투력 +2.',rival3:'같은 장소에 상대 포켓몬이 더 많으면 전투력 +3.',
 water:'같은 장소의 내 다른 물 포켓몬에 전투력 +1.',fire:'같은 장소의 내 다른 불꽃 포켓몬에 전투력 +1.',
 pack:'같은 장소에 내 다른 포켓몬이 있으면 전투력 +2.',pack3:'같은 장소에 내 다른 포켓몬이 있으면 전투력 +3.',
 all:'모든 장소의 내 다른 포켓몬에 전투력 +1.',forest:'상록숲에 있으면 전투력 +2.',river:'블루시티에 있으면 전투력 +2.',
 solo:'같은 장소에 혼자 있으면 전투력 +3.',refund:'배치한 뒤 에너지 1개를 돌려받아요.',
 mobile:'이 포켓몬을 이동할 때 에너지를 쓰지 않아요.',electric:'모든 장소의 내 다른 전기 포켓몬에 전투력 +1.',
 anchored:'이 포켓몬은 이동할 수 없어요.',copy:'같은 장소 내 다른 포켓몬의 기본 전투력 중 가장 높은 값을 복사해요. 다른 포켓몬의 효과는 복사하지 않아요.',
 sing:'같은 장소에서 기본 전투력이 가장 높은 상대 포켓몬 하나의 전투력 -2.',
 full:'같은 장소에 내 포켓몬이 3마리면 전투력 +3.'
};
const data={};
function add(id,name,type,cost,power,effect='none',next=[],evolveCost=0){data[id]={id,name,type,cost,power,effect,next,evolveCost};}
add(1,'이상해씨','grass',1,2,'leaf',[2]);add(2,'이상해풀','grass',0,5,'leaf',[3],2);add(3,'이상해꽃','grass',0,8,'leaf2',[],3);
add(4,'파이리','fire',1,2,'rival',[5]);add(5,'리자드','fire',0,5,'rival',[6],2);add(6,'리자몽','fire',0,10,'rival3',[],3);
add(7,'꼬부기','water',1,2,'water',[8]);add(8,'어니부기','water',0,5,'water',[9],2);add(9,'거북왕','water',0,9,'water',[],3);
add(25,'피카츄','electric',1,2,'pack',[26]);add(26,'라이츄','electric',0,8,'pack3',[],3);
add(10,'캐터피','bug',1,1,'none',[11]);add(11,'단데기','bug',0,4,'none',[12],1);add(12,'버터플','bug',0,5,'all',[],2);
add(13,'뿔충이','bug',1,2,'none',[14]);add(14,'딱충이','bug',0,4,'none',[15],1);add(15,'독침붕','bug',0,7,'rival',[],2);
add(129,'잉어킹','water',1,0,'none',[130]);add(130,'갸라도스','water',0,11,'none',[],4);
add(133,'이브이','normal',2,3,'none',[134,135,136]);add(134,'샤미드','water',0,8,'river',[],3);add(135,'쥬피썬더','electric',0,8,'pack',[],3);add(136,'부스터','fire',0,9,'rival',[],3);
add(92,'고오스','ghost',2,3,'none',[93]);add(93,'고우스트','ghost',0,6,'sing',[94],2);add(94,'팬텀','ghost',0,9,'sing',[],3);
add(147,'미뇽','dragon',2,3,'none',[148]);add(148,'신뇽','dragon',0,6,'none',[149],2);add(149,'망나뇽','dragon',0,11,'mobile',[],3);
add(43,'뚜벅쵸','grass',1,2,'forest',[44]);add(44,'냄새꼬','grass',0,5,'forest',[45],2);add(45,'라플레시아','grass',0,8,'leaf',[],3);
add(54,'고라파덕','water',2,4,'none',[55]);add(55,'골덕','water',0,8,'river',[],3);
add(58,'가디','fire',2,3,'fire',[59]);add(59,'윈디','fire',0,9,'fire',[],3);
add(39,'푸린','normal',1,2,'sing',[40]);add(40,'푸크린','normal',0,5,'sing',[],2);
add(52,'나옹','normal',1,2,'refund');add(56,'망키','fighting',2,3,'solo',[57]);add(57,'성원숭','fighting',0,7,'solo',[],3);
add(100,'찌리리공','electric',2,4,'mobile',[101]);add(101,'붐볼','electric',0,8,'mobile',[],3);
add(81,'코일','electric',2,3,'electric',[82]);add(82,'레어코일','electric',0,7,'electric',[],3);
add(95,'롱스톤','rock',3,7,'anchored');add(128,'켄타로스','normal',3,6,'full');add(131,'라프라스','water',4,6,'water');
add(143,'잠만보','normal',4,9,'anchored');add(142,'프테라','flying',4,7,'mobile');add(132,'메타몽','normal',3,1,'copy');
add(144,'프리져','water',5,9,'none');add(145,'썬더','electric',5,9,'none');add(146,'파이어','fire',5,9,'none');add(150,'뮤츠','psychic',6,13,'none');
const starters=[1,4,7,25],basics=Object.values(data).filter(c=>c.cost>0).map(c=>c.id);
const locations=[{name:'상록숲',sub:'VIRIDIAN FOREST',effect:'풀·벌레 포켓몬마다 +2',key:'forest'},{name:'블루시티',sub:'CERULEAN CITY',effect:'물 포켓몬마다 +2',key:'river'},{name:'석영고원',sub:'INDIGO PLATEAU',effect:'진화한 포켓몬마다 +2',key:'league'}];
const need=(v,message)=>{if(!v)throw Error(message);};
function random(g){let n=g.rng|0;n^=n<<13;n^=n>>>17;n^=n<<5;g.rng=n>>>0;return g.rng/4294967296;}
function shuffle(g,list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function note(g,text){g.log.push(text);g.log=g.log.slice(-50);}
function createPlayer(g,partner,index){
 const low=shuffle(g,basics.filter(id=>id!==partner&&data[id].cost<=2)).slice(0,8),mid=shuffle(g,basics.filter(id=>data[id].cost>=3&&data[id].cost<=4)).slice(0,5),high=shuffle(g,basics.filter(id=>data[id].cost>=5)).slice(0,2);
 const ids=[partner,low[0],low[1],mid[0],...shuffle(g,low.slice(2).concat(mid.slice(1),high))];
 const cards=ids.map((id,i)=>({uid:index+'-'+i,id,boost:0,evolvedRound:0,history:[]}));
 return {partner,hand:cards.slice(0,4),deck:cards.slice(4),lanes:[[],[],[]],energy:1,moved:false,cheered:false};
}
function draw(g,index){const p=g.players[index];if(p.deck.length){const c=p.deck.shift();p.hand.push(c);if(index===0)note(g,data[c.id].name+' 카드를 뽑았어요.');}}
function newGame(partner,seed){
 need(starters.includes(Number(partner)),'파트너를 골라 주세요.');
 const g={schema:1,round:1,actor:0,phase:'playing',rng:(Number(seed)>>>0)||9173141,players:[],log:[],result:null};
 const opponent=starters[Math.floor(random(g)*starters.length)];g.players=[createPlayer(g,Number(partner),0),createPlayer(g,opponent,1)];
 note(g,'첫 라운드! 카드를 골라 장소에 배치해 보세요.');draw(g,0);draw(g,1);return g;
}
function find(g,index,uid){for(let lane=0;lane<3;lane++){const slot=g.players[index].lanes[lane].findIndex(c=>c.uid===uid);if(slot!==-1)return{lane,slot,unit:g.players[index].lanes[lane][slot]};}return null;}
function scores(g){
 const power=g.players.map(p=>p.lanes.map(lane=>lane.map(u=>{
  const c=data[u.id];return (c.effect==='copy'?Math.max(1,...lane.filter(x=>x.uid!==u.uid).map(x=>data[x.id].power)):c.power)+u.boost;
 })));
 for(let pi=0;pi<2;pi++)for(let li=0;li<3;li++){
  const p=g.players[pi],lane=p.lanes[li];
  lane.forEach((u,slot)=>{
   const c=data[u.id],e=c.effect;
   if(li===0&&['grass','bug'].includes(c.type)||li===1&&c.type==='water'||li===2&&u.history.length)power[pi][li][slot]+=2;
   if(e==='pack'&&lane.length>1)power[pi][li][slot]+=2;if(e==='pack3'&&lane.length>1)power[pi][li][slot]+=3;
   if((e==='rival'||e==='rival3')&&g.players[1-pi].lanes[li].length>lane.length)power[pi][li][slot]+=e==='rival'?2:3;
   if(e==='solo'&&lane.length===1)power[pi][li][slot]+=3;
   if(e==='forest'&&li===0||e==='river'&&li===1)power[pi][li][slot]+=2;if(e==='full'&&lane.length===3)power[pi][li][slot]+=3;
   for(let dest=0;dest<3;dest++)p.lanes[dest].forEach((ally,ai)=>{
    if(ally.uid===u.uid)return;const type=data[ally.id].type;
    if((e==='leaf'||e==='leaf2')&&dest===li)power[pi][dest][ai]+=e==='leaf'?1:2;
    if(e==='water'&&dest===li&&type==='water'||e==='fire'&&dest===li&&type==='fire'||e==='electric'&&type==='electric'||e==='all')power[pi][dest][ai]++;
   });
   if(e==='sing'){
    const enemy=g.players[1-pi].lanes[li];if(enemy.length){let target=0;enemy.forEach((x,i)=>{if(data[x.id].power>data[enemy[target].id].power)target=i;});power[1-pi][li][target]-=2;}
   }
  });
 }
 const totals=power.map(lanes=>lanes.map(lane=>lane.reduce((n,v)=>n+Math.max(0,v),0)));
 const owners=totals[0].map((v,i)=>v===totals[1][i]?-1:v>totals[1][i]?0:1);
 return {power:power.map(lanes=>lanes.map(lane=>lane.map(v=>Math.max(0,v)))),totals,owners,wins:[owners.filter(v=>v===0).length,owners.filter(v=>v===1).length]};
}
function act(g,index,a){
 need(g.phase==='playing'&&!g.result,'게임이 끝났어요. 새 원정을 시작해 주세요.');need(g.actor===index,'아직 내 차례가 아니에요.');
 const p=g.players[index],who=index===0?'나':'라이벌';let cost=0;
 if(a.type==='play'){
  const hi=p.hand.findIndex(c=>c.uid===a.uid);need(hi!==-1,'손패에서 카드를 골라 주세요.');const card=p.hand[hi],c=data[card.id];
  need(Number.isInteger(a.lane)&&a.lane>=0&&a.lane<3,'장소를 골라 주세요.');need(p.lanes[a.lane].length<3,'한 장소에는 포켓몬을 3마리까지 놓을 수 있어요.');
  cost=c.cost;need(p.energy>=cost,'에너지가 부족해요.');p.energy-=cost;p.hand.splice(hi,1);p.lanes[a.lane].push(card);
  if(c.effect==='refund')p.energy++;note(g,who+' · '+c.name+' → '+locations[a.lane].name);return;
 }
 const found=find(g,index,a.uid);need(found,'내 장소에 놓인 포켓몬을 골라 주세요.');const {unit,lane,slot}=found,c=data[unit.id];
 if(a.type==='evolve'){
  const next=data[a.to];need(c.next.includes(a.to)&&next,'진화할 포켓몬을 골라 주세요.');need(unit.evolvedRound!==g.round,'같은 포켓몬은 라운드마다 한 번만 진화해요.');
  cost=next.evolveCost;need(p.energy>=cost,'진화할 에너지가 부족해요.');p.energy-=cost;unit.history.push(unit.id);unit.id=a.to;unit.evolvedRound=g.round;
  note(g,who+' · '+c.name+' → '+next.name+' 진화!');return;
 }
 if(a.type==='move'){
  need(!p.moved,'이동은 라운드마다 한 번이에요.');need(c.effect!=='anchored','이 포켓몬은 이동할 수 없어요.');
  need(Number.isInteger(a.lane)&&a.lane>=0&&a.lane<3&&a.lane!==lane,'다른 장소를 골라 주세요.');need(p.lanes[a.lane].length<3,'그 장소는 3마리가 모두 찼어요.');
  cost=c.effect==='mobile'?0:1;need(p.energy>=cost,'이동할 에너지가 부족해요.');p.energy-=cost;p.moved=true;p.lanes[lane].splice(slot,1);p.lanes[a.lane].push(unit);
  note(g,who+' · '+c.name+'를 '+locations[a.lane].name+'로 이동');return;
 }
 if(a.type==='cheer'){
  need(!p.cheered,'응원은 라운드마다 한 번이에요.');need(p.energy>=1,'에너지가 부족해요.');p.energy--;p.cheered=true;unit.boost+=2;note(g,who+' · '+c.name+' 응원! 전투력 +2');return;
 }
 throw Error('할 수 없는 행동이에요.');
}
function legal(g,index){
 const p=g.players[index],actions=[];
 for(const c of p.hand)if(data[c.id].cost<=p.energy)for(let lane=0;lane<3;lane++)if(p.lanes[lane].length<3)actions.push({type:'play',uid:c.uid,lane});
 p.lanes.forEach((lane,li)=>lane.forEach(u=>{
  const c=data[u.id];if(u.evolvedRound!==g.round)for(const to of c.next)if(data[to].evolveCost<=p.energy)actions.push({type:'evolve',uid:u.uid,to});
  if(!p.cheered&&p.energy>=1)actions.push({type:'cheer',uid:u.uid});
  if(!p.moved&&c.effect!=='anchored'&&p.energy>=(c.effect==='mobile'?0:1))for(let dest=0;dest<3;dest++)if(dest!==li&&p.lanes[dest].length<3)actions.push({type:'move',uid:u.uid,lane:dest});
 }));return actions;
}
function utility(g,index){
 const s=scores(g),opp=1-index;let value=0;
 for(let lane=0;lane<3;lane++){const own=s.totals[index][lane],enemy=s.totals[opp][lane],margin=own-enemy;
 value+=own*.55+Math.max(-10,Math.min(10,margin))*.55+(margin>0?4:margin===0?0:-2);
 if(g.round===6)value+=(margin>0?14:margin===0?0:-7);}
 return value;
}
function bestAction(g,index){
 const actions=legal(g,index);if(!actions.length)return null;const before=utility(g,index);let best=null,score=-Infinity;
 for(const a of actions){const copy=JSON.parse(JSON.stringify(g));act(copy,index,a);let gain=utility(copy,index)-before;
  if(a.type==='play'){const c=g.players[index].hand.find(c=>c.uid===a.uid);gain+=data[c.id].next.length&&g.round<5?1.5:0;gain+=.15;}
  if(a.type==='evolve')gain+=.4;
  if(a.type==='move')gain-=.5;
  if(gain>score){score=gain;best=a;}
 }return score>0?best:null;
}
function autoPlay(g,index){for(let count=0;count<24;count++){const a=bestAction(g,index);if(!a)break;act(g,index,a);}}
function finishRound(g){
 need(g.phase==='playing'&&g.actor===0,'지금은 라운드를 마칠 수 없어요.');
 g.actor=1;autoPlay(g,1);
 if(g.round===6){const s=scores(g),total=s.totals.map(a=>a.reduce((n,v)=>n+v,0));const winner=s.wins[0]!==s.wins[1]?(s.wins[0]>s.wins[1]?0:1):total[0]===total[1]?-1:total[0]>total[1]?0:1;
  g.result={winner,wins:s.wins,total};g.phase='finished';note(g,winner===-1?'완벽한 무승부!':winner===0?'관동 원정 승리!':'라이벌의 승리! 다음 원정에서 다시 도전해요.');return;
 }
 g.round++;g.actor=0;g.players.forEach(p=>{p.energy=g.round;p.moved=false;p.cheered=false;});draw(g,0);draw(g,1);note(g,g.round+'라운드 · 에너지 '+g.round+'개로 시작해요.');
}
function assert(g){
 need(g&&g.schema===1&&Number.isInteger(g.round)&&g.round>=1&&g.round<=6,'저장된 원정을 읽지 못했어요.');
 need(g.players.length===2&&['playing','finished'].includes(g.phase),'게임 상태를 확인해 주세요.');
 for(const p of g.players){need(Number.isInteger(p.energy)&&p.energy>=0&&p.energy<=6,'에너지 계산 오류');need(p.lanes.length===3&&p.lanes.every(l=>l.length<=3),'장소 정원 오류');
  const cards=p.hand.concat(p.deck,p.lanes.flat());need(cards.length===16&&new Set(cards.map(c=>c.uid)).size===16,'카드 수 오류');
  need(cards.every(c=>data[c.id]&&Number.isInteger(c.boost)&&c.boost>=0&&Array.isArray(c.history)&&c.history.every(id=>data[id])),'카드 정보 오류');
 }return true;
}
return{data,types,effects,starters,basics,locations,newGame,act,find,scores,legal,bestAction,autoPlay,finishRound,assert};
});
