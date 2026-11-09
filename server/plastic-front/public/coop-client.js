(function(root){'use strict';
const active=new URLSearchParams(location.search).get('coop')==='1';
const api={active};root.FrontCoopClient=api;if(!active)return;
const $=id=>document.getElementById(id),base='/plastic-front/api/coop';
let bridge,token='',state=null,connected=false,busy=false,queue=Promise.resolve(),lastInput=0,inputBusy=false,move=null,lastEvent=0,shownRound=-1,lastPhase='',lastApply=0,positions=new Map(),leaving=false;
try{token=sessionStorage.getItem('plastic-front-coop-token')||'';}catch{}
const style=document.createElement('link');style.rel='stylesheet';style.href='coop.css?v=20261105';document.head.append(style);
async function request(route,body){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(5000)});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'연결하지 못했습니다.'),{status:response.status});return data;}
function error(message){$('coopStatus').textContent=message;bridge?.events.toast(message);}
function command(action,data={}){
 const round=state?.round;
 queue=queue.catch(()=>{}).then(()=>request('/command',{action,round,...data})).then(data=>{apply(data);return data;}).catch(e=>{error(e.message);});return queue;
}
function modal(show){$('coopLobby').hidden=!show||!$('displayOverlay').hidden;}
function updateRoom(){
 if(!state)return;
 const mine=state.owner?'파랑':'초록';document.body.dataset.coopColor=state.owner?'blue':'green';
 $('coopIdentity').textContent=mine+' 대장';$('coopRoomCode').textContent=state.code;$('coopCode').textContent=state.code;
 $('coopMembers').replaceChildren(...state.players.map(p=>{const n=document.createElement('p');n.className=p.owner?'coop-blue':'coop-green';n.textContent=(p.owner?'● 파랑 · ':'● 초록 · ')+p.name+(p.connected?' · 연결됨':' · 재접속 대기');return n;}));
 $('coopEntry').hidden=true;$('coopWaiting').hidden=false;
 $('coopStart').hidden=state.started||!state.host;$('coopStart').disabled=state.players.length!==2||state.players.some(p=>!p.connected);
 $('coopResume').hidden=!state.started||!state.paused;$('coopResume').disabled=state.players.some(p=>!p.connected);
 $('coopLobbyTitle').textContent=!state.started?'두 대장이 모이면 출격합니다.':state.paused?'작전을 잠시 멈췄습니다.':'협동 작전';
 $('coopStatus').textContent=!connected?'서버에 다시 연결하는 중입니다…':state.paused?state.pauseReason:!state.started?state.host?'방 코드나 초대 링크를 친구에게 알려주세요.':'초록 대장이 출격하면 함께 시작합니다.':'2성 거실 · 일반 적 1.8배';
 $('coopConnection').textContent=connected?(state.paused?'일시정지':'연결됨'):'재연결 중';
 $('coopStrip').hidden=false;$('coopPause').disabled=!state.started;
 modal(!state.started||state.paused||!connected);
}
function bindGame(game){
 const call=(method,action,encode=(...args)=>({args}))=>{const original=Object.getPrototypeOf(game)[method]||game[method];game[method]=(...args)=>{
  if(!connected||state?.paused||!state?.started)return false;
  if(method==='stageChoice'){const ok=original.apply(game,args);if(!ok)return false;}
  if(action==='move')move={x:args[0],y:args[1]};else command(action,encode(...args));
  return true;
 };};
 if(game.coopClientBound)return;game.coopClientBound=true;
 game.levelCheck=()=>{};
 call('setMoveOrder','move');call('setFocus','focus',target=>({target:target.base?'enemy-base':target.id}));call('followCommander','follow',()=>({}));call('useUltimate','ultimate',()=>({}));
 call('stageChoice','stage',(type,queue)=>({type,queue}));call('confirmChoice','confirm',()=>({}));call('beginRecovery','recovery',()=>({}));call('useMedkit','medkit',()=>({}));call('useArtilleryTicket','artillery',(x,y)=>({x,y}));call('cancelRecovery','cancelRecovery',()=>({}));call('build','build',kind=>({kind}));call('resolveSupportToyOffer','supportToy',id=>({id}));
}
function apply(data){
 if(leaving||!bridge)return;connected=true;const previousRound=state?.round;state=data;
 if(data.game){
  const game=bridge.getGame(),camera={...game.camera},viewport=game.viewport;
  positions=new Map(game.units.map(u=>[u.id,{x:u.x,y:u.y}]));lastApply=performance.now();
  root.FrontCoopState.applySnapshot(game,data.game,root.FrontGameState.unpack);
  for(const own of game.coopStates)if(!(own.profile instanceof root.FrontProfile))own.profile=new root.FrontProfile(own.profile);
  game.coopSelectOwner(data.owner);game.coopScoped=true;game.camera=camera;game.viewport=viewport;
  game.phase=data.phase==='ended'?'ended':data.paused?'paused':data.choosing?'choice':data.phase;
  bindGame(game);bridge.apply(game);
  if(data.phase!=='ended'&&data.choosing&&shownRound!==data.round){shownRound=data.round;bridge.clearInput();bridge.events.level(game.currentOptions||[]);}
  if(!data.choosing){$('upgradeOverlay').hidden=true;$('supportOverlay').hidden=true;}
  if(data.phase==='ended'&&lastPhase!=='ended')bridge.events.end({result:game.result,reason:game.result==='win'?'finalBoss':'commander'});
  lastPhase=data.phase;
  $('coopShield').hidden=!(data.invulnerable>0);$('coopShield').textContent='내 분대 무적 '+data.invulnerable.toFixed(1)+'초';
  $('headerMode').textContent='2인 협동 · 2성 거실 · 개인 성장';$('greenLabel').textContent=(data.owner?'BLUE':'GREEN')+' / 내 분대 · 기회 '+Math.max(0,3-game.retreated)+'회';
  if(data.choosing)$('promotionDescription').textContent='내 강화·지원만 선택합니다. 전투는 계속 진행됩니다. '+(data.invulnerable>0?'내 분대 무적 '+data.invulnerable.toFixed(1)+'초 남음.':'5초 무적이 끝났습니다. 빠르게 선택하세요.');
  if(previousRound!==data.round)move=null;
 }
 for(const event of data.events||[]){if(event.id<=lastEvent)continue;lastEvent=event.id;if(['fire','explosion','toast'].includes(event.type))bridge.events[event.type]?.(event.data);}
 updateRoom();
}
async function poll(){
 if(leaving||!token||busy)return;busy=true;
 try{apply(await request('/state'));}catch(e){connected=false;if(e.status===401){token='';try{sessionStorage.removeItem('plastic-front-coop-token');}catch{}$('coopEntry').hidden=false;$('coopWaiting').hidden=true;modal(true);}else updateRoom();error(e.message);}
 finally{busy=false;}
}
function mount(){
 document.body.classList.add('coop-mode');
 document.querySelector('.choice-foot>b').textContent='전투 계속 · 내 분대만 5초 무적';
 const panel=document.createElement('div');panel.id='coopLobby';panel.className='overlay';panel.innerHTML=`<section class="modal coop-modal" role="dialog" aria-modal="true" aria-labelledby="coopLobbyTitle"><div class="eyebrow">TWO COMMANDERS / LIVING ROOM ★★</div><h2 id="coopLobbyTitle">초록과 파랑, 함께 진격.</h2><p>기존 2성 거실맵 · 일반 적 등장 수 1.8배<br>자원·경험치·강화·병력은 개인별로 성장합니다.</p><p class="coop-rule">강화를 골라도 전투는 계속됩니다.<br>레벨업 선택창이 열리면 내 분대만 5초 무적.</p><button type="button" id="coopPlanSettings">목표 편성 · 자동 충원 설정 ↗</button><div id="coopEntry"><label for="coopName">대장 이름</label><input id="coopName" maxlength="16" autocomplete="nickname" value="대장"><label for="coopMedicSkin">내 의무병 스킨</label><select id="coopMedicSkin"><option value="classic">기본 의무병</option><option value="rina">리나 · 입체 모션</option></select><button id="coopCreate" class="primary">초록 대장으로 방 만들기</button><label for="coopJoinCode">친구의 방 코드</label><input id="coopJoinCode" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="6자리 코드"><button id="coopJoin">파랑 대장으로 입장</button></div><div id="coopWaiting" hidden><p class="coop-code">방 코드 <strong id="coopCode"></strong></p><div id="coopMembers"></div><button id="coopCopy">초대 링크 복사</button><button id="coopStart" class="primary">둘이 함께 출격 →</button><button id="coopResume" class="primary" hidden>함께 작전 재개 →</button></div><p id="coopStatus" role="status" aria-live="polite">방을 만들거나 친구의 코드를 입력하세요.</p><p class="coop-note">방은 서버 재시작 시 종료됩니다. 연결이 끊기면 작전이 멈추며, 같은 탭을 새로고침하면 재접속합니다.</p><button id="coopLeave" class="pause-reset">협동에서 나가기</button></section>`;
 document.body.append(panel);
 const strip=document.createElement('div');strip.id='coopStrip';strip.hidden=true;strip.innerHTML='<strong id="coopIdentity"></strong><span>방 <b id="coopRoomCode"></b></span><span id="coopConnection"></span><strong id="coopShield" hidden></strong><button id="coopPause">함께 일시정지</button><button id="coopExit">나가기</button>';
 document.querySelector('.topbar').after(strip);
 $('startOverlay').hidden=true;
 $('coopJoinCode').value=new URLSearchParams(location.search).get('room')||'';try{$('coopMedicSkin').value=localStorage.getItem('plastic-front-medic-skin')==='rina'?'rina':'classic';}catch{}
 async function enter(route){try{await bridge.ready;bridge.enableAudio();const value=await request(route,{name:$('coopName').value,code:$('coopJoinCode').value,medicSkin:$('coopMedicSkin').value,reinforcementPlan:bridge.getGame().reinforcementPlan()});token=value.token;try{sessionStorage.setItem('plastic-front-coop-token',token);}catch{}apply(value.state);}catch(e){error(e.message);}}
 $('coopPlanSettings').onclick=()=>{$('displayBtn').click();modal(false);};
 new MutationObserver(()=>{if($('displayOverlay').hidden)modal(!state?.started||state?.paused||!connected);else modal(false);}).observe($('displayOverlay'),{attributes:true,attributeFilter:['hidden']});
 $('coopCreate').onclick=()=>enter('/rooms');$('coopJoin').onclick=()=>enter('/join');
 $('coopStart').onclick=()=>{bridge.enableAudio();command('start');};$('coopResume').onclick=()=>command('resume');
 $('coopPause').onclick=$('pauseBtn').onclick=()=>{bridge.clearInput();command('pause');};
 $('coopCopy').onclick=async()=>{try{const url=new URL(location.href);url.search='?coop=1&room='+state.code;await navigator.clipboard.writeText(url.href);$('coopStatus').textContent='초대 링크를 복사했습니다.';}catch{$('coopStatus').textContent='친구에게 이 주소와 방 코드 '+state.code+'를 알려주세요.';}};
 async function leave(){leaving=true;try{await request('/leave',{});}catch{}try{sessionStorage.removeItem('plastic-front-coop-token');}catch{}location.href='./';}
 $('coopLeave').onclick=$('coopExit').onclick=leave;
 $('againBtn').onclick=$('toMenuBtn').onclick=leave;
 if(token)poll();setInterval(poll,125);
}
api.configureReinforcement=plan=>{if(!globalThis.FrontReinforcementPlan.valid(plan))return false;if(!token)return bridge.getGame().setReinforcementPlan(plan);return command('reinforcementPlan',{plan}).then(data=>{if(!data)return false;const g=bridge.getGame();if(!state.started)g.setReinforcementPlan(plan);return JSON.stringify(g.reinforcementPlan().targets)===JSON.stringify(plan.targets)&&g.reinforcementPlan().enabled===plan.enabled&&g.reinforcementPlan().mode===plan.mode;});};
api.install=value=>{bridge=value;mount();};
api.pause=()=>{bridge.clearInput();command('pause');};
api.frame=game=>{
 if(!state?.started||state.phase==='ended'||!connected||state.paused||leaving)return;
 const now=performance.now();if(now-lastInput<100||inputBusy)return;lastInput=now;inputBusy=true;
 const input=state.choosing?{x:0,y:0}:game.input;
 request('/command',{action:'input',x:input.x,y:input.y}).catch(()=>{connected=false;}).finally(()=>{inputBusy=false;});
 if(move){const target=move;move=null;command('move',target);}
};
api.drawUnit=(ctx,u,draw)=>{
 const previous=positions.get(u.id),alpha=Math.max(0,Math.min(1,(performance.now()-lastApply)/100));ctx.save();
 if(previous&&Math.hypot(previous.x-u.x,previous.y-u.y)<160)ctx.translate((previous.x-u.x)*(1-alpha),(previous.y-u.y)*(1-alpha));
 if(u.team===0&&u.coopOwner===1)ctx.filter='hue-rotate(115deg) saturate(1.25)';if(u.team===0)bridge.getGame().withOwner(u.coopOwner,()=>draw(u));else draw(u);ctx.filter='none';
 if(u.team===0&&u.hp>0){const blue=u.coopOwner===1;ctx.strokeStyle=blue?'#59baff':'#a2dc63';ctx.lineWidth=u.type==='leader'?3:1.5;ctx.beginPath();ctx.ellipse(u.x,u.y+5,u.type==='leader'?27:19,9,0,0,Math.PI*2);ctx.stroke();if(u.type==='leader'){ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle=blue?'#65c6ff':'#c1ef8c';ctx.fillText(blue?'BLUE':'GREEN',u.x,u.y-49);}}
 if(u.team===0&&u.hp>0&&bridge.getGame().time<bridge.getGame().coopInvulnerable[u.coopOwner]){ctx.strokeStyle='#ffe68e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(u.x,u.y-10,36,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
};
api.status=()=>({owner:state?.owner,code:state?.code,connected,choosing:state?.choosing,invulnerable:state?.invulnerable,round:state?.round});
})(window);
