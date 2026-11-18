import {createBathAudio} from './bath-audio.js';
import {createSearchPuzzles} from './room-search.js?v=20261117-tricks1';
import {createSuitePuzzles} from './suite-puzzles.js?v=20261117-tricks1';
import * as T from './three.module.js';
import {buildRoom} from './room-scene.js?v=20261117-tricks1';
import {createState,ITEMS,DRAWER_NOTE,addItem,canCombineFilms,combineFilms,alignFilm,setClock,useItem,uvVisible,unlockDoor,phase,HINTS,MUSIC_SEQUENCE,TRAVEL_STOPS} from './room-state.js?v=20261117-tricks1';
import {zoneAt,ZONES,floorHeight} from './room-layout.js?v=20261117-tricks1';
import {TEST_STARTS,getTestStart,createTestStart,CHECKPOINT_KEY,SETTINGS_KEY,readCheckpoint,writeCheckpoint,prepareRestart} from './test-starts.js?v=20261117-tricks1';
const $=q=>document.querySelector(q),canvas=$('#world');
const state=createState();let assetsReady=false,started=false,paused=false,complete=false,mode='walk',active=null,crouched=false,yaw=.02,pitch=0,drag=false,moved=false,inspectionId='',inspectPivot=null,inspectDistance=3.4;
let inventoryOpened=false,inventoryUnread=false,modalKind='';const knownInventory=new Set(),CLUE_ONLY=new Set(['receipt','tag','tourMap']);
const keys=new Set(),player=new T.Vector3(0,1.62,2.75),clock=new T.Clock(),ray=new T.Raycaster(),pointer=new T.Vector2(),look=new T.Vector3();
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('#loadStatus').textContent='이 브라우저에서 3D 그래픽을 시작하지 못했습니다. 하드웨어 가속이 켜진 PC 브라우저에서 열어주세요.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;renderer.outputColorSpace=T.SRGBColorSpace;
const camera=new T.PerspectiveCamera(57,innerWidth/innerHeight,.06,80);camera.rotation.order='YXZ';
const room=buildRoom(renderer,state);const eyeFill=new T.PointLight('#a7bdc6',.8,2.2,2);room.scene.add(eyeFill);
const inspectScene=new T.Scene();inspectScene.background=new T.Color('#111917');const inspectCamera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.01,30);inspectCamera.position.set(0,.08,3.4);inspectScene.add(new T.HemisphereLight('#e9e3cb','#27352e',2));const il=new T.DirectionalLight('#ffe7c5',3);il.position.set(-3,4,5);inspectScene.add(il);const ir=new T.DirectionalLight('#82a1b7',1.3);ir.position.set(4,0,-3);inspectScene.add(ir);
const ICONS={coin:'○',cloth:'▱',inlayA:'▧',inlayB:'▧',batteryA:'▯',batteryB:'▯',compassWheel:'↟',postcard0:'▤',postcard1:'▤',postcard2:'▤',magnet:'∩',musicCylinder:'▥',route0:'▤',route1:'▤',route2:'▤',filmA:'◩',filmB:'◪',film:'▧',key:'⚿',bathKey:'⚿',stock_tea:'▣',stock_coffee:'▣',stock_sugar:'▣',stock_empty:'▣',bulb:'ϟ',receipt:'▤',tag:'▱',windingKey:'⚿',exitKey:'⚿',stairKey:'⚿',passKey:'⚿',inlay:'▧',kitchenKey:'⚿',tourMap:'▤',pencil:'✎',tinKey:'⚿',twinKey:'⚿',suiteKey:'⚿'};
let audio,bathAudio,audioOn=true,ambient,elapsed=0,step=0,hintStep=0,hintPhase='',phoneTimer=0;
function initAudio(){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;if(!audio){audio=new Context();bathAudio=createBathAudio(audio);const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate),data=buffer.getChannelData(0);let old=0;for(let i=0;i<data.length;i++){old=(old+Math.random()*.02-.01)*.99;data[i]=old;}const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1300;ambient=audio.createGain();ambient.gain.value=.4;source.connect(filter).connect(ambient).connect(audio.destination);source.start();}if(audioOn&&audio.state!=='running')audio.resume().catch(()=>{});else if(!audioOn&&audio.state==='running')audio.suspend().catch(()=>{});}
function sound(kind='wood'){if(!audioOn||!started)return;initAudio();if(!audio)return;const duration={wood:.12,paper:.22,metal:.45,cloth:.4,unlock:.75,ring:.8}[kind]||.15;const g=audio.createGain();g.gain.setValueAtTime(.001,audio.currentTime);g.gain.linearRampToValueAtTime(kind==='ring'?.06:.12,audio.currentTime+.012);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);g.connect(audio.destination);
 if(['metal','unlock','ring'].includes(kind)){for(const f of kind==='ring'?[620,840]:kind==='unlock'?[135,230,380]:[390,720]){const o=audio.createOscillator();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.82,audio.currentTime+duration);o.connect(g);o.start();o.stop(audio.currentTime+duration);}}else{const b=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),d=b.getChannelData(0);let old=0;for(let i=0;i<d.length;i++){old=.65*old+Math.random()*.7-.35;d[i]=old;}const s=audio.createBufferSource();s.buffer=b;const f=audio.createBiquadFilter();f.type='lowpass';f.frequency.value=kind==='paper'?2600:kind==='cloth'?900:360;s.connect(f).connect(g);s.start();}}
