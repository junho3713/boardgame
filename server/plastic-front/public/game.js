/* Canvas presentation and touch/keyboard UI for Plastic Front. */
(()=>{'use strict';
const COOP=window.FrontCoopClient;
const $=id=>document.getElementById(id),canvas=$('battle'),ctx=canvas.getContext('2d'),mini=$('mini'),mc=mini.getContext('2d'),fog=document.createElement('canvas'),fc=fog.getContext('2d');
const upgradeArt=window.FrontUpgradeArt,unitArt=window.FrontUnitArt;
const abilities=window.FrontAbilities,evolutions=window.FrontEvolutions,fieldCards=window.FrontFieldCards;let evolutionReturn='ready';
const types=window.FrontTypes,roster=window.FrontRoster,production=[...roster],emptyQueue=()=>Object.fromEntries(production.map(t=>[t,0]));let W=1,H=1,DPR=1,scale=1,toastTimer,returnPhase='playing',last=0,uiTime=0,terrain,movePointer=null,pageTouch=null,stickPointer=null,aim=null,stickInput={x:0,y:0},keys={},orderMode='move',rosterKey='',queue=emptyQueue();
const display=window.FrontDisplay;let displayPrefs;try{displayPrefs=display.read(localStorage);}catch{displayPrefs={...display.defaults};}let displayReturn='ready',displayFocus=null;
const profileKey='plastic-front-profile-v1',permanent=window.FrontPermanent;let profile,profileSaveError='',permanentReturn='ready';
try{profile=window.FrontProfile.read(localStorage,profileKey);}catch{profile=new window.FrontProfile();profileSaveError='브라우저 저장을 읽을 수 없습니다. 현재 세션의 진행만 유지됩니다.';}
const worldModels=new window.FrontWorldModels(()=>buildTerrain());
const swordView=new window.FrontSwordBossView();
const unitModels=new window.FrontModels(),battleFx=new window.FrontEffects({budget:window.matchMedia("(pointer:coarse)").matches?240:360,weaponPoint:e=>unitModels.weaponPoint(e)});
const gameAssetsReady=Promise.all([unitModels.ready,swordView.ready,window.FrontPortal.ready,upgradeArt.ready,unitArt.ready,battleFx.prepareCombatMaterials()]);
let battlefield='livingroom';try{battlefield=['backyard','desktop','livingroom-star','livingroom-star3'].includes(localStorage.getItem('plastic-front-map'))?localStorage.getItem('plastic-front-map'):'livingroom';}catch{}
const requestedMap=new URLSearchParams(location.search).get('map');if(['livingroom','livingroom-star','livingroom-star3','backyard','desktop'].includes(requestedMap))battlefield=requestedMap;
let selectedCommander='sarge';try{selectedCommander=['shino','blaze','shion'].includes(localStorage.getItem('plastic-front-commander'))?localStorage.getItem('plastic-front-commander'):'sarge';}catch{}
let selectedSniperSkin='classic';try{selectedSniperSkin=['kayla','hayeon'].includes(localStorage.getItem('plastic-front-sniper-skin'))?'kayla':'classic';}catch{}
let selectedMedicSkin='classic';try{selectedMedicSkin=localStorage.getItem('plastic-front-medic-skin')==='rina'?'rina':'classic';}catch{}
let selectedFlameSkin='classic';try{selectedFlameSkin=localStorage.getItem('plastic-front-flame-skin')==='hwarin'?'hwarin':'classic';}catch{}
let selectedMode='pve',autoPilot=null,waveTestBackup=null,waveTestReturn='ready',waveTestFocus=null;const directProfile=profile;
const gameEvents={level:showUpgrade,change:updateUI,toast:toast,end:data=>{if(autoPilot)autoPilot.lastEnd=data;showResult(data);},fire:weaponSound,explosion:explosionSound,profile:persistProfile};
let game=COOP?.active?new window.FrontCoopGame(gameEvents):new window.FrontGame(gameEvents,profile,{map:battlefield,commander:selectedCommander,sniperSkin:selectedSniperSkin,medicSkin:selectedMedicSkin,flameSkin:selectedFlameSkin});
const fieldSupplyUI=window.FrontSupplyUI.create({getGame:()=>game,toast,clearInput});
const autoSessionOptions={events:gameEvents,apply:applyAuto,message:toast,busy:(value,progress)=>{$('autoBusy').hidden=!value;if(value&&progress){const total=Math.max(0,progress.total),done=Math.min(total,progress.processed||0);$('autoBusyProgress').max=Math.max(1,total);$('autoBusyProgress').value=done;$('autoBusyStatus').textContent=`${Math.floor(done)}초 / ${Math.ceil(total)}초 반영${progress.fallback?' · 응답을 복구하며 계산 중':''}`;}}};let autoSession=new window.FrontAutoSession(autoSessionOptions);const normalAutoSession=autoSession;
let idlePlan=window.FrontAutoCleanPlan(window.FrontAutoPresets[battlefield.startsWith('livingroom')?'roomBalanced':'balanced']);
let runSave=new window.FrontRunSave({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)});
const normalRunSave=runSave;
function refreshManualSave(){const v=runSave.read(),idle=selectedMode==='idle';$('manualContinue').hidden=idle||!v;for(const id of ['saveRunBtn','saveMenuBtn','manualSaveStatus'])$(id).hidden=idle||!!waveTestBackup;if(v){const f=v.engine.fields,t=Math.floor(f.time||0);$('manualSaveSummary').textContent=`${f.starExperiment?(f.starMax===3?'거실 · 3성 실험':'거실 · 2성 실험'):({livingroom:'거실',backyard:'뒷마당',desktop:'책상 디펜스'})[f.world?.id]||'작전'} · ${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')} · Lv.${f.level} · ${new Date(v.savedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 저장`;}
 $('manualStorageStatus').textContent=runSave.error||'일반 작전은 수동 저장 · 저장하기를 누르면 이전 진행 저장을 교체합니다.';$('manualStorageStatus').classList.toggle('save-error',!!runSave.error);$('manualSaveStatus').textContent=runSave.error||'일반 작전은 수동 저장입니다. 나가기 전에 저장하기를 눌러주세요.';$('manualSaveStatus').classList.toggle('save-error',!!runSave.error);}
function manualCheckpoint(report=false){if(selectedMode==='idle'||!['playing','paused','choice','resupply'].includes(game.phase))return false;const ok=runSave.save(game,selectedMode);refreshManualSave();if(report)toast(ok?'이 브라우저에 작전 저장 완료':runSave.error||'저장할 진행 중인 작전이 없습니다.');return ok;}
$('saveRunBtn').onclick=()=>manualCheckpoint(true);
$('saveMenuBtn').onclick=()=>{if(manualCheckpoint(true))newGame(false);};
$('manualContinue').onclick=async()=>{enableAudio();await gameAssetsReady;let latest;try{latest=window.FrontProfile.read(localStorage,profileKey);}catch{toast('개인 강화 저장을 읽지 못했습니다. 기존 저장은 유지합니다.');return;}directProfile.gold=latest.gold;Object.assign(directProfile.upgrades,latest.upgrades);const restored=runSave.load(gameEvents,directProfile);if(!restored){refreshManualSave();toast(runSave.error||'저장된 작전이 없습니다.');return;}
 if(selectedMode==='idle')autoSession.detach();selectedMode=restored.mode;autoPilot=null;game=restored.game;profile=directProfile;battlefield=game.battlefieldId();selectedCommander=game.commanderId||'sarge';selectedSniperSkin=game.sniperSkinId||'classic';selectedMedicSkin=game.medicSkinId||'classic';selectedFlameSkin=game.flameSkinId||'classic';document.body.classList.remove('auto-mode');for(const id of ['startOverlay','idleConfig','autoState','displayOverlay','constructionOverlay','resultOverlay','upgradeOverlay','pauseOverlay','helpOverlay','intelOverlay','supportOverlay','permanentOverlay','evolutionOverlay','fusionOverlay'])$(id).hidden=true;
 clearInput();setOrderMode('move');rosterKey='';queue=emptyQueue();renderCommanderChoice();renderSniperChoice();renderMedicChoice();renderBattlefieldChoice();buildTerrain();resize();updateIntel();if(game.phase==='choice'){showUpgrade(game.currentOptions||[]);if(game.pendingChoice){queue={...emptyQueue(),...game.pendingChoice.queue};choiceDone(game.pendingChoice.type);}}else $('pauseOverlay').hidden=false;refreshManualSave();updateUI();toast('저장된 작전 복구 · 준비되면 계속 진격하세요.');};
setInterval(()=>{if(waveTestBackup)normalRunSave.claim();if(!COOP?.active&&selectedMode!=='idle'&&['playing','paused','choice','resupply'].includes(game.phase)&&!runSave.claim()){refreshManualSave();}},3000);


const waveSetup=new window.FrontWaveTestSetup();
function renderWaveTest(){
 const supported=!COOP?.active&&game.isRoomCampaign()&&game.mode==='pve',available=supported&&['ready','playing','paused'].includes(game.phase);
 for(const id of ['pauseWaveTest','settingsWaveTest']){$(id).hidden=!supported;$(id).disabled=!available;}
 $('waveTestStrip').hidden=!waveTestBackup;$('waveTestLabel').textContent=`웨이브 테스트 · ${Math.floor((game.waveTestTarget||0)/60)}:${pad((game.waveTestTarget||0)%60)}`;
 $('returnWaveTest').hidden=!waveTestBackup;
 if(waveTestBackup){$('headerMode').textContent='웨이브 테스트 · 원래 작전 별도 보관';if(selectedMode==='idle')$('autoState').textContent='테스트 전용 AI · 원래 AI 저장과 별도 · 원래 작전으로 버튼으로 복귀';}
}
function waveTestTime(){const min=Number($('waveTestMinute').value),sec=Number($('waveTestSecond').value);return Number.isInteger(min)&&Number.isInteger(sec)&&min>=0&&min<=20&&sec>=0&&sec<60&&min*60+sec<=1200?min*60+sec:NaN;}
async function openWaveTest(){
 if(COOP?.active||!game.isRoomCampaign()||game.mode!=='pve')return;
 if(autoSession.busy){toast('부재중 계산이 끝나면 테스트를 열 수 있습니다.');return;}
 if(!['ready','playing','paused'].includes(game.phase))return;
 if(selectedMode==='idle'&&autoPilot?.active)await autoSession.tick();
 waveTestReturn=!$('displayOverlay').hidden?displayReturn:game.phase;waveTestFocus=document.activeElement;
 $('displayOverlay').hidden=true;clearInput();if(game.phase==='playing')game.phase='paused';autoCheckpoint();combatAudio.sync(game.phase);
 $('waveTestCurrent').textContent=`현재 ${Math.floor(game.time/60)}분 ${Math.floor(game.time%60)}초 · Lv.${game.level} · 생존 ${game.alive(0).length}기 / 편성 선택 가능`;
 $('waveTestStatus').textContent='테스트 골드와 진행은 원래 저장에 반영되지 않습니다.';
 waveSetup.open(game,waveTestTime());$('waveTestOverlay').hidden=false;syncWavePreset();$('waveTestMinute').focus();updateUI();
}
function closeWaveTest(){
 $('waveTestOverlay').hidden=true;if(game.phase==='paused'&&waveTestReturn==='playing'){game.phase='playing';if(selectedMode==='idle'){autoSession.at=Date.now();autoSession.save();}}
 waveTestFocus?.focus?.({preventScroll:true});updateUI();
}
function hideWaveModals(){for(const id of ['startOverlay','waveTestOverlay','displayOverlay','constructionOverlay','resultOverlay','upgradeOverlay','pauseOverlay','helpOverlay','intelOverlay','supportOverlay','permanentOverlay','evolutionOverlay','fusionOverlay'])$(id).hidden=true;}
async function beginWaveTest(){
 const target=waveTestTime();if(!Number.isFinite(target)){$('waveTestStatus').textContent='0:00부터 20:00 사이의 분·초를 입력하세요.';return;}
 $('beginWaveTest').disabled=true;
 try{
  const loadout=waveSetup.value();
  await gameAssetsReady;
  if(!waveTestBackup){
   // Clone before detaching anything. A failure leaves the original operation in place.
   const p=selectedMode==='idle'?window.FrontAutoPilot.restore(autoPilot.snapshot(),gameEvents):null;
   const copy=p?p.game:window.FrontWaveTest.fork(game,gameEvents);copy.waveTest=true;
   waveTestBackup={game,profile,autoPilot,phase:waveTestReturn};
   if(selectedMode==='idle')autoSession.detach();
   game=copy;profile=game.profile;autoPilot=p;runSave=new window.FrontRunSave(window.FrontWaveTest.memoryStorage(),{key:'plastic-front-wave-test-run'});
   autoSession=new window.FrontAutoSession({...autoSessionOptions,key:'plastic-front-wave-test-auto',storage:window.FrontWaveTest.memoryStorage()});
  }
  window.FrontWaveTest.seek(game,target,{heal:$('waveTestHeal').checked});
  if(loadout)window.FrontWaveTest.applyLoadout(game,loadout);
  if(autoPilot){autoPilot.active=true;autoPilot.remainder=0;for(const key of ['nextThink','nextBuild','nextPermanent','nextAdvance','dodgeUntil','supplyPauseUntil','hqGuardUntil'])autoPilot[key]=0;for(const key of ['escape','motion','supply','baseDefense','advanceState','lineAnchor'])autoPilot[key]=null;autoPilot.action='웨이브 테스트 · AI 준비';}
  hideWaveModals();clearInput();game.phase='playing';if(autoPilot)autoSession.attach(autoPilot);rosterKey='';refreshManualSave();updateUI();toast(`${Math.floor(target/60)}분 ${target%60}초 웨이브 테스트 · ${loadout?'시험 편성·강화 적용':'현재 분대·강화 유지'}`);
 }catch(error){$('waveTestStatus').textContent=error.message||'테스트를 시작하지 못했습니다.';}finally{$('beginWaveTest').disabled=false;}
}
function stopWaveTest(showPause=true){
 if(!waveTestBackup)return;const original=waveTestBackup;if(selectedMode==='idle')autoSession.detach();
 game=original.game;profile=original.profile;autoPilot=original.autoPilot;autoSession=normalAutoSession;runSave=normalRunSave;waveTestBackup=null;
 game.phase=original.phase==='ready'?'ready':'paused';clearInput();hideWaveModals();if(autoPilot?.active)autoSession.attach(autoPilot);
 if(game.phase==='ready')$('startOverlay').hidden=false;else if(showPause)$('pauseOverlay').hidden=false;
 rosterKey='';queue=emptyQueue();buildTerrain();resize();refreshManualSave();updateUI();toast('원래 작전으로 복귀 · 테스트 전의 분대와 진행을 유지합니다.');
}
for(const id of ['pauseWaveTest','settingsWaveTest','changeWaveTest'])$(id).onclick=openWaveTest;
$('closeWaveTest').onclick=closeWaveTest;$('beginWaveTest').onclick=beginWaveTest;
for(const id of ['exitWaveTest','returnWaveTest'])$(id).onclick=()=>stopWaveTest();
$('waveTestOverlay').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const nodes=[...$('waveTestOverlay').querySelectorAll('button,input,select')].filter(n=>!n.disabled&&!n.hidden),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
$('waveTestPresets').onclick=e=>{const b=e.target.closest('[data-wave-minute]');if(!b)return;$('waveTestMinute').value=b.dataset.waveMinute;$('waveTestSecond').value=0;syncWavePreset();};
function syncWavePreset(){const time=waveTestTime();waveSetup.update(time);document.querySelectorAll('[data-wave-minute]').forEach(n=>n.classList.toggle('selected',Number(n.dataset.waveMinute)*60===time));$('waveTestPreview').textContent=window.FrontWaveTest.describe(time)||'0:00부터 20:00 사이를 선택하세요.';}
$('waveTestMinute').oninput=$('waveTestSecond').oninput=syncWavePreset;
window.addEventListener('pagehide',()=>{if(waveTestBackup){normalAutoSession.release();normalRunSave.release();}});

function applyAuto(p){battlefield=p.game.battlefieldId();renderBattlefieldChoice();autoPilot=p;game=p.game;profile=game.profile;rosterKey='';buildTerrain();resize();updateIntel();updateUI();if(game.phase==='paused')$('pauseOverlay').hidden=false;if(game.phase==='ended')showResult(p.lastEnd||{result:game.result,reason:'base'});}
function renderCommanderChoice(){document.querySelectorAll('input[name="commander"]').forEach(input=>{input.checked=input.value===selectedCommander;});renderFlameChoice();}
document.querySelector('.commander-picker').onchange=e=>{const id=e.target.value;if(!game.setCommander(id))return;selectedCommander=id;try{localStorage.setItem('plastic-front-commander',id);}catch{}renderCommanderChoice();updateUI();};
function renderSniperChoice(){document.querySelectorAll('input[name="sniperSkin"]').forEach(input=>{input.checked=input.value===selectedSniperSkin;});}
document.querySelector('.unit-skin-picker').onchange=e=>{const id=e.target.value;if(!game.setSniperSkin(id))return;selectedSniperSkin=id;try{localStorage.setItem('plastic-front-sniper-skin',id);}catch{}renderSniperChoice();renderMedicChoice();updateUI();};
function renderMedicChoice(){document.querySelectorAll('input[name="medicSkin"]').forEach(input=>input.checked=input.value===selectedMedicSkin);}
$('medicSkinPicker').onchange=e=>{const id=e.target.value;if(!game.setMedicSkin(id))return;selectedMedicSkin=id;try{localStorage.setItem('plastic-front-medic-skin',id);}catch{}renderMedicChoice();updateUI();};
function renderFlameChoice(){const picker=$('flameSkinPicker');picker.hidden=selectedCommander!=='blaze';document.querySelectorAll('input[name="flameSkin"]').forEach(input=>input.checked=input.value===selectedFlameSkin);const card=document.querySelector('input[name="commander"][value="blaze"]').closest('label'),hwarin=selectedFlameSkin==='hwarin';card.querySelector('img').src=hwarin?'assets/commanders/hwarin-portrait-v146.webp':'assets/commanders/blaze-portrait.webp?v=1';card.querySelector('img').alt=hwarin?'고글과 쌍연료통을 갖춘 화염방사 대장 스킨 화린':'방탄모와 쌍연료통, 화염방사기를 든 플라스틱 대장';card.querySelector('b').textContent=hwarin?'화린':'화염방사 대장';card.querySelector('small').textContent=hwarin?'화염방사 대장 · 외형 스킨':'근거리 광역 · 강력한 연속 화염';}
$('flameSkinPicker').onchange=e=>{const id=e.target.value;if(!game.setFlameSkin(id))return;selectedFlameSkin=id;try{localStorage.setItem('plastic-front-flame-skin',id);}catch{}renderFlameChoice();updateUI();};
function renderIdlePlan(focus){const total=Object.values(idlePlan.counts).reduce((a,b)=>a+b,0),selected=Object.values(idlePlan.growth).filter(Boolean).length;
 const stepper=(key,name,icon,value,kind,blocked=false,minimum=0)=>`<div class="auto-weight"><span>${icon} ${name}</span><div><button data-auto-kind="${kind}" data-auto-key="${key}" data-auto-delta="-1" aria-label="${name} ${kind==='unit'?'편성':'강화'} 비중 감소" ${value<=minimum?'disabled':''}>−</button><output aria-label="${name} 비중">${value}</output><button data-auto-kind="${kind}" data-auto-key="${key}" data-auto-delta="1" aria-label="${name} ${kind==='unit'?'편성':'강화'} 비중 증가" ${value===5||blocked?'disabled':''}>+</button></div></div>`;
 $('idlePlanGrid').innerHTML=roster.map(t=>stepper(t,types[t].name,unitArt.icon(t,types[t].icon),idlePlan.counts[t],'unit',false,t!=='medic'&&!roster.some(k=>k!==t&&k!=='medic'&&idlePlan.counts[k])?1:0)).join('');
 $('idleGrowthGrid').innerHTML=window.FrontAutoGrowth.map(k=>stepper(k,abilities[k].name,upgradeArt.icon(k,abilities[k].icon),idlePlan.growth[k],'growth',!idlePlan.growth[k]&&selected>=5)).join('');
 $('idleStrategy').value=idlePlan.strategy;$('idleConstruction').value=idlePlan.construction;$('idleGrowthSummary').textContent=`강화 ${selected}/5종 · 0은 제외, 숫자가 높을수록 우선 강화`;$('idleContinue').hidden=!autoSession.read();$('idlePlanSummary').textContent=roster.filter(t=>idlePlan.counts[t]).map(t=>`${types[t].name} ${Math.round(idlePlan.counts[t]/total*100)}%`).join(' · ');
 if(focus){const q=`[data-auto-kind="${focus.kind}"][data-auto-key="${focus.key}"][data-auto-delta="${focus.delta}"]`,button=document.querySelector(q);if(button&&!button.disabled)button.focus({preventScroll:true});}
}
function legacyIdle(){try{const v=JSON.parse(localStorage.getItem('plastic-front-idle-v1')||'null');return v?.state?.started?v.state:null;}catch{return null;}}
function idleProfileData(saved){const armory=autoSession.readArmory();if(armory&&(!saved||armory.savedAt>=saved.savedAt))return armory.profile;if(saved)return saved.snapshot.engine.profile;const legacy=legacyIdle(),data=new window.FrontAutoProfile().snapshot();if(legacy){data.gold=Number.isFinite(legacy.gold)?legacy.gold:0;for(const k of Object.keys(data.upgrades))data.upgrades[k]=Math.min(10,Math.max(0,Math.floor(legacy.ranks?.[k]||0)));}return data;}
function selectMode(mode){if(waveTestBackup)stopWaveTest(false);runSave.release();renderCommanderChoice();renderSniperChoice();renderMedicChoice();renderBattlefieldChoice();if(selectedMode==='idle')autoSession.detach();selectedMode=mode;try{localStorage.setItem('plastic-front-mode',mode);}catch{}document.body.classList.toggle('auto-mode',mode==='idle');if(mode==='idle'){const saved=autoSession.read();profile=new window.FrontAutoProfile(idleProfileData(saved));game=new window.FrontGame(gameEvents,profile,{map:battlefield,commander:selectedCommander,sniperSkin:selectedSniperSkin,medicSkin:selectedMedicSkin,flameSkin:selectedFlameSkin});idlePlan=window.FrontAutoCleanPlan(saved?.snapshot.pilot.plan||legacyIdle()?.build||idlePlan);autoPilot=new window.FrontAutoPilot(game,idlePlan);autoPilot.prepare();renderIdlePlan();$('idleMigration').hidden=!!saved||!legacyIdle();}else{autoPilot=null;profile=directProfile;game=new window.FrontGame(gameEvents,profile,{map:battlefield,commander:selectedCommander,sniperSkin:selectedSniperSkin,medicSkin:selectedMedicSkin,flameSkin:selectedFlameSkin});game.reset(mode);}setOrderMode('move');rosterKey='';$('idleConfig').hidden=mode!=='idle';$('autoState').hidden=mode!=='idle';resize();buildTerrain();updateUI();updateIntel();refreshManualSave();}
function renderBattlefieldChoice(){const locked=selectedMode==='duel'||selectedMode==='crisis';document.querySelectorAll('input[name="battlefield"]').forEach(input=>{input.checked=input.value===battlefield;input.disabled=locked;});}
document.querySelector('.battlefield-picker').onchange=e=>{const input=e.target;if(input.name!=='battlefield'||input.disabled)return;battlefield=input.value;try{localStorage.setItem('plastic-front-map',battlefield);}catch{}selectMode(selectedMode);};
$('idleConstruction').onchange=()=>{idlePlan.construction=$('idleConstruction').value;renderIdlePlan();};
$('idlePresets').onclick=e=>{const key=e.target.closest('[data-auto-preset]')?.dataset.autoPreset;if(key){idlePlan=window.FrontAutoCleanPlan(window.FrontAutoPresets[key==='balanced'&&battlefield.startsWith('livingroom')?'roomBalanced':key]);renderIdlePlan();}};
function adjustIdlePlan(e){const button=e.target.closest('[data-auto-delta]');if(!button||button.disabled)return;const {autoKind:kind,autoKey:key,autoDelta:delta}=button.dataset,values=kind==='unit'?idlePlan.counts:idlePlan.growth;if(!(key in values))return;values[key]=Math.max(0,Math.min(5,values[key]+Number(delta)));idlePlan=window.FrontAutoCleanPlan(idlePlan);renderIdlePlan({kind,key,delta});}
$('idlePlanGrid').onclick=adjustIdlePlan;$('idleGrowthGrid').onclick=adjustIdlePlan;
$('idleStrategy').onchange=()=>{idlePlan=window.FrontAutoCleanPlan({counts:idlePlan.counts,strategy:$('idleStrategy').value,construction:idlePlan.construction});renderIdlePlan();};
$('autoBusyContinue').onclick=()=>autoSession.cancelCatchup();
$('idleContinue').onclick=async()=>{enableAudio();await gameAssetsReady;$('startOverlay').hidden=true;await autoSession.resume();};
function startAuto(){autoPilot.start(idlePlan);if(!autoSession.attach(autoPilot)){toast('다른 창에서 방치 작전 진행 중 · 저장된 작전 이어하기를 선택하세요.');autoPilot.active=false;game.phase='ready';return false;}return true;}
function autoCheckpoint(){if(selectedMode==='idle'&&autoPilot?.active){autoSession.tick();autoSession.save();}}
setInterval(()=>{if(selectedMode==='idle'&&autoPilot?.active)autoSession.tick();},1000);
window.addEventListener('pagehide',()=>{if(selectedMode==='idle')autoSession.release();else{runSave.release();}});
function persistProfile(){if(COOP?.active||waveTestBackup||selectedMode==='idle')return;try{profile.save(localStorage,profileKey);profileSaveError='';}catch{profileSaveError='브라우저 저장에 실패했습니다. 현재 세션에만 적용되므로 창을 닫기 전에 저장 가능 여부를 확인하세요.';}if(!$('permanentOverlay').hidden)renderPermanent();}
function permanentEffect(key,level){const n=permanent[key].gain*level;if(key==='capacity')return `${20+n}기`;if(key==='critChance')return `${5+n}%`;if(key==='critDamage')return `${150+n}%`;if(key==='turretDefense')return `${10+n} · 피해 ${Math.round(100*(10+n)/(110+n))}% 감소`;if(key==='defense')return `${n} · 피해 ${Math.round(100*n/(100+n))}% 감소`;return `+${n}%`;}
function renderPermanent(){
 const idle=selectedMode==='idle';$('permanentTitle').textContent=idle?'AI 부대 · 확률 영구 강화':'일반 부대 · 확정 영구 강화';$('permanentCurrencyLabel').textContent=idle?'AI 전용 골드':'일반 모드 골드';
 $('permanentGold').textContent=Math.floor(profile.gold);$('headerGold').textContent=Math.floor(profile.gold);$('startGold').textContent=Math.floor(profile.gold);
 $('permanentGrid').innerHTML=Object.entries(permanent).map(([key,b])=>{const lv=profile.upgrades[key],cost=profile.cost(key),max=lv>=b.max;return `<article class="permanent-card"><div class="permanent-card-top"><span>${upgradeArt.icon(key,b.icon)}</span><small>Lv.${lv} / ${b.max}</small></div><h3>${b.name}</h3><p>${b.detail}${idle&&!max?`<br><strong>성공 ${Math.round(profile.chance(key)*1000)/10}%</strong> · 실패 보정 +${(profile.fails[key]||0)*15}%p`:''}</p><div class="permanent-effect"><span>${permanentEffect(key,lv)}</span>${max?'':`<b>→ ${permanentEffect(key,lv+1)}</b>`}</div><button data-permanent="${key}" aria-label="${b.name} ${max?'최대 강화':`강화 ${cost} 골드`}" ${max||profile.gold<cost?'disabled':''}>${max?'최대 강화':`${idle?'확률 강화 시도':'확정 강화'} · ◈ ${cost}`}</button></article>`;}).join('');
 $('profileSaveStatus').textContent=(idle&&autoSession.error?'AI 강화 저장 실패 · 이 창의 진행을 유지하세요.':profileSaveError)||'이 기기·브라우저의 개인 저장입니다. 다른 방문자에게 전달되지 않습니다. 브라우저 데이터를 지우면 초기화됩니다.';$('profileSaveStatus').classList.toggle('save-error',!!profileSaveError);if(waveTestBackup)$('profileSaveStatus').textContent='테스트 전용 강화·골드 · 원래 작전과 영구 저장에 반영하지 않습니다.';
}
async function openPermanent(){if(selectedMode==='idle'&&autoSession.busy){toast('부재중 계산이 끝나면 강화창을 열 수 있습니다.');return;}if(selectedMode==='idle'&&autoPilot?.active)await autoSession.tick();permanentReturn=game.phase;clearInput();if(game.phase==='playing')game.phase='paused';if(selectedMode==='idle'&&autoPilot?.active)autoSession.save();$('permanentStatus').textContent=selectedMode==='idle'?'AI 전용 골드·강화 · 실패해도 단계 유지, 다음 성공 확률 +15%p · 일반 모드와 독립 저장':'일반 모드 전용 · 100% 성공 · 단계별 비용 80 → 180 → 360 → 620… 골드';renderPermanent();$('permanentOverlay').hidden=false;updateUI();}
function closePermanent(){$('permanentOverlay').hidden=true;if(permanentReturn==='playing'&&game.phase==='paused'){game.phase='playing';if(selectedMode==='idle'){autoSession.at=Date.now();autoSession.save();}}updateUI();}
for(const id of ['permanentBtn','startPermanent','pausePermanent','resultPermanent'])$(id).onclick=openPermanent;
$('closePermanent').onclick=closePermanent;
window.addEventListener('storage',e=>{if(e.key!==profileKey)return;try{const next=new window.FrontProfile(e.newValue?JSON.parse(e.newValue):{});directProfile.gold=next.gold;Object.assign(directProfile.upgrades,next.upgrades);if(waveTestBackup||selectedMode==='idle')return;game.refreshBuildingStats();if(!$('permanentOverlay').hidden)renderPermanent();updateUI();}catch{profileSaveError='다른 창에서 바뀐 진행 정보를 읽을 수 없습니다.';if(!$('permanentOverlay').hidden)renderPermanent();}});
$('permanentGrid').onclick=e=>{const button=e.target.closest('[data-permanent]');if(!button)return;const key=button.dataset.permanent;if(selectedMode==='idle'){
 if(autoSession.busy||!autoSession.claim()){toast('다른 창에서 AI 작전 진행 중 · 해당 창에서 강화하세요.');return;}
 // Refresh the ready-screen wallet after a different window has changed it.
 if(!autoPilot.active){profile=new window.FrontAutoProfile(idleProfileData(autoSession.read()));game.profile=profile;autoPilot.fails=profile.fails;autoPilot.attempts=profile.attempts;autoPilot.successes=profile.successes;}
 const result=autoPilot.attemptPermanent(key);if(autoPilot.active)autoSession.save();else autoSession.saveArmory(autoPilot);renderPermanent();$('permanentStatus').textContent=result?(result.success?`AI 강화 성공 · Lv.${result.level} · ${result.cost} 골드 사용`:`AI 강화 실패 · Lv.${result.level} 유지 · ${result.cost} 골드 사용 · 다음 성공 ${Math.round(profile.chance(key)*1000)/10}%`):'AI 전용 골드와 최대 단계를 확인하세요.';return;
 }if(game.buyPermanent(key)){renderPermanent();$('permanentStatus').textContent='일반 모드 확정 강화 · 현재 부대와 이후 일반 작전에 적용됩니다.';}else $('permanentStatus').textContent='보유 골드와 최대 강화 단계를 확인하세요.';};


const compactBattle=window.matchMedia('(max-width:760px), (pointer:coarse), (orientation:landscape) and (max-height:560px)');let objectiveManual=false;
function collapseObjective(compact){$('objectiveDetails').hidden=compact;$('objectiveToggle').setAttribute('aria-expanded',String(!compact));$('objectiveToggle').querySelector('i').textContent=compact?'＋':'−';}
collapseObjective(compactBattle.matches);
$('objectiveToggle').onclick=()=>{objectiveManual=true;collapseObjective(!$('objectiveDetails').hidden);};
compactBattle.addEventListener('change',()=>{if(!objectiveManual)collapseObjective(compactBattle.matches);});

function unitName(type){return game.evolved[type]?evolutions[type].name:types[type].name;}
function abilityValue(key,level){const b=abilities[key],n=game.abilityBonus(key,level);return key==='capacity'?`+${n}기`:key==='defense'?`+${n}`:`+${n}${b.unit}`;}
function evolutionHint(type){const key=game.abilityKey(type),pairs=key?Object.entries(evolutions).filter(([,e])=>e.ability===key):evolutions[type]?[[type,evolutions[type]]]:[];return pairs.map(([u,e])=>`${types[u].name} Lv.5 + ${abilities[e.ability].name} Lv.5 → ${e.name}`).join('<br>');}
function renderBuild(){
 const selected=game.selectedAbilities();$('runAbilityCount').textContent=`작전 능력 ${selected.length}/5`;
 $('abilitySlots').innerHTML=[...selected.map(k=>`<span class="ability-slot ${game.abilities[k]===5?'maxed':''}" title="${abilities[k].name} Lv.${game.abilities[k]}/5"><i>${upgradeArt.icon(k,abilities[k].icon)}</i><b>${abilities[k].name}</b><small>${game.abilities[k]===5?'MAX':game.abilities[k]+'/5'}</small></span>`),...Array(5-selected.length).fill('<span class="ability-slot empty">＋</span>')].join('');
 $('runChoiceSummary').innerHTML=`<b>작전 능력 ${selected.length}/5종</b><span>${selected.length?selected.map(k=>`${abilities[k].name} ${game.abilities[k]}/5`).join(' · '):'능력 카드를 확정하면 슬롯이 채워집니다.'}</span><small>${selected.length===5?'5종 선택 완료 · 선택한 능력만 계속 강화할 수 있습니다.':'새 능력을 고르면 이번 판의 5개 슬롯 중 하나를 사용합니다.'}</small>`;
}
let evolutionLinkFilter='all';
function renderEvolutions(){
 const count=game.selectedAbilities().length;
 $('evolutionGrid').innerHTML=Object.entries(evolutions).map(([type,e])=>{const lv=game.tech[0][type],rank=game.abilities[e.ability],done=game.evolved[type],blocked=count===5&&!rank;return `<article class="evolution-pair ${done?'evolved':''}"><div class="evolution-pair-top"><span>${unitArt.icon(type,types[type].icon)} + ${upgradeArt.icon(e.ability,abilities[e.ability].icon)}</span><small>${done?'진화 완료':blocked?'이번 판 슬롯 선택 완료':'조합 성장 중'}</small></div><h3>${e.name}</h3><p>${e.detail}</p><div class="evolution-progress"><span>${types[type].name} <b>${lv}/5</b></span><span>${abilities[e.ability].name} <b>${rank}/5</b></span></div><small>${done?'현재·이후 해당 병과에 적용':blocked?'다른 능력 5종을 선택해 이번 판에는 이 조합을 완성할 수 없습니다.':'두 조건을 모두 달성하면 자동 진화'}</small></article>`;}).join('');
 $('evolutionGrid').insertAdjacentHTML('beforeend','<h3 id="evolutionLinksHeading" style="grid-column:1/-1">진화 병과 연계 13종 · 같은 분대의 두 진화 병과가 생존하면 자동 활성화</h3><div style="grid-column:1/-1;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><label>연계 병과 <select id="evolutionLinkFilter" aria-label="연계 병과 필터"><option value="all">전체 13종</option>'+roster.map(t=>'<option value="'+t+'">'+types[t].name+'</option>').join('')+'</select></label><small>병과마다 2~3가지 조합 · 추가 비용 없이 자동 발동</small></div><div id="evolutionLinkCards" class="evolution-grid" style="grid-column:1/-1"></div>');
 const filter=$('evolutionLinkFilter');filter.value=evolutionLinkFilter;
 const renderLinks=()=>{$('evolutionLinkCards').innerHTML=game.evolutionLinks().filter(l=>evolutionLinkFilter==='all'||l.types.includes(evolutionLinkFilter)).map(l=>'<article class="evolution-pair '+(l.active?'evolved':'')+'"><h3>'+l.name+'</h3><b>'+l.types.map(t=>types[t].name).join(' + ')+'</b><p>'+l.detail+'</p><small>'+(l.active?'연계 활성화':l.progress+'/2 · 진화 병력 생존 필요')+' · 같은 연계 중복 없음</small></article>').join('');};
 filter.onchange=()=>{evolutionLinkFilter=filter.value;renderLinks();};renderLinks();
}
let constructionReturn='playing';
function renderConstruction(){const idle=selectedMode==='idle',live=game.buildings.filter(b=>b.hp>0);$('constructionGuide').textContent=`첫 건물은 대장 위치, 다음은 오른쪽·왼쪽 순서로 붙습니다. 아군은 옆으로 비켜줍니다. 수리로봇은 손상된 건물로 이동하며 적을 우회합니다. 최대 ${game.buildingCap('repairBot')}대.${game.isDesktopDefense()?' 책상 디펜스: 건설 한도 2배.':''}`;$('constructionBudget').textContent=`생산 자원 ◆ ${Math.floor(game.cash[0])} · 건물 ${live.filter(b=>!b.mobile).length}곳 · 수리로봇 ${live.filter(b=>b.mobile).length}기`;$('constructionGrid').innerHTML=Object.keys(window.FrontBuildings).map(kind=>[kind,game.buildingStats(kind)]).map(([kind,b])=>`<article class="permanent-card"><h3>${b.name}</h3><p>${kind==='mgTower'?`쌍열 동시 사격 · 합산 공격력 ${Number(b.damage.toFixed(1))} (각 ${Number((b.damage/2).toFixed(1))}) · 0.3초 간격`:kind==='missileBase'?`공격력 ${Number(b.damage.toFixed(1))} · 장갑 1배 / 경장갑 0.5배 · 반경 90 · 1초 후 착탄 · 사거리 600`:kind==='repair'?'주변 기계와 본진 수리':kind==='repairBot'?`최대 ${game.buildingCap(kind)}대 · 의무병 치료 가능 · 손상 건물로 자동 이동 · 적 우회 · 초당 ${Number(b.repair.toFixed(1))} 수리 · 의무병 레벨·진화 공유`:'내구력 3배 · 인접 아군 방어력 +20'}</p><small>체력 ${Math.round(b.hp)} · 방어력 ${b.defense??10} · ${b.mobile?'배치':'설치'} ${game.buildingCount(kind)}/${game.buildingCap(kind)}</small><button data-build="${kind}" ${idle||game.cash[0]<b.cost||game.buildingCount(kind)>=game.buildingCap(kind)?'disabled':''}>${b.mobile?'배치':'건설'} · ◆ ${b.cost}</button></article>`).join('');}
async function openConstruction(){if(game.mode!=='pve'||!['playing','paused'].includes(game.phase)||autoSession.busy)return;if(selectedMode==='idle')await autoSession.tick();constructionReturn=game.phase;game.phase='paused';clearInput();game.beginConstructionLine();$('constructionStatus').textContent=selectedMode==='idle'?'AI가 설정한 우선순위에 따라 안전한 거점을 건설합니다.':'첫 건물은 대장 위치 · 다음은 오른쪽/왼쪽 순서로 밀착 · 아군 자동 비켜주기 · 조립 2초';renderConstruction();$('constructionOverlay').hidden=false;}
function closeConstruction(){$('constructionOverlay').hidden=true;if(game.phase==='paused'&&constructionReturn==='playing'){game.phase='playing';if(selectedMode==='idle'){autoSession.at=Date.now();autoSession.save();}}updateUI();}
$('constructionBtn').onclick=openConstruction;$('closeConstruction').onclick=closeConstruction;$('constructionResume').onclick=closeConstruction;
$('constructionGrid').onclick=e=>{const kind=e.target.closest('[data-build]')?.dataset.build;if(!kind||selectedMode==='idle')return;if(game.build(kind)){renderConstruction();$('constructionStatus').textContent=kind==='repairBot'?'수리로봇 배치 · 조립 후 손상된 건물을 찾아 적을 우회하며 수리합니다.':'대장 기준 좌우 배치 · 아군은 옆으로 이동했습니다. 전장으로 돌아가면 조립합니다.';}else $('constructionStatus').textContent=game.buildError;};
function openEvolutions(){evolutionReturn=game.phase;clearInput();if(game.phase==='playing')game.phase='paused';renderEvolutions();$('evolutionOverlay').hidden=false;updateUI();}
function closeEvolutions(){$('evolutionOverlay').hidden=true;if(evolutionReturn==='playing'&&game.phase==='paused')game.phase='playing';updateUI();}
$('evolutionBtn').onclick=openEvolutions;$('startEvolution').onclick=openEvolutions;$('closeEvolution').onclick=closeEvolutions;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
window.addEventListener('front-room-art-ready',()=>buildTerrain());
const groundTexture=new Image();groundTexture.onload=()=>buildTerrain();groundTexture.src='assets/backyard-ground-calm-v112.webp';
const combatAudio=new window.FrontAudio({onStatus:status=>{
 const messages={loading:'효과음 불러오는 중…',ready:'전투 효과음 9종 준비됨',partial:'일부 효과음을 불러오지 못했습니다. 새로 접속해 주세요.',unsupported:'이 브라우저에서 소리를 사용할 수 없습니다.',unavailable:'소리를 시작하지 못했습니다. 소리 버튼을 다시 눌러주세요.'};
 $('audioStatus').textContent=messages[status]||'';
}});let muted=false,lastImpactAudioAt=-1;battleFx.impactSound=e=>{if(game.time<lastImpactAudioAt-1)lastImpactAudioAt=-1;if(e.at>lastImpactAudioAt&&game.phase==='playing'){lastImpactAudioAt=e.at;combatAudio.impact(e,game.camera);}};
try{muted=localStorage.getItem('plastic-front-muted')==='true';const saved=localStorage.getItem('plastic-front-volume');if(saved!==null)combatAudio.setVolume(Number(saved));}catch{}
combatAudio.setMuted(muted);
function soundUI(){$('soundBtn').textContent=muted?'음소거':'소리 켬';$('soundBtn').setAttribute('aria-pressed',String(!muted));$('pauseSoundBtn').textContent=muted?'음소거 해제':'음소거';$('pauseSoundBtn').setAttribute('aria-pressed',String(muted));$('sfxVolume').value=Math.round(combatAudio.volume*100);$('sfxVolumeValue').textContent=`${Math.round(combatAudio.volume*100)}%`;$('sfxMuteStatus').textContent=muted?'음소거 중 · 해제하면 설정한 음량으로 재생됩니다.':combatAudio.volume?'현재 음량이 모든 전투 효과음에 적용됩니다.':'0% · 무음 상태입니다.';$('sfxVolume').setAttribute('aria-valuetext',`${Math.round(combatAudio.volume*100)}퍼센트${muted?' · 음소거 중':''}`);}
function enableAudio(){if(!muted)combatAudio.unlock();}
function weaponSound(u){combatAudio.sync(game.phase);combatAudio.fire(u,game.camera);}
function explosionSound(e){combatAudio.sync(game.phase);combatAudio.explosion(e,game.camera);}
$('soundBtn').onclick=()=>{muted=!muted;combatAudio.setMuted(muted);try{localStorage.setItem('plastic-front-muted',String(muted));}catch{}enableAudio();soundUI();};
$('pauseSoundBtn').onclick=()=>$('soundBtn').onclick();
$('sfxVolume').oninput=()=>{combatAudio.setVolume(Number($('sfxVolume').value)/100);try{localStorage.setItem('plastic-front-volume',String(combatAudio.volume));}catch{}soundUI();};
$('previewSfx').onclick=async()=>{if(muted||!combatAudio.volume){$('audioStatus').textContent='효과음을 켜고 음량을 올려주세요.';return;}const played=await combatAudio.audition($('sfxSample').value);if(played)$('audioStatus').textContent=`${$('sfxSample').selectedOptions[0].textContent} 재생 중`;};
soundUI();

function pad(n){return String(n).padStart(2,'0');}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function clearInput(){keys={};aim=null;movePointer=null;pageTouch=null;stickPointer=null;stickInput={x:0,y:0};game.input={x:0,y:0};$('stick').style.transform='';}
function makeProduction(){
 $('productionButtons').innerHTML=production.map(t=>`<div class="queue-slot"><button data-buy="${t}" class="produce-btn" aria-label="${t==='truck'?'채집 트럭':types[t].name} 수량 추가"><span>${t==='truck'?'▰':unitArt.icon(t,types[t].icon)}</span><div><b>${t==='truck'?'채집 트럭':types[t].name}</b><small id="prodState-${t}"></small><em>${t==='truck'?'화면 밖 자원 채집':types[t].role}</em></div><strong id="prodCost-${t}"></strong><i>＋</i></button><div class="quantity"><button data-minus="${t}" aria-label="${t==='truck'?'채집 트럭':types[t].name} 수량 감소">−</button><b id="quantity-${t}">0</b><span>선택</span></div></div>`).join('');
 $('productionButtons').addEventListener('click',e=>{const b=e.target.closest('[data-buy]'),minus=e.target.closest('[data-minus]');if(minus){queue[minus.dataset.minus]=Math.max(0,queue[minus.dataset.minus]-1);updateQueue();return;}if(b){const t=b.dataset.buy,proposed={...queue,[t]:queue[t]+1};const troops=Object.entries(proposed).filter(([k])=>k!=='truck').reduce((n,[k,q])=>n+q,0);const count=game.units.filter(u=>u.team===0&&u.hp>0&&!u.patrol&&u.type!=='leader'&&(!COOP?.active||u.coopOwner===game.coopOwner)).length;if((proposed[t]||0)>game.recruitmentRemaining(t)){$('queueNote').textContent=game.starExperiment?`${types[t].name}은 ${game.isThreeStarExperiment()?'3성 최대 1기':'2성 최대 3기'}까지 편성할 수 있습니다. 남은 충원 ${game.recruitmentRemaining(t)}기.`:`${types[t].name}은 살아 있는 유닛 최대 ${game.unitTypeCap()}기까지 편성할 수 있습니다.`;return;}if(game.queueCost(proposed)>game.cash[0]){$('queueNote').textContent='보유 자원을 초과했습니다. 선택 수량을 조정하세요.';return;}if(count+troops>game.capacity()){$('queueNote').textContent=`지휘관을 제외하고 병력 최대 ${game.capacity()}기까지 편성할 수 있습니다.`;return;}queue=proposed;updateQueue();}});
}
function updateQueue(){const cost=game.queueCost(queue),total=Object.values(queue).reduce((a,b)=>a+b,0);$('budgetCash').textContent=Math.floor(game.cash[0]);$('budgetCost').textContent=cost;$('budgetAfter').textContent=Math.floor(game.cash[0]-cost);Object.keys(queue).forEach(t=>{$('quantity-'+t).textContent=queue[t];const add=document.querySelector(`[data-buy="${t}"]`),alive=game.alive(0).filter(u=>u.type!=='leader').length;add.disabled=!game.tech[0][t]||game.phase!=='choice'||!!game.turnChoice||queue[t]>=game.recruitmentRemaining(t)||alive+total>=game.capacity()||cost+types[t].cost>game.cash[0];document.querySelector(`[data-minus="${t}"]`).disabled=queue[t]===0;document.querySelector(`[data-buy="${t}"]`).closest('.queue-slot').classList.toggle('has-quantity',queue[t]>0);});$('requestSupport').disabled=total===0||cost>game.cash[0]||!game.supportValid(queue);$('requestSupport').innerHTML=total?`이 편성 선택 · ${total}기 / ◆ ${cost} <span>→</span>`:'지원할 병력을 선택하세요 <span>→</span>';$('queueNote').textContent=total?'이 편성을 선택한 뒤 ‘확정하고 진격’을 누르면 자원 차감 후 합류합니다.':'병력 슬롯을 누르면 수량이 늘어납니다. − 버튼으로 줄일 수 있습니다.';}
$('supportMenuBtn').onclick=()=>{if(game.phase!=='choice'||game.turnChoice)return;document.querySelector('.support-disclaimer').textContent=game.choiceKind==='supply'?'지원 보급 +400 자원 · 강화 기회 소모 없음 · 남은 자원은 계속 보유합니다.':game.choiceKind==='recovery'?'취소하면 자원과 대기시간을 소비하지 않습니다. 확정 시 생산 자원만 차감되며 90초 뒤 다시 긴급 지원을 요청할 수 있습니다. XP·레벨·강화 기회는 소비하지 않습니다.':'취소하면 자원과 강화 기회가 유지됩니다. 확정하고 진격할 때 자원과 강화 기회가 소비됩니다. 채집 트럭은 2대로 고정이며 전투트럭은 전장에 합류하는 전투 병력입니다.';queue=game.pendingChoice?.type==='support'?{...game.pendingChoice.queue}:emptyQueue();updateUI();updateQueue();$('supportOverlay').hidden=false;};$('cancelSupport').onclick=()=>{$('supportOverlay').hidden=true;};$('requestSupport').onclick=()=>{const total=Object.values(queue).reduce((a,b)=>a+b,0);if(game.stageChoice('support',queue)){toast(`${total}기 지원 편성 선택 · 진격 전까지 변경할 수 있습니다.`);$('supportOverlay').hidden=true;choiceDone('support');}else $('queueNote').textContent='자원과 병력 한도를 확인하고 수량을 조정하세요.';};
function updateIntel(){
 const seen=game.units.filter(u=>u.team!==0&&u.hp>0&&game.visible(u)),counts=new Map();for(const u of seen)counts.set(u.type,(counts.get(u.type)||0)+1);
 $('intelBadge').textContent=seen.length?`${seen.length}기 확인`:'시야 내 적 없음';
 const html=seen.length?[...counts].map(([type,n])=>`<div class="intel-row"><b>${types[type]?.icon||'•'} ${types[type]?.name||'적'}</b><span>${n}기</span></div>`).join(''):'<div class="intel-question">⌖</div><p>시야 안에 들어온 적을<br>이곳에서 확인할 수 있습니다.</p>';
 if($('intelContent').innerHTML!==html){$('intelContent').innerHTML=html;$('intelContent').classList.toggle('revealed',!!seen.length);$('mobileIntelContent').innerHTML=`<div class="intel-content ${seen.length?'revealed':''}">${html}</div>`;}
}
let fusionReturn='playing';
function renderFusion(){const three=game.isThreeStarExperiment();$('fusionTitle').textContent=three?'정예병 3명이 모이면 3성으로.':'3명이 모이면 자동으로 정예병.';$('fusionRules').innerHTML=three?'1성 3기 → 2성 1기 · 2성 3기 → 3성 1기 자동 합성<br>3성: 1성 기준 공격 ×7.2 · 체력 ×7.8 · 의무병 치료 ×7.2<br>병과별 3성 최대 1기 · 완성된 병과는 추가 생산 불가<br>저격병: 총 피해량을 절반씩 나눈 2발 동시 발사<br>레토나: 룰렛 3개 유지 · 4초 주기 · 당첨 한 번의 위력 유지<br>룰렛별 일반 / 진화 확률: 777 6% / 14% · 스프레이 24% / 41%<br>끈끈이 44% / 29% · 지뢰 20% / 13% · 꽝 6% / 3%<br>공속·이속·방어·사거리 동일 · 합성 전 체력 비율 유지<br>일반·AI 모드 모두 자동 합성합니다.':'살아 있는 같은 병과 1성 3기 → 자동으로 2성 1기<br>공격 ×2.4 · 체력 ×2.6 · 의무병 치료 ×2.4<br>럭키 레토나: 독립 룰렛 3개 · 룰렛 피해 배율 추가 없음<br>공속·이속·방어·사거리 동일 · 합성 전 체력 비율 유지<br>일반·AI 모드 모두 자동 합성합니다.<br>병과별 2성 최대 3기 · 3기 완성 시 해당 병과 추가 생산 불가.';$('fusionRules').innerHTML+='<br>2성 전사 시 같은 병과 1성 1기 복귀 · 체력 100% · 장비 회수 자원 없음.';$('fusionGrid').innerHTML=roster.map(type=>{const complete=three?game.threeStarCount(type)>0:game.twoStarCount(type)>=3;return `<div class="fusion-status"><b>${types[type].name}</b><span>${game.starRosterLabel(type)}</span><small>${complete?'최대 편성 · 추가 생산 불가':three?'1성 3기 → 2성 · 2성 3기 → 3성':'1성 3기 → 자동 2성 합성'}</small></div>`;}).join('');}
$('fusionBtn').onclick=()=>{if(!game.starExperiment||!['playing','paused'].includes(game.phase))return;fusionReturn=game.phase;game.phase='paused';clearInput();renderFusion();$('fusionOverlay').hidden=false;};
$('closeFusion').onclick=()=>{$('fusionOverlay').hidden=true;game.phase=fusionReturn;updateUI();};

function updateUI(){
 fieldSupplyUI.update();
 $('fusionBtn').hidden=!game.starExperiment||game.mode!=='pve';$('fusionBtn').disabled=!['playing','paused'].includes(game.phase);if(game.starExperiment)$('fusionBtn').textContent=(game.isThreeStarExperiment()?'★★★':'★★')+' 자동 합성';
 const room=game.bounds().id==='livingroom',desk=game.isDesktopDefense();$('mapName').textContent=desk?'DESK DEFENSE 03':room?(game.isThreeStarExperiment()?'LIVING ROOM ★★★':game.starExperiment?'LIVING ROOM ★★':'LIVING ROOM 02'):'BACKYARD 01';$('mapSubtitle').textContent=desk?'책상 위 방어선 · 북쪽 공세 / 20분 생존':room?'확장 거실 · 20분 혼합 공세':'작전 구역 · 뒷마당';$('constructionCount').textContent=game.buildings.filter(b=>b.hp>0).length;$('constructionBtn').disabled=game.mode!=='pve'||!['playing','paused'].includes(game.phase);renderBattlefieldChoice();
 renderBuild();updateIntel();
 $('headerGold').textContent=Math.floor(profile.gold);$('startGold').textContent=Math.floor(profile.gold);$('cash').textContent=Math.floor(game.cash[0]);$('supportCash').textContent=Math.floor(game.cash[0]);$('truckCount').textContent=game.trucks[0];$('income').textContent=`+${game.income(0).toFixed(1)} / 초`;
 $('levelLabel').textContent=`LV. ${pad(game.level)}`;$('xpFill').style.width=`${Math.min(100,game.xp/game.neededXP()*100)}%`;$('xpText').textContent=`다음 선택까지 ${Math.max(0,Math.ceil(game.neededXP()-game.xp))} XP`;
 const duel=game.mode==='duel',practice=game.mode==='crisis',clock=desk?Math.max(0,Math.ceil(1200-game.time)):duel?Math.max(0,Math.ceil(180-game.time)):Math.floor(game.time);$('timer').textContent=`${pad(Math.floor(clock/60))}:${pad(clock%60)}`;
 $('startDescription').innerHTML=practice?'준비된 분대로 포격을 피하고 북쪽 포병을 돌파하세요.<br><strong>승리: 포병 2기 파괴</strong> · 부대 이동과 집중 공격을 시험하세요.':duel?'상대의 테크와 편성을 읽고 분대로 대결하세요.<br><strong>승리: 상대 본진 파괴</strong> · 3분 후 남은 본진 체력으로 판정':'벌레 사냥 → 전초기지 2곳 → 최종 기지 파괴.<br><strong>7:30 포병 예고 · 8:00 포격 개시</strong> · 시간 제한 없음';
 if(room&&game.mode==='pve')$('startDescription').innerHTML='16분부터 보스 2기씩 연전을 돌파하고, 20분 이후 최종 보스를 처치하면 승리합니다. 최전방 포탈을 파괴하면 보상과 함께 증원이 줄어듭니다.<br><strong>약 20분 혼합 공세 · 4:00 첫 사슴벌레 보스 · 7:30 포격 예고</strong><br>15:00 장수말벌 · 16:00부터 매분 보스 2기씩 · 19:00 전차 보스 · 20분 이후 연전 완료 시 사검의 군주 · 포탈이 남으면 15분부터 증원 폭주<br>레이저 포탑 → 얼음 마녀 순서로 박격포병·저격병 해금 퀘스트를 경험하세요.';
 $('startSubtitle').textContent=practice?'고정 분대 9기 · 15초 준비 · 전사한 분대원은 복귀하지 않음':duel?'1대1 훈련 3분 · 채집 트럭 양측 2대 고정':room&&game.mode==='pve'?'거실 전체 개방 · 4분 첫 보스 · 16분부터 2기씩 보스 연전':'적 무리 지속 유입 · 2분마다 보스 / 처치 시 추가 강화';
 $('modeName').textContent=practice?'포병 위기 연습':duel?'1대1 훈련':'돌파 작전';$('modeTime').textContent=room?'20분 최종 보스':practice?'포병 격파':duel?'03:00':'기지 파괴';$('headerMode').textContent=COOP?.active?'2인 협동 · 2성 거실 · 개인 성장':practice?'부대 이동 · 포격 회피 훈련':duel?'선택 모드 · 컴퓨터와 1대1':'기본 모드 · 스테이지 돌파';$('greenLabel').textContent=COOP?.active?`${game.coopOwner?'BLUE':'GREEN'} / 내 분대 · 기회 ${Math.max(0,3-game.retreated)}회`:duel?'GREEN / 아군 본진':`GREEN / ${game.commanderId==='blaze'&&game.flameSkinId==='hwarin'?'화린':game.commanderId==='shion'?'시온':game.commanderId==='shino'?'시노':'대장'} · 기회 ${Math.max(0,3-game.retreated)}회`;$('redLabel').textContent=room?'최전방 포탈 / 폐쇄 시 증원 감소':practice?'적 포병 / 2기 파괴하면 승리':duel?'상대 본진 / CORAL':game.baseShielded()?'최종 기지 / 방어막':'최종 기지 / 파괴하면 승리';
 $('startRules').innerHTML=practice?'<div><b>01</b><span>전장을 눌러<strong>부대 이동</strong></span></div><div><b>02</b><span>포격 원 밖으로<strong>전체 회피</strong></span></div><div><b>03</b><span>집중 공격으로<strong>포병 2기 격파</strong></span></div>':'<div><b>01</b><span>부대 이동 명령<strong>공격은 자동</strong></span></div><div><b>02</b><span>레벨업마다<strong>강화·지원 중 선택</strong></span></div><div><b>03</b><span>병과 + 능력<strong>Lv.5 조합으로 진화</strong></span></div>';
 if(desk){
  $('startDescription').innerHTML='책상 위 최후의 방어선을 지키세요.<br><strong>20분 동안 버티세요.</strong> · 아군 기지가 파괴되면 패배';
  $('startSubtitle').textContent='북쪽에서만 적 접근 · 건설 한도 2배 · 2분마다 보스 / 격파 시 추가 강화';
  $('modeName').textContent='책상 디펜스';$('modeTime').textContent='20:00 생존';$('headerMode').textContent='책상 위 방어전 · 20분 생존';
  $('greenLabel').textContent=`GREEN / 방어 기지 · 후퇴 ${Math.max(0,3-game.retreated)}회`;$('redLabel').textContent='방어 진행 / 20분 달성 시 승리';
  $('startRules').innerHTML='<div><b>01</b><span>적은 북쪽에서<strong>방어선 구축</strong></span></div><div><b>02</b><span>건설 한도 2배<strong>기지 보호·수리</strong></span></div><div><b>03</b><span>기지를 지키며<strong>20분 버티기</strong></span></div>';
 }
 if(game.hasInvulnerableHQ())$('startSubtitle').textContent+=' · 대장 5초 뒤 제자리 부활 · 부활 후 3초 보호 · 3회 후퇴 시 패배 / HQ 보호';
 if(practice){$('levelLabel').textContent='고정 편성';$('xpFill').style.width='0%';$('xpText').textContent='성장 없이 이동·집중 공격 연습';}
 const c=game.crisis;const incoming=c.phase==='warning',active=c.phase==='active';$('crisisBanner').hidden=!(incoming||active)||game.phase==='ready'||game.phase==='ended';$('crisisBanner').classList.toggle('active',active);
 $('crisisTitle').textContent=incoming?`포병 출현까지 ${Math.max(0,Math.ceil(c.startAt-game.time))}초`:`포병 ${game.artilleryUnits().length}기 가동 · 포격 위치 고정`;
 const next=game.barrages.length?Math.max(0,Math.min(...game.barrages.map(b=>b.landAt))-game.time):0;
 $('crisisText').textContent=incoming?'부대를 모으고 북쪽 돌파를 준비하세요.':next?`착탄까지 ${next.toFixed(1)}초 · 부대 전체를 붉은 원 밖으로 이동!`:'포격 사이에 접근 → 포병 집중 공격 → 파괴하면 포격 중단';
 $('orderStatus').textContent=orderMode==='focus'?'공격할 적을 누르세요':game.moveOrder?'지정 위치로 이동 · 직접 이동하면 추종 복귀':'전장을 눌러 부대 전체 이동';
 for(const id of ['moveOrderBtn','focusOrderBtn','followOrderBtn'])$(id).disabled=game.phase!=='playing';
 $('matchStatus').textContent=game.phase==='ready'?'작전 대기':game.phase==='ended'?'작전 종료':game.phase==='playing'?(desk?'남은 방어 시간':duel?`남은 대결 시간`:'경과 시간 · 제한 없음'):'전술 검토 중';
 const lessons=[['mage',game.mageQuestView()],['laser',game.laserQuestView()]];
 for(const [key,quest]of lessons){$(key+'Quest').hidden=!quest||quest.announce;if(quest){$(key+'QuestTitle').textContent=quest.title;$(key+'QuestProgress').textContent=quest.progress;$(key+'QuestReward').textContent=quest.reward;}}
 const announced=lessons.filter(([,q])=>q?.announce);$('lessonBanner').hidden=!announced.length;
 const bannerHTML=announced.map(([,q])=>`<article><small>${q.title==='퀘스트 완료'?'MISSION CLEAR':'NEW QUEST'}</small><b>${q.title}</b><span>${q.progress}</span><strong>${q.reward}</strong><p>${q.hint}</p></article>`).join('');if($('lessonBanner').innerHTML!==bannerHTML)$('lessonBanner').innerHTML=bannerHTML;
 const objective=game.objective();$('objectiveTitle').textContent=objective.title;$('objectiveProgress').textContent=objective.progress;const pressure=game.pressure();$('pressureText').textContent=`위협 Lv.${pressure.tier+1} · 전사 ${game.losses[0]}기 · 상승 ${Math.max(1,Math.ceil(60-game.time%60))}초`;
 $('enemyGrowthText').textContent=`시간 성장 · 체력 +${Math.round((pressure.hp-1)*100)}% / 공격 +${pressure.tier*10}% / 방어 +${pressure.defense}`;
 const boss=game.activeBoss(),bosses=game.isRoomCampaign()?game.units.filter(u=>u.boss&&!u.roadCaptain&&u.hp>0):boss?[boss]:[];$('bossHealthBar').hidden=!boss;if(boss){const percent=Math.max(0,bosses.reduce((n,u)=>n+u.hp,0)/bosses.reduce((n,u)=>n+u.maxHp,0)*100);$('bossHealthFill').style.width=`${percent}%`;$('bossHealthBar').setAttribute('aria-valuenow',String(Math.round(percent)));}$('bossSchedule').hidden=game.mode!=='pve';$('bossSchedule').textContent=boss?(bosses.length>1?'보스 2기 · 각각 강화 보상 · 모두 격파 후 16초 회복':'보스 격파 → 추가 강화 1회 보장'):game.isRoomCampaign()&&!Number.isFinite(game.bossState.nextAt)?'보스 공세 종료 · 최종 기지를 파괴하세요':`다음 보스 ${Math.max(0,Math.ceil(game.bossState.nextAt-game.time))}초 · 격파 ${game.bossState.killed}회`;if(game.isRoomCampaign()&&game.time>=780)$('bossSchedule').textContent+=` · 일반 전차 증원 ${game.roomCampaign.tankSpawned||0}/3`;
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===selectedMode));
 [0,1].forEach(t=>{const p=game.bases[t].hp/game.bases[t].maxHp*100;$(t?'redHealth':'greenHealth').style.width=`${p}%`;$(t?'redHP':'greenHP').textContent=!duel&&t===1&&game.baseShielded()?'잠김':`${Math.ceil(p)}%`;});
 if(game.hasInvulnerableHQ()){$('greenHealth').style.width='100%';$('greenHP').textContent='보호';$('greenLabel').textContent+= ' · HQ 보호';}
 if(desk){$('redHealth').style.width=`${Math.min(100,game.time/1200*100)}%`;$('redHP').textContent=`${Math.floor(Math.min(100,game.time/1200*100))}%`;}
 if(practice){const n=c.phase==='idle'||c.phase==='warning'?2:game.artilleryUnits().length;$('redHealth').style.width=`${n/2*100}%`;$('redHP').textContent=`${n}기`;}
 const rows=roster.filter(t=>game.tech[0][t]>0);const count=game.units.filter(u=>u.team===0&&u.hp>0&&!u.patrol&&u.type!=='leader'&&(!COOP?.active||u.coopOwner===game.coopOwner)).length;
 const signature=rows.map(t=>`${t}${game.tech[0][t]}${game.evolved[t]}:${game.unitCount(t)}:${game.starExperiment?game.starRosterLabel(t):0}`).join('');
 $('unitCount').textContent=`${pad(count+(game.commander(0).hp>0?1:0))} 생존 / 한도 ${game.capacity()+1}`;$('squadLosses').textContent=`전사 ${game.losses[0]}기 · 장비 회수 ${game.salvaged} 자원`;
 const recovery=$('emergencySupportBtn'),low=game.mode==='pve'&&game.losses[0]>0&&count<=2;recovery.hidden=!low||game.phase==='ready'||game.phase==='ended';recovery.disabled=!game.recoveryReady();const wait=Math.max(0,Math.ceil(game.nextRecoveryAt-game.time));recovery.textContent=wait?`긴급 지원 · ${wait}초`:game.cash[0]<45?'긴급 지원 · 45자원 필요':'긴급 지원 ↗';
 if(signature!==rosterKey){rosterKey=signature;$('roster').innerHTML=rows.map(t=>{const n=game.units.filter(u=>u.team===0&&u.type===t&&u.hp>0).length;return `<div class="roster-row"><span class="unit-icon">${unitArt.icon(t,types[t].icon)}</span><div class="roster-info"><b>${unitName(t)} <span class="roster-amount">${game.starExperiment?game.starRosterLabel(t):n+'기'}</span></b><small>${game.evolved[t]?evolutions[t].detail:types[t].role}</small></div><span class="roster-level">${game.evolved[t]?'진화':'Lv.'+game.tech[0][t]}</span></div>`;}).join('');}
 production.forEach(t=>{const b=document.querySelector(`[data-buy="${t}"]`);if(!b)return;b.querySelector('b').textContent=unitName(t);const truck=t==='truck',unlocked=truck||game.tech[0][t]>0,cost=truck?game.truckCost(0):types[t].cost,queued=!$('supportOverlay').hidden?Object.values(queue).reduce((a,b)=>a+b,0):0,pending=!$('supportOverlay').hidden?(queue[t]||0):0,typeFull=!truck&&pending>=game.recruitmentRemaining(t),limit=truck?game.trucks[0]>=7:count+queued>=game.capacity()||typeFull;
  $('prodCost-'+t).textContent=unlocked?`◆ ${cost}`:'잠김';$('prodState-'+t).textContent=truck?(limit?'최대 7대':'수입 +1.8 / 초'):unlocked?(typeFull?game.starExperiment?`${game.starRosterLabel(t)} · 최대 편성`:`동일 병과 ${game.unitCount(t)}/${game.unitTypeCap()}기 · 충원 한도`:limit?`병력 한도 ${game.capacity()}기`:game.starExperiment?`${game.starRosterLabel(t)} · 자동 합성`:`${game.unitCount(t)}/${game.unitTypeCap()}기 · Lv.${game.tech[0][t]} · HP ${types[t].hp}`):'카드로 해금';b.disabled=!unlocked||limit||game.cash[0]-(!$('supportOverlay').hidden?game.queueCost(queue):0)<cost||game.phase!=='choice'||!!game.turnChoice;b.classList.toggle('locked',!unlocked);
 });
 const ult=game.ultimateStatus(),ub=$('ultimateBtn'),flameLeader=game.isFlameCommander(game.commander(0)),ultName=game.isSwordCommander(game.commander(0))?'홍련 회전베기':flameLeader?'지옥불 분사':'쌍권총 난사';ub.disabled=!ult.ready;ub.classList.toggle('ultimate-ready',ult.ready);ub.classList.toggle('ultimate-active',ult.active);ub.style.setProperty('--cooldown',String(ult.cooldown/60));ub.querySelector('b').textContent=!ult.unlocked?'Lv.10':ult.active?`${ult.remaining.toFixed(1)}초`:ult.cooldown?`${Math.ceil(ult.cooldown)}초`:'궁극기';ub.querySelector('small').textContent=!ult.unlocked?'궁극기 잠김':ult.active?ultName:ult.cooldown?'재사용 대기':ultName+' · R';ub.setAttribute('aria-label',!ult.unlocked?'궁극기: 10레벨 해금':ult.active?`궁극기 사용 중 ${ult.remaining.toFixed(1)}초`:ult.cooldown?`궁극기 재사용 대기 ${Math.ceil(ult.cooldown)}초`:'궁극기 '+ultName+' 사용 (R)');
 $('victoryGoal').textContent=desk?'승리 목표: 20분 기지 방어':practice?'승리 목표: 포병 2기 파괴':duel?'승리 목표: 상대 본진 파괴':room?'승리 목표: 20분 최종 보스 처치':'승리 목표: 최종 기지 파괴';
 const commander=game.commander(0),target=objective.target,meters=Math.round(Math.hypot(target.x-commander.x,target.y-commander.y)/10);$('missionLabel').querySelector('div').innerHTML=commander.hp<=0?`제자리 부활 대기<small>쓰러진 위치에서 부활하며, 부활 후 3초간 보호받습니다.</small>`:`${duel?'상대 본진':objective.targetName||target.name||'최종 기지'} 방향 · ${meters}m<small>${desk?'북쪽에서 적 접근 · 기지를 지키며 20분 생존':duel?'본진 파괴 또는 남은 체력 판정':practice?'포병 2기를 파괴하면 승리합니다.':room?'20분 최종 보스 처치로 승리 · 최전방 포탈을 닫아 후반 증원을 줄이세요.':game.crisis.phase==='active'?'포병을 파괴하면 포격이 중단됩니다.':game.mission.stage===3?(game.baseShielded()?'10분 최종 보스와 포병을 격파하세요.':'기지를 파괴하면 승리합니다.'):room&&game.mission.stage>=2?'전장 전체 개방 · 전초기지와 경로 대장을 격파하세요.':'현재 목표를 완료하면 다음 구역이 열립니다.'}</small>`;$('missionLabel').querySelector('span').style.transform=`rotate(${Math.atan2(target.y-commander.y,target.x-commander.x)+Math.PI/2}rad)`;
 if(selectedMode==='idle'){
  $('modeName').textContent='AI 방치 돌파';$('modeTime').textContent='동일 작전 자동 지휘';$('headerMode').textContent='같은 돌파 작전 · AI 이동/성장/지원/건설';$('startDescription').innerHTML=room?'AI가 최전방 포탈을 공략하고 20분 최종 보스 처치를 지휘합니다.<br><strong>포탈이 남으면 15분부터 증원 폭주 · 폐쇄하면 보상과 증원 감소</strong>':'기존 돌파 작전과 같은 전장·적·능력치·보상.<br><strong>AI가 벌레 사냥 → 전초기지 → 최종 기지 파괴까지 지휘합니다.</strong>';
  $('startSubtitle').textContent=`시작 자원 135 · 지휘관 + 소총병 2기 · ${room?'거실 20분 혼합 공세':'기존 뒷마당 작전'}`;$('startRules').innerHTML='<div><b>01</b><span>편성 비율과<strong>성장 순서 설정</strong></span></div><div><b>02</b><span>이동·회피·돌파<strong>AI 자동 지휘</strong></span></div><div><b>03</b><span>원래 기회·비용으로<strong>강화·지원</strong></span></div>';
  canvas.dataset.auto=JSON.stringify({phase:game.phase,time:game.time,stage:game.mission.stage,wave:game.mission.wave,units:game.units.length,kills:game.kills,x:game.commander(0).x,y:game.commander(0).y,action:autoPilot.action,owner:autoSession.owner,cash:game.cash[0],level:game.level,supplies:game.pickups.filter(p=>!p.active).length,supply:autoPilot.supply?.index??null,hq:game.bases[0].hp,defending:!!autoPilot.baseDefense});
  $('orderStatus').textContent=autoSession.busy?'부재중 전투 계산 중':autoSession.owner||!autoPilot?.active?(autoPilot?.action||'AI 출격 대기'):'다른 창의 방치 작전 관전 중';$('matchStatus').textContent=game.phase==='playing'?(desk?'AI 방어 · 남은 시간':'AI 자동 지휘 · 경과 시간'):game.phase==='ended'?'자동 작전 종료':'자동 작전 대기';$('autoState').textContent=autoSession.error?'저장 실패 · 이 창에서만 진행':autoPilot?.baseDefense?`본진 방어 중 · 본진 ${Math.ceil(game.bases[0].hp)} / ${game.bases[0].maxHp}`:autoPilot?.active?'자동 저장 · 창을 닫아도 복귀 시 진행 정산 (최대24시간)':'빌드만 설정하면 AI가 기존 명령과 선택을 대신합니다.';
  for(const id of ['moveOrderBtn','focusOrderBtn','followOrderBtn','ultimateBtn'])$(id).disabled=true;$('emergencySupportBtn').hidden=true;
 }

 renderWaveTest();
}
function showUpgrade(options){
 if(selectedMode==='idle'&&autoPilot?.active)return;
 clearInput();const supply=game.choiceKind==='supply',boss=game.choiceKind==='boss',recovery=game.choiceKind==='recovery'||supply;
 $('cancelRecovery').hidden=!recovery;$('runChoiceSummary').hidden=recovery;$('upgradeCards').hidden=recovery;document.querySelector('.upgrade-layout').classList.toggle('recovery-choice',recovery);
 $('promotionLevel').textContent=recovery?'EMERGENCY SUPPORT · 유료 충원':boss?'BOSS REWARD · 추가 강화':`LEVEL ${pad(game.level)}`;
 $('promotionTitle').textContent=recovery?'분대를 다시 편성하세요.':boss?'보스 격파 보상을 선택하세요.':'레벨업 선택';
 $('promotionDescription').textContent=recovery?'보유 자원으로 해금한 병과를 충원합니다. XP·레벨·강화 기회 소비 없음 · 확정 후 90초 대기.':boss?'레벨업과 별개의 무료 강화입니다. 작전 능력은 같은 5종 선택 한도를 따릅니다.':'병과를 키우거나 능력 5종을 구성하세요. Lv.5 + 지정 능력 Lv.5면 자동 진화합니다.';
 if(!recovery&&game.completedEvolutions()>=5)$('promotionDescription').textContent='진화 5종 완성 · 남은 강화 최대 1개 + 골드 상자 + 긴급 치료. 더 올릴 강화가 없으면 골드·회복 중 선택하세요.';
 document.querySelector('.support-panel').hidden=boss;document.querySelector('.upgrade-layout').classList.toggle('boss-reward',boss);
 $('continueBattle').disabled=true;$('continueBattle').innerHTML='선택 후 확정하고 진격 <span>→</span>';
 $('choiceStatus').textContent=recovery?'지원 편성을 선택하거나 취소하고 계속 진격하세요.':boss?'강화 보상 1개를 선택하세요. 확정 전에는 변경할 수 있습니다.':'강화 · 지원 중 하나를 선택하세요. 확정 전에는 변경할 수 있습니다.';
 document.querySelector('.support-note').textContent=recovery?'보유 자원으로 충원 · 강화·XP 소비 없음':'매 레벨업마다 제공 · 강화와 하나만 선택';
 document.querySelector('.support-menu>small').textContent=recovery?'생산 자원만 사용 · 확정 후 90초 대기 ↗':'자원 + 이번 강화 기회 사용 ↗';
 $('supportMenuBtn').disabled=boss;$('supportMenuBtn').classList.remove('selected');
 $('upgradeCards').innerHTML=options.map((t,i)=>{
  const key=game.abilityKey(t);
  if(key){const b=abilities[key],lv=game.abilities[key],hint=evolutionHint(t);return `<button class="upgrade-card ability-card" aria-pressed="false" data-upgrade="${t}"><span class="card-num">전체 부대</span><span class="card-icon">${upgradeArt.icon(key,b.icon)}</span><span class="card-badge">${lv?'작전 능력 강화':'새 능력 · 5종 중 1칸'}</span><h3>${b.name} 증가</h3><p><strong class="card-effect">${b.name} <em>+${game.abilityStep(key,lv+1)}${b.unit}</em></strong><span class="card-detail">${b.detail}${key==='critDamage'?'<br>기본 치명타 확률 5%':''}</span><small class="evolution-hint">${hint||'이번 작전의 부대 전체에 적용'}</small></p><span class="card-bottom"><span>Lv.${lv} → Lv.${lv+1}<small>누적 ${abilityValue(key,lv+1)} / 최대 5단계</small></span><span class="card-select-label">선택</span></span></button>`;}
  if(fieldCards[t]){const b=fieldCards[t];return `<button class="upgrade-card" aria-pressed="false" data-upgrade="${t}"><span class="card-num">즉시 보급</span><span class="card-icon">${upgradeArt.icon(t,b.icon)}</span><span class="card-badge">능력 슬롯을 사용하지 않음</span><h3>${b.name}</h3><p><strong class="card-effect">${b.detail}</strong></p><span class="card-bottom">즉시 보상<span class="card-select-label">선택</span></span></button>`;}
  const lv=game.tech[0][t],b=types[t],hint=evolutionHint(t);return `<button class="upgrade-card" aria-pressed="false" data-upgrade="${t}"><span class="card-num">0${i+1} / ${lv?'UPGRADE':'UNLOCK'}</span><span class="card-icon unit-card-icon">${unitArt.icon(t,b.icon)}</span><span class="card-badge">${lv?'병과 전체 강화':'새로운 생산 선택'}</span><h3>${b.name} ${lv?'강화':'해금'}</h3><p>${lv?(t==='medic'?'기본 치료량의 15%p 증가 · 치료 간격 1초 고정.':'공격력 +18%p · 체력·공격속도가 증가합니다.'):`${b.role}.<br>다음 지원에서 ◆ ${b.cost}로 충원.`}${game.isFlameCommander(game.commander(0))?(['machinegun','rocket'].includes(t)?'<br>화염방사 대장도 이 병과 강화 효과의 50% 적용':''):'<br>기본 대장·시노·시온도 이 병과 레벨 강화의 30% 적용'}${t==='medic'?'<br>공격속도 강화는 치료 간격에 영향 없음<br>수리로봇도 의무병 레벨·진화 효과 공유<br>동일 대상 중첩 치료 100% → 60% → 40%':''}${t==='lucky'?'<br>장비 추첨은 공속과 무관하게 4초마다 · 레토나 Lv.5 + 이동속도 Lv.5 진화: 꽝을 줄여 희귀 확률 증가':''}<small class="evolution-hint">${hint}</small></p><span class="card-bottom">${lv?`Lv.${lv} → Lv.${lv+1} / 5`:'Lv.1 해금'}<span class="card-select-label">선택</span></span></button>`;
 }).join('');
 $('supportMenuBtn').setAttribute('aria-pressed','false');$('upgradeOverlay').hidden=false;updateUI();if(supply){$('promotionTitle').textContent='지원 보급 · 400 자원 확보';$('promotionLevel').textContent='FIELD SUPPLY · 즉시 충원';$('promotionDescription').textContent='지급받은 400 자원으로 지원을 편성하세요. 남은 자원은 보유하며 레벨·강화 기회를 소모하지 않습니다.';document.querySelector('.support-menu>small').textContent='지급 자원으로 충원 · 강화 기회 소모 없음 ↗';$('supportMenuBtn').onclick();}
}
function choiceDone(selected){
 document.querySelectorAll('[data-upgrade]').forEach(b=>{b.disabled=false;b.classList.toggle('selected',b.dataset.upgrade===selected);b.setAttribute('aria-pressed',String(b.dataset.upgrade===selected));const label=b.querySelector('.card-select-label');if(label)label.textContent=b.dataset.upgrade===selected?'선택 중':'선택';});
 $('supportMenuBtn').disabled=game.choiceKind==='boss';$('supportMenuBtn').classList.toggle('selected',selected==='support');$('supportMenuBtn').setAttribute('aria-pressed',String(selected==='support'));$('continueBattle').disabled=false;$('continueBattle').innerHTML='선택 확정하고 진격 <span>→</span>';
 const key=game.abilityKey(selected),label=key?abilities[key].name:fieldCards[selected]?.name||types[selected]?.name;
 $('choiceStatus').textContent=game.choiceKind==='boss'?`${label} 선택 중 · 확정 전 변경 가능 / 레벨업·자원 소비 없음`:selected==='support'?`지원 ${Object.values(game.pendingChoice.queue).reduce((a,b)=>a+b,0)}기 · ◆ ${game.queueCost(game.pendingChoice.queue)} 선택 중. 확정 전까지 변경 가능.`:`${label} 선택 중 · 확정 전에는 능력 슬롯과 강화 효과가 적용되지 않습니다.`;updateUI();
}
$('emergencySupportBtn').onclick=()=>game.beginRecovery();
$('cancelRecovery').onclick=()=>{if(game.cancelRecovery()){$('upgradeOverlay').hidden=true;$('supportOverlay').hidden=true;clearInput();updateUI();}};
$('upgradeCards').addEventListener('click',e=>{const b=e.target.closest('[data-upgrade]');if(b&&game.stageChoice(b.dataset.upgrade))choiceDone(b.dataset.upgrade);});
$('continueBattle').onclick=()=>{if(game.confirmChoice()){$('upgradeOverlay').hidden=true;clearInput();game.phase='playing';game.levelCheck();updateUI();}else{toast('선택과 자원을 확인하고 다시 확정하세요.');}};

