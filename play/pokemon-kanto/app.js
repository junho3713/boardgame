'use strict';
const G=KantoDuel,$=id=>document.getElementById(id),ART='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/',API='https://jjinmak-boardgame.onrender.com/kanto/api/',SAVE='jjinmak-kanto-mind-v3',TOKEN='kanto-mind-token-v3';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
let full=null,game=null,viewer=0,mode='solo',lead=6,selected=null,busy=false,saved=null,modal=null,toastTimer,toolsPromise=null,linkTimer;
const net={token:sessionStorage.getItem(TOKEN)||'',state:null,controller:null};
const current=(i)=>G.active(game,i),mine=()=>current(viewer),opponent=()=>current(1-viewer);
function picture(id){const img=el('img');img.src=ART+id+'.png';img.alt=G.data[id].name;img.decoding='async';img.onerror=()=>{if(!img.dataset.fallback){img.dataset.fallback='1';img.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png';}else img.hidden=true;};return img;}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function closeDialog(){if(modal){modal.close();modal.remove();modal=null;}}
function dialog(title){closeDialog();const d=el('dialog',undefined,'dialog'),h=el('div',undefined,'dialog-head'),heading=el('h2',title);heading.id='dialogTitle';d.setAttribute('aria-labelledby','dialogTitle');h.append(heading,button('닫기 ✕',closeDialog));d.append(h);d.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});document.body.append(d);modal=d;return d;}
function setMode(value){mode=value;$('soloMode').setAttribute('aria-pressed',String(value==='solo'));$('onlineMode').setAttribute('aria-pressed',String(value==='online'));$('soloSetup').hidden=value!=='solo';$('onlineSetup').hidden=value!=='online';}
function drawLeads(){$('partners').replaceChildren(...G.starters.map(id=>{const c=G.data[id],b=button('',()=>{lead=id;drawLeads();},'partner'+(lead===id?' selected':'')),text=el('div');b.setAttribute('aria-pressed',String(lead===id));text.append(el('strong',c.name),el('small',G.types[c.type].name+' · HP 100'),el('small','에너지 3 / 4'));b.append(picture(id),text);return b;}));}
function persist(){if(full)try{localStorage.setItem(SAVE,JSON.stringify(full));}catch{}}
function settle(){
 if(mode!=='solo'||!full)return;
 if(full.phase==='reveal'&&!full.ready[1])G.act(full,1,{type:'ready'});
 if(full.phase==='replace'&&G.active(full,1).hp===0&&full.replacements[1]===null)G.act(full,1,{type:'replace',to:G.replacement(full,1)});
 if(full.phase==='choose'&&!full.pending[1])G.act(full,1,{type:'commit',action:G.ai(full,1)});
 G.assert(full);game=G.view(full,0);persist();render();
}
function startSolo(){closeDialog();mode='solo';viewer=0;net.state=null;window.RoomTools?.hide();full=G.newGame([lead,G.starters[Math.floor(Math.random()*3)]],crypto.getRandomValues(new Uint32Array(1))[0]);selected=null;settle();$('game').scrollIntoView({block:'start',behavior:'smooth'});}
async function api(route,body){
 const r=await fetch(API+route,{method:body===undefined?'GET':'POST',headers:{...(net.token?{Authorization:'Bearer '+net.token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 let d;try{d=await r.json();}catch{throw Error('서버를 깨우고 있어요. 잠시 뒤 다시 시도해 주세요.');}
 if(!r.ok){if(d.state)accept(d.state);const e=Error(d.error||'연결을 확인해 주세요.');e.status=r.status;throw e;}return d;
}
async function enableTools(){
 if(toolsPromise)return toolsPromise;
 toolsPromise=(async()=>{const origin=new URL(API).origin,link=el('link');link.rel='stylesheet';link.href=origin+'/room-tools.css';document.head.append(link);
 await new Promise((resolve,reject)=>{const script=el('script');script.src=origin+'/room-tools.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
 RoomTools.init({transport:body=>api('chat',body),invitePath:location.pathname+'?room=',copyTargets:'[data-no-room-copy]',fallbackTargets:['#lobbyCopy','#gameCopy']});
 if(net.state)RoomTools.update(net.state);
 })().catch(()=>{toast('채팅 도구를 불러오지 못했어요. 게임은 계속할 수 있어요.');toolsPromise=null;});return toolsPromise;
}
function accept(s){
 if(net.state&&net.state.code===s.code&&s.version<=net.state.version)return;
 if(!game||game.turn!==s.game?.turn||game.phase!==s.game?.phase||net.state?.gameNumber!==s.gameNumber)selected=null;
 net.state=s;viewer=s.meIndex;game=s.game;mode='online';full=null;
 window.RoomTools?.update(s);$('intro').hidden=true;$('lobby').hidden=!!game;$('game').hidden=!game;
 if(!game){
  $('lobbyCode').textContent=s.code;
  $('lobbyPlayers').replaceChildren(...s.players.map(p=>{const n=el('article');if(p.partner)n.append(picture(p.partner));else n.append(el('div','?','damage'));n.append(el('strong',p.name+(p.id===s.me?' (나)':'')),el('span',p.partner?G.data[p.partner].name+' 선발':'상대 선발은 시작할 때 공개'));return n;}));
  $('startRoom').hidden=s.host!==s.me;$('startRoom').disabled=s.players.length!==2||busy;$('lobbyHint').textContent=s.players.length===2?'준비 완료! 방장이 시작하면 서로의 선발이 공개돼요.':'초대 링크나 방 코드를 친구에게 보내 주세요.';return;
 }render();
}
async function connect(){
 net.controller?.abort();clearTimeout(linkTimer);const controller=new AbortController();net.controller=controller;
 try{
  const r=await fetch(API+'events',{headers:{Authorization:'Bearer '+net.token},signal:controller.signal});if(!r.ok)throw Error('연결을 다시 시도하고 있어요.');
  const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='';
  while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let end;
   while((end=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,end);buffer=buffer.slice(end+2);const line=event.split('\n').find(x=>x.startsWith('data: '));if(line)accept(JSON.parse(line.slice(6)));}}
 }catch(e){if(controller.signal.aborted)return;}
 if(!controller.signal.aborted&&net.token)linkTimer=setTimeout(async()=>{try{accept(await api('state'));connect();}catch(e){if(e.status===401)resetOnline();else connect();}},2200);
}
async function enter(route){
 if(busy)return;busy=true;$('createRoom').disabled=true;$('joinRoom').disabled=true;
 try{const name=$('trainerName').value.trim()||'트레이너';localStorage.setItem('kanto-trainer-name',name);const d=await api(route,{name,partner:lead,code:$('roomInput').value.trim()});net.token=d.token;sessionStorage.setItem(TOKEN,d.token);net.state=null;accept(d.state);enableTools();connect();}
 catch(e){toast(e.message);}finally{busy=false;$('createRoom').disabled=false;$('joinRoom').disabled=false;}
}
async function roomAction(route,body={}){
 if(busy)return;busy=true;render();
 try{accept(await api(route,{...body,version:net.state.version,turn:game?.turn,match:net.state.gameNumber}));}
 catch(e){toast(e.message);}finally{busy=false;if(game)render();else if(net.state){const s=net.state;net.state=null;accept(s);}}
}
function resetOnline(){net.controller?.abort();clearTimeout(linkTimer);net.token='';net.state=null;sessionStorage.removeItem(TOKEN);window.RoomTools?.hide();full=null;game=null;selected=null;viewer=0;$('intro').hidden=false;$('lobby').hidden=true;$('game').hidden=true;}
async function leaveRoom(){if(busy)return;busy=true;try{if(net.token)await api('leave',{});}catch(e){toast(e.message);}finally{busy=false;resetOnline();}}
function askLeave(){
 const d=dialog(mode==='online'?'방을 나갈까요?':'연습을 그만둘까요?');d.append(el('p',mode==='online'?'진행 중 나가면 상대의 승리로 끝나요.':'연습은 이 브라우저에 저장되어 이어할 수 있어요.'),button('계속하기',closeDialog),button('나가기',()=>{closeDialog();if(mode==='online')leaveRoom();else{full=null;game=null;$('intro').hidden=false;$('game').hidden=true;try{saved=JSON.parse(localStorage.getItem(SAVE));$('resume').hidden=!saved;}catch{}}},'primary'));d.showModal();
}
function send(body){
 selected=null;
 if(mode==='online')return roomAction('action',body);
 try{G.act(full,viewer,body);settle();}catch(e){toast(e.message);}
}
const moveText=m=>m.kind==='pursuit'?'상대가 교체하면 피해 +18. 교체하지 않으면 기본 피해만 줘요.':m.kind==='burst'?'큰 피해를 주지만 다음 턴 이 포켓몬이 받는 피해 +8.':'상대가 방어하면 피해 +22, 방어 감소 무시. 방어하지 않으면 피해가 낮아요.';
function moveCard(u,m,move,click){
 const n=click?button('',click,'move-card'):el('article',undefined,'move-card'),top=el('div',undefined,'move-top');
 top.append(el('strong',m.name),el('span','에너지 '+m.cost,'cost'));n.append(top,el('p','기본 피해 '+m.power+' · '+moveText(m)));
 if(click){n.disabled=busy||u.energy<m.cost;if(selected?.kind==='move'&&selected.move===move)n.classList.add('selected');n.setAttribute('aria-pressed',String(selected?.kind==='move'&&selected.move===move));}return n;
}
function fighter(i){
 const u=current(i),c=G.data[u.species],n=el('div',undefined,'fighter'),text=el('div');text.style.setProperty('--type',G.types[c.type].color);text.append(el('span',G.types[c.type].name+' · 배틀 포켓몬','type-name'),el('h3',c.name),el('div','HP '+u.hp+' / 100','hp-label'));
 const bar=el('div',undefined,'bar'+(u.hp<=30?' low':'')),fill=el('span');fill.style.width=u.hp+'%';bar.append(fill);text.append(bar);
 const energy=el('div','◆ '.repeat(u.energy)+'◇ '.repeat(4-u.energy),'energy');energy.append(el('small','에너지 '+u.energy+' / 4'));text.append(energy);
 if(u.exposed)text.append(el('div','빈틈! 이번 턴 받는 피해 +8','warn'));
 text.append(el('div','다음 방어: 피해 '+Math.round(G.guardRate(u)*100)+'% 감소','small muted'));n.append(picture(u.species),text);return n;
}
function bench(i){
 const p=game.players[i];return p.team.flatMap((u,to)=>{
  if(to===p.active)return[];const n=el('div',undefined,'bench-card'+(u.hp===0?' fainted':'')),text=el('div');text.append(el('strong',G.data[u.species].name),el('small',u.hp?'HP '+u.hp+' · 에너지 '+u.energy:'기절'));n.append(picture(u.species),text);
  if(i===viewer&&u.hp>0){
   if(game.phase==='choose'&&!game.locked[viewer]){
    const b=button('교체 · 에너지 1',()=>{selected={kind:'switch',to};render();});b.disabled=u.energy<1||busy;b.setAttribute('aria-pressed',String(selected?.kind==='switch'&&selected.to===to));text.append(b);
   }else if(game.phase==='replace'&&mine().hp===0&&!game.replacementLocked[viewer]){
    const b=button('출전 · 비용 없음',()=>send({type:'replace',to}));b.disabled=busy;text.append(b);
   }
  }return[n];
 });
}
function render(){
 if(!game)return;
 $('intro').hidden=true;$('lobby').hidden=true;$('game').hidden=false;
 const online=mode==='online',p=game.players[viewer],opp=game.players[1-viewer],phase=game.phase,locked=game.locked[viewer];
 $('modeLabel').textContent=online?'FRIEND DUEL / 3 VS 3':'PRACTICE / AI는 내 현재 선택을 보지 않아요';
 $('turnTitle').textContent='턴 '+game.turn+' / 30';$('gameCode').textContent=online?'방 '+net.state.code:'';$('gameCopy').hidden=!online;
 $('myName').textContent=p.name+(online?' (나)':'');$('opponentName').textContent=opp.name;
 $('myLock').textContent=phase==='choose'?(locked?'확정 완료':'선택 중'):phase==='replace'?(mine().hp>0||game.replacementLocked[viewer]?'준비 완료':'출전 선택'):phase==='finished'?'종료':'공개';
 $('opponentLock').textContent=phase==='choose'?(game.locked[1-viewer]?'상대 확정 완료':'상대 선택 중'):phase==='replace'?(opponent().hp>0||game.replacementLocked[1-viewer]?'상대 준비 완료':'상대 출전 선택 중'):phase==='finished'?'종료':'공개';
 $('myActive').replaceChildren(fighter(viewer));$('opponentActive').replaceChildren(fighter(1-viewer));$('myBench').replaceChildren(...bench(viewer));$('opponentBench').replaceChildren(...bench(1-viewer));
 $('opponentMoves').replaceChildren(...G.data[opponent().species].moves.map((m,j)=>moveCard(opponent(),m,j)));
 const panel=$('actionPanel');panel.replaceChildren();$('revealPanel').hidden=phase!=='reveal';$('finishPanel').hidden=phase!=='finished';
 if(phase==='choose'){
  $('phaseTitle').textContent=locked?'내 행동은 확정됐어요.':'상대의 다음 행동을 예측하세요.';
  $('phaseHint').textContent=locked?'상대도 확정하면 두 행동이 함께 공개돼요. 확정 후에는 바꿀 수 없어요.':'기술 목록·체력·에너지는 공개, 이번 턴의 선택은 비공개예요.';
  if(locked)panel.append(el('p','내 비밀 선택: '+G.label(game,viewer,game.pending[viewer])+'. 상대에게는 아직 보이지 않아요.','locked-note'));
  else{
   const list=el('div',undefined,'move-list');G.data[mine().species].moves.forEach((m,j)=>list.append(moveCard(mine(),m,j,()=>{selected={kind:'move',move:j};render();})));panel.append(list);
   const common=el('div',undefined,'common-actions');
   [['guard','방어 · 비용 0','이번에는 피해 '+Math.round(G.guardRate(mine())*100)+'% 감소 · 관통기에 취약'],['focus','집중 · 비용 0','공격 없이 에너지 추가 +2 · 공격에 무방비']].forEach(([kind,title,hint])=>{const b=button(title,()=>{selected={kind};render();});b.append(el('small',hint));b.classList.toggle('selected',selected?.kind===kind);b.setAttribute('aria-pressed',String(selected?.kind===kind));b.disabled=busy;common.append(b);});panel.append(common);
   const confirm=el('div',undefined,'confirm');confirm.append(el('p',selected?'내 선택: '+G.label(game,viewer,selected):'위 기술·방어·집중 또는 벤치 교체를 고르세요.'));
   const b=button('행동 확정 · 비밀리에 제출',()=>send({type:'commit',action:selected}),'primary');b.disabled=!selected||busy;confirm.append(b);panel.append(confirm);
  }
 }else if(phase==='replace'){
  $('phaseTitle').textContent='기절한 포켓몬 대신 출전할 팀원을 골라 주세요.';
  $('phaseHint').textContent='벤치의 출전 버튼을 누르세요. 강제 교체에는 에너지와 행동이 들지 않아요. 양쪽 모두 준비되면 다음 턴을 시작해요.';
  panel.append(el('p',mine().hp>0||game.replacementLocked[viewer]?'상대의 출전 선택을 기다리고 있어요.':'위 벤치에서 살아 있는 포켓몬을 선택하세요.','locked-note'));
 }else if(phase==='reveal'){
  $('phaseTitle').textContent='동시 공개! 예측이 맞았나요?';$('phaseHint').textContent='두 공격은 동시에 적용돼요. 기절한 쪽도 이미 선택한 공격은 실행해요.';drawResult($('revealPanel'),true);
 }else{
  $('phaseTitle').textContent=game.result.winner===null?'무승부':game.result.winner===viewer?'승리! 상대의 수를 읽었어요.':'대전 종료 · 다음에는 다른 수를!';
  $('phaseHint').textContent=game.result.reason+(game.result.forfeit?'':' · 남은 포켓몬 수, 남은 HP 순서로 승부를 가려요.');
  const f=$('finishPanel');f.replaceChildren(el('h2',game.result.winner===null?'양쪽이 비겼어요.':game.players[game.result.winner].name+' 승리'));
  if(game.last)drawResult(f,false);
  if(!online)f.append(button('같은 선발로 다시 시작',startSolo,'primary'));
  else if(net.state.host===net.state.me&&!net.state.players.some(p=>p.left)){const b=button('이 방에서 다시 시작',()=>roomAction('rematch'),'primary');b.disabled=busy;f.append(b);}else f.append(el('p',net.state.players.some(p=>p.left)?'상대가 나갔어요. 새 방에서 다시 만날 수 있어요.':'방장이 같은 방에서 다시 시작할 수 있어요.'));
 }
 $('history').replaceChildren(...game.history.slice().reverse().map(h=>el('p','턴 '+h.turn+' · '+p.name+': '+h.names[viewer]+' / '+opp.name+': '+h.names[1-viewer]+' · 준 피해 '+(h.hits[viewer]?.damage||0)+' / 받은 피해 '+(h.hits[1-viewer]?.damage||0))));
}
function drawResult(target,controls){
 if(controls)target.replaceChildren(el('p','TURN '+game.last.turn+' / ACTION REVEAL','eyebrow'),el('h2','선택의 결과'));
 const grid=el('div',undefined,'result-grid');
 [viewer,1-viewer].forEach(i=>{const h=game.last.hits[i],n=el('article',undefined,'result-card');n.append(el('p',game.players[i].name,'eyebrow'),el('h3',game.last.names[i]));
 if(h){const damage=el('div',String(h.damage),'damage');damage.append(el('small',' 피해'));n.append(damage,el('p','→ '+G.data[h.target].name));
 const parts=['기본 '+h.base];if(h.counter)parts.push('예측 +'+h.counter);if(h.type)parts.push('상성 '+(h.type>0?'+':'')+h.type);if(h.exposed)parts.push('빈틈 +'+h.exposed);if(h.blocked)parts.push('방어 -'+h.blocked);n.append(el('div',parts.join(' / '),'breakdown'));}
 else n.append(el('p','공격하지 않았어요.','muted'));
 game.last.notes[i].forEach(text=>n.append(el('p',text,text.includes('성공')?'success':text.includes('빗나감')?'miss':'')));grid.append(n);});target.append(grid);
 if(controls){const b=button(game.ready[viewer]?'상대의 결과 확인을 기다리는 중':'결과 확인 · 다음 턴 →',()=>send({type:'ready'}),'primary');b.disabled=game.ready[viewer]||busy;target.append(b);}
}
function manual(){
 const d=dialog('처음 하는 사람을 위한 그림 설명서');
 function section(n,title,text){const s=el('section',undefined,'manual-section');s.append(el('p',n,'eyebrow'),el('h3',title),el('p',text));d.append(s);return s;}
 function figures(s,ids,captions,middle){const row=el('div',undefined,'manual-figures');ids.forEach((id,j)=>{if(j&&middle)row.append(el('b',middle));const f=el('figure');f.append(picture(id),el('figcaption',captions[j]));row.append(f);});s.append(row);}
 const first=section('01 / GOAL','상대 세 마리를 모두 기절시키세요.','양쪽은 리자몽·거북왕·이상해꽃을 한 마리씩 가져요. 전원 HP 100, 에너지 3으로 시작하고, 에너지는 최대 4예요. 한 마리만 배틀에 나오고 나머지는 벤치에서 대기해요. 선발만 직접 고르세요.');
 figures(first,[6,9,3],['리자몽 · 불꽃','거북왕 · 물','이상해꽃 · 풀']);
 first.append(el('p','이 버전은 전투 실험판이에요. 카드 수집·드래프트·진화는 아직 포함하지 않았어요. 실제 포켓몬 게임의 능력치·타입 표와 다른 전용 규칙을 사용해요.','callout'));
 const turn=section('02 / ONE TURN','각자 하나를 고르고, 함께 공개해요.','① 양쪽 체력·에너지·기술과 지난 행동을 확인해요. ② 기술·방어·집중·교체 중 하나를 선택해요. ③ 행동 확정을 눌러요. 먼저 확정한 행동도 상대에게는 보이지 않아요. ④ 둘 다 확정하면 행동을 동시에 공개하고 결과를 계산해요.');
 turn.append(el('p','확정 전에는 비용도 차감하지 않으므로 상대의 에너지 변화로 행동을 알아낼 수 없어요. 확정 후 변경은 불가능해요. 결과 확인을 둘 다 눌러야 다음 턴으로 넘어가요. 선택에는 시간제한이 없어요.'));
 const moves=section('03 / THREE ATTACKS','강한 공격에도 약점이 있어요.','모든 포켓몬은 공개된 고유 기술 3개를 가져요. 숫자가 큰 기술만 고르면 에너지가 부족해지고, 상대의 방어나 상성 교체에 당할 수 있어요.');
 const cards=el('div',undefined,'manual-cards');[['견제 · 에너지 1','기본 피해 16~18. 상대가 교체하면 새로 나온 포켓몬에게 추가 피해 +18. 교체하지 않으면 기본 피해만 줘요.'],['강공격 · 에너지 3','기본 피해 34~36. 다음 턴 이 포켓몬이 맞으면 추가 피해 +8. 방어에 막히거나 상성 교체에 약해요.'],['페인트 · 에너지 2','기본 피해 10. 상대가 방어하면 +22, 방어의 피해 감소도 무시해요. 공격이나 교체를 예상하지 못했다면 큰 손해예요.']].forEach(([title,text])=>{const n=el('article');n.append(el('h4',title),el('p',text));cards.append(n);});moves.append(cards,el('p','정확한 기본 피해와 비용은 내 기술 버튼과 상대의 공개 기술 목록에서 항상 확인할 수 있어요. 방어·집중·교체는 기술 3개와 별도로 고를 수 있어요.'));
 const read=section('04 / READ & COUNTER','방어를 읽으면 추가 피해 +22.','리자몽 HP 40 · 에너지 3, 거북왕 HP 65 · 에너지 2인 상황이에요. 리자몽이 방어할 것 같다면 거북왕은 물결 페인트를 고를 수 있어요. 하지만 리자몽이 화염방사를 쓴다면 어떨까요?');
 figures(read,[6,9],['리자몽 · HP 40 / 에너지 3','거북왕 · HP 65 / 에너지 2'],'VS');
 const table=el('table',undefined,'manual-table');[['리자몽 선택','거북왕 선택','결과'],['방어','물결 페인트','관통 10 + 예측 22 + 물 상성 8 = 40 피해. 리자몽 기절!'],['화염방사','물결 페인트','거북왕은 36 − 상성 저항 6 = 30 피해를 받아 HP 35. 리자몽은 10 + 상성 8 = 18 피해로 HP 22.'],['방어','하이드로펌프','34 + 상성 8 = 42의 75%를 올림해 32 차단. 실제 피해 10. 이 기술은 에너지 3이 필요해 지금은 쓸 수 없어요.']].forEach((row,j)=>{const tr=el('tr');row.forEach(text=>tr.append(el(j?'td':'th',text)));table.append(tr);});read.append(table,el('p','위 예시는 현재 빈틈이 없고 첫 방어인 상황이에요. 마지막 줄은 거북왕 에너지가 3 이상일 때의 비교예요. 공격은 동시에 들어가므로 먼저 기절해도 이미 고른 공격을 실행해요.','callout'));
 const guard=section('05 / DEFEND, SWITCH, FOCUS','방어를 반복하면 약해져요.','방어는 비용 0. 처음에는 피해 75%를 막지만 연속 2회째는 40%, 3회째부터는 0%예요. 차단량은 올림해요. 방어 이외의 행동을 한 번 쓰면 다시 75%가 돼요. 관통기는 이 감소율을 무시해요.');
 guard.append(el('p','교체는 새로 나오는 포켓몬의 에너지 1을 쓰고 그 턴 공격하지 않아요. 공격은 새로 나온 포켓몬이 받아요. 유리한 상성으로 강공격을 받아내면 이득이지만, 상대가 견제를 쓰면 추격 +18을 맞아요. 벤치에서 교체 버튼을 누른 뒤 행동을 확정하세요.'),el('p','집중은 공격 없이 현재 포켓몬 에너지 +2. 모든 턴 종료 때 살아 있는 포켓몬은 벤치를 포함해 에너지 +1을 받아요. 따라서 집중한 포켓몬은 총 +3, 최대 4까지 회복해요. 상대의 공격은 그대로 받아요.'));
 const types=section('06 / TYPE & OPENING','유리한 상성은 +8, 불리하면 −6.','불꽃은 풀에 강하고, 풀은 물에 강하고, 물은 불꽃에 강해요. 반대 방향으로 공격하면 피해 −6, 같은 타입이면 보정이 없어요. 한 번의 상성으로 승패가 결정되지 않도록 작은 보정만 사용해요.');
 figures(types,[6,3,9],['불꽃 → 풀 +8','풀 → 물 +8','물 → 불꽃 +8'],'→');
 types.append(el('p','강공격 뒤 생긴 빈틈은 다음 한 턴만 유지돼요. 그 포켓몬이 공격받으면 피해 +8. 벤치로 물러나면 대신 나온 포켓몬에게 빈틈이 옮겨가지 않아요. 견제 기술로 교체를 읽으면 이 도망도 견제할 수 있어요.'));
 const end=section('07 / KO & WIN','기절하면 남은 팀원이 이어받아요.','결과 확인 후, 배틀 포켓몬이 기절한 쪽은 벤치의 출전 버튼을 눌러요. 이 강제 교체는 비용도 행동 소모도 없어요. 양쪽이 교체해야 하면 각자 선택을 숨겼다가 함께 공개해요. 기절한 포켓몬은 돌아오지 못해요.');
 end.append(el('p','상대 세 마리를 모두 기절시키면 승리예요. 동시에 전원 기절하면 무승부예요. 최대 30턴까지 진행하고, 남은 포켓몬 수 → 남은 HP 합계 순서로 비교해요. 둘 다 같으면 무승부. 전투 중에는 체력이 자동 회복되지 않아요.'));
 const friend=section('08 / PLAY & TEST','친구와 예측해 보고, 연습 AI와 비교해 보세요.','친구와 1대1 → 이름·선발 선택 → 방 만들기 → 초대 링크 또는 방 코드 복사. 친구가 입장하면 방장이 시작해요. 채팅으로 이야기할 수 있고, 끝나면 같은 방에서 다시 시작할 수 있어요. 진행 중 나가면 상대가 승리해요.');
 friend.append(el('p','연습 AI는 내 현재 선택을 읽지 않고 먼저 확정해요. 공개 체력·에너지·타입과 지난 행동을 참고하고, 일부는 무작위로 골라요. 재미와 균형은 아직 검증 중이에요. 방어 예측이 보상받는지, 교체와 강공격에 실제 고민이 생기는지 확인하려는 버전이에요.'),el('p','연습은 이 브라우저에 저장돼요. 친구 대전은 같은 탭 새로고침 시 다시 연결하지만, 서버 재시작이나 2시간 동안 요청이 없는 방은 만료될 수 있어요. 다른 기기에는 입장 정보가 이어지지 않아요.','callout'));
 d.append(button('이해했어요 · 배틀로 돌아가기',closeDialog,'primary'));d.showModal();
}
$('soloMode').onclick=()=>setMode('solo');$('onlineMode').onclick=()=>setMode('online');$('soloStart').onclick=startSolo;
$('createRoom').onclick=()=>enter('create');$('joinRoom').onclick=()=>enter('join');$('startRoom').onclick=()=>roomAction('start');$('leaveLobby').onclick=leaveRoom;$('leaveGame').onclick=askLeave;$('rulesButton').onclick=manual;
$('resume').onclick=()=>{mode='solo';viewer=0;full=saved;selected=null;settle();};
async function copyLink(){try{await navigator.clipboard.writeText(location.origin+location.pathname+'?room='+net.state.code);toast('초대 링크를 복사했어요.');}catch{toast('방 코드: '+net.state.code);}}
$('lobbyCopy').onclick=copyLink;$('gameCopy').onclick=copyLink;
drawLeads();$('trainerName').value=localStorage.getItem('kanto-trainer-name')||'';
try{saved=JSON.parse(localStorage.getItem(SAVE));if(saved){G.assert(saved);$('resume').hidden=false;}}catch{saved=null;}
const query=new URLSearchParams(location.search);if(query.get('room')){setMode('online');$('roomInput').value=query.get('room').slice(0,6);}
if(net.token){setMode('online');api('state').then(s=>{accept(s);enableTools();connect();}).catch(e=>{if(e.status===401)resetOnline();else toast(e.message);});}
if(query.has('rules'))manual();