function toast(s,duration=3900){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').classList.remove('show'),duration);}
function caption(s,duration=5500){$('#caption').textContent=s;$('#caption').classList.add('show');clearTimeout(caption.t);caption.t=setTimeout(()=>$('#caption').classList.remove('show'),duration);}
function record(title,text){if(!state.notes.some(n=>n.title===title))state.notes.push({title,text});}
function escape(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
function releaseMouse(){keys.clear();drag=false;if(document.pointerLockElement)document.exitPointerLock();}
function modal(html,kind=''){if(['inspect','focus'].includes(mode))closeInspection();releaseMouse();$('#caption').classList.remove('show');$('#toast').classList.remove('show');paused=true;modalKind=kind;$('#pause').hidden=true;$('#modalBody').innerHTML=html;$('#modal').hidden=false;$('#modal article').scrollTop=0;$('#prompt').hidden=true;const heading=$('#modalBody h2');if(heading){heading.id='modalTitle';$('#modal').setAttribute('aria-labelledby','modalTitle');}}
function closeModal(){ $('#modal').hidden=true;modalKind='';paused=false;keys.clear();}
function pause(){if(!started||complete)return;if(['inspect','focus'].includes(mode)){closeInspection();return;}if(!$('#modal').hidden){closeModal();return;}releaseMouse();paused=true;$('#pause').hidden=false;}
function resume(){paused=false;$('#pause').hidden=true;keys.clear();}
const FILM_COMBINE_GUIDE='I로 인벤토리를 열고 ‘두 필름 조각 합치기’를 누르세요.';
function inventory(){
 const added=state.inventory.filter(id=>!knownInventory.has(id));knownInventory.clear();state.inventory.forEach(id=>knownInventory.add(id));
 if(added.length){
   inventoryUnread=true;
   const foundFilm=added.includes('filmA')||added.includes('filmB');
   if(foundFilm&&canCombineFilms(state)){
     toast(`필름 조각 두 장을 모았습니다.\n${FILM_COMBINE_GUIDE}`,8500);
   }else if(foundFilm){
     toast(`${ITEMS[added.at(-1)]} 획득\n다른 조각을 찾으면 I 인벤토리에서 합칠 수 있어요.`,6500);
   }else{
     toast(`${ITEMS[added.at(-1)]} 획득\nI 인벤토리에서 조사해 단서를 찾거나, 손에 들어 사용할 수 있어요.`,6500);
   }
 }
 const bar=$('#inventory');bar.replaceChildren();state.inventory.forEach((id,i)=>{
   const b=document.createElement('button');b.className='item'+(state.selected===id?' active':'');b.title=ITEMS[id]+(CLUE_ONLY.has(id)?' · 클릭: 조사하기 · I: 인벤토리':' · 클릭: 손에 들기 · 두 번 클릭: 조사하기 · I: 인벤토리');
   b.innerHTML=`<span class="item-num">${i+1}</span><span class="item-icon">${ICONS[id]}</span><span>${ITEMS[id]}</span><span class="inspect-link">${CLUE_ONLY.has(id)?'조사하기':state.selected===id?'선택 해제':'손에 들기'}</span>`;
   b.onclick=()=>{if(CLUE_ONLY.has(id)){inspectItem(id);return;}state.selected=state.selected===id?null:id;inventory();sound('paper');};b.ondblclick=()=>inspectItem(id);bar.append(b);
 });
 $('#inventoryCount').textContent=state.inventory.length;$('#inventoryCount').hidden=!state.inventory.length;
 $('#inventoryNew').hidden=!inventoryUnread;$('#inventoryButton').classList.toggle('has-new',inventoryUnread);
 $('#inventoryGuide').hidden=inventoryOpened||state.inventory.length>0;
 $('#selectedItem').hidden=!state.selected;$('#selectedItem').textContent=state.selected?`${ITEMS[state.selected]} — 사용할 대상을 바라보고 E · 같은 물건을 다시 누르면 선택 해제`:'';
}
function equipItem(id){if(!state.inventory.includes(id))return;if(CLUE_ONLY.has(id)){inspectItem(id);return;}state.selected=id;closeInspection();closeModal();inventory();toast(`${ITEMS[id]} — 손에 들었습니다.\n사용할 대상을 바라보고 E를 누르세요.`,5000);}
function take(id,title,text){addItem(state,id);state.selected=null;inventory();sound('paper');if(title)record(title,text);}
function joinFilmPieces(){
 if(!combineFilms(state))return;
 record('이어진 필름','두 조각의 찢긴 부분이 맞았다. 네 개의 작은 창과 삼각 표식.');
 inventory();
 inspectItem('film');
}
function planeItem(kind){const {group,mesh,rb,rod,cyl}=room.helpers;const g=new T.Group();const texture=room.canvasTexture((a,w,h)=>{a.fillStyle='#b49a65';a.fillRect(0,0,w,h);a.strokeStyle='#584a2c';a.lineWidth=8;a.strokeRect(18,18,w-36,h-36);a.fillStyle='#56452c';a.font='28px monospace';a.fillText('CONTACT / 316',35,55);if(kind==='film'){for(const [x,y]of [[.17,.17],[.83,.17],[.17,.83],[.83,.83]])a.clearRect(w*x-43,h*y-43,86,86);a.fillStyle='#e3d1a4';a.font='21px serif';for(const [i,x,y]of [['I',.17,.17],['II',.83,.17],['III',.17,.83],['IV',.83,.83]])a.fillText(i,w*x-25,h*y-53);a.fillText('◢',16,100);}else{a.globalAlpha=.3;for(let i=0;i<80;i++)a.fillRect(Math.random()*w,Math.random()*h,1,Math.random()*h);a.globalAlpha=1;a.fillText(kind==='filmA'?'I     III':'II     IV',45,220);}},512,512);
 const o=new T.Mesh(new T.PlaneGeometry(.8,.8),new T.MeshStandardMaterial({map:texture,side:T.DoubleSide,transparent:true,roughness:.9}));g.add(o);return g;}
function inspectItem(id){if(!state.inventory.includes(id))return;if(searchPuzzles.inspect(id)||puzzles.inspect(id))return;if(id.startsWith('film')){inspectModel(planeItem(id),id,ITEMS[id],id==='film'?'찢긴 가장자리가 맞물렸다. 네 개의 작은 창과 구석의 삼각 표식이 남아 있다.':id==='filmA'?'인화실 쪽지에서 떼어 낸 필름. 쪽지에는 “두 장을 겹쳐 볼 것”이라고 적혀 있다.':'얇은 인화용 필름. 찢긴 가장자리에 오래된 접착제 자국이 남아 있다.');if(id!=='film'&&canCombineFilms(state))setInspectAction('두 필름 조각 합치기',joinFilmPieces);else setInspectAction('손에 들기',()=>equipItem(id));}else if(['key','bathKey','windingKey','exitKey','stairKey','passKey','tinKey','twinKey','suiteKey'].includes(id)){const g=new T.Group();const {mesh,rod,box}=room.helpers;const ring=mesh(new T.TorusGeometry(.15,.028,12,32),room.materials.brass,g);rod([0,-.15,0],[0,-.65,0],.027,room.materials.brass,g);box(.13,.05,.05,.06,-.55,0,room.materials.brass,g);if(id==='windingKey'){g.clear();const {rb,cyl}=room.helpers;for(const x of[-.18,.18])rb(.32,.18,.06,x,.08,0,room.materials.brass,g);cyl(.05,.05,.32,0,-.1,0,room.materials.brass,g);for(const x of[-.045,.045])rb(.025,.12,.09,x,-.31,0,room.materials.brass,g);for(const z of[-.045,.045])rb(.09,.12,.025,0,-.31,z,room.materials.brass,g);}inspectModel(g,id,ITEMS[id],id==='windingKey'?'날개 모양 손잡이와 네모난 축. 문을 여는 열쇠보다 태엽을 감는 도구에 가깝다.':id==='stairKey'?'3F STAIRS. 317호 안쪽 방에서 찾았다. 호텔 복도 왼쪽 끝 계단문에 맞는다.':id==='exitKey'?'317 INNER. 317호 끝의 안쪽 방을 여는 열쇠다.':id==='passKey'?'317호 예비 열쇠. 꼬리표에 동행인 보관용이라고 적혀 있다.':id==='tinKey'?'꽃무늬 작은 열쇠. 미니바 차 상자의 잠금판에도 같은 꽃무늬가 있다.':id==='twinKey'?'TWIN 표식. 거실 왼쪽 침실 문에 맞는다.':id==='suiteKey'?'316 EXIT 표식. 거실에서 호텔 복도로 나가는 문에 맞는다.':id==='bathKey'?'물방울 표식. 침실 옆 욕실 문에 맞는 별도의 열쇠다.':'삼각 표식. 인화 작업표 아래 책상 서랍의 잠금판과 같다.');setInspectAction('손에 들기',()=>equipItem(id));}else{const g=new T.Group();const {cyl}=room.helpers;cyl(.07,.07,.8,0,0,0,new T.MeshStandardMaterial({color:'#9c82b8',roughness:.3}),g);cyl(.075,.075,.12,0,.44,0,room.materials.brass,g);cyl(.075,.075,.12,0,-.44,0,room.materials.brass,g);inspectModel(g,id,ITEMS[id],'UV-A / 365 nm. 유리 표면에 “주변광을 차단할 것”이라는 작은 글씨가 남아 있다.');setInspectAction('손에 들기',()=>equipItem(id));}}
function inspectModel(source,id,title,text){closeModal();releaseMouse();paused=true;mode='inspect';inspectionId=id;$('#inspectHint').textContent='드래그해서 뒤집고, 휠로 가까이 보세요.';$('#hud').hidden=true;$('#inspection').hidden=false;$('#inspectTitle').textContent=title;$('#inspectText').textContent=text;$('#inspectBackAction').hidden=true;$('#inspectAction').hidden=true;
 if(inspectPivot)inspectScene.remove(inspectPivot);inspectPivot=new T.Group();const obj=source.clone(true);obj.position.set(0,0,0);obj.rotation.set(0,0,0);obj.traverse(o=>{o.visible=o.userData.filmBack?!state.inventory.includes('filmB')&&!state.filmJoined:o.visible;});const bounds=new T.Box3().setFromObject(obj),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());obj.position.sub(center);inspectPivot.add(obj);inspectPivot.scale.setScalar(1.8/Math.max(size.x,size.y,size.z));inspectPivot.position.y=.12;inspectScene.add(inspectPivot);inspectDistance=3.5;inspectCamera.position.set(0,.1,inspectDistance);sound('paper');}
function closeInspection(){if(!['inspect','focus'].includes(mode))return;camera.fov=57;camera.updateProjectionMatrix();mode='walk';paused=false;$('#inspection').hidden=true;$('#hud').hidden=!started;$('#inspectBackAction').hidden=true;keys.clear();}
function focusMirror(){$('#inspectHint').textContent='반사된 방과 실제 방을 비교하세요. ESC로 돌아갑니다.';releaseMouse();mode='focus';paused=true;$('#hud').hidden=true;$('#inspection').hidden=false;$('#inspectTitle').textContent='거울 속의 방';$('#inspectText').textContent=uvVisible(state)&&state.frameTaken?'현재의 벽은 비어 있다. 거울 속의 벽은 그렇지 않다.':'같은 방을, 반대쪽에서 바라본다.';$('#inspectBackAction').hidden=true;$('#inspectAction').hidden=true;camera.position.set(2.05,1.97,player.z>=1.15?.73:1.57);camera.lookAt(10.31,1.79,1.15);camera.fov=30;camera.updateProjectionMatrix();}
function setInspectAction(text,fn){const b=$('#inspectAction');b.hidden=false;b.textContent=text;b.onclick=fn;}
$('#inspectBackAction').onclick=()=>{if(inspectionId!=='frame'||Math.cos(inspectPivot.rotation.y)>-.6||state.inventory.includes('filmB')||state.filmJoined)return;if(!state.frameReleased){$('#inspectText').textContent='뒷판의 납작한 고정나사가 조각을 누르고 있다. 넓은 홈에 맞는 물건이 필요하다.';return;}take('filmB','사진 뒤의 필름','액자 뒷판에 테이프로 붙어 있던 필름 조각.');inspectPivot.traverse(o=>{if(o.userData.filmBack)o.visible=false;});$('#inspectBackAction').hidden=true;$('#inspectText').textContent=canCombineFilms(state)?FILM_COMBINE_GUIDE:'붙어 있던 조각을 떼었다. 다른 조각을 찾으면 인벤토리에서 합칠 수 있다.';};
function openFilm(){let x=0,y=2,q=1,dragging=false,sx=0,sy=0,bx=0,by=0;const grid=Array.from({length:30},(_,i)=>(i*7+Math.floor(i/6)*3+2)%10);grid[8]=0;grid[10]=5;grid[20]=4;grid[22]=0;
 modal(`<div class="overline">CONTACT SHEET / OBSERVATION</div><h2>겹쳐진 자리</h2><p>종이에 남은 칸과 필름의 작은 창.<br>어느 쪽에도 혼자서는 읽히는 문장이 없다.</p><div class="filmboard"><div class="filmgrid">${grid.map(v=>`<span>${v}</span>`).join('')}</div><span class="board-mark">◢</span><div class="film-mask" tabindex="0" role="img" aria-label="움직이는 필름. 드래그 또는 방향키로 이동"><svg viewBox="0 0 150 150"><path d="M0 0H150V150H0Z M8 8V42H42V8Z M108 8V42H142V8Z M8 108V142H42V108Z M108 108V142H142V108Z" fill="#503c1bee" fill-rule="evenodd" stroke="#dccb9b" stroke-width=".8"/><g fill="#e4d1a3" font-size="9" font-family="serif"><text x="1" y="7">◢</text><text x="20" y="53">I</text><text x="119" y="53">II</text><text x="16" y="103">III</text><text x="117" y="103">IV</text></g></svg></div></div><div class="film-instruction">필름을 드래그해 옮기세요. 표식과 찢긴 자국을 살펴보세요.</div><div class="buttonrow"><button class="outline" id="rotateFilm">필름 ↶</button><button class="outline" id="observeFilm">겹친 자리 기록</button></div><div class="observation-note" id="filmRead"></div>`);
 const mask=$('.film-mask'),board=$('.filmboard');const render=()=>{mask.style.left=x*50+'px';mask.style.top=y*50+'px';mask.style.transform=`rotate(${q*90}deg)`;};render();mask.onpointerdown=e=>{dragging=true;sx=e.clientX;sy=e.clientY;bx=x;by=y;mask.setPointerCapture(e.pointerId);};mask.onpointermove=e=>{if(!dragging)return;const scale=board.getBoundingClientRect().width/300;x=Math.max(0,Math.min(3,bx+(e.clientX-sx)/(50*scale)));y=Math.max(0,Math.min(2,by+(e.clientY-sy)/(50*scale)));render();};mask.onpointerup=()=>dragging=false;mask.onkeydown=e=>{const dirs={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};if(dirs[e.code]){e.preventDefault();e.stopPropagation();x=Math.max(0,Math.min(3,x+dirs[e.code][0]));y=Math.max(0,Math.min(2,y+dirs[e.code][1]));render();}};$('#rotateFilm').onclick=()=>{q=(q+3)%4;render();sound('paper');};$('#observeFilm').onclick=()=>{if(alignFilm(state,x,y,q)){$('#filmRead').textContent='0 5 : 4 0';record('인화 작업표','삼각 표식과 필름이 맞았을 때 네 창에 0 · 5 · 4 · 0이 남았다.');sound('paper');caption('숫자는 원래부터 거기 있었다.\n보지 못하게 가려져 있었을 뿐.');}else{$('#filmRead').textContent='';toast('필름의 표식과 종이의 자국이 아직 어긋나 있다.');}};}
let clockHour=11,clockMinute=10;
function openClock(){modal(`<div class="overline">MECHANISM / MANTEL CLOCK</div><h2>멈춘 시각</h2><p>태엽 소리는 없다. 뒷판에는 인화 작업표와 같은 삼각 표식.<br>두 바늘은 손으로 움직일 수 있다.</p><svg id="clockDiagram" class="ring-lock" viewBox="0 0 260 260" aria-label="벽시계"><circle cx="130" cy="130" r="112" fill="#b9ac8b" stroke="#5d4d35" stroke-width="8"/>${Array.from({length:12},(_,i)=>{const a=(i+1)*Math.PI/6;return`<text x="${130+Math.sin(a)*88}" y="${136-Math.cos(a)*88}" text-anchor="middle" font-family="serif" font-size="18" fill="#3c382c">${i+1}</text>`;}).join('')}<line id="hourHand" x1="130" y1="130" stroke="#33392d" stroke-width="6" stroke-linecap="round"/><line id="minuteHand" x1="130" y1="130" stroke="#51452d" stroke-width="3" stroke-linecap="round"/><circle cx="130" cy="130" r="6" fill="#3b3c2e"/></svg><div class="clock-controls"><div><span class="dial-label">짧은 바늘</span><b id="hourValue"></b><button id="hourMinus" aria-label="시침 뒤로">−</button><button id="hourPlus" aria-label="시침 앞으로">+</button></div><div><span class="dial-label">긴 바늘</span><b id="minuteValue"></b><button id="minuteMinus" aria-label="분침 뒤로">−</button><button id="minutePlus" aria-label="분침 앞으로">+</button></div></div><button class="primary" id="clockSet">시계 뒷판 누르기 <span>→</span></button><p id="clockFeedback" role="status" class="muted"></p>`);
 const draw=()=>{$('#hourValue').textContent=String(clockHour).padStart(2,'0');$('#minuteValue').textContent=String(clockMinute).padStart(2,'0');const h=(clockHour+clockMinute/60)*Math.PI/6,m=clockMinute*Math.PI/30;$('#hourHand').setAttribute('x2',130+Math.sin(h)*50);$('#hourHand').setAttribute('y2',130-Math.cos(h)*50);$('#minuteHand').setAttribute('x2',130+Math.sin(m)*74);$('#minuteHand').setAttribute('y2',130-Math.cos(m)*74);room.clockHands(clockHour,clockMinute);};draw();$('#hourMinus').onclick=()=>{clockHour=(clockHour+10)%12+1;draw();sound('metal');};$('#hourPlus').onclick=()=>{clockHour=clockHour%12+1;draw();sound('metal');};$('#minuteMinus').onclick=()=>{clockMinute=(clockMinute+55)%60;draw();sound('metal');};$('#minutePlus').onclick=()=>{clockMinute=(clockMinute+5)%60;draw();sound('metal');};$('#clockSet').onclick=()=>{if(state.clockSolved){toast('시계 안의 작은 칸은 비어 있다.');return;}if(setClock(state,clockHour,clockMinute)){closeModal();inventory();sound('unlock');record('시계의 빈 공간','바늘을 맞추자 벽시계 아래의 작은 보관칸이 열렸다. 인화 작업표 아래 침실 책상 서랍과 같은 삼각 표식의 작은 황동 열쇠가 들어 있었다.');caption('딸깍.\n시계 아래에서 작은 칸이 밀려 나왔다.');}else{$('#clockFeedback').textContent='뒷판은 움직이지 않는다. 이 시각이 아닌 것 같다.';sound('wood');}};}
const ARROWS=['↑','↗','→','↘','↓','↙','←','↖'];
function openLock(){modal(`<div class="overline">DOOR / THREE CONCENTRIC RINGS</div><h2>세 겹의 잠금</h2><p>세 고리에 하나씩 홈이 나 있다.<br>오래된 금속은 손의 힘에 따라 조금씩 돌아간다.</p><svg class="ring-lock" id="ringDiagram" viewBox="0 0 280 280" aria-label="바깥 가운데 안쪽의 세 회전 고리"><circle cx="140" cy="140" r="127" fill="#1c251e" stroke="#8b7350" stroke-width="5"/>${[105,76,47].map((r,i)=>`<g id="dial${i}" transform="rotate(${state.rings[i]*45} 140 140)"><circle cx="140" cy="140" r="${r}" fill="none" stroke="#a68b5c" stroke-width="11"/><path d="M134 ${140-r-10}h12v20h-12z" fill="#e1d3ac"/></g>`).join('')}<circle cx="140" cy="140" r="14" fill="#bbaa79"/></svg><div class="ring-row">${['바깥','가운데','안쪽'].map((name,i)=>`<button data-ring="${i}">${name}<span id="ringValue${i}">${ARROWS[state.rings[i]]}</span></button>`).join('')}</div><button class="primary" id="releaseLock">가운데 잠금 누르기 <span>→</span></button><p class="muted" id="lockFeedback" role="status"></p>`);document.querySelectorAll('[data-ring]').forEach(b=>b.onclick=()=>{const i=+b.dataset.ring;state.rings[i]=(state.rings[i]+1)%8;$('#dial'+i).setAttribute('transform',`rotate(${state.rings[i]*45} 140 140)`);$('#ringValue'+i).textContent=ARROWS[state.rings[i]];sound('metal');});$('#releaseLock').onclick=()=>{if(unlockDoor(state)){closeModal();sound('unlock');record('열린 문','세 고리의 홈이 서로 다른 방향을 가리켰을 때 문 안의 걸쇠가 풀렸다.');caption('걸쇠가 안쪽으로 물러났다.\n문 너머에서도, 누군가는 당신을 기다렸던 모양이다.');}else{$('#lockFeedback').textContent='금속판 안쪽에서 무딘 소리만 돌아온다.';sound('wood');}};}
function interact(id){
 if(id==='bed'){state.bedCoverFolded=!state.bedCoverFolded;sound('cloth');return;}
 if(id==='drawerNote'){
  if(!state.drawerOpen)return;
  const {title,lines}=DRAWER_NOTE;
  record(title,lines.join(' '));
  sound('paper');
  modal(`<h2>${escape(title)}</h2><div class="note">${lines.map(escape).join('<br><br>')}</div>`);
  return;
 }
 if(id==='filmA'){
  if(room.bedNote.visible&&!state.inventory.includes('filmA')&&!state.filmJoined){
   room.bedNote.visible=false;
   take('filmA','이불 속 인화실 쪽지','쪽지에 인화용 필름 한 조각이 붙어 있다. 뒷면에는 “두 장을 겹쳐 볼 것”이라고 적혀 있다.');
  }
  return;
 }
 if(searchPuzzles.interact(id)||puzzles.interact(id))return;if(state.selected){const item=state.selected;if(item==='film'&&id==='ledger'){openFilm();return;}if(useItem(state,item,id)){inventory();sound('unlock');if(item==='coin'&&id==='frame'){caption('동전으로 액자 고정나사를 풀었다. 이제 뒤집어 뒷판을 살필 수 있다.');return;}if(id==='teaTin'){record('미니바 차 상자','꽃무늬 작은 열쇠로 차 상자의 자물쇠를 열었다. 편지와 나무 조각을 조사할 수 있다.');caption('차 상자의 뚜껑이 열렸다. 안에 편지와 작은 나무 조각이 있다.');}else if(['bathDoor','twinDoor','suiteDoor'].includes(id)){record('열린 연결문',ITEMS[item]+'로 잠금을 풀었다.');caption('잠금이 풀렸다. 문 너머로 이동할 수 있다.');}else if(id==='drawer'){record('침실 책상 서랍','시계 열쇠가 인화 작업표 아래 서랍에 맞았다. 안쪽에는 보랏빛 유리 전구가 들어 있다.');caption('침실 책상 서랍의 잠금이 풀렸다.');}else if(id==='musicBox'){record('오르골의 태엽','여행가방에서 얻은 열쇠가 오르골에 맞았다. 네 문양판이 움직일 준비가 되었다.');caption('태엽이 감겼다. 오르골을 다시 조사해 재생할 수 있다.');}else if(id==='entry317'){record('복도 건너편 317호','316호 트윈 침실에서 찾은 동행인의 예비 열쇠로 317호 출입문을 열었다.');caption('317호의 문이 열렸다. 다른 투숙객의 흔적이 남아 있다.');}else if(id==='stairDoor'){record('3층 계단문','317호 안쪽 방에서 찾은 열쇠로 복도 끝 계단문을 열었다.');caption('계단문이 열렸다. 난간을 따라 2층으로 내려갈 수 있다.');}else if(id==='exit317'){record('317호 안쪽 방','객실 금고의 열쇠로 마지막 방을 열었다.');caption('문 너머에도 투숙객이 남긴 물건이 있다.');}else{record('보랏빛 전구','UV-A 365nm. 표면의 작은 글씨는 주변광을 차단하라고 적혀 있다.');caption('스탠드에서 낯선 보랏빛이 새어 나왔다.');}return;}if(id!=='frame'&&id!=='clock'&&id!=='mirror'){toast('이곳에는 맞지 않는다. 인벤토리에서 선택을 해제하고 다시 조사할 수 있다.');return;}}
 switch(id){
 case'frame':state.frameTaken=true;record('호텔 사진','이 호텔의 오래된 외관 사진. 불이 켜진 창은 딱 하나다.');inspectModel(room.frame,'frame','호텔 사진','촬영 날짜는 지워져 있다. 불이 켜진 창은 딱 하나. 액자는 벽에서 쉽게 떨어졌다.');break;
 case'ledger':if(state.inventory.includes('film')){modal('<div class="overline">KITCHEN TABLE</div><h2>인화 작업표</h2><p>작은 숫자와 삼각 표식. 작업표의 일부만 유난히 닳아 있다.</p><button class="outline" id="placeFilm">가지고 있는 필름 올려보기</button>');$('#placeFilm').onclick=openFilm;}else modal('<div class="overline">WRITING DESK</div><h2>인화 작업표</h2><div class="note">CONTACT / 316<br><br>숫자들이 칸을 채우고 있다.<br>작업표 한 귀퉁이에 작은 삼각 자국이 남아 있다.</div>');record('인화 작업표','침실 책상 위의 낡은 작업표. 숫자가 든 칸과 한쪽의 삼각 자국.');break;
 case'clock':inspectModel(room.clock,'clock','침실의 원형 벽시계','법랑 문자판과 금속 테두리. 시계 아래에는 작은 보관칸이 달려 있다. 뒷판에는 작업표와 같은 삼각 표식이 있다.');setInspectAction('두 바늘을 움직여 보기',()=>{closeInspection();openClock();});break;
 case'drawer':if(state.drawerOpen){state.drawerOpen=false;sound('wood');toast('책상 서랍을 닫았다.');}else if(state.drawerUnlocked){state.drawerOpen=true;sound('wood');}else{sound('wood');caption('침실 책상 서랍이 잠겨 있다.\n손잡이 옆에 삼각 표식과 작은 열쇠 구멍이 있다.');}break;
 case'bulb':
  if(!state.drawerOpen||state.bulbTaken)return;
  state.bulbTaken=true;
  take('bulb','서랍 안의 전구','평범한 전구와 다른 보랏빛 유리. UV-A라는 작은 글씨.');
  if(!state.notes.some(note=>note.title===DRAWER_NOTE.title)){
   toast('보랏빛 전구를 챙겼다.\n전구 옆에 접힌 쪽지가 남아 있다.',6500);
  }
  break;
 case'lamp':state.lampOn=!state.lampOn;sound('metal');toast(state.lampOn?'스탠드를 켰다.':'스탠드를 껐다.');break;
 case'switch':state.lightOn=!state.lightOn;sound('wood');break;
 case'bathDoor':if(!state.bathUnlocked){caption('욕실 문이 잠겨 있다. 열쇠 구멍 옆에 물방울 표식이 있다.');break;}state.bathDoorOpen=!state.bathDoorOpen;sound('wood');caption(state.bathDoorOpen?'욕실 문을 열었다.':'욕실 문을 닫았다.',2200);break;
 case'showerDoor':state.showerOpen=!state.showerOpen;sound('metal');caption(state.showerOpen?'샤워부스 문이 열렸다.':'샤워부스 문을 닫았다.',2200);break;
 case'basin':caption('매끈하게 파인 세면볼과 금속 배수구. 세면대 아래에는 잠긴 수납장이 있다.');break;
 case'cup':caption('속이 빈 도자기 찻잔이다.');break;
 case'kettle':caption('스테인리스 전기 주전자. 전원은 꺼져 있고 안에는 물이 남아 있지 않다.');break;
 case'towels':caption('두 겹으로 접힌 면 수건. 옆에 말려 둔 세탁 의뢰표와 담당자의 기록이 있다.');break;
 case'kitchenSink':caption('깊은 스테인리스 싱크볼. 수도꼭지와 배수구는 평범한 주방 설비다.');break;
 case'toilet':caption('물탱크와 시트 사이를 살펴보았다. 특별한 흔적은 없다.');break;
 case'curtains':state.curtainsClosed=!state.curtainsClosed;sound('cloth');caption(state.curtainsClosed?'커튼이 맞물리자, 빗소리가 한결 멀게 들렸다.':'창문 너머로 이웃 건물의 불빛이 들어온다.',3000);break;
 case'mirror':focusMirror();if(uvVisible(state)&&state.frameTaken){record('거울 속의 문장','현재의 벽에는 없던 문장이 거울 속에만 남아 있었다. 세 고리의 방향을 가리키는 듯하다.');caption('비어 있는 벽이다. 그런데 거울 속에는 문장이 남아 있다.');}else caption('거울은 당신 뒤의 방을 비춘다.\n너무 평범해서, 오히려 마음에 걸린다.');break;
 case'lock':case'door':if(!state.bedroomOpen)openLock();else caption('문이 열렸다. 이제 직접 걸어 나갈 수 있다.');break;
 case'phone':sound('ring');state.phoneHeard=true;record('수화기 너머','“문을 잠근 건 내가 아니야. 네가 기록을 지웠을 때, 그 방은 이미 닫혀 있었어.”');modal('<div class="overline">A RECORDED CALL</div><h2>수화기 너머의 목소리</h2><div class="note">“문을 잠근 건 내가 아니야.<br><br>네가 기록을 지웠을 때,<br>그 방은 이미 닫혀 있었어.”</div><p class="muted">녹음이 끊긴 뒤에도 회선에서는 비슷한 빗소리가 들린다.</p>');break;
 case'wardrobe':state.wardrobeOpen=!state.wardrobeOpen;sound('wood');caption('가는 철사 옷걸이 세 개. 아래에는 접힌 담요와 슬리퍼가 놓여 있다.');break;
 case'suitcase':state.suitcaseOpen=!state.suitcaseOpen;sound('metal');caption('짐은 비어 있다. 안감에 “316”이라는 낡은 수선표만 남았다.');record('여행 가방','빈 가방의 안감에 같은 객실 번호가 남아 있었다. 누군가 여러 번 이 방으로 돌아온 것 같다.');break;
 case'suiteDirectory':modal('<h2>316호 · 스위트룸 안내</h2><p>이 객실은 두 침실과 공용 공간으로 나뉘어 있습니다.</p><div class="note">처음 침실 — 침대·사진·작업표·벽시계·거울<br>트윈 침실 — 두 침대·여행 엽서·동행인의 보관함<br>거실 — 찻잔·잠긴 차 상자·출입문<br>간이주방 — 저울·식재료 통·잠긴 보관함<br>욕실 — 세면대·잠긴 수납장</div><p>각 공간의 연결문은 잠겨 있습니다. 방 안의 작은 상자와 단서를 조사해 다음 공간을 여세요. 거실 왼쪽은 트윈 침실, 오른쪽은 간이주방입니다. 처음 침실 옆에는 욕실이 있습니다. 호텔 복도는 거실 출입문 밖에 있습니다.</p>');break;

 case'twinDoor':caption(state.twinOpen?'트윈 침실 문이 열려 있다.':'트윈 침실이 잠겨 있다. 열쇠 표식 아래에 “주방 열쇠 보관함”이라고 적혀 있다.');break;
 case'suiteDoor':caption(state.doorOpen?'복도로 이어지는 출입문이 열려 있다.':'316호 출입문이 잠겨 있다. “출입문 열쇠는 동행인의 보관함에”라는 메모가 붙어 있다.');break;
 case'twinBed':caption('두 개의 침대. 한쪽 머리맡에는 읽다 만 여행 수첩이 있다.');break;
 case'entry317':caption(state.room317Open?'317호 문이 열렸다. 걸어 들어갈 수 있다.':'317호. 평범한 객실 열쇠 구멍이 있다.');break;
 case'minibar':caption('컵 두 개와 식은 찻잔. 이 스위트룸에는 한 사람만 머문 것이 아니었다.');break;
 case'bed317':caption('베개가 깊게 눌려 있다. 침대 끝에 수하물표 하나가 남아 있다.');break;
 case'exit317':caption(state.exitOpen?'317호 안쪽 방이 열렸다.':'317호 안쪽 방. 열쇠 구멍 옆에 317 INNER라고 적혀 있다.');break;
 case'elevator':modal('<h2>엘리베이터 운행 중지</h2><p>제어부 고장으로 운행을 중지합니다.</p><div class="note">아래층으로 이동할 때는 복도 반대편 비상계단을 이용해 주세요.<br>3층 계단문 예비 열쇠: 317호 안쪽 방 비상 열쇠함.</div>');record('엘리베이터 고장 안내','비상계단은 복도 반대편. 계단문 예비 열쇠는 317호 안쪽 방에 있다.');break;
 case'stairDoor':caption(state.stairsOpen?'열린 계단문. 2층으로 내려갈 수 있다.':'3층 계단문이 잠겨 있다. 열쇠 구멍 위에 3F STAIRS라고 적혀 있다.');break;
 }}
const luggageDigits=[0,0,0],safeSymbols=[0,0,0,0];
function musicNote(i){if(!audioOn)return;initAudio();if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=[523.25,440,659.25,587.33][i];g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.linearRampToValueAtTime(.14,audio.currentTime+.015);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.9);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+1);}
const searchPuzzles=createSearchPuzzles({state,modal,closeModal,inventory,record,caption,sound,equipItem});
const puzzles=createSuitePuzzles({state,modal,closeModal,inventory,record,caption,sound,equipItem,room,luggageDigits,safeSymbols,musicNote,travelStops:TRAVEL_STOPS,searchRoute:()=>searchPuzzles.route(),zone:()=>zoneAt(player.x,player.z)});
function journal(){modal(`<div class="overline">THINGS YOU HAVE NOTICED</div><h2>관찰 기록</h2>${state.notes.length?state.notes.map(n=>`<div class="journal-entry"><b>${escape(n.title)}</b><p>${escape(n.text)}</p></div>`).join(''):'<p>아직 적어 둔 것이 없다.<br>사물의 흔적과 읽은 내용은 이곳에 남는다.</p>'}<p class="muted">기록은 발견한 사실만 남깁니다. 다음에 할 일이나 정답을 자동으로 알려주지 않습니다.</p>`);}
function bag(){
 inventoryOpened=true;inventoryUnread=false;inventory();
 modal(`<h2>인벤토리 <kbd>I</kbd></h2><p class="inventory-intro">가진 물건을 다시 조사해 단서를 찾고, 방 안의 대상에 사용할 수 있어요.</p>
 ${canCombineFilms(state)?'<div class="buttonrow"><button class="primary" id="joinFilms">두 필름 조각 합치기 <span aria-hidden="true">→</span></button></div>':''}
 <ul class="inventory-instructions"><li><strong>조사해서 단서 찾기</strong><span>물건을 뒤집고 확대해 글씨·뒷면·표면의 흔적을 살펴보세요.</span></li><li><strong>물건 사용하기</strong><span>‘손에 들기’를 누른 뒤, 사용할 대상 앞에서 <kbd>E</kbd>를 누르세요.</span></li><li><strong>물건 조합하기</strong><span>조합할 수 있는 물건을 모으면 조합 버튼이 나타나요.</span></li></ul>
 <div class="inventory-item-list">${state.inventory.map(id=>`<article class="inventory-entry"><strong>${ITEMS[id]}</strong><div class="inventory-item-actions"><button class="outline" data-inspect="${id}" aria-label="${ITEMS[id]} 조사하기">조사하기</button>${CLUE_ONLY.has(id)?'':state.selected===id?`<button class="outline" data-unequip="${id}" aria-label="${ITEMS[id]} 선택 해제">선택 해제</button>`:`<button class="outline" data-equip="${id}" aria-label="${ITEMS[id]} 손에 들기">손에 들기</button>`}</div></article>`).join('')}</div>
 ${!state.inventory.length?'<p class="inventory-empty"><strong>아직 가진 물건이 없어요.</strong><span>방에서 물건을 얻으면 여기에 모입니다.</span></p>':''}
 <p class="inventory-shortcut"><kbd>I</kbd> 또는 <kbd>ESC</kbd>로 닫기</p>`,'inventory');
 document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>{const id=b.dataset.inspect;closeModal();inspectItem(id);});
 document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>equipItem(b.dataset.equip));
 document.querySelectorAll('[data-unequip]').forEach(b=>b.onclick=()=>{state.selected=null;closeModal();inventory();toast('물건 선택을 해제했습니다.');});
 if($('#joinFilms'))$('#joinFilms').onclick=joinFilmPieces;
}
function hint(){const p=phase(state);if(p!==hintPhase){hintPhase=p;hintStep=0;}modal(`<div class="overline">A SMALL NUDGE</div><h2>잠깐, 다른 시선으로.</h2><p>도움은 한 번에 한 단계씩 보여줍니다.<br>마지막 단계는 구체적인 해결 방법을 포함합니다.</p><div class="note" id="hintText">아직 도움을 요청하지 않았습니다.</div><button class="outline" id="nextHint" style="margin-top:20px">첫 번째 도움 보기</button>`);$('#nextHint').onclick=()=>{const lines=HINTS[p];$('#hintText').textContent=lines[Math.min(hintStep,2)];if(hintStep<3){hintStep++;state.hints++;}$('#nextHint').textContent=hintStep<3?`더 구체적으로 보기 (${hintStep}/3)`:'모든 도움을 확인했습니다';$('#nextHint').disabled=hintStep>=3;};}
function help(){modal('<div class="overline">HOW TO LOOK CLOSER</div><h2>눈높이를 바꿔보세요.</h2><p>PC 키보드와 마우스로 플레이합니다.</p><p>316호는 두 침실·거실·간이주방·욕실로 나뉜 스위트룸입니다. 거실 출입문을 나서면 호텔 복도가 나오고, 복도에서 317호로 들어갈 수 있습니다.</p><div class="note">WASD — 걷기<br>마우스 드래그 / 방향키 — 시점<br>화면 클릭 — 마우스 시점 잠금<br>E 또는 물건 클릭 — 조사<br>C — 몸 낮추기 / 일어서기<br>I — 인벤토리 열기/닫기 · J — 관찰 기록 · H — 선택형 도움<br>1–5 — 소지품 선택 · ESC — 닫기 / 일시정지</div><p>물건을 들여다볼 때는 드래그로 뒤집고 휠로 확대합니다.<br>인벤토리에서 물건을 선택한 뒤, 대상 앞에서 E로 사용할 수 있습니다.</p><p class="muted">다음 행동은 자동 안내하지 않습니다. 정답은 여러 발견을 연결해야 알 수 있습니다.</p>');}
function start(explore){state.explore=explore;state.doorOpen=explore;state.room317Open=explore;state.exitOpen=explore;state.stairsOpen=explore;for(const k of ['bedroomOpen','kitchenOpen','twinOpen','bathUnlocked','bathDoorOpen'])state[k]=explore;started=true;complete=false;paused=false;$('#landing').hidden=true;$('#hud').hidden=false;$('#modeName').textContent=explore?'자유 탐색 · L 조명 / U 스탠드':'관찰은 당신의 몫이다.';player.set(0,1.62,2.7);yaw=0;pitch=-.015;initAudio();inventory();record('316호 스위트룸에서 깨어나다','침실 옆에는 욕실, 안쪽 문 너머에는 거실과 간이주방, 동행인의 트윈 침실이 있다. 호텔 복도로 나가는 출입문은 거실에 있다.');caption(explore?'열린 방을 자유롭게 둘러볼 수 있습니다.':'316호의 침실에서 눈을 떴다.\n거실로 이어지는 안쪽 문이 잠겨 있다.',6200);}
function finish(){if(complete)return;if(state.explore)return;if(!state.exitOpen||!state.safeOpen)return;complete=true;state.complete=true;releaseMouse();$('#caption').classList.remove('show');$('#toast').classList.remove('show');$('#hud').hidden=true;$('#ending').hidden=false;const t=Math.round(state.seconds);$('#result').textContent=`조사 시간 ${Math.floor(t/60)}분 ${t%60}초  /  관찰 기록 ${state.notes.length}개  /  도움 ${state.hints}회`;sound('unlock');}
let adminEnabled=new URLSearchParams(location.search).get('admin')==='1';
let adminPointId='bedroom',adminFree=false,adminAutoResume=true;
function storageRead(key){try{return localStorage.getItem(key);}catch{return null;}}
function storageWrite(key,value){try{localStorage.setItem(key,value);return true;}catch{return false;}}
function adminSettings(){storageWrite(SETTINGS_KEY,JSON.stringify({pointId:adminPointId,free:adminFree,autoResume:adminAutoResume}));}
function currentCheckpoint(){return writeCheckpoint({state,pointId:adminPointId,position:player.toArray(),yaw,pitch,clockHour,clockMinute,luggageDigits,safeSymbols});}
function saveAdminPoint(quiet=false){if(!adminEnabled||!started||complete)return false;const ok=storageWrite(CHECKPOINT_KEY,currentCheckpoint());if(!quiet)toast(ok?'현재 테스트 지점을 저장했습니다.':'브라우저 저장소를 사용할 수 없어 이번 지점을 저장하지 못했습니다.');return ok;}
function applyAdminState(snapshot){
 closeInspection();releaseMouse();closeModal();
 for(const key of Object.keys(state))delete state[key];Object.assign(state,snapshot.state);state.complete=false;
 started=true;complete=false;paused=false;mode='walk';active=null;crouched=false;drag=false;moved=false;
 luggageDigits.splice(0,3,...(snapshot.luggageDigits||(snapshot.state.luggageOpen?[5,7,1]:[0,0,0])));safeSymbols.splice(0,4,...(snapshot.safeSymbols||(snapshot.state.safeOpen?MUSIC_SEQUENCE:[0,0,0,0])));
 room.setPuzzleDials(luggageDigits,safeSymbols);
 clockHour=snapshot.clockHour;clockMinute=snapshot.clockMinute;room.clockHands(clockHour,clockMinute);room.update(1,elapsed);
 const point=getTestStart(snapshot.pointId);adminPointId=point.id;let position=snapshot.position;
 if(!room.canMove(position[0],position[2])){const zone=zoneAt(position[0],position[2]);const fallback=getTestStart(zone==='exitHall'?'exit':zone==='lowerHall'?'downstairs':zone||point.id);position=fallback.position;if(!room.canMove(position[0],position[2]))position=point.position;}
 player.fromArray(position);player.y=floorHeight(player.x,player.z)+1.62;yaw=snapshot.yaw;pitch=snapshot.pitch;
 camera.fov=57;camera.updateProjectionMatrix();camera.position.copy(player);camera.rotation.set(pitch,yaw,0);camera.updateMatrixWorld();room.scene.updateMatrixWorld(true);
 $('#landing').hidden=true;$('#ending').hidden=true;$('#pause').hidden=true;$('#inspection').hidden=true;$('#hud').hidden=false;$('#prompt').hidden=true;
 $('#caption').classList.remove('show');$('#toast').classList.remove('show');$('#modeName').textContent='관리자 테스트 · F2로 위치 변경';
 inventoryOpened=true;inventoryUnread=false;knownInventory.clear();state.inventory.forEach(id=>knownInventory.add(id));inventory();hintPhase='';hintStep=0;phoneTimer=0;
 $('#pause .muted').textContent=adminAutoResume?'관리자 테스트는 위치와 진행을 자동 저장합니다. F2로 시작 위치를 바꿀 수 있습니다.':'관리자 테스트 · F2에서 저장하거나 다른 지점을 선택할 수 있습니다.';
 adminSettings();if(adminAutoResume)saveAdminPoint(true);
}
function startAdminPoint(id,free){
 const setup=createTestStart(id,free),p=setup.point,dx=p.look[0]-p.position[0],dz=p.look[2]-p.position[2];adminFree=free;
 applyAdminState({state:setup.state,pointId:p.id,position:p.position,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(p.look[1]-p.position[1],Math.hypot(dx,dz)),clockHour:setup.clockHour,clockMinute:setup.clockMinute});
 toast('관리자 테스트 · '+p.label,3500);
}
function adminPanel(){
 if(!adminEnabled||!assetsReady)return;
 const saved=readCheckpoint(storageRead(CHECKPOINT_KEY));
 const groups=[...new Set(TEST_STARTS.map(p=>p.group))];
 modal(`<h2>관리자 테스트</h2><p class="admin-intro">확인할 공간이나 퍼즐 단계에서 바로 시작하세요. 플레이 중에도 <kbd>F2</kbd>로 다시 열 수 있어요.</p>
 <label class="admin-field" for="adminStartPoint"><span>시작 위치 · 진행 단계</span><select id="adminStartPoint">${groups.map(group=>`<optgroup label="${group}">${TEST_STARTS.filter(p=>p.group===group).map(p=>`<option value="${p.id}" ${p.id===adminPointId?'selected':''}>${p.label}</option>`).join('')}</optgroup>`).join('')}</select></label>
 <p id="adminStartDescription" class="admin-description">${getTestStart(adminPointId).description}</p>
 <label class="admin-check"><input id="adminFree" type="checkbox" ${adminFree?'checked':''}><span>모든 문을 열고 자유롭게 둘러보기<small>퍼즐 단계의 소지품은 유지하고, 완료 화면은 표시하지 않습니다.</small></span></label>
 <label class="admin-check"><input id="adminAutoResume" type="checkbox" ${adminAutoResume?'checked':''}><span>패치·새로고침 후 자동으로 이어가기<small>관리자 모드에서 위치와 진행 상태를 이 브라우저에 자동 저장합니다.</small></span></label>
 <button class="primary" id="adminLaunch">선택한 지점에서 시작 <span>→</span></button><p class="admin-reset-note">시작하면 현재 테스트 진행을 선택한 단계로 바꿉니다.</p>
 <div class="admin-checkpoint"><h3>저장 지점</h3><p id="adminSavedDescription">${saved?`${getTestStart(saved.pointId).label} · ${new Date(saved.savedAt).toLocaleString('ko-KR')}`:'아직 저장된 테스트 지점이 없습니다.'}</p>
 <div class="admin-actions"><button class="outline" id="adminSave" ${!started||complete?'disabled':''}>현재 지점 저장</button><button class="outline" id="adminRestore" ${!saved?'disabled':''}>저장 지점 불러오기</button><button class="quiet" id="adminClear" ${!saved?'disabled':''}>저장 지점 지우기</button></div></div>
 <button class="quiet" id="adminNormal">일반 플레이로 돌아가기</button>`,'admin');
 $('#adminStartPoint').onchange=e=>{$('#adminStartDescription').textContent=getTestStart(e.target.value).description;};
 $('#adminLaunch').onclick=()=>{adminAutoResume=$('#adminAutoResume').checked;startAdminPoint($('#adminStartPoint').value,$('#adminFree').checked);};
 $('#adminAutoResume').onchange=e=>{adminAutoResume=e.target.checked;adminSettings();};
 $('#adminSave').onclick=()=>{if(saveAdminPoint()){adminPanel();}};
 $('#adminRestore').onclick=()=>{const checkpoint=readCheckpoint(storageRead(CHECKPOINT_KEY));if(checkpoint){adminFree=checkpoint.state.explore;applyAdminState(checkpoint);toast('저장한 테스트 지점을 불러왔습니다.');}else{adminPanel();toast('저장 지점을 읽을 수 없습니다. 시작 위치를 다시 선택하세요.');}};
 $('#adminClear').onclick=()=>{try{localStorage.removeItem(CHECKPOINT_KEY);}catch{}adminAutoResume=false;adminSettings();adminPanel();};
 $('#adminNormal').onclick=()=>{const url=new URL(location.href);url.searchParams.delete('admin');url.searchParams.delete('start');url.searchParams.delete('free');location.assign(url.href);};
}
if(adminEnabled){
 try{const settings=JSON.parse(storageRead(SETTINGS_KEY));if(settings){adminPointId=getTestStart(settings.pointId).id;adminFree=settings.free===true;adminAutoResume=settings.autoResume!==false;}}catch{}
}
function openAdminPanel(){
 if(!assetsReady)return;
 if(!adminEnabled){adminEnabled=true;const url=new URL(location.href);url.searchParams.set('admin','1');history.replaceState(null,'',url.href);}
 adminPanel();
}
$('#adminButton').onclick=$('#adminLanding').onclick=openAdminPanel;
setInterval(()=>{if(adminEnabled&&adminAutoResume&&started&&!complete&&!paused&&mode==='walk')saveAdminPoint(true);},2000);
function initializeAdmin(){
 $('#adminButton').disabled=false;$('#adminLanding').disabled=false;if(!adminEnabled)return;
 const params=new URLSearchParams(location.search),explicit=params.get('start');
 if(TEST_STARTS.some(p=>p.id===explicit)){startAdminPoint(explicit,params.get('free')==='1');return;}
 const saved=readCheckpoint(storageRead(CHECKPOINT_KEY));if(adminAutoResume&&saved){adminFree=saved.state.explore;applyAdminState(saved);toast('관리자 테스트 · 저장 지점에서 이어갑니다.');}else adminPanel();
}

