(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KantoDuel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
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

add(16,'구구','flying',1,2,'none',[17]);add(17,'피죤','flying',0,5,'none',[18],2);add(18,'피죤투','flying',0,9,'none',[],3);

const CONFIG={picks:4,goal:3,beatMs:2400,introMs:6500,maxBeats:45};
const moves={
 tackle:{id:'tackle',name:'기본 공격',power:0,speed:0,icon:'✦',text:'공격력만큼 피해를 줘요.'},
 quick:{id:'quick',name:'전광석화',power:1,speed:4,icon:'ϟ',text:'위력 +1 · 속도 +4. 먼저 공격할 기회를 노려요.'},
 heavy:{id:'heavy',name:'강타',power:8,speed:-3,icon:'◆',text:'위력 +8 · 속도 -3. 느리지만 강하게 때려요.'},
 guard:{id:'guard',name:'가드 어택',power:-2,speed:1,shield:8,icon:'⬡',text:'공격 전 보호막 8 · 위력 -2. 다음 피해도 남은 보호막으로 막아요.'},
 drain:{id:'drain',name:'흡수 공격',power:1,speed:0,heal:5,icon:'✿',text:'위력 +1 · 공격한 뒤 자신의 HP 5 회복.'},
 recover:{id:'recover',name:'회복 호흡',power:-3,speed:0,heal:10,icon:'＋',text:'위력 -3 · 공격한 뒤 자신의 HP 10 회복.'},
 combo:{id:'combo',name:'연계 공격',power:3,speed:0,icon:'↗',text:'위력 +3. 직전에도 같은 포켓몬이 공격했다면 추가 +5.'},
 finish:{id:'finish',name:'마무리 일격',power:4,speed:0,icon:'★',text:'위력 +4. 상대 HP가 절반 이하면 추가 +6.'}
};
const need=(v,m)=>{if(!v)throw Error(m);},clone=v=>JSON.parse(JSON.stringify(v));
const parents={};for(const c of Object.values(data))for(const next of c.next)parents[next]=c.id;
function stage(id){let n=0;for(let p=id;parents[p];p=parents[p])n++;return n;}
function stats(u){const c=data[u.species],s=stage(u.species),training=Math.min(3,u.training||0);return{hp:48+s*27+(c.power%3)*3+(c.type==='water'?5:c.type==='normal'?3:0)+training*3,attack:8+s*6+c.power%3+training,speed:4+(c.id%4)+(c.type==='electric'?2:0)+(c.type==='flying'?1:0)};}
function passive(type){return type==='grass'?'공격 뒤 자신의 HP 2 회복':type==='water'?'배틀 시작 보호막 4':type==='electric'?'기본 속도 +2':type==='fire'?'상대 HP 절반 이하일 때 피해 +2':type==='normal'?'기본 최대 HP +3':type==='flying'?'기본 속도 +1':'균형 잡힌 기본 능력';}
function rng(g){let n=g.rng|0;n^=n<<13;n^=n>>>17;n^=n<<5;g.rng=n>>>0;return g.rng/4294967296;}
function shuffle(g,list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function log(g,text){g.sequence++;g.log.push({n:g.sequence,text});g.log=g.log.slice(-90);}
function unit(species,index,slot){return{id:index+'-'+slot,species,xp:0,training:0};}
function accessible(g,index){const slot=g.market[index];if(!slot||slot.taken)return false;if(index>=7)return true;const row=index<3?0:1,col=row===0?index:index-3,offset=row===0?3:7;return g.market[offset+col].taken&&g.market[offset+col+1].taken;}
function reveal(g){g.market.forEach((s,i)=>{if(accessible(g,i))s.hidden=false;});}
function beginDraft(g,first=0){
 g.phase='draft';g.current=first;g.picks=[0,0];g.ready=[false,false];g.battle=null;
 const options=g.players.flatMap(p=>p.team.flatMap(u=>data[u.species].next));
 const evo=shuffle(g,options.length?options:[2,5,8,26]);const recruits=[10,13,43,54,58,39,52,56,81,92,129,133,147];
 const cards=[];
 for(let i=0;i<3;i++)cards.push({kind:'evolution',species:evo[i%evo.length]});
 for(let i=0;i<4;i++)cards.push({kind:'training',xp:2});
 const skillIds=shuffle(g,Object.keys(moves).filter(id=>id!=='tackle'));for(let i=0;i<3;i++)cards.push({kind:'move',move:skillIds[i]});
 const mons=shuffle(g,recruits);for(let i=0;i<2;i++)cards.push({kind:'pokemon',species:mons[i]});
 g.market=shuffle(g,cards).map((card,i)=>({id:'r'+g.round+'-'+i,card,hidden:i<3,taken:false}));reveal(g);
 log(g,'육성 '+g.round+'라운드 · 각자 카드 4장을 고르세요. '+g.players[first].name+'님 먼저!');
}
function newGame(partners=[25,4],seed=9173141,names=['나','라이벌']){
 need(partners.length===2&&partners.every(p=>starters.includes(p)),'파트너를 골라 주세요.');
 const g={schema:2,rng:(Number(seed)>>>0)||9173141,round:1,phase:'draft',current:0,players:partners.map((partner,i)=>({name:String(names[i]||'플레이어').slice(0,16),partner,team:[unit(partner,i,0),unit(16,i,1),unit(133,i,2)],program:[0,1,2].map(slot=>({slot,move:'tackle'})),evolutions:[]})),points:[0,0],picks:[0,0],market:[],sequence:0,log:[],battle:null,lastBattle:null,ready:[false,false],result:null};
 beginDraft(g,0);return g;
}
function draft(g,index,a){
 need(g.phase==='draft'&&g.current===index,'지금은 내 카드 선택 차례가 아니에요.');need(Number.isInteger(a.market)&&accessible(g,a.market),'덮이지 않은 카드만 가져올 수 있어요.');
 const card=g.market[a.market].card,p=g.players[index];let text='';
 if(card.kind==='evolution'){p.evolutions.push(card.species);text=data[card.species].name+' 진화 카드 보관';}
 else{
  need(Number.isInteger(a.slot)&&a.slot>=0&&a.slot<3,'적용할 포켓몬을 골라 주세요.');const target=p.team[a.slot];
  if(card.kind==='training'){target.xp=Math.min(6,target.xp+card.xp);target.training=Math.min(3,target.training+1);text=data[target.species].name+' 훈련 · 경험치 +2';}
  if(card.kind==='pokemon'){
   need(!p.team.some((u,s)=>s!==a.slot&&u.species===card.species),'같은 포켓몬은 두 마리 데려올 수 없어요.');
   const retired=data[target.species].name;p.team[a.slot]=unit(card.species,index,a.slot);p.program=p.program.filter(e=>e.slot!==a.slot);p.program.push({slot:a.slot,move:'tackle'});
   text=retired+' 대신 '+data[card.species].name+' 영입';
  }
  if(card.kind==='move'){const at=a.position??p.program.length;need(Number.isInteger(at)&&at>=0&&at<=p.program.length,'기술을 넣을 위치를 골라 주세요.');p.program.splice(at,0,{slot:a.slot,move:card.move});text=data[target.species].name+'의 '+moves[card.move].name+' 추가';}
 }
 g.market[a.market].taken=true;g.picks[index]++;reveal(g);g.phase='prepare';log(g,p.name+' · '+text);
}
function evolve(g,index,slot,to){
 need(g.phase==='prepare'&&g.current===index,'내 육성 정비 시간에 진화할 수 있어요.');const p=g.players[index],u=p.team[slot];
 need(u&&data[u.species].next.includes(to),'이어지는 진화형을 골라 주세요.');const cost=stage(u.species)===0?2:3;
 need(u.xp>=cost,'진화할 경험치가 부족해요.');const at=p.evolutions.indexOf(to);need(at>=0,'해당 포켓몬의 진화 카드가 필요해요.');
 const old=data[u.species].name;u.species=to;u.xp-=cost;p.evolutions.splice(at,1);log(g,p.name+' · '+old+' → '+data[to].name+' 진화!');
}
function startBattle(g){
 g.phase='battle';g.current=null;g.battle={id:'battle-'+g.round,step:0,first:(g.round-1)%2,cursors:[0,0],active:[0,0],override:[null,null],guard:[0,0],ultimate:[false,false],used:[false,false],lastSlot:[-1,-1],units:g.players.map(p=>p.team.map(u=>({...stats(u),hp:stats(u).hp,maxHp:stats(u).hp,shield:data[u.species].type==='water'?4:0}))),lastMoves:[]};
 log(g,'배틀 '+g.round+' 시작! 각자 한 번 교체·방어·필살기 중 하나로 개입할 수 있어요.');
}
function finishPrepare(g,index){
 need(g.phase==='prepare'&&g.current===index,'내 육성 정비부터 마쳐 주세요.');
 if(g.picks.every(n=>n===CONFIG.picks)){startBattle(g);return;}
 g.phase='draft';g.current=1-index;if(g.picks[g.current]>=CONFIG.picks)g.current=index;
}
function command(g,index,a){
 need(g.phase==='battle'&&g.battle.id===a.battleId,'현재 배틀에서만 개입할 수 있어요.');const b=g.battle;need(!b.used[index],'이번 배틀에는 이미 개입했어요.');
 if(a.kind==='switch'){need(Number.isInteger(a.slot)&&b.units[index][a.slot]?.hp>0,'기절하지 않은 포켓몬을 골라 주세요.');need(a.slot!==b.active[index],'다른 포켓몬으로 교체해 주세요.');b.override[index]=a.slot;b.active[index]=a.slot;}
 else if(a.kind==='guard')b.guard[index]+=18;
 else if(a.kind==='ultimate')b.ultimate[index]=true;
 else throw Error('교체·방어·필살기 중 하나를 골라 주세요.');
 b.used[index]=true;log(g,g.players[index].name+' · '+(a.kind==='switch'?'긴급 교체':a.kind==='guard'?'팀 방어막 18':'다음 공격에 필살기 +14'));
}
function advantage(attacker,defender){return{fire:['grass','bug'],water:['fire','rock'],grass:['water','rock'],electric:['water','flying'],fighting:['normal','rock'],ghost:['psychic']}[attacker]?.includes(defender)?4:0;}
function nextMove(g,index){
 const b=g.battle,p=g.players[index];let entry;
 for(let k=0;k<p.program.length;k++){const i=b.cursors[index]++%p.program.length,e=p.program[i];if(b.units[index][e.slot].hp>0){entry={...e};break;}}
 if(!entry)return null;
 if(b.override[index]!==null){entry={slot:b.override[index],move:'quick'};b.override[index]=null;}
 b.active[index]=entry.slot;return entry;
}
function conclude(g,winner,reason){
 const b=g.battle;g.points[winner]++;for(const p of g.players)for(const u of p.team)u.xp=Math.min(6,u.xp+1);
 g.lastBattle={winner,reason,round:g.round,steps:b.step,remaining:b.units.map(team=>team.reduce((n,u)=>n+u.hp,0))};
 log(g,g.players[winner].name+' 배틀 승리! '+g.points[winner]+'승 · 모두 경험치 +1');
 if(g.points[winner]>=CONFIG.goal){g.phase='finished';g.result={winner,points:[...g.points]};log(g,g.players[winner].name+' 최종 우승!');}
 else{g.phase='battleResult';g.ready=[false,false];}
}
function stepBattle(g){
 need(g.phase==='battle','배틀이 진행 중이 아니에요.');const b=g.battle;b.step++;b.lastMoves=[];
 const entries=[nextMove(g,0),nextMove(g,1)];
 if(entries.some(e=>!e)){conclude(g,entries[0]?0:1,'상대 팀 전원 기절');return;}
 const order=[0,1].sort((a,z)=>{const speed=i=>b.units[i][entries[i].slot].speed+moves[entries[i].move].speed;return speed(z)-speed(a)||(a===b.first?-1:1);});
 for(const index of order){
  const enemy=1-index,e=entries[index],attacker=b.units[index][e.slot];if(attacker.hp<=0)continue;
  let targetSlot=b.active[enemy];if(b.units[enemy][targetSlot].hp<=0){const live=b.units[enemy].findIndex(u=>u.hp>0);if(live<0)break;targetSlot=live;b.active[enemy]=live;}
  const target=b.units[enemy][targetSlot],move=moves[e.move],pokemon=g.players[index].team[e.slot],enemyMon=g.players[enemy].team[targetSlot],type=data[pokemon.species].type;
  attacker.shield+=move.shield||0;
  let amount=Math.max(1,attacker.attack+move.power+advantage(type,data[enemyMon.species].type)+(move.id==='combo'&&b.lastSlot[index]===e.slot?5:0)+(move.id==='finish'&&target.hp<=target.maxHp/2?6:0)+(type==='fire'&&target.hp<=target.maxHp/2?2:0)+(b.ultimate[index]?14:0));
  b.ultimate[index]=false;const teamBlocked=Math.min(amount,b.guard[enemy]);b.guard[enemy]-=teamBlocked;amount-=teamBlocked;const personalBlocked=Math.min(amount,target.shield);target.shield-=personalBlocked;amount-=personalBlocked;
  const damage=Math.min(target.hp,amount);target.hp-=damage;attacker.hp=Math.min(attacker.maxHp,attacker.hp+(move.heal||0)+(type==='grass'?2:0));b.lastSlot[index]=e.slot;
  b.lastMoves.push({player:index,slot:e.slot,move:e.move,target:targetSlot,damage,blocked:teamBlocked+personalBlocked,advantage:advantage(type,data[enemyMon.species].type)>0});
  log(g,data[pokemon.species].name+' · '+move.name+' → '+data[enemyMon.species].name+' 피해 '+damage+(teamBlocked+personalBlocked?' (방어 '+(teamBlocked+personalBlocked)+')':'')+(target.hp===0?' · 기절!':''));
  if(b.units[enemy].every(u=>u.hp<=0)){conclude(g,index,'상대 팀 전원 기절');return;}
 }
 if(b.step>=CONFIG.maxBeats){
  const hp=b.units.map(team=>team.reduce((n,u)=>n+u.hp,0)),winner=hp[0]===hp[1]?b.first:hp[0]>hp[1]?0:1;
  conclude(g,winner,hp[0]===hp[1]?'45교환 뒤 HP 동점 · 이번 배틀 선공 우선':'45교환 뒤 남은 HP 합계');return;
 }
 b.first=1-b.first;
}
function continueGame(g,index){
 need(g.phase==='battleResult','다음 육성을 준비할 때만 사용할 수 있어요.');g.ready[index]=true;
 if(g.ready.every(Boolean)){const first=1-g.lastBattle.winner;g.round++;beginDraft(g,first);}
}
function valueCard(g,index,card){
 const p=g.players[index];
 if(card.kind==='evolution'){const u=p.team.find(u=>data[u.species].next.includes(card.species));return u?10+Math.min(u.xp,3)*3-p.evolutions.filter(id=>id===card.species).length*9:1;}
 if(card.kind==='training'){return 9+Math.max(...p.team.map(u=>data[u.species].next.some(id=>p.evolutions.includes(id))?6:0));}
 if(card.kind==='move')return card.move==='combo'?9:8;
 return 4;
}
function botDraft(g,index){
 need(g.phase==='draft'&&g.current===index,'컴퓨터 선택 차례가 아니에요.');
 const choices=g.market.map((slot,i)=>({i,score:accessible(g,i)?valueCard(g,index,slot.card):-Infinity})).sort((a,b)=>b.score-a.score);const card=g.market[choices[0].i].card,p=g.players[index];
 let slot=p.team.map((u,i)=>({i,value:(data[u.species].next.some(id=>p.evolutions.includes(id))?20:0)+(data[u.species].next.length?6:0)-u.xp-u.training})).sort((a,b)=>b.value-a.value)[0].i;
 if(card.kind==='pokemon'){const same=p.team.findIndex(u=>u.species===card.species);slot=same>=0?same:p.team.map((u,i)=>({i,v:stage(u.species)*10+u.xp+u.training})).sort((a,b)=>a.v-b.v)[0].i;}
 if(card.kind==='move')slot=p.team.map((u,i)=>({i,v:stats(u).attack+stage(u.species)*4})).sort((a,b)=>b.v-a.v)[0].i;
 let position=p.program.findIndex(e=>e.slot===slot)+1;draft(g,index,{market:choices[0].i,slot,position:Math.max(0,position)});
 for(let i=0;i<3;i++)for(let attempt=0;attempt<2;attempt++){const u=p.team[i],to=data[u.species].next.find(id=>p.evolutions.includes(id));if(to&&u.xp>=(stage(u.species)===0?2:3))evolve(g,index,i,to);}
 finishPrepare(g,index);
}
function botCommand(g,index){if(g.phase!=='battle'||g.battle.used[index])return;const b=g.battle,active=b.units[index][b.active[index]];if(active.hp<active.maxHp*.45)command(g,index,{kind:'guard',battleId:b.id});else if(b.step>=4)command(g,index,{kind:'ultimate',battleId:b.id});}
function act(g,index,a){
 need(index===0||index===1,'플레이어를 확인해 주세요.');
 if(a.type==='draft')draft(g,index,a);else if(a.type==='evolve')evolve(g,index,a.slot,a.to);else if(a.type==='finishPrepare')finishPrepare(g,index);else if(a.type==='command')command(g,index,a);else if(a.type==='continue')continueGame(g,index);else throw Error('알 수 없는 행동이에요.');
}
function assert(g){
 need(g&&g.schema===2&&g.players.length===2&&g.players.every(p=>p.team.length===3),'팀은 정확히 세 마리여야 해요.');
 need(['draft','prepare','battle','battleResult','finished'].includes(g.phase),'진행 단계 오류');
 for(const p of g.players){need(p.team.every(u=>data[u.species]&&u.species<=151&&Number.isInteger(u.xp)&&u.xp>=0&&u.xp<=6&&u.training>=0&&u.training<=3),'포켓몬 성장 정보 오류');need(p.program.length>=3&&p.program.every(e=>Number.isInteger(e.slot)&&e.slot>=0&&e.slot<3&&moves[e.move]),'기술 순서 오류');need(p.evolutions.every(id=>data[id]),'진화 카드 오류');}
 need(g.points.every(n=>Number.isInteger(n)&&n>=0&&n<=3),'승점 오류');need(g.picks.every(n=>n>=0&&n<=4),'선택 횟수 오류');
 if(g.battle)for(const team of g.battle.units)need(team.every(u=>u.hp>=0&&u.hp<=u.maxHp&&u.shield>=0),'배틀 HP 오류');return true;
}
return{CONFIG,data,types,moves,starters,stage,stats,passive,newGame,accessible,draft,evolve,finishPrepare,command,stepBattle,continueGame,act,botDraft,botCommand,assert,advantage};
});