function showResult({result,reason}){if(!COOP?.active&&selectedMode!=='idle'){runSave.clear(game);refreshManualSave();}clearInput();$('upgradeOverlay').hidden=true;$('resultTitle').textContent=result==='win'?'작전 성공.':result==='lose'?'작전 실패.':'팽팽한 대치.';const elapsed=`${Math.floor(game.time/60)}분 ${Math.floor(game.time%60)}초`;$('resultText').textContent=game.isDesktopDefense()?(result==='win'?`20분 동안 기지를 지켰습니다! 책상 방어 성공 · 남은 기지 체력 ${Math.ceil(game.bases[0].hp)}/${game.bases[0].maxHp}.`:`아군 방어 기지가 파괴되었습니다. 생존 시간 ${elapsed} / 목표 20분.`):game.mode==='crisis'?(result==='win'?`포병 2기를 파괴해 포격이 중단되었습니다. 피격 ${game.crisis.hits}회 · 완전 회피 ${game.crisis.dodges}회 · 작전 시간 ${elapsed}.`:`지휘관이 세 번 후퇴해 연습이 종료되었습니다. 피격 ${game.crisis.hits}회 · 다음에는 포격 원이 고정된 뒤 부대 전체를 이동하세요.`):game.mode==='pve'?(result==='win'?`최종 기지를 파괴했습니다. 사냥 구역과 전초기지를 모두 돌파했습니다. 작전 시간 ${elapsed}.`:`지휘관의 후퇴 기회 3회를 모두 사용했습니다. 도달 단계 ${game.mission.stage}/3 · 작전 시간 ${elapsed}.`):reason==='base'?(result==='win'?'상대 본진을 파괴했습니다.':'아군 본진이 파괴되었습니다.'):'3분 대결이 끝나 남은 본진 체력으로 판정했습니다.';$('resultText').textContent+=` 분대원 전사 ${game.losses[0]}기.`;$('runGoldText').textContent=`이번 작전 획득 ◈ ${Math.floor(game.runGold)} · 보유 골드 ${Math.floor(profile.gold)}`;$('resultStats').innerHTML=`<div><b>${game.mode==='crisis'?game.crisis.hits:game.level}</b><span>${game.mode==='crisis'?'포격 피격 횟수':'최종 레벨'}</span></div><div><b>${game.kills}</b><span>처치 수</span></div><div><b>${pad(Math.floor(game.time/60))}:${pad(Math.floor(game.time%60))}</b><span>작전 시간</span></div>`;$('resultOverlay').hidden=false;updateUI();}
async function newGame(start=true){if(COOP?.active)return;if(waveTestBackup)stopWaveTest(false);if(start&&selectedMode!=='idle'&&!runSave.claim()){toast(runSave.error);return;}if(start){enableAudio();await gameAssetsReady;}if(selectedMode==='idle')autoSession.detach();clearInput();for(const id of ['displayOverlay','constructionOverlay','resultOverlay','upgradeOverlay','pauseOverlay','helpOverlay','intelOverlay','supportOverlay','permanentOverlay','evolutionOverlay','fusionOverlay'])$(id).hidden=true;game.commanderId=selectedCommander;game.sniperSkinId=selectedSniperSkin;game.medicSkinId=selectedMedicSkin;game.flameSkinId=selectedFlameSkin;game.reset();if(start&&selectedMode!=='idle')runSave.begin(game);if(selectedMode==='idle'){if(start){if(!startAuto())return;}else{autoPilot=new window.FrontAutoPilot(game,idlePlan);autoPilot.prepare();renderIdlePlan();}}setOrderMode('move');rosterKey='';updateIntel();buildTerrain();if(start){$('startOverlay').hidden=true;if(selectedMode!=='idle')game.start();toast(game.isDesktopDefense()?'20분 동안 버티세요 · 북쪽 공세 / 건설 한도 2배':selectedMode==='idle'?'AI 지휘 시작 · 기존 돌파 작전 규칙으로 진행합니다.':game.mode==='crisis'?'15초 뒤 포병 도착 · 부대 이동과 집중 공격을 시험하세요.':'채집 트럭 2대가 고정 수입을 생산합니다. 레벨업에서 병력을 충원하세요.');}else{$('startOverlay').hidden=false;runSave.release();}refreshManualSave();updateUI();}
 $('startBtn').onclick=async()=>{enableAudio();await gameAssetsReady;if(selectedMode!=='idle'&&!runSave.begin(game)){toast(runSave.error);return;}if(selectedMode==='idle'&&!startAuto())return;setOrderMode('move');$('startOverlay').hidden=true;if(selectedMode!=='idle')game.start();toast(game.isDesktopDefense()?'20분 동안 버티세요 · 북쪽 공세 / 건설 한도 2배':selectedMode==='idle'?'AI 지휘 시작 · 기존 돌파 작전 규칙으로 진행합니다.':game.mode==='crisis'?'15초 뒤 포병 도착 · 부대 이동으로 회피하고 집중 공격으로 포병을 파괴하세요.':game.isRoomCampaign()?'거실 전체 개방 · 길어진 전장을 돌파하고 적 기지를 파괴하세요.':game.mode==='pve'?'목표 1/3 · 벌레 무리 8회를 처치하고 전방 구역을 개방하세요.':'1대1 훈련 · 상대 본진을 파괴하세요. 3분 후 체력으로 판정합니다.');refreshManualSave();updateUI();};
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{selectMode(b.dataset.mode);});$('toMenuBtn').onclick=()=>{if(waveTestBackup)stopWaveTest();else newGame(false);};
 $('againBtn').onclick=()=>{if(waveTestBackup){stopWaveTest(false);openWaveTest();}else newGame();};$('restartBtn').onclick=()=>{if(game.phase==='ready')return;openPause('restart');};