$('#inventoryButton').onclick=$('#inventoryGuide').onclick=bag;
$('#storyStart').onclick=()=>start(false);$('#exploreStart').onclick=()=>start(true);$('#closeInspect').onclick=closeInspection;$('#closeModal').onclick=closeModal;$('#resume').onclick=resume;$('#restart').onclick=$('#endingRestart').onclick=()=>{adminEnabled=false;adminAutoResume=false;const storage={removeItem:key=>localStorage.removeItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};location.replace(prepareRestart(storage,location.href));};$('#returnRoom').onclick=()=>{complete=false;state.explore=true;$('#ending').hidden=true;$('#hud').hidden=false;$('#modeName').textContent='해결한 밀실 · 자유 탐색';};$('#pauseButton').onclick=pause;$('#journalButton').onclick=journal;$('#hintButton').onclick=hint;$('#help').onclick=help;$('#brand').onclick=e=>{e.preventDefault();pause();};$('#sound').onclick=()=>{audioOn=!audioOn;$('#sound').textContent=audioOn?'SOUND ON':'SOUND OFF';if(audio||started)initAudio();};$('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>toast('브라우저 창을 넓혀서 플레이해 주세요.'));};
document.addEventListener('keydown',e=>{if(e.code==='F2'){e.preventDefault();if(!$('#modal').hidden&&modalKind==='admin')closeModal();else openAdminPanel();return;}if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;if(e.code==='Escape'){e.preventDefault();if(['inspect','focus'].includes(mode))closeInspection();else if(!$('#modal').hidden)closeModal();else if(!$('#pause').hidden)resume();else pause();return;}if(!started||complete)return;if(e.repeat&&['KeyE','KeyC','KeyI','KeyJ','KeyH'].includes(e.code))return;if(e.code==='KeyI'){e.preventDefault();if(!$('#pause').hidden)return;if(!$('#modal').hidden&&modalKind==='inventory')closeModal();else bag();return;}if(!$('#modal').hidden||!$('#pause').hidden||mode==='inspect')return;if(e.code==='KeyJ'){journal();return;}if(e.code==='KeyH'){hint();return;}if(state.explore&&e.code==='KeyL'){state.lightOn=!state.lightOn;return;}if(state.explore&&e.code==='KeyU'){state.uvInstalled=!state.uvInstalled;state.lampOn=true;return;}if(e.code==='KeyC'){crouched=!crouched;toast(crouched?'몸을 낮췄다.':'몸을 일으켰다.');return;}if(/^Digit[1-5]$/.test(e.code)){const id=state.inventory[+e.code.slice(-1)-1];if(id){if(CLUE_ONLY.has(id))inspectItem(id);else{state.selected=state.selected===id?null:id;inventory();}}return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&active)interact(active.id);});document.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('pointerdown',e=>{if(!started||paused&&mode!=='inspect'||complete)return;drag=true;moved=false;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag||document.pointerLockElement)return;if(Math.abs(e.movementX)+Math.abs(e.movementY)>2)moved=true;if(mode==='inspect'&&inspectPivot){inspectPivot.rotation.y+=e.movementX*.009;inspectPivot.rotation.x+=e.movementY*.006;}else if(!paused){yaw-=e.movementX*.0025;pitch=Math.max(-1.3,Math.min(1.3,pitch-e.movementY*.0025));}});canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('click',e=>{if(!started||paused||complete||moved)return;pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera);const target=pickTarget();if(target){interact(target.id);return;}if(!document.pointerLockElement)canvas.requestPointerLock?.()?.catch?.(()=>{});});document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!paused&&!complete){yaw-=e.movementX*.0025;pitch=Math.max(-1.3,Math.min(1.3,pitch-e.movementY*.0025));}});canvas.addEventListener('wheel',e=>{if(mode==='inspect'){e.preventDefault();inspectDistance=Math.max(2.1,Math.min(5,inspectDistance+e.deltaY*.002));inspectCamera.position.z=inspectDistance;}},{passive:false});window.addEventListener('blur',()=>{keys.clear();drag=false;if(started&&!complete&&!paused)pause();});document.addEventListener('pointerlockchange',()=>keys.clear());
function pickTarget(){const hits=ray.intersectObjects(room.scene.children,true);for(const hit of hits){let o=hit.object;if(!o.visible||hit.distance>2.65)continue;let visible=true;for(let p=o.parent;p;p=p.parent)if(!p.visible)visible=false;if(!visible)continue;if(o.type==='Points'||o.type==='LineSegments'||o.material?.transparent&&o.material.opacity<.15)continue;let id=null,label='';while(o){if(o.userData.interactId){id=o.userData.interactId;label=o.userData.label;break;}o=o.parent;}if(id)return{id,label,distance:hit.distance};if(hit.object.isMesh)return null;}return null;}
function resize(){renderer.setSize(innerWidth,innerHeight);for(const c of[camera,inspectCamera]){c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();}}window.addEventListener('resize',resize);
// A direct room link may start before the browser has received a gesture.
document.addEventListener('visibilitychange',()=>{
 if(!audio)return;
 if(document.hidden)audio.suspend().catch(()=>{});
 else if(started&&audioOn)initAudio();
});
function wakeAudio(){if(started&&audioOn&&audio?.state!=='running')initAudio();}
window.addEventListener('pointerdown',wakeAudio);window.addEventListener('keydown',wakeAudio);
function animate(){requestAnimationFrame(animate);const frameDelta=clock.getDelta(),dt=Math.min(frameDelta,.05);elapsed+=dt;const simDelta=started&&!document.hidden&&$('#pause').hidden?Math.min(frameDelta,1):0;searchPuzzles.update(simDelta);room.update(dt,elapsed,started?player:null);
 bathAudio?.(state,player,yaw,zoneAt(player.x,player.z)==='bath',started&&audioOn&&!document.hidden&&$('#pause').hidden&&!complete);
 if(mode==='inspect'){if(inspectionId==='frame')$('#inspectBackAction').hidden=!(Math.cos(inspectPivot.rotation.y)<-.6&&!state.inventory.includes('filmB')&&!state.filmJoined);renderer.render(inspectScene,inspectCamera);return;}
 if(!started){camera.position.set(.25,1.48,3.1);camera.rotation.set(-.015,-.3+Math.sin(elapsed*.07)*.025,0);}else if(!paused&&!complete){state.seconds+=dt;if(keys.has('ArrowLeft'))yaw+=dt*1.35;if(keys.has('ArrowRight'))yaw-=dt*1.35;if(keys.has('ArrowUp'))pitch=Math.min(1.3,pitch+dt);if(keys.has('ArrowDown'))pitch=Math.max(-1.3,pitch-dt);let mx=+keys.has('KeyD')-+keys.has('KeyA'),mz=+keys.has('KeyS')-+keys.has('KeyW');const len=Math.hypot(mx,mz)||1;mx/=len;mz/=len;const speed=(crouched?1.1:1.85)*dt,dx=(Math.cos(yaw)*mx+Math.sin(yaw)*mz)*speed,dz=(-Math.sin(yaw)*mx+Math.cos(yaw)*mz)*speed;if(room.canMove(player.x+dx,player.z))player.x+=dx;if(room.canMove(player.x,player.z+dz))player.z+=dz;player.y+=( (floorHeight(player.x,player.z)+(crouched?.56:1.62))-player.y)*Math.min(1,dt*9);camera.position.copy(player);if(mx||mz){camera.position.y+=Math.sin(elapsed*9)*.014;step+=dt;if(step>(crouched?.8:.55)){sound('wood');step=0;}}camera.rotation.set(pitch,yaw,0);const zone=zoneAt(player.x,player.z);if(zone==='hall'&&!state.suiteEscaped){state.suiteEscaped=true;state.selected=null;inventory();record('316호 밖의 호텔 복도','두 침실·거실·간이주방·욕실이 있던 316호를 나왔다. 복도 건너편에는 317호 객실이 있다.');caption('316호를 빠져나왔다. 여기는 호텔의 3층 복도다.\n건너편에 317호가 보인다.',6500);}if(zone==='room317'&&!state.room317Entered){state.room317Entered=true;state.selected=null;inventory();record('복도 건너편 317호에 들어서다','316호와 별개의 객실이다. 다른 투숙객의 물건이 그대로 남아 있다.');caption('317호. 다른 투숙객의 흔적이 남아 있다.',6500);}$('.room-title b').textContent=zone==='lowerHall'?'2F':zone==='hall'||zone==='stairs'?'3F':zone==='room317'||zone==='exitHall'?'317':'316';$('.room-title .overline').textContent=ZONES[zone]?.label||'316호 · 스위트룸';if(zone==='lowerHall'&&!state.lowerHallEntered){state.lowerHallEntered=true;record('2층 계단 로비','317호에서 계단문 열쇠를 찾아 복도로 돌아온 뒤, 고장 난 엘리베이터 대신 계단으로 내려왔다.');caption('2층에 도착했다. 계단을 통해 위층으로 돌아갈 수도 있다.',6500);}ray.setFromCamera(new T.Vector2(0,0),camera);active=pickTarget();$('#prompt').hidden=!active;if(active){$('#prompt').classList.toggle('mirror-prompt',active.id==='mirror'||active.id==='bathSteamMirror');$('#prompt span').textContent=active.label;$('#usePrompt').textContent=state.selected?'사용: '+ITEMS[state.selected]:'';}if(state.doorOpen&&!state.phoneHeard){phoneTimer+=dt;if(phoneTimer>6){sound('ring');phoneTimer=0;}}}
 room.updateGuest(started,player,yaw,pitch,floorHeight(player.x,player.z),dt);
 // Keep the low-light fill outside the face, also during a mirror close-up.
 eyeFill.position.set(player.x-.52*Math.sin(yaw)-.16*Math.cos(yaw),player.y+.20,player.z-.52*Math.cos(yaw)+.16*Math.sin(yaw));
 eyeFill.intensity=started&&!state.lightOn?.8:0;renderer.render(room.scene,camera);}
animate();await room.ready;assetsReady=true;$('#loading').hidden=true;initializeAdmin();if(room.assetsFailed.length)toast('일부 재질을 불러오지 못했습니다. 기본 재질로 플레이할 수 있습니다.');

