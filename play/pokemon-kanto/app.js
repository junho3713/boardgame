'use strict';
const G=KantoDuel,$=id=>document.getElementById(id),ART='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/',API='https://jjinmak-boardgame.onrender.com/kanto/api/',SAVE='jjinmak-kanto-duel-v2';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;},button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
let game=null,mode='solo',partner=25,viewer=0,selected=null,targetSlot=0,insertAt=null,busy=false,localTimer=null,botTimer=null,nextBeatAt=0,clockOffset=0,modal=null,toastTimer,lastBeat='',saved=null,toolsPromise=null;
const net={token:sessionStorage.getItem('kanto-duel-token')||'',state:null,controller:null};
const me=()=>game.players[viewer],other=()=>game.players[1-viewer],myTurn=()=>game&&['draft','prepare'].includes(game.phase)&&game.current===viewer;
function toast(t){$('toast').textContent=t;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3800);}
function picture(id,alt){const img=el('img');img.src=ART+id+'.png';img.alt=alt||G.data[id].name;img.loading='lazy';img.decoding='async';img.onerror=()=>{if(!img.dataset.fallback){img.dataset.fallback='1';img.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png';}else img.hidden=true;};return img;}
function closeDialog(){if(modal){modal.close();modal.remove();modal=null;}}
function dialog(title){closeDialog();const d=el('dialog',undefined,'dialog'),h=el('div',undefined,'dialog-head'),heading=el('h2',title);heading.id='dialogTitle';d.setAttribute('aria-labelledby',heading.id);h.append(heading,button('닫기 ✕',closeDialog));d.append(h);document.body.append(d);d.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});modal=d;return d;}
function show(d){d.showModal();d.querySelector('button')?.focus();}
function persist(){if(mode==='solo'&&game)try{localStorage.setItem(SAVE,JSON.stringify(game));}catch{}}
function stopLocal(){clearTimeout(localTimer);clearTimeout(botTimer);localTimer=null;botTimer=null;nextBeatAt=0;}
function setMode(value){mode=value;$('soloMode').setAttribute('aria-pressed',String(value==='solo'));$('onlineMode').setAttribute('aria-pressed',String(value==='online'));$('soloSetup').hidden=value!=='solo';$('onlineSetup').hidden=value!=='online';}
function drawPartners(){$('partners').replaceChildren(...G.starters.map(id=>{const c=G.data[id],b=button('',()=>{partner=id;drawPartners();},'partner'+(partner===id?' selected':''));b.setAttribute('aria-pressed',String(partner===id));b.style.setProperty('--type',G.types[c.type].color);b.append(picture(id),el('strong',c.name),el('span',G.types[c.type].name),el('small',G.passive(c.type)));return b;}));}
function startSolo(){stopLocal();closeDialog();mode='solo';viewer=0;game=G.newGame([partner,G.starters[Math.floor(Math.random()*4)]],crypto.getRandomValues(new Uint32Array(1))[0]);net.state=null;if(window.RoomTools)RoomTools.hide();selected=null;targetSlot=0;lastBeat='';persist();render();settleSolo();$('game').scrollIntoView({block:'start',behavior:'smooth'});}
function settleSolo(){
 if(mode!=='solo'||!game)return;
 if(game.phase==='draft'&&game.current===1&&!botTimer){botTimer=setTimeout(()=>{botTimer=null;try{G.botDraft(game,1);G.assert(game);persist();render();settleSolo();}catch(e){toast(e.message);}},650);}
 if(game.phase==='battle'&&!localTimer){const delay=game.battle.step?G.CONFIG.beatMs:G.CONFIG.introMs;nextBeatAt=Date.now()+delay;localTimer=setTimeout(()=>{localTimer=null;try{G.botCommand(game,1);G.stepBattle(game);G.assert(game);persist();render();settleSolo();}catch(e){toast(e.message);}},delay);}
 if(game.phase==='battleResult'&&!game.ready[1]){G.continueGame(game,1);persist();render();}
}
async function api(route,body){
 const r=await fetch(API+route,{method:body===undefined?'GET':'POST',headers:{...(net.token?{Authorization:'Bearer '+net.token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 let d;try{d=await r.json();}catch{throw Error('서버를 깨우고 있어요. 잠시 뒤 다시 시도해 주세요.');}
 if(!r.ok){if(d.state)accept(d.state);const e=Error(d.error||'연결을 확인해 주세요.');e.status=r.status;throw e;}return d;
}
async function enableTools(){
 if(toolsPromise)return toolsPromise;toolsPromise=(async()=>{
  const origin=new URL(API).origin;
  const link=el('link');link.rel='stylesheet';link.href=origin+'/room-tools.css';document.head.append(link);
  await new Promise((resolve,reject)=>{const script=el('script');script.src=origin+'/room-tools.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
  RoomTools.init({transport:body=>api('chat',body),invitePath:location.pathname+'?room=',copyTargets:'[data-no-room-copy]',fallbackTargets:['#lobbyCopy','#gameCopy']});
  if(net.state)RoomTools.update(net.state);
 })().catch(()=>{toast('채팅 연결을 불러오지 못했어요. 게임은 계속할 수 있어요.');});return toolsPromise;
}
function accept(s){
 if(net.state&&net.state.code===s.code&&s.version<=net.state.version)return;
 const changed=net.state&&net.state.gameNumber!==s.gameNumber,oldPhase=game?.phase;net.state=s;viewer=s.meIndex;clockOffset=s.serverNow-Date.now();nextBeatAt=s.nextBeatAt||0;game=s.game;
 if(changed||oldPhase!==game?.phase||!myTurn())selected=null;if(changed)closeDialog();
 if(window.RoomTools)RoomTools.update(s);
 $('intro').hidden=true;$('lobby').hidden=!!game;$('game').hidden=!game;
 if(!game){$('lobbyCode').textContent=s.code;$('lobbyPlayers').replaceChildren(...s.players.map(p=>{const n=el('article');n.append(picture(p.partner),el('strong',p.name+(p.id===s.me?' (나)':'')),el('span',G.data[p.partner].name+' · '+(p.id===s.host?'방장':'참가자')));return n;}));$('startRoom').hidden=s.host!==s.me;$('startRoom').disabled=s.players.length!==2;$('startRoom').textContent=s.players.length===2?'1대1 대전 시작 →':'두 명이 모이면 시작';$('lobbyHint').textContent=s.players.length===2?'두 명이 모였어요. 방장이 시작하면 함께 육성 시장으로 이동해요.':'초대 링크나 방 코드를 친구에게 보내 주세요.';return;}
 render();
}
async function enter(route){
 if(busy)return;busy=true;$('setupError').textContent='서버에 연결하고 있어요…';
 try{const d=await api(route,{name:$('trainerName').value.trim()||'트레이너',partner,code:$('roomInput').value});net.token=d.token;sessionStorage.setItem('kanto-duel-token',net.token);localStorage.setItem('kanto-trainer-name',$('trainerName').value.trim());mode='online';net.state=null;stopLocal();accept(d.state);$('setupError').textContent='';enableTools();connect();}
 catch(e){$('setupError').textContent=e.message;}finally{busy=false;}
}
async function connect(){
 net.controller?.abort();const controller=new AbortController();net.controller=controller;
 while(net.token&&!controller.signal.aborted){
  try{$('connection').textContent='연결 중';const response=await fetch(API+'events',{headers:{Authorization:'Bearer '+net.token},signal:controller.signal});if(!response.ok||!response.body)throw Error('다시 연결 중');$('connection').textContent='실시간 연결';
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   while(!controller.signal.aborted){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end;while((end=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);const line=block.split('\n').find(x=>x.startsWith('data: '));if(line)accept(JSON.parse(line.slice(6)));}}
  }catch(e){if(controller.signal.aborted)return;}
  if(controller.signal.aborted)return;$('connection').textContent='다시 연결 중';
  try{accept(await api('state'));}catch(e){if(e.status===401){resetOnline();$('setupError').textContent='방이 만료됐어요. 새 방을 만들어 주세요.';return;}}
  await new Promise(r=>setTimeout(r,1500));
 }
}
function resetOnline(){net.controller?.abort();net.token='';net.state=null;sessionStorage.removeItem('kanto-duel-token');if(window.RoomTools)RoomTools.hide();game=null;$('intro').hidden=false;$('lobby').hidden=true;$('game').hidden=true;setMode('online');}
async function leaveRoom(){if(!net.token)return;try{await api('leave',{version:net.state.version});}catch{}resetOnline();}
async function send(a){
 if(busy)return;busy=true;$('gameError').textContent='';
 try{if(mode==='online')accept(await api('action',{...a,version:net.state.version}));else{G.act(game,0,a);G.assert(game);if(a.type==='draft'||a.type==='finishPrepare'||a.type==='continue')selected=null;persist();render();settleSolo();}}
 catch(e){$('gameError').textContent=e.message;toast(e.message);}finally{busy=false;if(game)render();}
}
async function roomAction(route){if(busy)return;busy=true;try{accept(await api(route,{version:net.state.version}));}catch(e){toast(e.message);}finally{busy=false;}}
function cardName(c){return c.kind==='training'?'성장 훈련':c.kind==='move'?G.moves[c.move].name:c.kind==='evolution'?G.data[c.species].name+' 진화':c.kind==='pokemon'?G.data[c.species].name+' 영입':'미공개 카드';}
function cardText(c){return c.kind==='training'?'경험치 +2 · 능력 보정 1회':c.kind==='move'?G.moves[c.move].text:c.kind==='evolution'?'보관한 뒤 경험치를 모아 진화해요.':c.kind==='pokemon'?'기존 팀원 한 마리와 바꿔 영입해요.':'아래 카드가 열리면 공개돼요.';}
function draftCard(c,fn,cls=''){
 const n=fn?button('',fn,'draft-card kind-'+c.kind+' '+cls):el('div',undefined,'draft-card kind-'+c.kind+' '+cls);
 const kind={training:'TRAINING',move:'TECHNIQUE',evolution:'EVOLUTION',pokemon:'POKÉMON',hidden:'UNREVEALED'}[c.kind];n.append(el('span',kind,'card-category'));
 if(c.species)n.append(picture(c.species));else n.append(el('span',c.kind==='training'?'✦':c.kind==='move'?G.moves[c.move].icon:'◉','card-symbol'));
 n.append(el('strong',cardName(c)),el('p',cardText(c)));return n;
}
function renderMarket(){
 const rows=[[],[],[]];game.market.forEach((s,i)=>{const row=i<3?0:i<7?1:2;if(s.taken){const empty=el('div',undefined,'market-hole');rows[row].push(empty);return;}
 const available=G.accessible(game,i),c=s.hidden?{kind:'hidden'}:s.card,n=draftCard(c,()=>{selected=i;insertAt=me().program.length;renderCoach();renderMarket();},(available?'available':'covered')+(selected===i?' selected':''));
 n.disabled=!available||!myTurn()||game.phase!=='draft';n.setAttribute('aria-label',cardName(c)+(available?' · 선택 가능':' · 다른 카드에 덮여 있음'));
 n.append(el('span',available?'선택 가능':'덮여 있어요','card-state'));rows[row].push(n);
 });$('market').replaceChildren(...rows.map(items=>{const row=el('div',undefined,'market-row');row.append(...items);return row;}));
}
function teamCard(u,index,slot,selectable){
 const s=G.stats(u),c=G.data[u.species],n=selectable?button('',()=>{targetSlot=slot;renderTeams();renderCoach();},'team-card'+(targetSlot===slot?' target':'')):el('div',undefined,'team-card');
 n.style.setProperty('--type',G.types[c.type].color);n.append(el('span','0'+(slot+1),'team-number'),picture(u.species),el('strong',c.name),el('span',G.types[c.type].name+' · '+(G.stage(u.species)?G.stage(u.species)+'단계 진화':'기본 포켓몬'),'team-type'));
 const stats=el('div',undefined,'stats');[['HP',s.hp],['공격',s.attack],['속도',s.speed]].forEach(([k,v])=>{const item=el('span');item.append(el('small',k),el('b',String(v)));stats.append(item);});n.append(stats,el('p','경험치 '+u.xp+'/6 · 훈련 '+u.training+'/3','xp-caption'));
 const xp=el('div',undefined,'xp-pips');for(let i=0;i<6;i++)xp.append(el('i',undefined,i<u.xp?'filled':''));n.append(xp);if(selectable)n.setAttribute('aria-label',c.name+' 선택 · 경험치 '+u.xp);return n;
}
function renderBag(p,node){node.replaceChildren();const label=el('span','보관 중인 진화 카드');node.append(label);if(!p.evolutions.length){node.append(el('small','아직 없어요.'));return;}p.evolutions.forEach(id=>{const chip=el('div',undefined,'evo-chip');chip.append(picture(id),el('span',G.data[id].name));node.append(chip);});}
function program(p,node){node.replaceChildren(...p.program.map((entry,i)=>{const u=p.team[entry.slot],chip=el('div',undefined,'program-entry');chip.append(el('b',String(i+1)),picture(u.species),el('strong',G.moves[entry.move].name),el('small',G.data[u.species].name));return chip;}));}
function renderTeams(){$('myTeam').replaceChildren(...me().team.map((u,i)=>teamCard(u,viewer,i,true)));$('otherTeam').replaceChildren(...other().team.map((u,i)=>teamCard(u,1-viewer,i,false)));renderBag(me(),$('evolutionBag'));renderBag(other(),$('otherBag'));program(me(),$('myProgram'));program(other(),$('otherProgram'));}
function renderCoach(){
 if(!game||!['draft','prepare'].includes(game.phase))return;
 const node=$('coachBody');node.replaceChildren();const preparing=game.phase==='prepare'&&myTurn(),p=me(),u=p.team[targetSlot];$('draftCoach').dataset.open=String((selected!==null&&myTurn())||preparing);
 if(preparing){
  node.append(el('h2',G.data[u.species].name+' 육성 정비'),el('p','경험치와 진화 카드를 함께 쓰면 진화해요. 필요 없다면 육성을 마치고 넘겨도 돼요.'));
  const options=G.data[u.species].next;if(!options.length)node.append(el('p','더 진화하지 않는 포켓몬이에요. 기술과 훈련으로 팀을 완성해 보세요.'));
  for(const to of options){const need=G.stage(u.species)===0?2:3,owned=p.evolutions.includes(to),ok=u.xp>=need&&owned,b=button('',()=>send({type:'evolve',slot:targetSlot,to}),'evolve-option');b.append(picture(to),el('strong',G.data[to].name),el('span','경험치 '+need+' · 진화 카드 '+(owned?'보유':'없음')));b.disabled=!ok||busy;node.append(b);}
  node.append(button('육성 마치고 차례 넘기기 →',()=>send({type:'finishPrepare'}),'primary'));return;
 }
 if(selected===null||!myTurn()){node.append(el('h2',myTurn()?'어떤 성장에 투자할까요?':'상대가 고르고 있어요.'),el('p','덮이지 않은 카드 한 장을 고르세요. 가져온 뒤 진화할 기회가 있어요.'),el('ol',undefined,'coach-tips'));const list=node.querySelector('ol');['훈련: 경험치와 기본 능력을 키워요.','진화: 경험치와 해당 진화 카드가 모두 필요해요.','기술: 기존 순서 사이에 새 카드를 넣어요.','영입: 팀원을 바꿔 새 전략을 시작해요.'].forEach(t=>list.append(el('li',t)));return;}
 const c=game.market[selected]?.card;if(!c)return;
 node.append(draftCard(c,null,'preview'),el('h3',c.kind==='evolution'?'진화 카드 보관':'적용할 팀원'),el('p',c.kind==='evolution'?'이번에 가져오면 보관함에 들어가요. 육성 정비 중 경험치를 쓰고 진화할 수 있어요.':'아래 팀에서 포켓몬을 누르거나 여기서 골라 주세요.'));
 if(c.kind!=='evolution'){
  const choices=el('div',undefined,'target-choices');p.team.forEach((mon,slot)=>{const b=button(G.data[mon.species].name,()=>{targetSlot=slot;renderTeams();renderCoach();},slot===targetSlot?'chosen':'');b.setAttribute('aria-pressed',String(slot===targetSlot));choices.append(b);});node.append(choices);
  if(c.kind==='pokemon')node.append(el('p',G.data[u.species].name+'의 경험치·진화·배운 기술을 버리고 '+G.data[c.species].name+'을 새로 영입해요.','warning'));
  if(c.kind==='move'){
   const label=el('label','기술을 끼워 넣을 위치'),select=el('select');select.id='insertPosition';label.htmlFor=select.id;
   for(let i=0;i<=p.program.length;i++){const opt=el('option',i===0?'맨 앞':i===p.program.length?'맨 뒤':i+'번 '+G.moves[p.program[i-1].move].name+' 다음');opt.value=String(i);select.append(opt);}select.value=String(insertAt??p.program.length);select.onchange=()=>insertAt=Number(select.value);node.append(label,select);
  }
 }
 const commit=button(c.kind==='evolution'?'진화 카드 가져오기 →':c.kind==='training'?'훈련 카드 가져오기 →':c.kind==='move'?'기술 카드 가져오기 →':'포켓몬 영입하기 →',()=>{if(c.kind==='pokemon'&&p.team.some((mon,i)=>i!==targetSlot&&mon.species===c.species)){toast('같은 포켓몬이 이미 팀에 있어요. 그 포켓몬의 자리로 바꿔 주세요.');return;}send({type:'draft',market:selected,slot:targetSlot,position:insertAt??p.program.length});},'primary');commit.disabled=busy;node.append(commit);
}
function fighters(index,node,animate){
 const b=game.battle,p=game.players[index];node.replaceChildren();const heading=el('div',undefined,'fighter-heading');heading.append(el('strong',p.name),el('span','팀 방어막 '+b.guard[index]));node.append(heading);
 p.team.forEach((u,slot)=>{const health=b.units[index][slot],active=b.active[index]===slot,hit=b.lastMoves.some(e=>e.player!==index&&e.target===slot),attack=b.lastMoves.some(e=>e.player===index&&e.slot===slot),n=el('article',undefined,'fighter'+(active?' active':'')+(health.hp<=0?' knocked':'')+(animate&&hit?' hit':'')+(animate&&attack?' attack':''));
 n.style.setProperty('--type',G.types[G.data[u.species].type].color);n.append(picture(u.species),el('strong',G.data[u.species].name),el('span',health.hp<=0?'기절':active?'배틀 중':'대기 중','fighter-state'));
 const bar=el('div',undefined,'hp-bar'),fill=el('i');fill.style.width=(health.hp/health.maxHp*100)+'%';bar.append(fill);n.append(bar,el('span',health.hp+' / '+health.maxHp+' HP','hp-value'),el('small','공격 '+health.attack+' · 속도 '+health.speed+(health.shield?' · 보호막 '+health.shield:'')));node.append(n);
 });
}
function renderBattle(){
 const b=game.battle;if(!b)return;if(game.phase!=='battle')$('countdown').textContent='배틀 종료';const key=b.id+'-'+b.step,animate=key!==lastBeat&&b.step>0;fighters(viewer,$('myFighters'),animate);fighters(1-viewer,$('otherFighters'),animate);lastBeat=key;
 $('battleStep').textContent='기술 교환 '+b.step+' / 최대 '+G.CONFIG.maxBeats+' · 각 포켓몬은 쓰러질 때까지 차례로 싸워요.';
 $('lastExchange').replaceChildren(...b.lastMoves.map(e=>{const c=game.players[e.player].team[e.slot],line=el('p');line.append(el('strong',G.data[c.species].name+' · '+G.moves[e.move].name),el('span','피해 '+e.damage+(e.blocked?' / 방어 '+e.blocked:'')+(e.advantage?' / 상성 +4':'')));return line;}));
 if(!b.lastMoves.length)$('lastExchange').append(el('p','곧 첫 기술이 펼쳐져요. 개입할 순간을 살펴보세요.'));
 const used=b.used[viewer],live=game.phase==='battle';$('commandHint').textContent=used?'이번 배틀의 개입을 사용했어요. 다음 배틀에서 다시 쓸 수 있어요.':'교체·방어·필살기 중 딱 하나! 언제 쓸지도 내가 정해요.';
 for(const id of ['switchCommand','guardCommand','ultimateCommand'])$(id).disabled=used||!live||busy;
 if(used)$('switchChoices').hidden=true;
}
function renderResult(){
 const node=$('roundResult');node.replaceChildren();const final=game.phase==='finished',r=final?game.result:game.lastBattle,winner=r.winner,won=winner===viewer;
 node.append(el('p',final?'MATCH COMPLETE':'BATTLE COMPLETE','eyebrow'),el('h2',final?(won?'관동 리그 우승!':'상대의 관동 리그 우승!'):(won?'이번 배틀, 승리!':'이번 배틀은 상대의 승리!')));
 if(!final)node.append(el('p',game.lastBattle.reason+' · 모든 포켓몬 경험치 +1. 다음 배틀에서는 HP가 모두 회복돼요.'));
 else node.append(el('p',game.result.forfeit?'상대가 방을 나가 대전이 끝났어요.':'먼저 3승을 달성했어요. 포켓몬과 기술 순서를 바꿔 다시 도전해 보세요.'));
 node.append(el('strong',game.players[0].name+' '+game.points[0]+' : '+game.points[1]+' '+game.players[1].name,'result-score'));
 if(!final){const ready=game.ready[viewer],b=button(ready?'상대의 준비를 기다리는 중…':'다음 육성으로 →',()=>send({type:'continue'}),'primary');b.disabled=ready||busy;node.append(b,el('small','직전 배틀에서 진 플레이어가 다음 카드 시장에서 먼저 골라요.'));}
 else if(mode==='solo')node.append(button('새 팀으로 다시 대전',home,'primary'));
 else{const host=net.state.host===net.state.me,b=button(host?'같은 방에서 다시 시작':'방장이 다시 시작할 수 있어요.',()=>roomAction('rematch'),'primary');b.disabled=!host||net.state.players.some(p=>p.left);node.append(b);}
}
function render(){
 if(!game)return;$('intro').hidden=true;$('lobby').hidden=true;$('game').hidden=false;
 $('myName').textContent=me().name;$('otherName').textContent=other().name;
 const points=(node,n)=>node.replaceChildren(...Array.from({length:3},(_,i)=>el('i',i<n?'★':'☆',i<n?'earned':'')));
 points($('myPoints'),game.points[viewer]);points($('otherPoints'),game.points[1-viewer]);
 $('roundLabel').textContent='육성·배틀 '+game.round;$('phaseLabel').textContent=game.phase==='draft'?(myTurn()?'내 카드 선택':'상대 카드 선택'):game.phase==='prepare'?(myTurn()?'내 육성 정비':'상대 육성 정비'):game.phase==='battle'?'자동 태그 배틀':game.phase==='finished'?'대전 종료':'배틀 결과';
 $('roomTools').hidden=mode!=='online';if(mode==='online')$('gameCode').textContent='방 '+net.state.code;
 const drafting=['draft','prepare'].includes(game.phase);$('draftPhase').hidden=!drafting;$('battlePhase').hidden=drafting||!game.battle;$('roundResult').hidden=!['battleResult','finished'].includes(game.phase);
 if(drafting){$('draftHeading').textContent=game.phase==='draft'?(myTurn()?'가져올 카드 한 장을 골라요.':'상대가 카드를 고르고 있어요.'):(myTurn()?'진화할 포켓몬이 있나요?':'상대가 진화를 준비하고 있어요.');$('draftProgress').textContent='내 선택 '+game.picks[viewer]+'/4 · 상대 선택 '+game.picks[1-viewer]+'/4';$('finishPrepare').hidden=game.phase!=='prepare'||!myTurn();$('finishPrepare').disabled=busy;renderMarket();renderTeams();renderCoach();}
 else{renderBattle();if(! $('roundResult').hidden)renderResult();}
 $('log').replaceChildren(...game.log.slice().reverse().map(e=>el('li',e.text)));$('announce').textContent=game.log.at(-1)?.text||'';
}
function home(){stopLocal();closeDialog();game=null;selected=null;$('game').hidden=true;$('lobby').hidden=true;$('intro').hidden=false;setMode('solo');try{saved=JSON.parse(localStorage.getItem(SAVE));$('resume').hidden=!saved;}catch{}window.scrollTo({top:0,behavior:'smooth'});}
function askNew(){
 const d=dialog(mode==='online'?'방을 나갈까요?':'새 팀을 고를까요?');d.append(el('p',mode==='online'?'진행 중인 대전에서 나가면 상대의 승리로 끝나요.':'현재 연습은 저장돼요. 새로 시작하면 저장된 연습을 덮어써요.'),button('계속하기',closeDialog),button(mode==='online'?'방 나가기':'파트너 고르기',()=>{closeDialog();if(mode==='online')leaveRoom();else home();},'primary'));show(d);
}
function chooseSwitch(){if(!game?.battle||game.battle.used[viewer])return;const node=$('switchChoices');node.hidden=!node.hidden;if(node.hidden)return;node.replaceChildren(...me().team.map((u,slot)=>{const b=button('',()=>send({type:'command',kind:'switch',slot,battleId:game.battle.id}));b.append(picture(u.species),el('strong',G.data[u.species].name),el('span',game.battle.units[viewer][slot].hp+' HP'));b.disabled=game.battle.units[viewer][slot].hp<=0||game.battle.active[viewer]===slot;return b;}));}
function manual(){
 const d=dialog('그림으로 배우는 관동 육성 듀얼');d.classList.add('manual');const intro=el('p','공유 카드를 고르고 → 세 마리를 키우고 → 자동 배틀 중 한 번 개입해요. 먼저 3승하면 우승! 아래 수치는 시제품의 테스트 규칙이에요.','manual-intro');d.append(intro);
 function section(n,title,text){const s=el('section',undefined,'manual-section');s.append(el('p',n,'eyebrow'),el('h3',title),el('p',text));d.append(s);return s;}
 const a=section('01 / START','기본 포켓몬 3마리로 똑같이 출발해요.','파트너 한 마리와 구구·이브이로 시작해요. 바로 쓰는 완성형 포켓몬을 뽑는 방식이 아니에요. 카드를 한 장 가져온 뒤에는 육성 정비 시간에 진화하고, 육성 마치기를 눌러 차례를 넘겨요.');
 const team=el('div',undefined,'manual-pokemon-row');[25,16,133].forEach(id=>{const n=el('figure');n.append(picture(id),el('figcaption',G.data[id].name));team.append(n);});a.append(team);
 const b=section('02 / SHARED MARKET','아래 카드를 가져오면, 위 카드가 열려요.','시장에는 3장·4장·5장, 총 12장이 놓여요. 맨 아래 5장은 처음부터 선택 가능해요. 어떤 카드 바로 아래의 두 카드가 모두 없어져야 그 카드를 가져올 수 있어요. 맨 위 카드는 열릴 때 그림이 공개돼요. 각자 4장씩, 총 8장을 고르면 남은 시장을 버리고 배틀로 가요.');
 const pyramid=el('div',undefined,'manual-pyramid');[[{kind:'hidden'}],[{kind:'evolution',species:26},{kind:'move',move:'quick'}],[{kind:'training',xp:2},{kind:'pokemon',species:129},{kind:'training',xp:2}]].forEach((row,i)=>{const n=el('div');row.forEach(c=>n.append(draftCard(c)));pyramid.append(n);});b.append(pyramid,el('p','그림은 축소 예시예요. 상대의 진화 카드를 먼저 가져오거나, 덮인 카드를 일부러 열어주지 않는 선택도 가능해요.','callout'));
 const c=section('03 / GROWTH','진화 카드 + 경험치, 둘 다 필요해요.','훈련 카드는 골라 둔 포켓몬에게 경험치 2와 능력 보정 1회를 줘요. 보정은 최대 3회이며, 회당 최대 HP +3·공격 +1이에요. 모든 포켓몬은 배틀이 끝날 때 경험치 1을 얻어요. 경험치는 최대 6까지 보관해요.');
 const evolution=el('div',undefined,'manual-evolution');const from=el('figure');from.append(picture(25),el('figcaption','피카츄 · 경험치 2'));const to=el('figure');to.append(picture(26),el('figcaption','라이츄 · 경험치 소비'));evolution.append(from,el('div','경험치 2 + 라이츄 진화 카드\n→'),to);c.append(evolution,el('p','기본형 → 1단계는 경험치 2, 1단계 → 2단계는 경험치 3과 해당 진화 카드 1장이 필요해요. 진화 카드는 가져와 보관할 수 있고, 경험치가 모이면 내 육성 정비 시간에 사용해요. 진화해도 훈련 보정과 기술 순서는 유지돼요.'));
 const kinds=section('04 / FOUR CARD TYPES','어떤 카드를 가져올까요?','같은 카드 한 장도 어느 팀원에게 쓰는지에 따라 다른 전략이 돼요. 육성 정비에서는 내 포켓몬을 눌러 진화 대상을 바꿀 수 있어요.');
 const grid=el('div',undefined,'manual-cards');[{kind:'training',xp:2},{kind:'evolution',species:6},{kind:'move',move:'combo'},{kind:'pokemon',species:10}].forEach(c=>grid.append(draftCard(c)));kinds.append(grid,el('p','영입 카드는 기존 팀원 한 마리와 바꿔요. 바꾼 자리의 경험치·훈련·진화는 사라지고, 그 자리의 기술은 기본 공격 한 장으로 바뀌어요. 새 포켓몬도 약한 기본형부터 키워야 해요.','callout'));
 const t=section('05 / PROGRAM YOUR MOVES','기술 순서는 섞지 않고, 사이에 끼워 넣어요.','처음에는 파트너·구구·이브이의 기본 공격이 차례대로 있어요. 기술 카드를 가져오면 배울 포켓몬과 삽입 위치를 골라요. 이미 있는 카드끼리의 순서는 바꾸지 않아요. 기술 카드는 이 게임에서는 누구나 배울 수 있어요.');
 const timeline=el('div',undefined,'manual-timeline');['① 피카츄 기본 공격','② 피카츄 연계 공격 (새 카드)','③ 구구 기본 공격','④ 이브이 기본 공격'].forEach((text,i)=>timeline.append(el('div',text,i===1?'inserted':'')));t.append(timeline,el('p','연계 공격은 직전에도 같은 포켓몬이 공격했으면 추가 피해 +5예요. 위처럼 같은 포켓몬의 기술을 붙이면 콤보를 노릴 수 있어요. 기절한 포켓몬의 기술은 자동으로 건너뛰고, 살아 있는 포켓몬의 기술은 끝에서 처음으로 계속 돌아요.'));
 const battle=section('06 / AUTO TAG BATTLE','서로 기술을 공개하고, 빠른 쪽부터 공격해요.','매 기술 교환마다 각자의 다음 기술에 지정된 포켓몬이 앞으로 나와요. 포켓몬 속도와 기술의 속도 보정을 합쳐 빠른 쪽이 먼저 공격해요. 속도가 같으면 먼저 공격할 우선권을 교대로 가져요. 먼저 맞고 기절하면 그 기술 교환에서는 반격하지 못해요.');
 const duel=el('div',undefined,'manual-evolution');const f1=el('figure');f1.append(picture(4),el('figcaption','파이리 공격 10'));const f2=el('figure');f2.append(picture(1),el('figcaption','이상해씨 HP 54 → 32'));duel.append(f1,el('div','강타 +8 / 상성 +4\n10 + 8 + 4 = 피해 22'),f2);battle.append(duel,el('p','피해 계산 한 번만 떼어 본 예시예요. 실제 전투에서는 방어막부터 피해를 흡수하고, 풀 타입은 공격 뒤 HP 2를 회복해요. 상성 보너스는 +4이며 불→풀·벌레, 물→불·바위, 풀→물·바위, 전기→물·비행, 격투→노말·바위, 고스트→에스퍼에 적용해요. 나머지 조합에는 추가 보너스가 없어요.'));
 const intervene=section('07 / YOUR ONE CHANCE','배틀마다 개입은 딱 한 번이에요.','교체·방어·필살기 중 하나만 쓸 수 있어요. 초반에 방어해 피해를 줄일지, 강한 공격 순간에 필살기를 쓸지, 선택한 순간이 중요해요.');
 const commands=el('div',undefined,'manual-commands');[['⇄','교체','살아 있는 다른 팀원으로 교체해 다음 내 공격을 그 포켓몬의 전광석화로 대신해요. 예정 기술은 지나가요.'],['⬡','방어','팀 방어막 18을 얻어요. 이후 들어오는 피해를 18만큼 누적해서 막고, 남은 양은 다음 공격에도 유지돼요.'],['★','필살기','다음에 성공하는 내 공격에 피해 +14를 더해요. 사용 직전에 포켓몬이 기절해 공격하지 못하면 다음 공격까지 기다려요.']].forEach(([icon,title,text])=>{const n=el('article');n.append(el('b',icon),el('h4',title),el('p',text));commands.append(n);});intervene.append(commands);
 const win=section('08 / WIN & PLAY AGAIN','세 마리 전부 기절시키면 배틀 1승!','상대 팀을 모두 기절시키면 승점 1점을 받아요. 먼저 3점을 얻으면 대전이 끝나요. 배틀이 45교환까지 이어지면 남은 HP 합계가 높은 팀이 이기고, 같으면 그 배틀의 첫 선공 우선권을 가진 쪽이 이겨요.');
 win.append(el('p','승부 뒤에는 양쪽이 다음 육성으로를 눌러 새 시장으로 넘어가요. 직전 패자가 먼저 고르고, 다음 배틀 시작 때 모든 포켓몬의 HP와 보호막·기술 순서를 새로 시작해요. 포켓몬의 진화·경험치·훈련·배운 기술은 그대로 이어져요. 배틀 개입도 다시 한 번 쓸 수 있어요.','callout'));
 const online=section('09 / FRIEND DUEL','친구와는 이렇게 시작하세요.','친구와 1대1 → 이름과 파트너 선택 → 방 만들기 → 초대 링크 또는 방 코드 복사. 친구가 같은 화면에서 코드로 입장하면 방장이 시작해요. 상대가 카드 선택·육성 정비 중이면 기다리고, 배틀은 자동으로 함께 진행돼요.');
 online.append(el('p','카드 시장의 맨 위 미공개 정보는 서버가 공개되기 전까지 보내지 않아요. 새로고침해도 같은 브라우저에서는 방에 다시 연결해요. 진행 중 방을 나가면 상대의 승리로 끝나고, 서버가 재시작되거나 방이 만료되면 새 방을 만들어야 해요.'));
 d.append(button('이해했어요 · 닫기',closeDialog,'primary'));show(d);
}
function dex(){
 const d=dialog('포켓몬·기술 도감');d.classList.add('dex-dialog');const heading=el('p','포켓몬 능력치는 이 시제품용 수치예요. 기술 카드는 모든 포켓몬이 배울 수 있어요.');d.append(heading);
 const moveGrid=el('div',undefined,'manual-cards');Object.values(G.moves).forEach(m=>moveGrid.append(draftCard({kind:'move',move:m.id})));d.append(el('h3','기술 카드'),moveGrid,el('h3','등장 포켓몬과 진화'));
 const roots=[...G.starters,16,133,10,13,43,54,58,39,52,56,81,92,129,147],ids=new Set();function include(id){if(ids.has(id))return;ids.add(id);G.data[id].next.forEach(include);}roots.forEach(include);
 const grid=el('div',undefined,'dex-grid');[...ids].sort((a,b)=>a-b).forEach(id=>{const u={species:id,training:0},s=G.stats(u),n=el('article');n.append(picture(id),el('strong',G.data[id].name),el('span',G.types[G.data[id].type].name+' · '+(G.stage(id)?G.stage(id)+'단계':'기본')),el('small','HP '+s.hp+' · 공격 '+s.attack+' · 속도 '+s.speed));grid.append(n);});d.append(grid);show(d);
}
$('soloMode').onclick=()=>setMode('solo');$('onlineMode').onclick=()=>setMode('online');$('soloStart').onclick=startSolo;
$('createRoom').onclick=()=>enter('create');$('joinRoom').onclick=()=>enter('join');$('startRoom').onclick=()=>roomAction('start');$('leaveLobby').onclick=leaveRoom;$('leaveGame').onclick=askNew;$('newGame').onclick=askNew;
$('finishPrepare').onclick=()=>send({type:'finishPrepare'});$('closeCoach').onclick=()=>{selected=null;$('draftCoach').dataset.open='false';};$('switchCommand').onclick=chooseSwitch;$('guardCommand').onclick=()=>send({type:'command',kind:'guard',battleId:game.battle.id});$('ultimateCommand').onclick=()=>send({type:'command',kind:'ultimate',battleId:game.battle.id});
$('rulesButton').onclick=manual;$('dexButton').onclick=dex;
$('resume').onclick=()=>{stopLocal();mode='solo';viewer=0;game=saved;selected=null;targetSlot=0;render();settleSolo();};
setInterval(()=>{if(!game||game.phase!=='battle')return;const remaining=Math.max(0,(nextBeatAt-Date.now()-(mode==='online'?clockOffset:0))/1000);$('countdown').textContent=remaining?'다음 교환까지 '+remaining.toFixed(1)+'초':'공격 진행 중';},100);
drawPartners();$('trainerName').value=localStorage.getItem('kanto-trainer-name')||'';
try{saved=JSON.parse(localStorage.getItem(SAVE));if(saved){G.assert(saved);$('resume').hidden=false;}}catch{saved=null;}
const query=new URLSearchParams(location.search);if(query.get('room')){setMode('online');$('roomInput').value=query.get('room').slice(0,6);}
if(net.token){setMode('online');api('state').then(s=>{mode='online';accept(s);enableTools();connect();}).catch(()=>resetOnline());}
if(query.has('rules'))manual();
