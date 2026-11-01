/* Browser/server rules engine. Base data provenance: LICENSE-UPSTREAM.txt. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./data.js'));else r.SevenDuel=f(r.DuelData);})(typeof globalThis!=='undefined'?globalThis:this,function(D){
'use strict';
const C=D.cards,R=['wood','clay','stone','glass','paper'],clone=x=>JSON.parse(JSON.stringify(x)),has=(p,id)=>p.tokens.includes(id),tok=id=>'token_'+id;
const uid=(g)=>++g.seq,random=g=>{g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;};
function shuffled(g,a){a=[...a];for(let j=a.length-1;j>0;j--){const k=Math.floor(random(g)*(j+1));[a[j],a[k]]=[a[k],a[j]];}return a;}
function count(g,i,type){const p=g.players[i];if(type==='unit')return 1;if(type==='wonder')return p.wonders.filter(w=>w.built).length;if(type==='token')return p.tokens.length;if(type==='coin_packets')return Math.floor(p.coins/3);if(type==='brown_and_gray')return count(g,i,'brown')+count(g,i,'gray');return p.city.filter(id=>C[id].type===type).length;}
function multiplier(g,i,e){return e.max?Math.max(count(g,i,e.per),count(g,1-i,e.per)):count(g,i,e.per);}
function production(g,i){const p=g.players[i],fixed=Object.fromEntries(R.map(r=>[r,0])),price={...fixed},market=[],flex=[];
 for(const id of [...p.city,...p.wonders.filter(w=>w.built).map(w=>w.id)]){const c=C[id];for(const[r,n]of Object.entries(c.produce||{})){fixed[r]+=n;if(['brown','gray'].includes(c.type))price[r]+=n;}if(c.flex)flex.push(c.flex);market.push(...c.market||[]);}return{fixed,price,market,flex};
}
function cost(g,i,id){const c=C[id],p=g.players[i],mine=production(g,i),enemy=production(g,1-i);
 const chain=!!((c.cost.chain&&p.city.includes(c.cost.chain))||(c.type==='temple'&&p.myths.includes(c.myth)));
 if(chain)return{total:0,trade:0,coins:0,chain:true,missing:{}};
 const missing=Object.fromEntries(R.map(r=>[r,Math.max(0,(c.cost.res[r]||0)-mine.fixed[r])])),rates=Object.fromEntries(R.map(r=>[r,mine.market.includes(r)?1:2+enemy.price[r]]));
 const use=(allowed)=>{const best=allowed.filter(r=>missing[r]>0).sort((a,b)=>rates[b]-rates[a])[0];if(best)missing[best]--;};
 for(const f of mine.flex)use(f==='raw'?R.slice(0,3):R.slice(3));
 if((c.type==='wonder'&&has(p,tok('architecture')))||(c.type==='blue'&&has(p,tok('masonry')))){use(R);use(R);}
 const trade=R.reduce((n,r)=>n+missing[r]*rates[r],0),normal=trade+c.cost.coins;
 if((c.cost.chain||c.type==='temple')&&has(p,'engineering')&&normal>1)return{total:1,trade:0,coins:1,engineering:true,missing:{}};
 return{total:normal,trade,coins:c.cost.coins,chain:false,missing};
}
function money(p){return p.coins+p.astarte;}
function pay(g,i,amount,protectedAmount){const p=g.players[i],minimum=Math.max(0,amount-p.coins),use=protectedAmount===undefined?minimum:protectedAmount;
 if(!Number.isInteger(amount)||amount<0||!Number.isInteger(use)||use<minimum||use>Math.min(amount,p.astarte))throw Error('지불할 금화를 확인해 주세요.');p.coins-=amount-use;p.astarte-=use;
}
function available(g,slot){return Number.isInteger(slot)&&slot>=0&&slot<20&&!g.market[slot].taken&&D.schemes[g.age-1][slot].children.every(j=>g.market[j].taken);}
function science(g,i){const p=g.players[i],out={};for(const id of [...p.city,...p.tokens,...p.gods]){const s=C[id].science||(id==='ishtar'?'law':null);if(s)out[s]=(out[s]||0)+1;}
 if(g.snake&&g.snake.player===i){const id=g.snake.card;if(g.players[1-i].city.includes(id))out[C[id].science]=(out[C[id].science]||0)+1;}return out;
}
function log(g,text){g.log.push({n:uid(g),text});g.log=g.log.slice(-70);}
function task(g,i,kind,options,title,extra={},front=false){if(!options.length)return;const t={id:uid(g),player:i,kind,options,title,...extra};if(front)g.tasks.unshift(t);else g.tasks.push(t);}
function finish(g,winner,reason){g.phase='finished';g.result={winner,reason,scores:g.players.map((_,i)=>score(g,i))};g.tasks=[];g.flow=null;}
function checkpoint(g,i){if(g.phase==='finished')return;if(Math.abs(g.pawn)>=9){finish(g,g.pawn>0?0:1,'군사 패권');return;}
 const sc=science(g,i);if(Object.keys(sc).length>=6){finish(g,i,'과학 패권');return;}
 const p=g.players[i];for(const[s,n]of Object.entries(sc)){const pairs=Math.floor(n/2),old=p.pairs[s]||0;if(pairs>old){p.pairs[s]=pairs;for(let k=old;k<pairs;k++)task(g,i,'progress',[...g.progress],'같은 과학 기호 한 쌍! 진보 토큰을 골라 주세요.');}}
}
function advanceMilitary(g,i,n){const dir=i===0?1:-1,p=g.players[i];for(let j=0;j<n;j++){
 const next=g.pawn+dir;if(next===g.minerva){g.minerva=null;log(g,'미네르바가 진군을 멈췄어요.');break;}g.pawn=next;
 if(has(p,'poliorcetics'))g.players[1-i].coins=Math.max(0,g.players[1-i].coins-1);
 const t=g.military.find(t=>!t.used&&t.pos===g.pawn);if(t){t.used=true;g.players[1-i].coins=Math.max(0,g.players[1-i].coins-t.loss);log(g,g.players[1-i].name+'의 금화 '+t.loss+'개 약탈');}
 if(Math.abs(g.pawn)>=9){checkpoint(g,i);break;}
 }}
function enkiReveal(g,ids){if(ids.includes('enki')&&!g.enki.length){g.box=shuffled(g,g.box);g.enki=g.box.splice(0,2);}}
function returnEnki(g){g.box.push(...g.enki);g.box=shuffled(g,g.box);g.enki=[];}
function collect(g,i,slot){const s=g.market[slot];if(!s.token)return;const t=s.token;s.token=null;
 if(t.kind==='offering'){g.players[i].offerings.push(t.value);log(g,g.players[i].name+'이 봉헌 '+t.value+' 토큰을 얻었어요.');return;}
 g.players[i].myths.push(t.myth);const options=g.mythDecks[t.myth].splice(0,2);task(g,i,'myth',options,D.myths[t.myth].name+' 신 둘 중 하나와 신전 자리를 골라 주세요.',{myth:t.myth});log(g,g.players[i].name+'이 '+D.myths[t.myth].name+' 신화 토큰을 얻었어요.');
}
function reveal(g,i){for(let slot=0;slot<20;slot++){const s=g.market[slot];if(!s.taken&&!s.face&&available(g,slot)){s.face=true;collect(g,i,slot);}}}
function prepareAge(g,age){g.age=age;let ids;
 if(age<3)ids=shuffled(g,D.decks['age'+age+'Cards']).slice(0,20);
 else ids=shuffled(g,[...shuffled(g,D.decks.age3Cards).slice(0,17),...shuffled(g,g.pantheon?Object.keys(D.myths).map(m=>'temple_'+m):D.decks.guildCards).slice(0,3)]);
 g.market=ids.map((id,j)=>({id,face:D.schemes[age-1][j].face,taken:false,token:null}));
 if(g.pantheon&&age===1){const myths=shuffled(g,Object.keys(D.myths).flatMap(m=>[m,m])).slice(0,5);[2,4,9,11,13].forEach((slot,j)=>g.market[slot].token={kind:'myth',myth:myths[j]});}
 if(g.pantheon&&age===2){const offers=shuffled(g,[2,3,4]);[6,8,10].forEach((s,j)=>g.market[s].token={kind:'offering',value:offers[j]});
 const empty=g.pantheonSlots.find(s=>!s.id);if(empty)Object.assign(empty,{id:'gate',owner:null});enkiReveal(g,g.pantheonSlots.filter(s=>!s.used).map(s=>s.id));}
}
function settle(g){
 if(g.phase==='finished'||g.phase==='wonderDraft'||g.phase==='ageStart')return;
 if(!g.flow)return;
 if(g.tasks.length){g.phase='choice';return;}
 const i=g.flow.actor;reveal(g,i);if(g.tasks.length){g.phase='choice';return;}
 if(g.market.every(s=>s.taken)){
  if(g.age===3){const a=score(g,0),b=score(g,1);let winner=null;if(a.total!==b.total)winner=a.total>b.total?0:1;else if(a.blue!==b.blue)winner=a.blue>b.blue?0:1;finish(g,winner,'시민 승리 · 최종 점수');return;}
  const chooser=g.pawn>0?1:g.pawn<0?0:i;g.flow=null;g.phase='ageStart';g.current=chooser;return;
 }
 g.current=g.flow.replay?i:1-i;g.flow=null;g.phase='play';
}
function sealWonders(g){if(g.players.reduce((n,p)=>n+p.wonders.filter(w=>w.built).length,0)>=7){for(const p of g.players)for(const w of p.wonders)if(!w.built)w.removed=true;}}
function grant(g,i,id,kind='building'){
 const p=g.players[i],c=C[id];
 if(kind==='building')p.city.push(id);else if(kind==='token')p.tokens.push(id);
 if(c.coins)p.coins+=c.coins.n*multiplier(g,i,c.coins);
 if(id===tok('urbanism'))p.coins+=6;
 if(c.loot)g.players[1-i].coins=Math.max(0,g.players[1-i].coins-c.loot);
 if(c.shields)advanceMilitary(g,i,c.shields+(c.type==='red'&&has(p,tok('strategy'))?1:0));
 if(c.replay||(kind==='wonder'&&has(p,tok('theology'))))g.flow.replay=true;
 if(c.destroy)task(g,i,'destroy',g.players[1-i].city.filter(id=>C[id].type===c.destroy),'상대의 '+(c.destroy==='brown'?'갈색':'회색')+' 건물 하나를 파괴하세요.');
 if(c.special==='discardBuild')task(g,i,'discardBuild',g.discard.filter(id=>!p.city.includes(id)),'버린 카드 중 무료로 건설할 건물을 고르세요.');
 if(c.special==='boxProgress'){g.box=shuffled(g,g.box);const options=g.box.splice(0,3);task(g,i,'boxProgress',options,'상자 속 진보 토큰 셋 중 하나를 고르세요.');}
 if(c.special==='divineTheater')task(g,i,'theaterDeck',Object.keys(g.mythDecks).filter(m=>g.mythDecks[m].length),'신들의 극장: 신화 덱을 골라 주세요.');
 checkpoint(g,i);
}
function constructWonder(g,i,id,under){const w=g.players[i].wonders.find(w=>w.id===id&&!w.built&&!w.removed);if(!w)throw Error('지을 수 없는 불가사의예요.');w.built=true;w.under=under;sealWonders(g);grant(g,i,id,'wonder');}
function invoke(g,i,id){const p=g.players[i];p.gods.push(id);if(id==='aphrodite')return;
 if(id==='tanit')p.coins+=12;if(id==='astarte')p.astarte+=7;if(id==='mars')advanceMilitary(g,i,2);
 if(id==='enki'){const options=[...g.enki];g.enki=[];task(g,i,'boxProgress',options,'엔키: 진보 토큰을 고르세요.');}
 if(id==='nisaba')task(g,i,'nisaba',g.players[1-i].city.filter(id=>C[id].science),'상대 과학 카드 하나의 기호를 복사하세요.');
 if(id==='baal')task(g,i,'baal',g.players[1-i].city.filter(id=>['brown','gray'].includes(C[id].type)),'상대의 원자재 또는 제조품 건물 하나를 가져오세요.');
 if(id==='hades')task(g,i,'discardBuild',g.discard.filter(id=>!p.city.includes(id)),'하데스: 버린 카드 중 하나를 무료 건설하세요.');
 if(id==='zeus')task(g,i,'zeus',g.market.flatMap((s,j)=>s.taken?[]:[j]),'제우스: 구조의 카드 한 장을 버리세요. 뒷면도 선택할 수 있어요.');
 if(id==='anubis')task(g,i,'anubis',g.players.flatMap((q,owner)=>q.wonders.filter(w=>w.built).map(w=>({owner,id:w.id}))),'아누비스: 해체할 불가사의를 골라 주세요.');
 if(id==='ra')task(g,i,'ra',g.players[1-i].wonders.filter(w=>!w.built&&!w.removed).map(w=>w.id),'라: 상대의 미완성 불가사의를 가져오세요.');
 if(id==='isis'&&g.discard.length)task(g,i,'isisWonder',p.wonders.filter(w=>!w.built&&!w.removed).map(w=>w.id),'이시스: 무료로 지을 불가사의를 골라 주세요.');
 if(id==='minerva')task(g,i,'minerva',Array.from({length:19},(_,j)=>j-9),'미네르바: 진군을 막을 트랙 칸을 고르세요.');
 if(id==='neptune')task(g,i,'neptuneRemove',g.military.filter(t=>!t.used).map(t=>t.id),'넵투누스: 먼저 효과 없이 제거할 군사 토큰을 고르세요.');
 checkpoint(g,i);
}
function choose(g,i,a){
 const t=g.tasks[0];if(!t||t.id!==a.task||t.player!==i||!t.options.some(o=>JSON.stringify(o)===JSON.stringify(a.value)))throw Error('선택 화면이 바뀌었어요. 다시 골라 주세요.');
 if(t.kind==='myth'&&(!Number.isInteger(a.position)||a.position<0||a.position>5||g.pantheonSlots[a.position].id))throw Error('빈 신전 자리를 골라 주세요.');
 g.tasks.shift();const v=a.value,p=g.players[i];
 if(t.kind==='myth'){g.pantheonSlots[a.position]={id:v,owner:i,used:false,myth:t.myth};g.mythDecks[t.myth].unshift(...t.options.filter(x=>x!==v));log(g,p.name+'이 '+D.myths[t.myth].name+' 신을 '+(a.position+1)+'번 자리에 놓았어요.');}
 if(t.kind==='progress'){const at=g.progress.indexOf(v);if(at<0)throw Error('남아 있지 않은 토큰이에요.');g.progress.splice(at,1);grant(g,i,v,'token');}
 if(t.kind==='boxProgress'){g.box.push(...t.options.filter(x=>x!==v));g.box=shuffled(g,g.box);grant(g,i,v,'token');}
 if(t.kind==='discardBuild'){g.discard.splice(g.discard.indexOf(v),1);grant(g,i,v);}
 if(t.kind==='destroy'){g.players[1-i].city.splice(g.players[1-i].city.indexOf(v),1);g.discard.push(v);log(g,C[v].name+'을 파괴했어요.');}
 if(t.kind==='baal'){g.players[1-i].city.splice(g.players[1-i].city.indexOf(v),1);p.city.push(v);}
 if(t.kind==='nisaba'){g.snake={player:i,card:v};checkpoint(g,i);}
 if(t.kind==='zeus'){const s=g.market[v];s.taken=true;g.discard.push(s.id);collect(g,i,v);log(g,'제우스가 '+C[s.id].name+'을 버렸어요.');}
 if(t.kind==='anubis'){const w=g.players[v.owner].wonders.find(w=>w.id===v.id);w.built=false;g.discard.push(w.under);w.under=null;log(g,C[v.id].name+'을 해체했어요. 즉시 효과는 취소하지 않아요.');}
 if(t.kind==='ra'){const q=g.players[1-i],at=q.wonders.findIndex(w=>w.id===v);p.wonders.push(q.wonders.splice(at,1)[0]);}
 if(t.kind==='isisWonder')task(g,i,'isisCard',[...g.discard],'이시스: 재료로 쓸 버린 카드를 고르세요.',{wonder:v},true);
 if(t.kind==='isisCard'){g.discard.splice(g.discard.indexOf(v),1);constructWonder(g,i,t.wonder,v);}
 if(t.kind==='minerva')g.minerva=v;
 if(t.kind==='neptuneRemove'){g.military.find(x=>x.id===v).used=true;task(g,i,'neptuneApply',g.military.filter(x=>!x.used).map(x=>x.id),'이번에는 상대에게 적용할 군사 토큰을 고르세요.',{},true);}
 if(t.kind==='neptuneApply'){const m=g.military.find(x=>x.id===v);m.used=true;g.players[1-i].coins=Math.max(0,g.players[1-i].coins-m.loss);}
 if(t.kind==='theaterDeck'){const options=[...g.mythDecks[v]];enkiReveal(g,options);task(g,i,'godSelect',options,'무료로 부를 신을 골라 주세요.',{source:'theater',myth:v},true);}
 if(t.kind==='godSelect'){
  const myth=C[v].myth,at=g.mythDecks[myth].indexOf(v);g.mythDecks[myth].splice(at,1);
  if(t.options.includes('enki')&&v!=='enki')returnEnki(g);
  if(t.source==='theater'){const rest=g.mythDecks[myth].splice(0);task(g,i,'godOrder',rest,'남은 신들을 맨 위에 놓을 순서대로 고르세요.',{myth,ordered:[]},true);}
  invoke(g,i,v);
 }
 if(t.kind==='godOrder'){const ordered=[...t.ordered,v],rest=t.options.filter(x=>x!==v);if(rest.length)task(g,i,'godOrder',rest,'다음에 놓을 신을 고르세요. 먼저 고른 신이 맨 위예요.',{myth:t.myth,ordered},true);else g.mythDecks[t.myth]=ordered;}
 checkpoint(g,i);if(t.kind==='myth')log(g,p.name+'이 비공개 신 선택을 마쳤어요.');else if(t.kind==='godOrder')log(g,p.name+'이 남은 신의 순서를 정했어요.');else log(g,p.name+' 선택: '+(C[v]?.name||D.myths[v]?.name||(typeof v==='object'?C[v.id]?.name:String(v))));settle(g);
}
function invokeCost(g,i,slot,offers=[]){const s=g.pantheonSlots[slot],p=g.players[i];const base=(i===0?3+slot:8-slot)*(s?.id==='gate'?2:1),discount=p.wonders.filter(w=>w.built).reduce((n,w)=>n+(C[w.id].discount||0),0);
 const valid=Array.isArray(offers)&&new Set(offers).size===offers.length&&offers.every(j=>Number.isInteger(j)&&j>=0&&j<p.offerings.length);if(!valid)throw Error('봉헌 토큰을 다시 골라 주세요.');
 return Math.max(0,base-discount-offers.reduce((n,j)=>n+p.offerings[j],0));
}
function newGame(pantheon=true,seed=1,names=['나','컴퓨터']){
 const g={schema:1,pantheon:!!pantheon,rng:seed>>>0||1,seq:0,turn:0,age:1,phase:'wonderDraft',current:0,players:names.map(name=>({name,coins:7,astarte:0,city:[],wonders:[],tokens:[],gods:[],myths:[],offerings:[],pairs:{}})),market:[],discard:[],tasks:[],flow:null,log:[],pawn:0,minerva:null,snake:null,enki:[],pantheonSlots:Array.from({length:6},()=>({id:null,owner:null,used:false})),military:[{id:'west2',pos:-3,loss:2,used:false},{id:'west5',pos:-6,loss:5,used:false},{id:'east2',pos:3,loss:2,used:false},{id:'east5',pos:6,loss:5,used:false}],result:null};
 const tokens=shuffled(g,[...D.decks.tokens,...(pantheon?['mysticism','poliorcetics','engineering']:[])]);g.progress=tokens.splice(0,5);g.box=tokens;
 g.mythDecks=Object.fromEntries(Object.keys(D.myths).map(m=>[m,shuffled(g,Object.keys(C).filter(id=>C[id].type==='god'&&C[id].myth===m))]));
 const wonders=shuffled(g,[...D.decks.wonders,...(pantheon?['sanctuary','divine_theater']:[])]).slice(0,8),first=Math.floor(random(g)*2);g.draft={pool:wonders.slice(0,4),rest:wonders.slice(4),pick:0,order:[first,1-first,1-first,first,1-first,first,first,1-first],first};g.current=first;prepareAge(g,1);return g;
}
function act(g,i,a){
 if(g.phase==='finished'||i!==g.current)throw Error('내 차례가 아니에요.');
 if(g.phase==='wonderDraft'){
  if(a.type!=='draft'||!g.draft.pool.includes(a.id))throw Error('공개된 불가사의를 골라 주세요.');g.players[i].wonders.push({id:a.id,built:false,removed:false,under:null});g.draft.pool.splice(g.draft.pool.indexOf(a.id),1);g.draft.pick++;log(g,g.players[i].name+'이 '+C[a.id].name+' 선택');
  if(g.draft.pick===4){g.draft.pool=g.draft.rest;g.draft.rest=[];}if(g.draft.pick===8){g.current=g.draft.first;g.phase='play';}else g.current=g.draft.order[g.draft.pick];return g;
 }
 if(g.phase==='ageStart'){if(a.type!=='startAge'||![0,1].includes(a.first))throw Error('다음 시대의 선공을 골라 주세요.');prepareAge(g,g.age+1);g.current=a.first;g.phase='play';g.turn++;return g;}
 if(g.phase==='choice'){if(a.type!=='choice')throw Error('먼저 효과 선택을 마쳐 주세요.');choose(g,i,a);return g;}
 if(g.phase!=='play')throw Error('진행 상태를 확인해 주세요.');
 const p=g.players[i];
 if(a.type==='invoke'){
  const s=g.pantheonSlots[a.slot];if(!g.pantheon||g.age<2||!s?.id||s.used)throw Error('지금 부를 수 없는 신이에요.');
  const offers=a.offerings||[],amount=invokeCost(g,i,a.slot,offers);if(money(p)<amount)throw Error('신을 부를 금화가 부족해요.');
  pay(g,i,amount,a.protected);[...offers].sort((a,b)=>b-a).forEach(j=>p.offerings.splice(j,1));g.flow={actor:i,replay:false};s.used=true;g.turn++;log(g,p.name+'이 '+C[s.id].name+' 호출 · '+amount+'금화');
  if(s.id==='gate'){const options=Object.values(g.mythDecks).flatMap(x=>x.length?[x[0]]:[]);enkiReveal(g,options);p.gods.push('gate');task(g,i,'godSelect',options,'신들의 문: 무료로 부를 신 하나를 고르세요.',{source:'gate'});}else invoke(g,i,s.id);settle(g);return g;
 }
 if(!['build','discard','wonder'].includes(a.type)||!available(g,a.slot))throw Error('덮이지 않은 카드를 골라 주세요.');const s=g.market[a.slot],id=s.id;
 let price=null;if(a.type==='build'){if(p.city.includes(id))throw Error('이미 가진 건물이에요.');price=cost(g,i,id);}
 if(a.type==='wonder'){if(!p.wonders.some(w=>w.id===a.wonder&&!w.built&&!w.removed))throw Error('지을 수 없는 불가사의예요.');price=cost(g,i,a.wonder);}
 if(price&&money(p)<price.total)throw Error('금화가 부족해요.');
 if(price){pay(g,i,price.total,a.protected);if(has(g.players[1-i],tok('economy')))g.players[1-i].coins+=price.trade;}
 g.flow={actor:i,replay:false};s.taken=true;g.turn++;
 if(a.type==='discard'){g.discard.push(id);p.coins+=2+count(g,i,'yellow');log(g,p.name+'이 '+C[id].name+'을 버려 금화를 얻었어요.');}
 if(a.type==='build'){if(price.chain&&has(p,tok('urbanism')))p.coins+=4;grant(g,i,id);log(g,p.name+'이 '+C[id].name+' 건설 · '+price.total+'금화');}
 if(a.type==='wonder'){constructWonder(g,i,a.wonder,id);log(g,p.name+'이 '+C[a.wonder].name+' 건설 · '+price.total+'금화');}
 settle(g);return g;
}
function score(g,i){const p=g.players[i],out={blue:0,buildings:0,wonders:0,progress:0,gods:0,temples:0,coins:Math.floor(p.coins/3)+p.astarte,military:0,total:0};
 for(const id of p.city){const c=C[id];let n=c.vp||0;if(c.scorePer)n+=c.scorePer.n*multiplier(g,i,c.scorePer);out.buildings+=n;if(c.type==='blue')out.blue+=n;}
 out.wonders=p.wonders.filter(w=>w.built).reduce((n,w)=>n+C[w.id].vp,0);
 for(const id of p.tokens){const c=C[id];out.progress+=c.vp||0;if(c.scorePer)out.progress+=c.scorePer.n*multiplier(g,i,c.scorePer);if(id==='mysticism')out.progress+=2*(p.myths.length+p.offerings.length);}
 out.gods=p.gods.reduce((n,id)=>n+(C[id].vp||0),0);const temples=count(g,i,'temple');out.temples=[0,5,12,21][Math.min(3,temples)];
 const military=(i===0?1:-1)*g.pawn;if(military>0)out.military=military>=6?10:military>=3?5:2;out.total=out.buildings+out.wonders+out.progress+out.gods+out.temples+out.coins+out.military;return out;
}
function view(g,i){const v=clone(g);delete v.rng;delete v.box;delete v.mythDecks;delete v.draft.rest;
 v.market.forEach(s=>{if(!s.face&&!s.taken)s.id=null;});v.players.forEach(p=>p.wonders.forEach(w=>{w.under=null;}));
 if(g.age===1)v.pantheonSlots.forEach(s=>{if(s.owner!==i)s.id=null;});
 v.tasks=v.tasks.map(t=>t.player===i?t:{id:t.id,player:t.player,kind:'waiting',options:[],title:'상대가 효과를 선택하고 있어요.'});v.me=i;return v;
}
function actions(g,i=g.current){
 if(i!==g.current||g.phase==='finished')return[];
 if(g.phase==='wonderDraft')return g.draft.pool.map(id=>({type:'draft',id}));
 if(g.phase==='ageStart')return[0,1].map(first=>({type:'startAge',first}));
 if(g.phase==='choice'){const t=g.tasks[0];if(t.kind==='myth')return t.options.flatMap(value=>g.pantheonSlots.flatMap((s,position)=>!s.id&&!s.myth?[{type:'choice',task:t.id,value,position}]:[]));return t.options.map(value=>({type:'choice',task:t.id,value}));}
 const p=g.players[i],a=[];g.market.forEach((s,slot)=>{if(!available(g,slot))return;a.push({type:'discard',slot});if(!p.city.includes(s.id)&&cost(g,i,s.id).total<=money(p))a.push({type:'build',slot});p.wonders.forEach(w=>{if(!w.built&&!w.removed&&cost(g,i,w.id).total<=money(p))a.push({type:'wonder',slot,wonder:w.id});});});
 if(g.pantheon&&g.age>=2)g.pantheonSlots.forEach((s,slot)=>{if(!s.id||s.used)return;for(let mask=0;mask<1<<p.offerings.length;mask++){const offerings=p.offerings.flatMap((_,j)=>mask&(1<<j)?[j]:[]);if(invokeCost(g,i,slot,offerings)<=money(p))a.push({type:'invoke',slot,offerings});}});return a;
}
function ai(g,i=g.current){
 const v=view(g,i),a=actions(v,i),p=v.players[i],sc=science(v,i),enemySc=science(v,1-i);
 const value=id=>{const c=C[id];if(!c)return 0;let n=(c.vp||0)*.9;
 if(c.produce)n+=Object.values(c.produce).reduce((n,x)=>n+x,0)*(v.age===1?6:3);
 if(c.flex)n+=6;if(c.market)n+=v.age===1?4:2;if(c.coins)n+=c.coins.n*multiplier(v,i,c.coins)*.45;
 if(c.science)n+=sc[c.science]?7:5+(Object.keys(sc).length>=4?5:0);
 if(c.shields){n+=c.shields*2;if((i===0?v.pawn:-v.pawn)+c.shields>=9)n+=1000;if((i===0?-v.pawn:v.pawn)>=5)n+=4;}
 if(c.replay)n+=4;if(c.type==='token')n+=7;if(c.type==='temple')n+=count(v,i,'temple')?10:6;
 if(c.type==='god')n+=({tanit:6,astarte:7,enki:9,ishtar:Object.keys(sc).length>=4?13:7,nisaba:Object.keys(enemySc).length?7:0,aphrodite:0,baal:6,hades:5,isis:7,ra:4,minerva:2,zeus:4,anubis:2,neptune:4,mars:5}[id]||0);
 return n;};
 function rate(x){
 if(x.type==='draft')return value(x.id)+((C[x.id].flex||C[x.id].replay)?4:0);
 if(x.type==='startAge')return x.first===i?2:0;
 if(x.type==='choice'){const t=v.tasks[0];if(t.kind==='myth')return value(x.value)+(i===0?5-x.position:x.position)*.7;if(t.kind==='minerva')return -Math.abs(x.value-(v.pawn+(i===0?-2:2)));if(t.kind==='anubis')return(x.value.owner!==i?5:-5)+C[x.value.id].vp;if(t.kind==='neptuneRemove')return v.military.find(t=>t.id===x.value).loss;if(t.kind==='neptuneApply')return v.military.find(t=>t.id===x.value).loss*2;if(t.kind==='zeus'){const c=v.market[x.value].id;return c?value(c):1;}if(t.kind==='theaterDeck')return 3;if(t.kind==='godOrder')return value(x.value);return value(x.value);}
 if(x.type==='discard')return(2+count(v,i,'yellow'))*.45+(money(p)<3?2:0);
 if(x.type==='invoke')return value(v.pantheonSlots[x.slot].id)-invokeCost(v,i,x.slot,x.offerings)*.45-x.offerings.length*.2;
 const id=x.type==='wonder'?x.wonder:v.market[x.slot].id;return value(id)-cost(v,i,id).total*.4;
 }
 let best=-Infinity,out=a[0];for(const x of a){const n=rate(x)+random(g)*1.8;if(n>best){best=n;out=x;}}return out;
}
function assert(g){if(g.schema!==1||g.players.length!==2||g.pawn<-9||g.pawn>9||!Number.isInteger(g.current)||g.current<0||g.current>1)throw Error('잘못된 게임 상태');for(const p of g.players)if(!Number.isInteger(p.coins)||p.coins<0||!Number.isInteger(p.astarte)||p.astarte<0)throw Error('잘못된 금화');if(g.market.length!==20)throw Error('잘못된 시대 구조');if(g.players.reduce((n,p)=>n+p.wonders.filter(w=>w.built).length,0)>7)throw Error('불가사의는 일곱 개까지만 지어요.');return true;}
return{D,C,R,newGame,act,view,actions,ai,cost,production,available,science,score,invokeCost,money,assert,clone};
});