function openPause(){if(COOP?.active){COOP.pause();return;}if(game.phase!=='playing')return;if(selectedMode==='idle')autoSession.tick();clearInput();game.phase='paused';combatAudio.sync(game.phase);$('pauseOverlay').hidden=false;autoCheckpoint();updateUI();}
 $('pauseBtn').onclick=()=>{if(game.phase==='paused'&&!$('pauseOverlay').hidden){$('resumeBtn').click();return;}openPause();};
 $('resumeBtn').onclick=()=>{enableAudio();$('pauseOverlay').hidden=true;game.phase='playing';if(selectedMode==='idle'){autoSession.at=Date.now();autoSession.save();}updateUI();};
 const resetButton=document.createElement('button');resetButton.textContent='새 작전으로 다시 시작';resetButton.className='pause-reset';resetButton.onclick=()=>newGame();$('pauseOverlay').querySelector('.modal').append(resetButton);const menuButton=document.createElement('button');menuButton.textContent='작전 선택으로';menuButton.className='pause-reset';menuButton.onclick=()=>newGame(false);$('pauseOverlay').querySelector('.modal').append(menuButton);
function openModal(id){if(game.phase==='ended')return;returnPhase=game.phase;clearInput();if(game.phase==='playing')game.phase='paused';$(id).hidden=false;updateUI();}
function closeModal(id){$(id).hidden=true;if(game.phase==='paused')game.phase=returnPhase;updateUI();}
 $('helpBtn').onclick=()=>openModal('helpOverlay');$('counterBtn').onclick=()=>openModal('helpOverlay');$('closeHelp').onclick=()=>closeModal('helpOverlay');$('mobileIntel').onclick=()=>{updateIntel();openModal('intelOverlay');};$('closeIntel').onclick=()=>closeModal('intelOverlay');$('ultimateBtn').onclick=()=>{if(selectedMode!=='idle')game.useUltimate();updateUI();};

