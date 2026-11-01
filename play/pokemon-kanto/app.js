'use strict';
const G=KantoGame,$=id=>document.getElementById(id),art='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/',SAVE='jjinmak-kanto-v1';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const btn=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
let game=null,saved=null,partner=25,selection=null,busy=false,undo=[],modal=null,toastTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function picture(id,name){const img=el('img');img.src=art+id+'.png';img.alt=name;img.loading='lazy';img.decoding='async';img.onerror=()=>{if(!img.dataset.fallback){img.dataset.fallback='1';img.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png';}else{img.hidden=true;}};return img;}
function closeDialog(){if(modal){modal.close();modal.remove();modal=null;}}
function dialog(title){closeDialog();const d=el('dialog',undefined,'dialog'),head=el('div',undefined,'dialog-header'),h=el('h2',title);h.id='dialogTitle';d.setAttribute('aria-labelledby',h.id);head.append(h,btn('닫기 ✕',closeDialog,'text-button'));d.append(head);d.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});document.body.append(d);modal=d;return d;}
function show(d){d.showModal();d.querySelector('button')?.focus();}
function typeTag(type){const t=G.types[type],tag=el('span',t.symbol+' '+t.name,'type-tag');tag.style.setProperty('--type',t.color);return tag;}
function card(c,action,cls=''){
 const d=G.data[c.id||c],type=G.types[d.type],node=action?btn('',action,'p-card '+cls):el('div',undefined,'p-card '+cls);node.style.setProperty('--type',type.color);
 const top=el('div',undefined,'card-top'),cost=el('span',d.cost?'ϟ '+d.cost:'진화','card-cost'),number=el('span','NO. '+String(d.id).padStart(3,'0'),'card-number');
 top.append(cost,number);node.append(top);const image=el('div',undefined,'card-picture');image.append(picture(d.id,d.name));node.append(image);
 const body=el('div',undefined,'card-body'),name=el('div',undefined,'card-name');name.append(el('strong',d.name),el('b',String(d.power),'card-power'));body.append(name,typeTag(d.type),el('p',G.effects[d.effect],'card-effect'));
 node.append(body);node.setAttribute('aria-label',d.name+' · '+(d.cost?'배치 에너지 '+d.cost:'진화 에너지 '+d.evolveCost)+' · 기본 전투력 '+d.power+' · '+G.effects[d.effect]);return node;
}
function drawPartners(){
 $('partners').replaceChildren(...G.starters.map(id=>{const d=G.data[id],b=btn('',()=>{partner=id;drawPartners();},'partner'+(partner===id?' selected':''));b.setAttribute('aria-pressed',String(partner===id));b.style.setProperty('--type',G.types[d.type].color);b.append(el('span','NO. '+String(id).padStart(3,'0'),'partner-number'),picture(id,d.name),el('strong',d.name),typeTag(d.type),el('p',id===1?'함께할수록 강해지는 팀':id===4?'불리할수록 타오르는 투지':id===7?'물 포켓몬과 함께하는 시너지':'친구가 있을 때 빛나는 한 방'));return b;}));
 $('start').textContent=G.data[partner].name+'와 출발하기 →';
}
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(game));}catch{toast('이번 판은 계속할 수 있지만 자동 저장을 하지 못했어요.');}}
function start(id=partner){closeDialog();const seed=crypto.getRandomValues(new Uint32Array(1))[0];game=G.newGame(id,seed);selection=null;undo=[];busy=false;G.assert(game);persist();render();$('game').scrollIntoView({block:'start',behavior:'smooth'});}
function load(){try{const raw=localStorage.getItem(SAVE);if(raw){const s=JSON.parse(raw);G.assert(s);if(s.actor===0||s.phase==='finished'){saved=s;$('resumeBar').hidden=false;$('resumeText').textContent='라운드 '+s.round+' · '+G.data[s.players[0].partner].name+'와 함께';}}}catch{saved=null;}}
function select(value){if(busy)return;selection=value;renderSelection();renderHand();document.querySelectorAll('.unit.selected').forEach(n=>n.classList.remove('selected'));if(value?.kind==='unit')document.querySelector('[data-unit="'+value.uid+'"]')?.classList.add('selected');}
function execute(action){
 if(busy||game.phase!=='playing')return;const previous=JSON.stringify(game);
 try{G.act(game,0,action);G.assert(game);undo.push(previous);if(undo.length>24)undo.shift();if(action.type==='play')selection=null;persist();$('announce').textContent=game.log.at(-1);render();}
 catch(e){game=JSON.parse(previous);toast(e.message);}
}
function unitView(u,index,lane,power){
 const c=G.data[u.id],own=index===0,b=btn('',()=>select({kind:'unit',index,uid:u.uid}),'unit'+(own?' own':' enemy')+(selection?.uid===u.uid?' selected':''));
 b.dataset.unit=u.uid;b.style.setProperty('--type',G.types[c.type].color);b.append(picture(c.id,c.name));const text=el('span',undefined,'unit-text');text.append(el('strong',c.name),el('small',u.history.length?'진화 '+u.history.length+'단계':G.types[c.type].name));b.append(text,el('b',String(power),'unit-power'));b.setAttribute('aria-label',(own?'내 ':'상대 ')+c.name+' · 현재 전투력 '+power+' · 누르면 설명');if(u.boost)b.append(el('span','+'+u.boost,'boost-tag'));return b;
}
function renderBoard(){
 const s=G.scores(game);$('myWins').textContent=s.wins[0];$('cpuWins').textContent=s.wins[1];
 $('board').replaceChildren(...G.locations.map((loc,lane)=>{
  const column=el('article',undefined,'lane lane-'+loc.key);column.dataset.winner=String(s.owners[lane]);
  const head=el('div',undefined,'lane-heading');head.append(el('span','0'+(lane+1),'lane-index'),el('span',loc.sub));column.append(head);
  const title=el('div',undefined,'location-title');title.append(el('h2',loc.name),el('p',loc.effect));column.append(title);
  for(const index of [1,0]){
   const team=el('div',undefined,'team '+(index?'cpu-team':'my-team')),label=el('div',undefined,'team-label');label.append(el('span',index?'라이벌':'내 원정대'),el('strong',String(s.totals[index][lane])+'점'));team.append(label);
   const slots=el('div',undefined,'slots');game.players[index].lanes[lane].forEach((u,i)=>slots.append(unitView(u,index,lane,s.power[index][lane][i])));
   for(let i=game.players[index].lanes[lane].length;i<3;i++){const empty=el('div',index?'·':'＋','empty-slot');empty.setAttribute('aria-label','빈 자리');slots.append(empty);}team.append(slots);column.append(team);
   if(index===1){const banner=el('div',s.owners[lane]===0?'내 원정대 우세':s.owners[lane]===1?'라이벌 우세':'아직 팽팽해요','lane-banner');column.append(banner);}
  }
  return column;
 }));
}
function renderHand(){
 if(!game)return;const p=game.players[0];$('handCount').textContent=p.hand.length;$('energyCount').textContent=p.energy;$('energyMax').textContent=' / '+game.round;
 $('energyPips').replaceChildren(...Array.from({length:game.round},(_,i)=>el('i',undefined,i<p.energy?'charged':'')));
 $('hand').replaceChildren(...p.hand.map(c=>{const b=card(c,()=>select({kind:'hand',uid:c.uid}),(selection?.uid===c.uid?'selected ':'')+(G.data[c.id].cost>p.energy?'unaffordable':''));b.disabled=busy||game.phase==='finished';return b;}));
 if(!p.hand.length)$('hand').append(el('p','손패를 모두 사용했어요. 배치한 포켓몬을 진화시키거나 응원해 보세요.','empty-hand'));
 $('deckCount').textContent='남은 덱 '+p.deck.length+'장';$('opponentHand').textContent='라이벌 손패 '+game.players[1].hand.length+'장 · 덱 '+game.players[1].deck.length+'장';
 $('handHint').textContent=game.phase==='finished'?'원정이 끝났어요. 각 장소의 최종 점수를 확인해 보세요.':busy?'라이벌이 카드를 고르고 있어요…':selection?.kind==='hand'?'배치할 장소를 골라 주세요. 장소 보너스도 확인해 보세요.':'손패를 누르면 배치, 내 장소의 포켓몬을 누르면 진화·이동·응원을 할 수 있어요.';
}
function actionButton(label,action,disabled=false,note=''){
 const b=btn('',()=>execute(action),'action-button');b.disabled=disabled||busy||game.phase==='finished';b.append(el('strong',label));if(note)b.append(el('span',note));return b;
}
function renderSelection(){
 if(!game)return;const body=$('coachBody');body.replaceChildren();$('coach').dataset.open=String(!!selection);
 if(!selection){
  const h=el('h2',game.phase==='finished'?'멋진 원정이었어요.':'한 수를 골라보세요.');h.id='coachTitle';body.append(h,el('p','손의 카드는 배치하고, 이미 놓은 포켓몬은 진화시키거나 옮길 수 있어요.','coach-copy'));
  const steps=el('ol',undefined,'coach-steps');['에너지 숫자만큼 카드를 낼 수 있어요.','장소 보너스에 맞는 팀을 모아요.','남은 에너지 1개로 응원하면 전투력 +2.'].forEach(t=>steps.append(el('li',t)));body.append(steps,el('div',undefined,'coach-divider'),el('p','6라운드 뒤 더 많은 장소에서 앞서면 승리. 장소 수가 같으면 전투력 합계를 비교해요.','coach-copy'));return;
 }
 let unit,found;if(selection.kind==='hand')unit=game.players[0].hand.find(c=>c.uid===selection.uid);else{found=G.find(game,selection.index,selection.uid);unit=found?.unit;}
 if(!unit){selection=null;renderSelection();return;}
 const c=G.data[unit.id],p=game.players[0],h=el('h2',c.name);h.id='coachTitle';body.append(h,card(unit,null,'detail-card'),el('p',G.effects[c.effect],'selected-effect'));
 if(selection.kind==='unit'&&selection.index===1){body.append(el('p','라이벌 포켓몬이에요. 상대의 효과도 점수에 반영돼요.','coach-copy'));return;}
 if(selection.kind==='hand'){
  body.append(el('h3','배치할 장소 · 에너지 '+c.cost));const choices=el('div',undefined,'place-choices');
  for(let lane=0;lane<3;lane++){const full=p.lanes[lane].length>=3,short=p.energy<c.cost;let text=full?'세 자리가 모두 찼어요':short?'에너지가 부족해요':'남은 자리 '+(3-p.lanes[lane].length);
   if(!full&&!short){const copy=JSON.parse(JSON.stringify(game));G.act(copy,0,{type:'play',uid:unit.uid,lane});const before=G.scores(game).totals[0][lane],after=G.scores(copy).totals[0][lane];text=before+'점 → '+after+'점';}
   choices.append(actionButton(G.locations[lane].name,{type:'play',uid:unit.uid,lane},full||short,text));
  }body.append(choices);return;
 }
 body.append(el('p',G.locations[found.lane].name+' · 응원 보너스 +'+unit.boost,'selection-location'));
 if(c.next.length){body.append(el('h3','진화하기'));const evolutions=el('div',undefined,'evolution-choices');for(const next of c.next){const d=G.data[next],done=unit.evolvedRound===game.round,b=actionButton(d.name+' · ϟ '+d.evolveCost,{type:'evolve',uid:unit.uid,to:next},done||p.energy<d.evolveCost,done?'이번 라운드에는 이미 진화했어요':'기본 '+c.power+' → '+d.power);evolutions.append(b);}body.append(evolutions);}
 const cheer=actionButton('응원 · ϟ 1',{type:'cheer',uid:unit.uid},p.cheered||p.energy<1,p.cheered?'이번 라운드 응원은 사용했어요':'이 포켓몬의 전투력 +2');body.append(cheer);
 if(c.effect!=='anchored'){
  body.append(el('h3','다른 장소로 이동 · ϟ '+(c.effect==='mobile'?0:1)));const moves=el('div',undefined,'move-choices');
  for(let lane=0;lane<3;lane++)if(lane!==found.lane)moves.append(actionButton(G.locations[lane].name,{type:'move',uid:unit.uid,lane},p.moved||p.lanes[lane].length>=3||p.energy<(c.effect==='mobile'?0:1),p.moved?'이번 라운드 이동은 사용했어요':'남은 자리 '+(3-p.lanes[lane].length)));body.append(moves);
 }else body.append(el('p','이 포켓몬은 장소를 옮길 수 없어요.','coach-copy'));
}
function render(){
 $('intro').hidden=true;$('game').hidden=false;$('resumeBar').hidden=true;$('roundText').textContent='ROUND '+String(game.round).padStart(2,'0')+' / 06';
 $('roundDots').replaceChildren(...Array.from({length:6},(_,i)=>el('i',undefined,i+1===game.round?'current':i+1<game.round?'complete':'')));
 $('phaseText').textContent=game.phase==='finished'?'원정 종료':busy?'라이벌 차례':'내 차례';$('phaseText').classList.toggle('thinking',busy);
 $('myName').textContent=G.data[game.players[0].partner].name+' 원정대';$('cpuName').textContent=G.data[game.players[1].partner].name+' 원정대';
 $('undo').disabled=busy||!undo.length||game.phase==='finished';$('endRound').disabled=busy||game.phase==='finished';$('endRound').textContent=busy?'라이벌이 생각 중…':game.round===6?'최종 승부 확인 →':'라운드 마치기 →';
 $('resultButton').hidden=game.phase!=='finished';renderBoard();renderHand();renderSelection();$('log').replaceChildren(...game.log.slice().reverse().map(t=>el('li',t)));
}
async function endRound(force=false){
 if(busy||game.phase!=='playing')return;
 if(!force&&game.players[0].energy>0&&G.legal(game,0).length){const d=dialog('남은 에너지를 두고 마칠까요?');d.append(el('p','에너지 '+game.players[0].energy+'개가 남았어요. 사용하지 않은 에너지는 다음 라운드로 넘어가지 않아요.'),btn('계속 생각하기',closeDialog,'button outline'),btn('이번 라운드 마치기',()=>{closeDialog();endRound(true);},'button dark'));show(d);return;}
 selection=null;undo=[];busy=true;render();const backup=JSON.stringify(game);await new Promise(r=>setTimeout(r,650));
 try{G.finishRound(game);G.assert(game);persist();}catch(e){game=JSON.parse(backup);toast(e.message);}finally{busy=false;render();}
 if(game.phase==='finished')results();else{$('announce').textContent=game.round+'라운드가 시작됐어요. 에너지 '+game.round+'개.';toast(game.round+'라운드 · 에너지 '+game.round+'개');}
}
function results(){
 if(!game?.result)return;const r=game.result,s=G.scores(game),d=dialog(r.winner===0?'관동 리그, 승리!':r.winner===1?'라이벌의 승리!':'멋진 무승부!');
 d.classList.add('result-dialog');const image=picture(game.players[r.winner===1?1:0].partner,G.data[game.players[r.winner===1?1:0].partner].name);image.className='result-pokemon';d.append(image,el('p',r.winner===0?'당신의 팀워크가 관동을 빛냈어요.':r.winner===1?'진화와 장소 보너스를 살려 다시 도전해 보세요.':'끝까지 팽팽했던 원정이었어요.'));
 const table=el('table',undefined,'result-table');const head=el('tr');['장소','나','라이벌'].forEach(t=>head.append(el('th',t)));table.append(head);G.locations.forEach((loc,i)=>{const row=el('tr');row.append(el('th',loc.name),el('td',s.totals[0][i]+'점'),el('td',s.totals[1][i]+'점'));table.append(row);});d.append(table,el('p','이긴 장소 '+r.wins[0]+' : '+r.wins[1]+' · 전투력 합계 '+r.total[0]+' : '+r.total[1],'result-summary'));
 d.append(btn('같은 파트너로 다시 도전',()=>start(game.players[0].partner),'button dark'),btn('다른 파트너 고르기',showIntro,'button outline'));show(d);
}
function showIntro(){if(busy)return;closeDialog();$('game').hidden=true;$('intro').hidden=false;selection=null;if(game){saved=game;$('resumeBar').hidden=false;$('resumeText').textContent='라운드 '+game.round+' · '+G.data[game.players[0].partner].name+'와 함께';}window.scrollTo({top:0,behavior:'smooth'});}
function rules(){
 const d=dialog('처음이라면, 이렇게 플레이해요.');const content=el('div',undefined,'rules-content');
 for(const [title,text] of [
  ['목표 · 세 장소에서 펼치는 원정','상록숲·블루시티·석영고원에 포켓몬을 배치해요. 6라운드가 끝났을 때 전투력 합계가 상대보다 큰 장소를 더 많이 가지면 승리해요. 이긴 장소 수가 같으면 모든 장소의 전투력 합계를 비교하고, 그것도 같으면 무승부예요.'],
  ['1. 에너지를 받고 카드를 뽑아요','1라운드는 에너지 1개, 2라운드는 2개… 6라운드는 6개로 시작해요. 라운드마다 카드 1장을 뽑고, 남은 에너지는 이월하지 않아요. 각자 카드 16장을 사용하며, 시작 손패 4장에 첫 라운드 드로우 1장을 더해 시작해요.'],
  ['2. 카드를 눌러 장소에 배치해요','왼쪽 위 ϟ 숫자만큼 에너지를 써요. 한 장소에는 각 팀이 3마리까지 놓을 수 있고, 포켓몬은 게임이 끝날 때까지 남아요. 카드 아래 효과와 장소 보너스는 즉시 반영돼요. 오른쪽 아래 숫자가 기본 전투력이에요.'],
  ['3. 진화·이동·응원을 해요','이미 놓은 내 포켓몬을 누르면 행동을 고를 수 있어요. 진화하면 기본 전투력과 효과가 바뀌고, 응원 보너스는 남아요. 배치한 라운드에도 진화할 수 있지만 같은 포켓몬은 라운드마다 한 번만 진화해요. 이동은 보통 에너지 1개를 써서 다른 빈 장소로 옮기고, 응원은 에너지 1개로 포켓몬 하나에 전투력 +2를 영구히 줘요. 이동과 응원은 각각 팀당 라운드에 한 번이에요.'],
  ['4. 라운드를 마치면 라이벌 차례예요','에너지 안에서 원하는 만큼 행동한 다음 라운드 마치기를 눌러요. 라이벌도 같은 에너지로 행동하고 다음 라운드를 시작해요. 내 행동을 확정하기 전에는 방금 행동 취소로 되돌릴 수 있어요.'],
  ['장소 보너스 · 팀을 나누는 이유','상록숲은 풀·벌레 포켓몬마다 +2, 블루시티는 물 포켓몬마다 +2, 석영고원은 한 번 이상 진화한 포켓몬마다 +2예요. 능력과 장소 보너스는 함께 적용돼요. 화면의 장소 점수와 포켓몬 전투력은 모든 효과를 반영한 값이에요.'],
  ['첫 판의 힌트','파트너를 먼저 놓고, 다음 라운드에 진화시켜 보세요. 한 장소에만 강한 팀을 모으기보다 두 장소에서 앞서는 편이 좋아요. 남는 에너지 1개는 응원에 쓸 수 있어요.']
 ])content.append(el('h3',title),el('p',text));
 const sample=el('div',undefined,'evolution-example');for(const id of [4,5,6]){if(sample.children.length)sample.append(el('span','→'));const figure=el('figure');figure.append(picture(id,G.data[id].name),el('figcaption',G.data[id].name+' · 기본 '+G.data[id].power));sample.append(figure);}content.append(sample);d.append(content);show(d);
}
function dex(){
 const d=dialog('관동 카드 도감'),intro=el('p','모두 1세대 포켓몬이에요. 덱에는 기본 카드가 들어가고, 진화형은 게임판에서 에너지를 써서 만나요.'),input=el('input');input.type='search';input.placeholder='포켓몬 이름으로 검색';input.setAttribute('aria-label','포켓몬 이름 검색');const grid=el('div',undefined,'dex-grid'),count=el('p',undefined,'dex-count');
 const draw=()=>{const cards=Object.values(G.data).filter(c=>c.name.includes(input.value.trim())).sort((a,b)=>a.id-b.id);count.textContent=cards.length+'종의 포켓몬';grid.replaceChildren(...cards.map(c=>{const node=card(c.id);if(!c.cost)node.append(el('span','진화 에너지 '+c.evolveCost,'evolution-label'));return node;}));};input.oninput=draw;d.classList.add('dex-dialog');d.append(intro,input,count,grid);draw();show(d);
}
$('start').onclick=()=>start();$('resume').onclick=()=>{game=saved;undo=[];selection=null;busy=false;render();if(game.phase==='finished')results();};
$('clearSelection').onclick=()=>select(null);$('endRound').onclick=()=>endRound();$('undo').onclick=()=>{if(!busy&&undo.length){game=JSON.parse(undo.pop());selection=null;persist();render();toast('방금 행동을 되돌렸어요.');}};
$('restart').onclick=()=>{if(busy)return;const d=dialog('새 원정을 시작할까요?');d.append(el('p','지금 원정 대신 새 파트너를 골라 처음부터 시작해요.'),btn('현재 원정 계속하기',closeDialog,'button outline'),btn('파트너 다시 고르기',showIntro,'button dark'));show(d);};
$('resultButton').onclick=results;$('openRules').onclick=rules;$('openDex').onclick=dex;
drawPartners();load();if(new URLSearchParams(location.search).has('rules'))rules();