function setOrderMode(mode){orderMode=mode;for(const [id,value]of [['moveOrderBtn','move'],['focusOrderBtn','focus']]){$(id).classList.toggle('active',value===mode);$(id).setAttribute('aria-pressed',String(value===mode));}updateUI();}
$('moveOrderBtn').onclick=()=>setOrderMode('move');$('focusOrderBtn').onclick=()=>setOrderMode('focus');$('followOrderBtn').onclick=()=>{if(game.followCommander()){setOrderMode('move');clearInput();}};
 window.addEventListener('keydown',e=>{if((e.code==='KeyR'||e.key.toLowerCase()==='r')&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'')&&selectedMode!=='idle'){e.preventDefault();game.useUltimate();updateUI();return;}if(!$('waveTestOverlay').hidden){if(e.key==='Escape'){e.preventDefault();closeWaveTest();}return;}if(!$('displayOverlay').hidden&&e.key!=='Escape')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='Escape'){if(!$('displayOverlay').hidden)closeDisplay();else if(!$('constructionOverlay').hidden)closeConstruction();else if(!$('permanentOverlay').hidden)closePermanent();else if(!$('evolutionOverlay').hidden)closeEvolutions();else if(!$('supportOverlay').hidden)$('supportOverlay').hidden=true;else if(!$('helpOverlay').hidden)closeModal('helpOverlay');else if(!$('intelOverlay').hidden)closeModal('intelOverlay');else if(!$('pauseOverlay').hidden)$('resumeBtn').click();else openPause();}keys[e.key.toLowerCase()]=true;});
 window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});window.addEventListener('blur',()=>{combatAudio.stop();clearInput();if(selectedMode!=='idle'&&!COOP?.active)openPause();else autoCheckpoint();});document.addEventListener('visibilitychange',()=>{if(document.hidden){combatAudio.stop();clearInput();if(selectedMode!=='idle'&&!COOP?.active)openPause();else autoCheckpoint();}else if(selectedMode==='idle')autoSession.tick(true);});
 function worldPosition(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-W/2)/scale+game.camera.x,y:(e.clientY-r.top-H/2)/scale+game.camera.y};}
 function orderAt(e,announce=true){
  if(selectedMode==='idle')return;
  const p=worldPosition(e);if(fieldSupplyUI.armed){fieldSupplyUI.target(p);return;}
  if(orderMode==='move'){game.setMoveOrder(p.x,p.y,announce);return;}
  const targets=[...game.units.filter(u=>u.team!==0&&u.hp>0&&game.visible(u)),...[...game.structures,...game.activeDefenses()].filter(u=>game.mission.stage>=2&&u.hp>0&&game.visible(u)),...game.bases.filter(u=>!u.hidden&&u.hp>0&&u.team===1&&game.mode!=='crisis'&&(game.mode==='duel'||game.mission.stage===3)&&game.visible(u))];
  const hit=targets.map(u=>({u,d:Math.hypot(u.x-p.x,u.y-p.y)})).filter(a=>a.d<Math.max(a.u.r||types[a.u.type]?.r||20,26/scale)).sort((a,b)=>a.d-b.d)[0];
  if(hit)game.setFocus(hit.u);else toast('집중 공격 · 보이는 적이나 포병을 눌러주세요.');
 }
 // In a browser page a touch swipe scrolls; only a tap issues an order.
 // Fullscreen and mouse keep continuous drag orders. The joystick always moves.
 canvas.addEventListener('pointerdown',e=>{if(game.phase!=='playing')return;if(e.pointerType==='touch'&&!window.FrontMobileUI.isFullscreen()){pageTouch={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};return;}movePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);orderAt(e);});
 canvas.addEventListener('pointermove',e=>{if(pageTouch?.id===e.pointerId&&Math.hypot(e.clientX-pageTouch.x,e.clientY-pageTouch.y)>10)pageTouch.moved=true;if(game.phase==='playing'&&e.pointerId===movePointer&&orderMode==='move')orderAt(e,false);});
 canvas.addEventListener('pointerup',e=>{if(pageTouch?.id!==e.pointerId)return;const tap=!pageTouch.moved&&Math.hypot(e.clientX-pageTouch.x,e.clientY-pageTouch.y)<=10;pageTouch=null;if(tap&&game.phase==='playing')orderAt(e);});
 function releaseMove(e){if(e.pointerId===movePointer)movePointer=null;if(pageTouch?.id===e.pointerId)pageTouch=null;}canvas.addEventListener('pointerup',releaseMove);canvas.addEventListener('pointercancel',releaseMove);canvas.addEventListener('lostpointercapture',releaseMove);
 const joy=$('joystick');function moveStick(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,max=r.width*.33,n=Math.hypot(dx,dy),m=Math.min(max,n);stickInput={x:n?dx/n*m/max:0,y:n?dy/n*m/max:0};$('stick').style.transform=`translate(${stickInput.x*max}px,${stickInput.y*max}px)`;}
 joy.addEventListener('pointerdown',e=>{if(game.phase!=='playing')return;e.preventDefault();stickPointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveStick(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)moveStick(e);});function endStick(e){if(e.pointerId===stickPointer){stickPointer=null;stickInput={x:0,y:0};$('stick').style.transform='';}}joy.addEventListener('pointerup',endStick);joy.addEventListener('pointercancel',endStick);joy.addEventListener('lostpointercapture',endStick);
 function input(){if(selectedMode==='idle')return;let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(stickPointer!==null){x=stickInput.x;y=stickInput.y;}game.input={x,y};}
function resize(){const r=canvas.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);const m=display.metrics(W,H,window.devicePixelRatio,displayPrefs,selectedMode==='idle');DPR=m.ratio;canvas.width=m.width;canvas.height=m.height;fog.width=m.width;fog.height=m.height;scale=m.scale*(game.isDesktopDefense()?.65:1);game.viewport={width:W/scale,height:H/scale};renderDisplay();}
function renderDisplay(){const p=displayPrefs;$('displayZoom').value=p.zoom;$('displayZoomValue').textContent=p.zoom+'%';$('displayResolution').value=p.resolution;$('zoomOut').disabled=p.zoom<=75;$('zoomIn').disabled=p.zoom>=200;$('displayPixels').textContent=`현재 전투 해상도 ${canvas.width} × ${canvas.height} · 화면 크기 ${Math.round(W)} × ${Math.round(H)}`;}
function changeDisplay(value){displayPrefs=display.clean({...displayPrefs,...value});try{display.save(localStorage,displayPrefs);}catch{}resize();}
async function openDisplay(){if(autoSession.busy)return;if(selectedMode==='idle'&&game.phase==='playing')await autoSession.tick();displayReturn=game.phase;displayFocus=document.activeElement;clearInput();if(game.phase==='playing')game.phase='paused';combatAudio.sync(game.phase);autoCheckpoint();renderDisplay();soundUI();$('displayOverlay').hidden=false;$('closeDisplay').focus();updateUI();}
function closeDisplay(){if($('displayOverlay').hidden)return;combatAudio.stop();$('displayOverlay').hidden=true;if(game.phase==='paused'&&displayReturn==='playing'){game.phase='playing';if(selectedMode==='idle'){autoSession.at=Date.now();autoSession.save();}}displayFocus?.focus?.({preventScroll:true});updateUI();}
for(const id of ['displayBtn','startDisplay','pauseDisplay'])$(id).onclick=openDisplay;
$('closeDisplay').onclick=closeDisplay;$('applyDisplay').onclick=closeDisplay;
$('displayZoom').oninput=e=>changeDisplay({zoom:e.target.value});$('zoomOut').onclick=()=>changeDisplay({zoom:displayPrefs.zoom-5});$('zoomIn').onclick=()=>changeDisplay({zoom:displayPrefs.zoom+5});$('displayResolution').onchange=e=>changeDisplay({resolution:e.target.value});$('resetDisplay').onclick=()=>changeDisplay(display.defaults);
$('displayOverlay').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const nodes=[...$('displayOverlay').querySelectorAll('button,input,select')].filter(n=>!n.disabled),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 new ResizeObserver(resize).observe($('battleFrame'));
window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>requestAnimationFrame(resize));
function rr(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function text(c,t,x,y,size,color,weight='600'){c.fillStyle=color;c.font=`${weight} ${size}px "Noto Sans KR",sans-serif`;c.textAlign='center';c.fillText(t,x,y);}
function buildTerrain(){
 terrain=document.createElement('canvas');const world=game.bounds(),cacheScale=world.id==='livingroom'?Math.min(1,6144/world.height):1;terrain.width=Math.round(world.width*cacheScale);terrain.height=Math.round(world.height*cacheScale);const c=terrain.getContext('2d');c.scale(terrain.width/world.width,terrain.height/world.height);if(game.isDesktopDefense())window.FrontDesktop.terrain(c,game);else if(game.bounds().id==='livingroom')window.FrontLivingRoom.terrain(c,game);else window.FrontGarden.terrain(c,game,worldModels,groundTexture);
}
async function renderMapPreviews(){
 const views={backyard:{w:1600,x:800,y:1900},livingroom:{w:2900,x:1500,y:5800},desktop:{w:2400,x:1200,y:1400}};
 for(const [id,v]of Object.entries(views)){
  const preview=document.createElement('canvas');preview.width=480;preview.height=300;const c=preview.getContext('2d'),g=new window.FrontGame({},new window.FrontProfile(),{map:id}),z=480/v.w,h=300/z;
  c.scale(z,z);c.translate(-v.x+v.w/2,-v.y+h/2);
  if(id==='livingroom'){window.FrontLivingRoom.terrain(c,g);for(const o of [...g.obstacles].sort((a,b)=>window.FrontLivingRoom.depth(a)-window.FrontLivingRoom.depth(b)))window.FrontLivingRoom.furniture(c,o);}
  else if(id==='desktop'){window.FrontDesktop.terrain(c,g);for(const o of [...g.obstacles].sort((a,b)=>window.FrontDesktop.depth(a)-window.FrontDesktop.depth(b)))window.FrontDesktop.obstacle(c,o);}
  else{window.FrontGarden.terrain(c,g,worldModels,groundTexture);g.obstacles.forEach((o,i)=>window.FrontGarden.obstacle(c,o,i,worldModels));for(const p of window.FrontGarden.grassPatches(g))window.FrontGarden.grass(c,p,[],0);}
  const url=preview.toDataURL('image/webp',.86);document.querySelector(`[data-map-preview="${id}"]`).src=url;if(id==='livingroom')document.querySelectorAll('[data-map-preview^="livingroom-star"]').forEach(img=>img.src=url);
  await new Promise(resolve=>requestAnimationFrame(resolve));
 }
}
function drawBase(b){if(b.hidden)return;if(b.team===1&&game.isRoomCampaign())return;if(window.FrontLivingRoom.field(ctx,'hq-'+b.team,b.x,b.y)||worldModels.draw(ctx,'hq-'+b.team,b.x,b.y)){text(ctx,b.team?'CORAL HQ':game.hasInvulnerableHQ()?'GREEN HQ · 공격 불가':'GREEN HQ',b.x,b.y+100,12,b.team?'#f0b39b':'#e3edbf');return;}const t=b.team,col=t?'#ba6958':'#68874e',dark=t?'#8f4d40':'#48633a';ctx.save();ctx.translate(b.x,b.y);circle(ctx,0,0,115,null,t?'#a65e4933':'#4e754133');rr(ctx,-75,-54,160,130,9,'#354e3433');rr(ctx,-83,-65,160,130,8,dark);rr(ctx,-83,-71,160,123,8,col);rr(ctx,-62,-54,118,82,5,t?'#c77b68':'#7f9a64');rr(ctx,-26,-23,45,41,3,dark);ctx.fillStyle='#dce5bc';ctx.fillRect(-7,-35,7,28);ctx.fillRect(-18,-24,29,7);ctx.fillStyle='#ddd9b8';ctx.fillRect(60,-118,3,97);ctx.beginPath();ctx.moveTo(63,-117);ctx.lineTo(103,-104);ctx.lineTo(63,-92);ctx.fillStyle=t?'#c46d5a':'#66884d';ctx.fill();text(ctx,t?'CORAL HQ':game.hasInvulnerableHQ()?'GREEN HQ · 공격 불가':'GREEN HQ',-3,93,12,t?'#f0b39b':'#e3edbf');ctx.restore();}
function drawPost(p){if(worldModels.draw(ctx,p.hp>0?'post':'post-ruin',p.x,p.y)){text(ctx,p.hp>0?p.name:'전초기지 파괴됨',p.x,p.y+79,12,p.hp>0?'#f1ddb7':'#c9c8aa');if(p.hp>0){rr(ctx,p.x-56,p.y+91,112,6,2,'#3f4436');rr(ctx,p.x-56,p.y+91,112*p.hp/p.maxHp,6,2,'#d7a27b');}return;}ctx.save();ctx.translate(p.x,p.y);const alive=p.hp>0;rr(ctx,-62,-43,136,110,8,'#2d402b35');rr(ctx,-68,-55,136,105,8,alive?'#875846':'#77755c');rr(ctx,-61,-63,122,101,6,alive?'#b48665':'#9c9b80');if(alive){rr(ctx,-33,-37,66,55,7,'#966b4f');rr(ctx,-7,-73,14,51,3,'#6e5140');rr(ctx,-5,-73,10,39,2,'#c39c78');circle(ctx,0,-9,16,'#8b654b');}else{ctx.strokeStyle='#68694f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-38,-40);ctx.lineTo(5,10);ctx.lineTo(37,-35);ctx.stroke();}text(ctx,alive?p.name:'전초기지 파괴됨',0,79,12,alive?'#f1ddb7':'#c9c8aa');if(alive){rr(ctx,-56,91,112,6,2,'#3f4436');rr(ctx,-56,91,112*p.hp/p.maxHp,6,2,'#d7a27b');}ctx.restore();}
function drawDefense(p){
 if(p.fencePost){window.FrontRoomFenceArt.post(ctx,p,game);return;}
 if(p.defenseKind==='laserTower'){if(!game.visible(p))return;ctx.save();ctx.translate(p.x,p.y);if(p.hp>0)unitModels.draw(ctx,p,game.time);else{window.FrontGuardianFX.wreck(ctx,p,game.time);text(ctx,'레이저 포탑 잔해'+(Number.isFinite(p.respawnAt)?' · 재조립 '+Math.max(0,Math.ceil(p.respawnAt-game.time))+'초':''),0,55,10,'#b8a59d');}ctx.restore();if(p.hp>0){text(ctx,p.name+' · 사거리 '+game.defenseStats(p).range,p.x,p.y+24,11,'#ffc2b7');rr(ctx,p.x-38,p.y+34,76,5,2,'#3c2929');rr(ctx,p.x-38,p.y+34,76*p.hp/p.maxHp,5,2,'#fa887d');}return;}

 if(p.defenseKind==='missileTower'&&p.hp>0&&window.FrontLivingRoom.field(ctx,'missileTower',p.x,p.y,p.face||0)){text(ctx,p.name,p.x,p.y+64,11,'#f0c9a3');rr(ctx,p.x-38,p.y+73,76,5,2,'#363d2d');rr(ctx,p.x-38,p.y+73,76*p.hp/p.maxHp,5,2,'#e5a279');return;}
 if(worldModels.draw(ctx,p.defenseKind+(p.hp>0?'':'-ruin'),p.x,p.y)){text(ctx,p.hp>0?p.name:'수비 건물 잔해',p.x,p.y+64,11,p.hp>0?'#f0d9ac':'#adb58c');if(p.hp>0){rr(ctx,p.x-38,p.y+73,76,5,2,'#363d2d');rr(ctx,p.x-38,p.y+73,76*p.hp/p.maxHp,5,2,'#dfad74');}return;}
 ctx.save();ctx.translate(p.x,p.y);const alive=p.hp>0,mortar=p.defenseKind==='mortarPit',missile=p.defenseKind==='missileTower',col=alive?'#b58260':'#77785f';
 circle(ctx,4,9,51,'#273a2a44');
 if(missile){rr(ctx,-38,-30,76,66,6,'#684d3e');if(alive){ctx.save();ctx.rotate((p.face||0)+Math.PI/2);rr(ctx,-27,-32,54,56,4,'#b87c60');for(const x of [-14,14])for(const y of [-28,-5]){rr(ctx,x-8,y,16,17,2,'#493e31');circle(ctx,x,y+6,4,'#e0cba1');}ctx.restore();}}
 else if(mortar){circle(ctx,0,0,42,'#685f47');for(let i=0;i<10;i++){ctx.save();ctx.rotate(i*Math.PI/5);rr(ctx,-12,-45,24,13,4,col);ctx.restore();}circle(ctx,0,0,26,alive?'#a28e64':'#8a8b70');if(alive){rr(ctx,-7,-38,14,43,4,'#554c36');circle(ctx,0,-32,8,'#2b3226');rr(ctx,-23,11,17,12,2,'#c5aa6a');}}
 else{rr(ctx,-47,-31,94,72,7,'#5b5440');rr(ctx,-44,-38,88,68,7,col);rr(ctx,-30,-25,60,32,3,alive?'#6b4c36':'#62674f');if(alive){rr(ctx,-17,-15,34,11,2,'#322e24');rr(ctx,-3,-54,6,44,2,'#4c4230');rr(ctx,-28,13,56,9,2,'#c5996e');}}
 if(!alive){ctx.strokeStyle='#4e5542';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-20,-20);ctx.lineTo(10,20);ctx.lineTo(25,-10);ctx.stroke();}
 text(ctx,alive?p.name:'수비 건물 잔해',0,64,11,alive?'#f0d9ac':'#adb58c');
 if(alive){rr(ctx,-38,73,76,5,2,'#363d2d');rr(ctx,-38,73,76*p.hp/p.maxHp,5,2,'#dfad74');}
 ctx.restore();
}
function drawMortarShell(p){
 const k=clamp(1-(p.landAt-game.time)/p.delay,0,1),friendly=p.team===0,color=friendly?'#91efa0':'#ff9e72';
 circle(ctx,p.x,p.y,p.radius,friendly?'#57bf6c28':'#d6523330',color);ctx.lineWidth=2;circle(ctx,p.x,p.y,p.radius*k,null,color);
 ctx.setLineDash([6,5]);circle(ctx,p.x,p.y,p.radius+4,null,color);ctx.setLineDash([]);
 ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p.x-12,p.y);ctx.lineTo(p.x+12,p.y);ctx.moveTo(p.x,p.y-12);ctx.lineTo(p.x,p.y+12);ctx.stroke();
 text(ctx,`${friendly?'아군':'적'} ${p.kind==='missile'?'미사일':'박격포'} · ${Math.max(0,p.landAt-game.time).toFixed(1)}초`,p.x,p.y+p.radius+20,12,color);
}
// Presentation-only interpolation leaves combat, saves and AI on the fixed simulation clock.
const aiVisualPositions=new WeakMap();
function drawUnit(u){
 if(COOP?.active){COOP.drawUnit(ctx,u,drawUnitRaw);return;}
 if(selectedMode!=='idle'||game.phase!=='playing'){aiVisualPositions.delete(u);drawUnitRaw(u);return;}
 const now=performance.now();let s=aiVisualPositions.get(u);
 if(!s||game.time<s.time||game.time-s.time>.2||Math.hypot(u.x-s.x,u.y-s.y)>120){s={time:game.time,x:u.x,y:u.y,px:u.x,py:u.y,at:now};aiVisualPositions.set(u,s);}
 else if(s.time!==game.time){s.px=s.x;s.py=s.y;s.x=u.x;s.y=u.y;s.time=game.time;s.at=now;}
 const alpha=clamp((now-s.at)/50,0,1);ctx.save();ctx.translate((s.px-s.x)*(1-alpha),(s.py-s.y)*(1-alpha));drawUnitRaw(u);ctx.restore();
}
function drawUnitRaw(u){
 const t=u.team,alive=u.hp>0,evolved=window.FrontUnitLabels.isEvolved(game,u);if(!alive){if(u.type==='medic'&&t===0&&u.appearance==='rina'&&Number.isFinite(u.diedAt)){ctx.save();ctx.translate(u.x,u.y);unitModels.draw(ctx,u,game.time);ctx.restore();}if(u.guardianRespawn&&Number.isFinite(u.respawnAt)&&game.mission.stage>=3&&game.visible(u))text(ctx,'얼음 마녀 귀환 · '+Math.max(0,Math.ceil(u.respawnAt-game.time))+'초',u.x,u.y+28,11,'#acdfff');if(u.type==='leader'&&t===0){const p=point(u);text(ctx,u.deadUntil>game.time?'제자리 부활 '+Math.ceil(u.deadUntil-game.time)+'초':'부활 기회 소진',u.x,u.y-25,13,'#f5edc6');}return;}
 if(t&&!game.visible(u))return;
 const col=t===2?'#77543a':t?'#bd6e55':'#5f863e',light=t===2?'#a17b4d':t?'#d88c71':'#84a953',dark=t===2?'#493c2b':t?'#82472f':'#36592b';ctx.save();ctx.translate(u.x,u.y);window.FrontHitFeedback.transform(ctx,u,game.time);

 if(u.type==='leader'&&t===0){circle(ctx,0,0,25,null,'#edf6cb99');ctx.setLineDash([3,7]);circle(ctx,0,0,30,null,'#edf6cb55');ctx.setLineDash([]);if(game.commanderReviveProtected(u)){circle(ctx,0,-26,43,'#83e8ff20','#9eefff');text(ctx,`부활 보호 ${Math.ceil(u.reviveProtectionUntil-game.time)}초`,0,-82,11,'#b8f4ff');}}
 if(evolved){circle(ctx,0,0,types[u.type].r+9,null,'#e9c76b');}
 if(u.boss){circle(ctx,0,0,48,null,'#e5a251');ctx.setLineDash([5,5]);circle(ctx,0,0,54,null,'#e5a25188');ctx.setLineDash([]);}
 if(game.isSupplyTroop(u)){if(u.type==='titan')ctx.scale(1.2,1.2);ctx.filter=u.type==='spectre'?'saturate(.35) brightness(1.4)':u.type==='titan'?'sepia(.5) hue-rotate(150deg) saturate(1.6) brightness(1.05)':'grayscale(.8) brightness('+(0.7+(window.FrontHitFeedback.pose(u,game.time)?.flash||0)*.7)+') contrast(1.2)';}
 if(!unitModels.draw(ctx,u,game.time)){ctx.save();
 const vehicle=['tank','crimsonAce','guntruck','lucky'].includes(u.type),bodyFace=Number.isFinite(u.moveFace)?u.moveFace:u.face,aimFace=Number.isFinite(u.turretFace)?u.turretFace:Number.isFinite(u.aimFace)?u.aimFace:u.face;
 ctx.rotate((vehicle?bodyFace:u.face)+Math.PI/2);ctx.translate(0,vehicle?0:(u.recoil||0)*22);if(u.boss)ctx.scale(1.35,1.35);
 if(unitModels.manifest?.insectDesign!=='classic'&&window.FrontToyInsects?.draw(ctx,u)){
  // Rounded toy fallback uses the same six species as the baked mesh set.
 }else if(types[u.type].flying){
  ctx.translate(0,-types[u.type].flightHeight);const hornet=u.type==='hornet';ctx.save();ctx.globalAlpha=.4;ctx.fillStyle='#ecdfb1';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*20,3,22,6+Math.sin(game.time*30)*3,side*.5,0,Math.PI*2);ctx.fill();}ctx.restore();circle(ctx,0,4,hornet?12:10,hornet?'#e0a53c':'#aa792b');rr(ctx,-10,-1,20,4,2,'#403025');rr(ctx,-8,9,16,4,2,'#403025');circle(ctx,0,-13,hornet?9:7,hornet?'#e48a2d':'#634521');circle(ctx,-5,-16,3,'#29251d');circle(ctx,5,-16,3,'#29251d');
 }else if(u.type==='bladeGuard'){
  const step=Math.sin(u.walk||0)*3;ctx.lineCap='round';rr(ctx,-10,1,7,16+step,3,'#252630');rr(ctx,3,1,7,16-step,3,'#252630');rr(ctx,-14,-35,17,42,3,'#34353d');rr(ctx,-15,-29,2,28,1,'#ed3c9d');rr(ctx,-10,-17,21,22,5,'#252630');rr(ctx,-11,-32,23,26,8,'#c5b4b5');circle(ctx,0,-24,9,'#ead8cf');circle(ctx,-4,-25,2,'#d25088');circle(ctx,4,-25,2,'#d25088');ctx.save();ctx.rotate(-.12);ctx.beginPath();ctx.ellipse(0,-35,14,6,0,0,Math.PI*2);ctx.fillStyle='#272831';ctx.fill();ctx.restore();ctx.strokeStyle='#e83d9c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(13,-7);ctx.lineTo(u.bayonetThrustUntil>game.time?-24:20,u.bayonetThrustUntil>game.time?-30:-37);ctx.stroke();
 }else if(u.type==='stagBeetle'||u.type==='rhinoBeetle'){
  const rhino=u.type==='rhinoBeetle',shell=rhino?'#654331':'#303d33',edge=rhino?'#b18a54':'#8c9870';
  ctx.scale(rhino?1.5:1.25,rhino?1.5:1.25);
  ctx.strokeStyle='#282b21';ctx.lineWidth=3;ctx.lineCap='round';
  for(const side of [-1,1])for(let i=0;i<3;i++){const y=i*10-10,w=Math.sin(u.walk+i)*2;ctx.beginPath();ctx.moveTo(side*10,y);ctx.lineTo(side*(21+w),y+3);ctx.lineTo(side*(25+w),y+11);ctx.stroke();}
  ctx.fillStyle=shell;ctx.beginPath();ctx.ellipse(0,5,rhino?16:14,22,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=edge;ctx.lineWidth=1.5;ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,26);ctx.stroke();
  ctx.strokeStyle=rhino?'#927144':'#60725a';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(-6,2,4,13,-.15,Math.PI*.7,Math.PI*1.6);ctx.stroke();
  rr(ctx,-13,-23,26,16,6,shell);circle(ctx,0,-24,9,shell);circle(ctx,-7,-27,1.6,'#e4c47a');circle(ctx,7,-27,1.6,'#e4c47a');
  ctx.fillStyle=rhino?'#c0a06a':'#acb582';ctx.strokeStyle='#262d22';ctx.lineWidth=1.5;
  if(rhino){ctx.beginPath();ctx.moveTo(-4,-26);ctx.lineTo(-5,-39);ctx.lineTo(-9,-47);ctx.lineTo(-5,-45);ctx.lineTo(0,-50);ctx.lineTo(5,-45);ctx.lineTo(9,-47);ctx.lineTo(5,-39);ctx.lineTo(4,-26);ctx.closePath();ctx.fill();ctx.stroke();}
  else for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*4,-27);ctx.lineTo(side*17,-38);ctx.lineTo(side*13,-50);ctx.lineTo(side*5,-53);ctx.lineTo(side*9,-44);ctx.lineTo(side*8,-39);ctx.lineTo(side*3,-37);ctx.lineTo(side*6,-34);ctx.closePath();ctx.fill();ctx.stroke();}
 }else if(['ant','soldierAnt','beetle','bruteBeetle'].includes(u.type)){
  if(u.type==='bruteBeetle')ctx.scale(1.7,1.7);else if(u.type==='beetle')ctx.scale(1.35,1.35);else if(u.type==='soldierAnt')ctx.scale(1.15,1.15);
  const wiggle=Math.sin(u.walk)*3;ctx.strokeStyle=dark;ctx.lineWidth=2;ctx.lineCap='round';for(let side of [-1,1])for(let i=0;i<3;i++){const y=i*7-9;ctx.beginPath();ctx.moveTo(side*4,y);ctx.lineTo(side*(13+(i%2?wiggle:-wiggle)),y+side*3);ctx.lineTo(side*(19+(i%2?wiggle:-wiggle)),y+8);ctx.stroke();}ctx.beginPath();ctx.moveTo(-4,-14);ctx.lineTo(-11,-24);ctx.moveTo(4,-14);ctx.lineTo(11,-24);ctx.stroke();ctx.save();ctx.scale(1,1.25);circle(ctx,0,7,9,u.type==='bruteBeetle'?'#4b5140':u.type==='beetle'?'#5a6336':u.type==='soldierAnt'?'#925a32':col);ctx.restore();if(u.type==='bruteBeetle'){for(const side of [-1,1])for(let i=0;i<3;i++){ctx.fillStyle='#c7ad69';ctx.beginPath();ctx.moveTo(side*7,i*6);ctx.lineTo(side*14,i*6-3);ctx.lineTo(side*9,i*6+5);ctx.fill();}}if(u.type==='beetle'||u.type==='bruteBeetle'){ctx.strokeStyle='#c0b278';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(0,17);ctx.stroke();}circle(ctx,0,-3,6,dark);circle(ctx,0,-12,7,col);circle(ctx,-3,-14,2,light);circle(ctx,-3,-17,1,'#eadfb5');circle(ctx,3,-17,1,'#eadfb5');
 }else if(u.type==='bayonet'){
  rr(ctx,-6,0,5,15,1,'#eee2c7');rr(ctx,2,0,5,15,1,'#eee2c7');rr(ctx,-8,-20,17,23,3,'#b33239');ctx.fillStyle='#d8b45b';for(let i=0;i<3;i++)ctx.fillRect(-5,-16+i*6,10,2);circle(ctx,0,-27,7,'#e4c18c');rr(ctx,-9,-48,18,18,3,'#27262b');rr(ctx,-10,-33,20,3,1,'#d8b45b');rr(ctx,5,-39,4,38,1,'#7d5635');ctx.fillStyle='#d7e2d5';ctx.beginPath();ctx.moveTo(5,-39);ctx.lineTo(7,-54);ctx.lineTo(9,-39);ctx.fill();
 }else if(u.type==='artillery'){
  for(const x of [-27,17])rr(ctx,x,-18,10,42,4,'#403f31');rr(ctx,-21,-25,42,53,5,col);rr(ctx,-16,-21,32,39,4,light);circle(ctx,0,0,15,dark);rr(ctx,-5,-62,10,64,3,dark);rr(ctx,-3,-61,6,53,2,light);rr(ctx,-25,20,8,25,2,dark);rr(ctx,17,20,8,25,2,dark);
 }else if(u.type==='lucky'){
  for(const y of [-22,22]){rr(ctx,-27,y-9,10,18,3,'#29372b');rr(ctx,17,y-9,10,18,3,'#29372b');}
  rr(ctx,-22,-37,44,73,5,'#4b613b');rr(ctx,-19,-35,38,25,4,'#819255');rr(ctx,-18,-9,36,40,3,'#5f7647');rr(ctx,-16,-9,32,14,2,'#698f91');rr(ctx,-16,8,32,20,3,'#455734');circle(ctx,0,38,11,'#28362a');
  ctx.fillStyle='#c5e783';for(const [x,y]of [[-5,12],[5,12],[-5,22],[5,22]])circle(ctx,x,y,5,'#c5e783');rr(ctx,-18,-38,8,4,1,'#efe1ac');rr(ctx,10,-38,8,4,1,'#efe1ac');
 }else if(u.type==='guntruck'){
  for(const y of [-19,19]){rr(ctx,-25,y-8,9,17,3,'#293b2b');rr(ctx,16,y-8,9,17,3,'#293b2b');}
  rr(ctx,-20,-32,40,66,4,dark);rr(ctx,-18,-31,36,24,4,light);rr(ctx,-13,-28,26,10,2,'#b9d0b0');rr(ctx,-18,-5,36,35,3,col);rr(ctx,-14,-1,28,27,2,dark);rr(ctx,-11,2,22,20,2,col);
  ctx.save();ctx.translate(0,8);ctx.rotate(aimFace-bodyFace);ctx.translate(0,-8+(u.recoil||0)*22);circle(ctx,0,8,9,light);rr(ctx,-3,-18,6,31,2,dark);rr(ctx,-7,-3,14,9,2,light);circle(ctx,0,8,5,dark);ctx.restore();ctx.fillStyle='#e9ddaa';ctx.fillRect(-15,-33,8,3);ctx.fillRect(7,-33,8,3);
 }else if(u.type==='tank'||u.type==='crimsonAce'){
  rr(ctx,-26,-31,11,59,4,dark);rr(ctx,15,-31,11,59,4,dark);for(let y=-24;y<27;y+=9){ctx.fillStyle='#0b211a30';ctx.fillRect(-26,y,11,2);ctx.fillRect(15,y,11,2);}rr(ctx,-20,-29,40,57,5,col);rr(ctx,-15,-26,30,48,3,light);ctx.save();ctx.rotate(aimFace-bodyFace);ctx.translate(0,(u.recoil||0)*22);rr(ctx,-12,-14,24,28,5,col);rr(ctx,-4,-44,8,35,2,dark);rr(ctx,-3,-44,6,27,2,light);circle(ctx,0,1,6,dark);circle(ctx,-2,-1,5,col);ctx.restore();
 }else{
  const stride=Math.sin(u.walk)*3;rr(ctx,-10,-1,7,17+stride,3,dark);rr(ctx,3,-1,7,17-stride,3,dark);rr(ctx,-12,-10,24,21,5,col);rr(ctx,-15,-10,7,20,3,col);rr(ctx,8,-11,7,18,3,light);rr(ctx,-11,3,23,11,4,dark);rr(ctx,-9,3,19,8,3,col);
  if(u.type==='sniper'){rr(ctx,8,-45,4,44,1,dark);rr(ctx,6,-21,9,24,2,col);rr(ctx,5,-29,10,7,2,'#b5c59b');ctx.fillStyle=light;for(let i=0;i<5;i++)ctx.fillRect(-12+i*5,-12+(i%2)*3,4,7);}else if(u.type==='machinegun'){rr(ctx,7,-39,9,38,2,dark);rr(ctx,6,-22,13,13,2,col);rr(ctx,16,-19,9,11,2,'#a5a35a');ctx.fillStyle='#c8b575';for(let i=0;i<4;i++)ctx.fillRect(17,-17+i*3,7,1);ctx.strokeStyle=dark;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(10,-27);ctx.lineTo(1,-17);ctx.moveTo(13,-27);ctx.lineTo(23,-17);ctx.stroke();}else if(u.type==='mortar'){rr(ctx,-17,-2,34,19,4,dark);rr(ctx,12,-34,12,36,3,'#8b9b65');circle(ctx,18,-33,6,'#2f442c');ctx.strokeStyle=light;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(17,-9);ctx.lineTo(26,10);ctx.moveTo(17,-9);ctx.lineTo(8,10);ctx.stroke();rr(ctx,-18,-15,9,14,2,'#b2b273');}else if(u.type==='rocket'){rr(ctx,9,-35,9,42,3,dark);rr(ctx,10,-31,7,31,2,'#84946c');rr(ctx,7,-36,13,7,2,col);}else if(u.type==='medic'){rr(ctx,6,-14,13,17,3,'#d7dfbb');ctx.fillStyle='#faf4d8';ctx.fillRect(-2,-6,5,12);ctx.fillRect(-5,-3,11,5);}else{rr(ctx,9,-29,5,29,1,dark);rr(ctx,8,-14,7,17,2,col);}
  circle(ctx,0,-8,12,dark);circle(ctx,-1,-11,11,col);ctx.beginPath();ctx.arc(-3,-14,7,Math.PI,Math.PI*1.8);ctx.strokeStyle=light;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=dark;ctx.fillRect(-12,-6,24,3);
  if(u.type==='leader'){ctx.fillStyle='#f4df92';ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?2.3:5;const x=Math.cos(a)*r,y=-10+Math.sin(a)*r;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();}
 }
 if(evolved){rr(ctx,-10,-6,20,4,1,'#f1d582');}
 ctx.restore();}
 ctx.filter='none';if(game.isSupplyTroop(u)){circle(ctx,0,-46,5,'#f2d88f','#33291a');text(ctx,'✦',0,-42,9,'#201e19');}
 if(u.type==='blizzardMage')window.FrontGuardianFX.shield(ctx,u,game.time);
 if(u.flash){ctx.globalAlpha=u.flash/.13*.65;circle(ctx,0,0,types[u.type].r+2,null,'#fff4c8');ctx.globalAlpha=1;}
 ctx.restore();
 if(game.isSupplyTroop(u))text(ctx,({commando:'블랙베어',spectre:'고스트',titan:'타이탄 · 최상위'})[u.type]+' · 특수부대',u.x,u.y-108,12,u.type==='titan'?'#ffe49a':'#e7c4ff');
 if(evolved)battleFx.drawEvolutionUnit(ctx,u,game.time);
 if(u.type==='blizzardMage')text(ctx,(u.iceShield&&game.time<=u.iceShield.until?'아이스 실드 · 박격포 차단':(u.mobileMage?'이동형 얼음 마녀':'얼음 마녀')+' · 사거리 '+window.FrontGuardians.range),u.x,u.y-103,11,'#c4edff');
 if(u.boss&&['bayonetCaptain','bladeGuard','bikeRaider'].includes(u.type))text(ctx,'BOSS / '+u.bossName,u.x,u.y-176,13,'#ffe294');
 if(u.type==='lucky'){ctx.save();ctx.translate(0,-16);battleFx.luckyReels(ctx,u,game);ctx.restore();}
 if(!u.boss&&u.type==='bikeRaider'&&(!u.bikeAttack||u.bikeAttack.phase!=='windup'))text(ctx,game.time<(u.bikeRecoverUntil||0)?'제동 · 공격 기회':'바이크 돌격병',u.x,u.y-88,10,'#ffd2be');

 if(!u.boss&&types[u.type].stab&&(u.type==='bayonetCaptain'||u.bayonetAttack||game.units.find(v=>v.type==='bayonet'&&v.hp>0&&game.visible(v))===u))text(ctx,u.bayonetAttack?'총검 준비!':types[u.type].name,u.x,u.y-(u.type==='bayonetCaptain'?99:78),10,u.bayonetAttack?'#ffd796':u.type==='bayonetCaptain'?'#ffdc80':'#ead3a2');
 if(!u.boss&&u.type==='bladeGuard'&&(u.bayonetAttack||game.units.find(v=>v.type==='bladeGuard'&&v.hp>0&&game.visible(v))===u))text(ctx,u.bayonetAttack?'베기 준비!':'블랙 실드 검병',u.x,u.y-86,10,u.bayonetAttack?'#ffb0df':'#e8bcd7');
 if(u.type==='crimsonAce')text(ctx,(u.boss?'BOSS / ':'')+'진홍 전차 에이스 · 중장갑',u.x,u.y-158*(u.boss?1.35:1),u.boss?12:10,'#f1bd7d');
 if(u.type==='bruteBeetle')text(ctx,'거대 갑충',u.x,u.y-67,11,'#f0d597');
 if(u.type==='stagBeetle'||u.type==='rhinoBeetle')text(ctx,(u.boss?'BOSS / '+u.bossName:types[u.type].name)+' · 장갑',u.x,u.y-(u.type==='rhinoBeetle'?91:78)*(u.boss?1.35:1),u.boss?13:11,'#f0d597');
 if(types[u.type].flying&&(u.boss||game.units.find(v=>v.type===u.type&&!v.boss&&v.hp>0&&game.visible(v))===u))text(ctx,(u.boss?'BOSS / '+u.bossName:types[u.type].name)+(u.type==='hornet'?' · 중장갑':' · 경장갑'),u.x,u.y-((u.visualFlightHeight??types[u.type].flightHeight)+49)*(u.boss?1.35:1),u.boss?13:10,u.boss?'#ffc079':'#f2d694');
 if(u.star>=2||u.boss||u.hp<u.maxHp||u.type==='leader'||u.type==='artillery'||u.type==='bayonetCaptain'){
  const vehicle=['tank','crimsonAce','guntruck','artillery','lucky'].includes(u.type),human=roster.includes(u.type)&&!vehicle||u.type==='leader'||types[u.type].stab,w=u.boss?84:vehicle?48:30;
  const rise=(u.type==='medic'&&u.team===0&&u.appearance==='rina'?78+(u.star>=2?8:0):types[u.type].flying?(u.visualFlightHeight??types[u.type].flightHeight)+42:u.type==='crimsonAce'?140:u.type==='rhinoBeetle'?88:u.type==='stagBeetle'?76:vehicle?79:u.type==='bayonetCaptain'?90:types[u.type].stab?75:human?66:u.type==='bruteBeetle'?58:35)*(u.boss?1.35:1)-(u.star>=2?(vehicle?10:8):0),y=u.y-rise;
  rr(ctx,u.x-w/2-1,y-1,w+2,6,2,'#172a20aa');rr(ctx,u.x-w/2,y,w,4,2,'#293d2d88');rr(ctx,u.x-w/2,y,w*u.hp/u.maxHp,4,2,u.boss?'#e6af57':t?'#e0a184':'#dceca2');
  if(u.star>=2){text(ctx,'★'.repeat(u.star),u.x,y-6,12,u.star===3?'#ffd36c':'#ffe4a0');}
 }

 const evolutionLabel=window.FrontUnitLabels.evolution(game,u,ctx);if(evolutionLabel)text(ctx,evolutionLabel.text,evolutionLabel.x,evolutionLabel.y,evolutionLabel.size,'#ffe3a0');
}
function point(u){return{x:(u.x-game.camera.x)*scale+W/2,y:(u.y-game.camera.y)*scale+H/2};}
function drawFog(){
 if(game.isDesktopDefense()||game.time<game.scoutUntil||game.bossIntro?.remaining>0)return;
 fc.setTransform(DPR,0,0,DPR,0,0);fc.clearRect(0,0,W,H);fc.fillStyle='#243b30d6';fc.fillRect(0,0,W,H);fc.globalCompositeOperation='destination-out';
 for(const u of [...game.alive(0),...game.buildings.filter(b=>b.hp>0&&b.kind==='repairBot'&&b.buildUntil<=game.time),game.bases[0]]){const p=point(u),sight=game.visionRadius(u),longRange=sight>380,r=(longRange?sight+32:u.base?335:sight)*scale;const g=fc.createRadialGradient(p.x,p.y,longRange?sight*scale:r*.64,p.x,p.y,r);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');fc.fillStyle=g;fc.beginPath();fc.arc(p.x,p.y,r,0,Math.PI*2);fc.fill();}
 fc.globalCompositeOperation='source-over';ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(fog,0,0);ctx.setTransform(DPR,0,0,DPR,0,0);
}
function drawMini(){
 const sx=132/game.bounds().width,sy=175/game.bounds().height;mc.clearRect(0,0,132,175);mc.fillStyle=game.isDesktopDefense()?'#b9956e':game.bounds().id==='livingroom'?'#a08c70':'#4d6346';mc.fillRect(0,0,132,175);mc.fillStyle=game.bounds().id==='livingroom'?'#687e7b':'#7a8460';mc.fillRect(59,0,15,175);for(const o of game.obstacles){mc.fillStyle=game.bounds().id==='livingroom'?'#5d655c':'#889172';mc.fillRect(o.x*sx,o.y*sy,o.w*sx,o.h*sy);}mc.strokeStyle='#b7c09a22';mc.beginPath();mc.moveTo(0,88);mc.lineTo(132,88);mc.stroke();
 for(const b of game.bases.filter(b=>!b.hidden)){mc.fillStyle=b.team?'#d48c72':'#c5dda0';mc.fillRect(b.x*sx-5,b.y*sy-4,10,8);}
 for(const p of [...game.structures,...game.defenses,...game.buildings]){mc.fillStyle=p.hp>0?(p.team===0?'#c3df9c':'#e3b18d'):'#82906d';mc.fillRect(p.x*sx-4,p.y*sy-3,8,6);}
 for(const u of game.units){if(u.hp<=0||!game.visible(u))continue;mc.fillStyle=COOP?.active&&u.team===0&&u.coopOwner===1?'#54b9ff':u.team===2?'#d5b273':u.team?'#e0a082':u.type==='leader'?'#f3e2a0':'#c1d89b';mc.beginPath();mc.arc(u.x*sx,u.y*sy,u.type==='leader'?3:1.7,0,Math.PI*2);mc.fill();}
 for(const p of game.pickups)if(p.active&&p.rareSupply&&game.time<p.expires){mc.fillStyle='#dcb0ff';mc.strokeStyle='#47265d';mc.lineWidth=1;mc.beginPath();mc.moveTo(p.x*sx,p.y*sy-5);mc.lineTo(p.x*sx+4,p.y*sy);mc.lineTo(p.x*sx,p.y*sy+5);mc.lineTo(p.x*sx-4,p.y*sy);mc.closePath();mc.fill();mc.stroke();}
 mc.strokeStyle='#e8ecd199';mc.lineWidth=.8;mc.strokeRect((game.camera.x-W/scale/2)*sx,(game.camera.y-H/scale/2)*sy,W/scale*sx,H/scale*sy);
}
function draw(dt){
 $('battleFrame').classList.toggle('boss-intro-active',game.bossIntro?.remaining>0);
 game.viewport={width:W/scale,height:H/scale};
 const fxAllies=game.alive(0),fxVisible=e=>!e.team||game.time<game.scoutUntil||fxAllies.some(u=>Math.hypot(e.x-u.x,e.y-u.y)<=game.visionRadius(u));battleFx.update(game,fxVisible);
 const player=game.commander(0),halfW=W/scale/2,halfH=H/scale/2;const tx=clamp(player.x,Math.min(game.bounds().width/2,halfW),Math.max(game.bounds().width/2,game.bounds().width-halfW)),ty=clamp(player.y-H/scale*.16,Math.min(game.bounds().height/2,halfH),Math.max(game.bounds().height/2,game.bounds().height-halfH));
 const intro=game.bossIntro;if(intro?.remaining>0){const q=1-intro.remaining/intro.total,smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);},bx=clamp(intro.x,Math.min(game.bounds().width/2,halfW),Math.max(game.bounds().width/2,game.bounds().width-halfW)),by=clamp(intro.y-40,Math.min(game.bounds().height/2,halfH),Math.max(game.bounds().height/2,game.bounds().height-halfH)),k=q<.24?smooth(q/.24):q>.72?smooth((q-.72)/.28):0;game.camera.x=q<.24?intro.from.x+(bx-intro.from.x)*k:q>.72?bx+(tx-bx)*k:bx;game.camera.y=q<.24?intro.from.y+(by-intro.from.y)*k:q>.72?by+(ty-by)*k:by;}else{game.camera.x+=(tx-game.camera.x)*Math.min(1,dt*6);game.camera.y+=(ty-game.camera.y)*Math.min(1,dt*6);}
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#809669';ctx.fillRect(0,0,W,H);ctx.translate(W/2,H/2);ctx.scale(scale,scale);ctx.translate(-game.camera.x,-game.camera.y);const impactShake=window.FrontHitFeedback.shake(game);ctx.translate(impactShake.x,impactShake.y);if(terrain)ctx.drawImage(terrain,0,0,game.bounds().width,game.bounds().height);
 window.FrontGuardianFX.ground(ctx,game);battleFx.ground(ctx,fxVisible);battleFx.luckyGround(ctx,game,fxVisible);
 for(const u of game.units)if(u.type==='bikeRaider'||u.bossPattern==='rhinoCharge')battleFx.drawBikeWarning(ctx,u,game.time);
 if(game.isRoomCampaign())window.FrontPortal.ground(ctx,game.bases[1],game.time);
 for(const b of game.bases)drawBase(b);
 game.structures.forEach(drawPost);game.defenses.filter(p=>!p.fencePost).forEach(drawDefense);window.FrontRoomFenceArt.links(ctx,game);game.defenses.filter(p=>p.fencePost).forEach(drawDefense);game.buildings.forEach(b=>window.FrontLivingRoom.building(ctx,b,game.time));
 for(const p of game.mortarShells)drawMortarShell(p);
 for(const b of game.barrages){const k=clamp(1-(b.landAt-game.time)/b.delay,0,1);circle(ctx,b.x,b.y,b.radius,'#c53d2630','#ffb079');ctx.lineWidth=3;circle(ctx,b.x,b.y,b.radius*k,'#db4e2830','#e84a27');ctx.setLineDash([8,6]);circle(ctx,b.x,b.y,b.radius+5,null,'#ffe1ad');ctx.setLineDash([]);text(ctx,`${Math.max(0,b.landAt-game.time).toFixed(1)}초`,b.x,b.y+5,22,'#fff2cc');}
 if(game.mode==='pve'&&!game.isDesktopDefense()&&game.frontline()>70){const y=game.frontline();ctx.strokeStyle='#efd48caa';ctx.lineWidth=3;ctx.setLineDash([14,12]);ctx.beginPath();ctx.moveTo(45,y);ctx.lineTo(game.bounds().width-45,y);ctx.stroke();ctx.setLineDash([]);text(ctx,game.mission.stage===1?'사냥 구역 완료 후 개방':'전초기지 2곳 파괴 후 개방',game.bounds().width/2,y-18,15,'#eee2ae');}
 if(!game.isDesktopDefense()&&game.baseShielded()){const b=game.bases[1];circle(ctx,b.x,b.y,135,null,'#a3cbbd88');text(ctx,'방어막 가동',b.x,b.y+135,14,'#c4dfd1');}

 for(const p of game.pickups){
  if(!p.active)continue;
  const pulse=(Math.sin(game.time*2.2+p.x)+1)/2,bob=Math.sin(game.time*2+p.x)*2;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.save();ctx.scale(1,.72);circle(ctx,0,0,34+pulse*3,'#ddbd6320','#e8d28a80');circle(ctx,0,0,26,null,'#f4df9c50');ctx.restore();
  const beacon=ctx.createLinearGradient(0,-90,0,0);beacon.addColorStop(0,'#f8df8c00');beacon.addColorStop(1,'#f8df8c25');ctx.fillStyle=beacon;ctx.fillRect(-14,-90,28,82);
  if(!worldModels.draw(ctx,'supply',0,-5+bob)){rr(ctx,-23,-31,46,31,4,'#678448');rr(ctx,-25,-34,50,7,2,'#90a467');text(ctx,'+',0,-13,18,'#eedc8c');}
  if(p.rareSupply){circle(ctx,0,0,44+pulse*6,null,'#cf9eff');const g=ctx.createLinearGradient(0,-200,0,0);g.addColorStop(0,'#ba72ff00');g.addColorStop(1,'#ba72ff65');ctx.fillStyle=g;ctx.fillRect(-22,-200,44,185);text(ctx,'✦',0,-66+bob,24,'#e9ceff');text(ctx,'희귀 보급 · '+Math.max(0,Math.ceil((p.expires-game.time)))+'초',0,43,13,'#eddbff');const guards=game.rareSupplyGuards(p).length;text(ctx,guards?'호위 '+guards+'기 처치 필요':'확보 가능',0,61,12,guards?'#ffb0af':'#c6ffd4');}else{text(ctx,'◆',0,-53+bob,14,'#f6dc89');text(ctx,'보급',0,35,11,'#f5e5ab');}ctx.restore();
 }
 if(game.moveOrder){const p=game.moveOrder;circle(ctx,p.x,p.y,25,null,'#f7efb7');circle(ctx,p.x,p.y,5,'#f7efb7');text(ctx,'집결 지점',p.x,p.y+44,13,'#fff3bc');}
 if(game.focusTarget){const u=game.focusTarget;circle(ctx,u.x,u.y,(u.r||types[u.type]?.r||20)+14,null,'#fff1a5');text(ctx,'집중 공격',u.x,u.y-52,13,'#fff1a5');}
 for(const u of game.units)if(u.team===0&&u.type==='leader'&&u.hp>0&&u.ultimatePose?.active)battleFx.drawUltimateArea(ctx,u,u===player?game.ultimate:u.ultimatePose,game.time);
 if(game.isDesktopDefense()){
  const view=window.FrontDesktop,visibleTroops=game.units.filter(u=>u.hp>0),props=game.obstacles.filter(o=>view.visible(o,game.camera,halfW,halfH)),entities=[...game.units.filter(u=>!types[u.type].flying).map(u=>({depth:u.y,u})),...props.map(o=>({depth:view.depth(o),o}))].sort((a,b)=>a.depth-b.depth);
  for(const e of entities)if(e.u)drawUnit(e.u);else{ctx.save();ctx.globalAlpha=view.opacity(e.o,visibleTroops);view.obstacle(ctx,e.o);ctx.restore();}
 }else if(game.bounds().id==='livingroom'){
  const view=window.FrontLivingRoom,props=game.obstacles.filter(o=>view.furnitureVisible(o,game.camera,halfW,halfH)),visibleTroops=game.units.filter(u=>u.hp>0&&(u.team===0||game.visible(u)));
  if(game.trialBoss?.hp>0){game.trialViewport={left:game.camera.x-halfW,right:game.camera.x+halfW,top:game.camera.y-halfH,bottom:game.camera.y+halfH};swordView.warnings(ctx,game);}
  const parts=game.trialBoss?.hp>0&&game.visible(game.trialBoss)?swordView.parts(game):[];
  const entities=[...game.units.filter(u=>!types[u.type].flying&&u.type!=='swordEmpress').map(u=>({depth:u.y,u})),...props.map(o=>({depth:view.depth(o),o})),...parts,{portal:true,depth:game.bases[1].y+29}].sort((a,b)=>a.depth-b.depth);
  for(const e of entities)if(e.portal)window.FrontPortal.body(ctx,game.bases[1],game.time);else if(e.kind)swordView.drawPart(ctx,e,game);else if(e.u)drawUnit(e.u);else{const o=e.o;view.furniture(ctx,o,view.furnitureOpacity(o,visibleTroops));}
 }else{
  const view=window.FrontGarden,visibleTroops=game.units.filter(u=>u.hp>0&&(u.team===0||game.visible(u))),props=game.obstacles.map((o,i)=>({o,i,depth:view.depth(o)})).filter(e=>view.visible(e.o,game.camera,halfW,halfH));
  const entities=[...game.units.filter(u=>!types[u.type].flying).map(u=>({depth:u.y,u})),...props,...view.grassPatches(game).filter(p=>view.grassVisible(p,game.camera,halfW,halfH)).map(p=>({depth:p.y+3,grass:p}))].sort((a,b)=>a.depth-b.depth);
  for(const e of entities)if(e.u)drawUnit(e.u);else if(e.grass)view.grass(ctx,e.grass,visibleTroops,game.time);else view.obstacle(ctx,e.o,e.i,worldModels,view.opacity(e.o,e.i,visibleTroops));
 }
 for(const u of game.units.filter(u=>types[u.type].flying).sort((a,b)=>a.y-b.y))drawUnit(u);
 for(const u of game.units.filter(u=>u.hp>0&&u.type==='sniper'&&game.visible(u)&&u.sniperAim&&game.visible(u.sniperAim.target)).slice(0,12))battleFx.drawLaser(ctx,u,game.time,{crouched:unitModels.crouched(u),muzzle:unitModels.weaponPoint(u)});
 window.FrontGuardianFX.air(ctx,game);battleFx.drawLuckySprays(ctx,game,fxVisible);
 for(const p of game.mortarShells){const pose=battleFx.mortarPose(p,game.time);if(fxVisible(pose))battleFx.drawMortar(ctx,p,game.time); }
 for(const p of game.shots){if(!fxVisible(p))continue;battleFx.drawShot(ctx,p,game.coop&&p.source.team===0?game.withOwner(p.source.coopOwner,()=>game.evolved[p.source.type]):game.evolved[p.source.type]);}
 for(const e of game.effects){
  if(!fxVisible(e)||battleFx.drawEvent(ctx,e))continue;
  const k=e.t/e.max;ctx.save();ctx.globalAlpha=k;
  if(e.kind==='critical')text(ctx,'치명타!',e.x,e.y-25*(1-k),15,'#ffe28c');
  else circle(ctx,e.x,e.y,45*(1-k),null,'#f5edc2');
  ctx.restore();
 }

 battleFx.drawHealingStatuses(ctx,game,fxVisible);battleFx.drawParticles(ctx,fxVisible);drawFog();ctx.setTransform(DPR,0,0,DPR,0,0);
 if(game.time<game.scoutUntil){ctx.strokeStyle='#f0db98';ctx.lineWidth=2;ctx.strokeRect(4,4,W-8,H-8);}
 if(game.bossIntro?.remaining>0){rr(ctx,W/2-156,24,312,64,10,'#211a2ee8','#b795d5');text(ctx,'최종 보스 등장',W/2,48,13,'#d8bde9');text(ctx,game.bossIntro.name,W/2,73,20,'#fff0d3');}
 drawMini();
 const objective=game.objective(),target=point(objective.target),marker=$('targetMarker'),lo=Math.min(145,H*.35),hi=Math.max(lo,H-110);marker.hidden=game.bossIntro?.remaining>0||objective.showMarker===false||game.phase==='ready'||game.phase==='ended'||(target.x>30&&target.x<W-30&&target.y>lo&&target.y<hi);marker.style.left=`${clamp(target.x,28,W-28)}px`;marker.style.top=`${clamp(target.y,lo,hi)}px`;marker.querySelector('b').style.transform=`rotate(${Math.atan2(target.y-H/2,target.x-W/2)+Math.PI/2}rad)`;marker.querySelector('small').textContent=game.mode==='duel'?'상대 본진':objective.targetName|| (game.mission.stage===1?objective.targetName:game.mission.stage===2?'전초기지':'최종 기지');
}
function frame(ts){const dt=last?Math.min(.05,(ts-last)/1000):1/60;last=ts;if(!(game.bossIntro?.remaining>0))input();else clearInput();combatAudio.sync(document.hidden?'paused':game.phase);if(selectedMode==='idle'){if(autoPilot?.active)autoSession.tick();}else if(COOP?.active)COOP.frame(game);else game.update(dt);combatAudio.sync(document.hidden?'paused':game.phase);draw(dt);uiTime+=dt;if(uiTime>.12){updateUI();uiTime=0;}requestAnimationFrame(frame);}
const startLabel=$('startBtn').textContent;$('startBtn').disabled=true;$('startBtn').textContent='전투 준비 중…';gameAssetsReady.then(()=>{$('startBtn').disabled=false;$('startBtn').textContent=startLabel;});
renderCommanderChoice();renderSniperChoice();renderMedicChoice();makeProduction();updateIntel();buildTerrain();resize();updateUI();refreshManualSave();renderBattlefieldChoice();const requestedMode=new URLSearchParams(location.search).get('mode');let lastMode='pve';try{lastMode=localStorage.getItem('plastic-front-mode')||'pve';}catch{}if(!COOP?.active&&(requestedMode==='idle'||!requestedMode&&lastMode==='idle')){selectMode('idle');const saved=autoSession.read();if(saved?.snapshot.engine.fields.phase==='playing'){gameAssetsReady.then(()=>{$('startOverlay').hidden=true;autoSession.resume();});}}requestAnimationFrame(frame);
Promise.all([worldModels.ready,window.FrontLivingRoom.ready,window.FrontDesktop.ready,groundTexture.decode().catch(()=>{})]).then(renderMapPreviews).catch(()=>{});
// Read-only diagnostics aid reproducible checks without changing the player's rules.
window.plasticFrontStatus=()=>({models:unitModels.diagnostics(),world:worldModels.diagnostics(),room:window.FrontLivingRoom.diagnostics(),commander:game.commanderId||'sarge',sniperSkin:game.sniperSkinId||'classic',medicSkin:game.medicSkinId||'classic',flameSkin:game.flameSkinId||'classic',effects:battleFx.diagnostics(),phase:game.phase,level:game.level,time:game.time,waveTest:!!waveTestBackup,waveTestTarget:game.waveTestTarget??null,cash:game.cash[0],trucks:game.trucks[0],scouts:game.scouts,units:game.units.length,mode:selectedMode,simulationMode:game.mode,auto:selectedMode==='idle'?{action:autoPilot.action,active:autoPilot.active,owner:autoSession.owner,plan:autoPilot.plan}:null,losses:game.losses[0],alive:game.alive(0).length,threat:game.pressure().tier,gold:profile.gold,permanent:{...profile.upgrades},capacity:game.capacity(),salvaged:game.salvaged,recoveryReady:game.recoveryReady(),nextRecoveryAt:game.nextRecoveryAt,abilities:{...game.abilities},evolved:{...game.evolved},order:game.moveOrder,focus:game.focusTarget?.type||null,defenses:game.activeDefenses().map(p=>({name:p.name,hp:p.hp})),mortarShells:game.mortarShells.map(p=>({x:p.x,y:p.y,left:p.landAt-game.time,team:p.team})),crisis:game.crisis.phase,barrages:game.barrages.map(b=>({x:b.x,y:b.y,radius:b.radius,left:b.landAt-game.time})),guns:game.artilleryUnits().map(u=>({x:u.x,y:u.y,hp:u.hp})),hits:game.crisis.hits,dodges:game.crisis.dodges});
window.addEventListener('front-screen-message',e=>toast(e.detail));
if(COOP?.active)COOP.install({getGame:()=>game,apply:g=>{game=g;profile=g.profile;},events:gameEvents,ready:gameAssetsReady,clearInput,enableAudio});
})();
