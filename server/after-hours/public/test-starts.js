import {LUGGAGE_CODE,takeWindingKey,takeInnerKey,takeCompanionKeys} from './room-state.js?v=20261117-tricks1';
import {createState,ITEMS,addItem,combineFilms,alignFilm,setClock,useItem,unlockDoor,RING_TARGET,unlockLuggage,hearTune,unlockSafe,takeStairKey,MUSIC_SEQUENCE,unlockCompanionCase,COMPANION_TARGET} from './room-state.js?v=20261117-tricks1';

export const TEST_STARTS=[
 {id:'steam',group:'트릭 확인',label:'욕실 · 온수와 거울의 접수 기호',step:0,position:[6.63,1.62,-.2],look:[8.04,1.25,.025],description:'C/H 표시를 E로 H에 맞추고 세면볼을 조사해 물을 틀면 거울의 흔적이 나타납니다.'},
 {id:'rubbing',group:'트릭 확인',label:'317호 · 영수증 정렬과 압흔 전사',step:5,position:[5.4,1.62,17.7],look:[4.35,.55,17.95],description:'수하물표·영수증·연필을 갖고 있습니다. I에서 연필을 조사해 수하물표에 사용하세요.'},
 {id:'basinFlow',group:'소품 모델 확인',label:'욕실 · 수도와 천 적시기',step:0,position:[6.63,1.62,-.2],look:[7.81,1.01,-.2],description:'E로 수도를 켜고 끕니다. I에서 천을 선택해 세면대에 사용하면 물줄기 아래에서 적십니다.'},
 {id:'latchNote',group:'이야기 단서 확인',label:'트윈 침실 · 협탁 수리 메모',step:4,position:[-7.1,1.62,6.05],look:[-7.16,.798,5.08],description:'화장대의 접힌 수리 메모를 읽고 협탁 걸쇠에 적용해 보세요.'},
 {id:'searchBathWipe',group:'탐색 확장',label:'욕실 · 얼룩 닦기부터',step:0,position:[5.3,1.62,.05],look:[3.81,1.43,.80],description:'물을 적신 천을 가지고 있습니다. 문 옆 의뢰표에 사용해 닦으세요.'},
 {id:'searchRouteReady',group:'탐색 확장',label:'마지막 방 · 대피도 조각 맞추기',step:8,position:[7.6,1.62,22.9],look:[7.75,.84,23.94],description:'세 조각을 테이블에 끼운 상태입니다. 끊긴 경로선을 이어 주세요.'},
 {id:'searchBook',group:'탐색 확장',label:'거실 · 장부 아래 조각',step:0,position:[-2.04,1.62,9.25],look:[-3.28,.928,8.88],description:'미니바 옆 작은 선반의 장부를 들어 보세요.'},
 {id:'searchBedroom',group:'탐색 확장',label:'침실 · 가방 안감과 액자 도구',step:0,position:[1.65,1.62,1.1],look:[2.65,.72,.9],description:'가방을 열고 안감을 들어 액자 뒷판 고정나사에 쓸 동전을 찾으세요.'},
 {id:'searchBath',group:'탐색 확장',label:'욕실 · 젖은 천으로 의뢰표 닦기',step:0,position:[5.85,1.62,.75],look:[6.74,1.02,1.30],description:'청소용 천을 찾아 세면대에서 적신 뒤 문 옆 의뢰표를 닦으세요.'},
 {id:'searchLiving',group:'탐색 확장',label:'거실 · 흩어진 상감 조각',step:0,position:[.3,1.62,7.1],look:[-.45,.43,7.80],description:'소파 아래 천과 미니바 장부 밑을 살펴 세 조각을 모두 찾으세요.'},
 {id:'searchKitchen',group:'탐색 확장',label:'주방 · 서비스 서랍의 전지',step:0,position:[7.5,1.62,6.3],look:[7.64,.63,5.48],description:'서랍 잠금 탭을 올려 AA 전지 두 개를 꺼내 저울에 넣으세요.'},
 {id:'searchTwin',group:'탐색 확장',label:'트윈 침실 · 슬라이드 서랍과 엽서',step:4,position:[-6.50,1.62,8.75],look:[-6.50,.69,9.465],description:'방 안에서 수리 기록을 찾아 협탁의 세 핀을 맞추세요.'},
 {id:'search317',group:'탐색 확장',label:'317호 · 자석과 실린더 회수',step:6,position:[5.4,1.62,18.05],look:[4.48,.13,17.65],description:'열린 가방에서 끈 달린 자석을 꺼내 협탁 아래 실린더를 회수하세요.'},
 {id:'searchInner',group:'탐색 확장',label:'마지막 방 · 찢긴 대피도 복원',step:8,position:[5.6,1.62,22.8],look:[4.4,.81,23.56],description:'서랍, 의자 아래, 휴지통을 찾아 대피도 조각을 테이블에 끼워 복원하세요.'},
 {id:'scale',group:'퍼즐 단계부터 시작',label:'주방 · 통 집기와 저울',step:0,position:[5.65,1.62,6.12],look:[5.7,1.08,5.22],description:'빈 예비 통과 재료 통을 집어 저울 위에 올려 측정하세요.'},
 {id:'plates',group:'소품 모델 확인',label:'주방 · 서비스 카트 접시',step:0,position:[5.2,1.62,8.35],look:[5.2,.87,9.3],description:'중앙이 막힌 접시와 가장자리 두께를 확인합니다.'},
 {id:'sink',group:'소품 모델 확인',label:'주방 · 싱크볼과 수전',step:0,position:[5.42,1.62,6.0],look:[5.5,1.04,5.04],description:'싱크볼 바닥과 수전 손잡이 축의 연결을 확인합니다.'},
 {id:'bathEntry',group:'퍼즐 단계부터 시작',label:'거실 · 욕실 열쇠 찾기',step:0,position:[-.80,1.62,5.85],look:[-1.0,.61,6.91],description:'시작 방을 나온 뒤입니다. 찻잔 받침을 뒤집어 별도의 욕실 열쇠를 찾으세요.'},
 {id:'linen',group:'이야기 단서 확인',label:'욕실 · 독립 세탁 퍼즐',step:0,position:[6.6,1.62,.5],look:[7.15,1.45,1.37],description:'욕실 문을 연 상태입니다. 담당자 기록과 세 곳의 의뢰표를 조사하세요.'},
 {id:'linenLock',group:'퍼즐 단계부터 시작',label:'욕실 · 린넨장 잠금',step:0,position:[6.3,1.62,-.3],look:[7.402,.67,-.2],description:'시작 방의 시계·UV와 별개인 접수 순서 잠금입니다.'},
 {id:'bedroom',group:'공간으로 이동',label:'316호 · 침실',step:0,position:[0,1.62,2.7],look:[0,1.4,-1],description:'처음 상태로 침실에서 시작합니다.'},
 {id:'shower',group:'소품 모델 확인',label:'욕실 · 샤워기 가까이 보기',step:0,position:[7.0,1.62,-2.8],look:[7.36,1.35,-4.29],description:'샤워기 손잡이·호스 양 끝·벽 고정부의 연결을 확인합니다.'},
 {id:'towels',group:'소품 모델 확인',label:'욕실 · 수건 가까이 보기',step:0,position:[5.85,1.63,.75],look:[6.38,1.42,1.36],description:'Blender에서 다시 만든 수건의 접힘·두께·직물 표면을 확인합니다.'},
 {id:'cups',group:'소품 모델 확인',label:'거실 · 찻잔 가까이 보기',step:0,position:[-.80,1.62,5.85],look:[-1.0,.61,6.91],description:'찻잔 내부와 손잡이, 받침 접시를 확인합니다.'},
 {id:'kettle',group:'소품 모델 확인',label:'주방 · 주전자 가까이 보기',step:0,position:[7.80,1.62,5.95],look:[7.79,1.12,5.04],description:'전기 주전자의 주둥이·뚜껑·손잡이 연결부를 확인합니다.'},
 {id:'twin',group:'공간으로 이동',label:'316호 · 트윈 침실',step:0,position:[-4.3,1.62,7.0],look:[-6.5,1,9.0],description:'거실 옆 두 번째 침실. 여행 엽서와 보관함을 확인합니다.'},
 {id:'teaBox',group:'퍼즐 단계부터 시작',label:'거실 · 차 상자 열기',step:0,position:[-1.95,1.62,9.3],look:[-2.92,1.12,9.5],description:'욕실 린넨장에서 얻은 꽃무늬 열쇠로 차 상자를 여세요.'},
 {id:'teaDoor',group:'퍼즐 단계부터 시작',label:'거실 · 편지와 상감판',step:0,position:[-1.80,1.62,5.85],look:[-1.80,.62,6.85],description:'차 상자의 조각을 챙겼습니다. I에서 조각을 손에 들어 상감판에 끼우세요.'},
 {id:'water',group:'퍼즐 단계부터 시작',label:'주방 · 야간 기록과 저울',step:0,position:[5.42,1.62,6.1],look:[5.42,1.5,4.76],description:'야간 근무 기록, 빈 예비 통과 재료 통, 저울을 조사하세요.'},
 {id:'waterKey',group:'퍼즐 단계부터 시작',label:'주방 · 열린 보관함의 열쇠',step:0,position:[4.65,1.62,6.0],look:[4.65,1.02,5.21],description:'주방 잠금을 푼 상태입니다. 열린 상자에서 열쇠를 직접 꺼내세요.'},
 {id:'companion',group:'퍼즐 단계부터 시작',label:'트윈 침실 · 동행인의 보관함부터',step:4,position:[-6.55,1.62,6.1],look:[-6.55,1.0,5.0],description:'처음 방의 트릭은 해결한 상태입니다. 엽서 뒷면의 이야기와 지도를 대조하세요.'},
 {id:'living',group:'공간으로 이동',label:'316호 · 거실',step:0,position:[.4,1.62,5.5],look:[-1.35,1.05,7.6],description:'거실의 가구·사진·스탠드를 바로 확인합니다.'},
 {id:'kitchen',group:'공간으로 이동',label:'316호 · 간이주방',step:0,position:[4.5,1.62,8.2],look:[6.4,1.3,5.0],description:'주방 가구와 싱크대를 바로 확인합니다.'},
 {id:'bath',group:'공간으로 이동',label:'316호 · 욕실',step:0,position:[5.3,1.62,.05],look:[7.45,1.2,-.6],description:'욕실 구조와 세면대·샤워부스를 바로 확인합니다.'},
 {id:'hall',group:'공간으로 이동',label:'3층 · 호텔 복도',step:4,position:[2.12,1.62,11.85],look:[5.12,1.55,13.5],description:'316호를 해결한 상태입니다. 317호 예비 열쇠를 가지고 있습니다.'},
 {id:'room317',group:'공간으로 이동',label:'317호 · 객실',step:5,position:[5.12,1.62,14.2],look:[6.9,1.2,17.2],description:'이전 객실과 출입문을 통과한 상태로 317호 퍼즐을 시작합니다.'},
 {id:'exit',group:'공간으로 이동',label:'317호 · 마지막 방 / 계단 열쇠',step:8,position:[7.5,1.62,22.0],look:[7.5,.85,24.0],description:'317호 안쪽 방을 연 상태입니다. 대피 안내를 읽고 잠긴 계단 열쇠함을 조사하세요.'},
 {id:'stairs',group:'퍼즐 단계부터 시작',label:'3층 · 잠긴 계단문',step:9,position:[-2.7,1.62,12],look:[-3.6,1.4,12],description:'317호에서 찾은 계단문 열쇠를 가지고 있습니다.'},
 {id:'downstairs',group:'공간으로 이동',label:'2층 · 계단 로비',step:10,position:[-11.4,-1.62,12],look:[-9.0,-1.5,12],description:'계단문을 열고 2층에 도착한 상태. 위층까지 걸어 올라갈 수도 있습니다.'},
 {id:'postcards',group:'이야기 단서 확인',label:'트윈 침실 · 엽서와 편지',step:4,position:[-6.55,1.62,5.8],look:[-6.55,1.62,4.7],description:'관광 지도를 가지고 있습니다. 엽서의 앞뒷면을 읽어 보세요.'},
 {id:'desk317',group:'이야기 단서 확인',label:'317호 · 지워진 기록',step:5,position:[7.5,1.62,19.1],look:[9.35,.805,19.93],description:'영수증과 수하물표를 챙겼습니다. 화장대 메모와 연필을 조사하세요.'},
 {id:'evacuationBox',group:'퍼즐 단계부터 시작',label:'317호 · 계단 열쇠함',step:8,position:[7.05,1.62,22.8],look:[7.05,.98,23.94],description:'옆의 대피 안내와 여백의 글을 읽고 열쇠함을 여세요.'},
 {id:'clock',group:'퍼즐 단계부터 시작',label:'침실 · 벽시계 퍼즐부터',step:1,position:[2.55,1.62,-3.4],look:[2.65,2.08,-4.40],description:'필름 조합과 정렬까지 완료했습니다. 시계 바늘 조작부터 확인합니다.'},
 {id:'vanity',group:'퍼즐 단계부터 시작',label:'침실 · 책상 서랍 열기부터',step:2,position:[1.65,1.62,-1.25],look:[2.58,.63,-2.05],description:'시계에서 얻은 작은 열쇠를 가지고 있습니다. 침실 책상 아래 서랍에 사용하세요.'},
 {id:'uv',group:'퍼즐 단계부터 시작',label:'침실 · UV 거울 단서부터',step:3,position:[1.65,1.62,1.15],look:[3.48,1.83,1.15],description:'전구 설치·액자 조사·조명 차단을 마쳤습니다. 거울 단서와 출입문 잠금을 확인합니다.'},
 {id:'music',group:'퍼즐 단계부터 시작',label:'317호 · 오르골부터',step:6,position:[7.5,1.62,19.1],look:[8.5,1.03,20.06],description:'여행가방을 열어 태엽 열쇠를 얻었습니다. 오르골에 사용하는 단계부터 확인합니다.'},
 {id:'safe',group:'퍼즐 단계부터 시작',label:'317호 · 금고부터',step:7,position:[5.4,1.62,18.3],look:[4.24,.72,19.32],description:'오르골 재생까지 마쳤습니다. 금고의 문양을 맞추는 단계부터 확인합니다.'},
];
export const getTestStart=id=>TEST_STARTS.find(p=>p.id===id)||TEST_STARTS.find(p=>p.id==='bedroom');
export function createTestStart(id,free=false){
 const point=getTestStart(id),s=createState();
 if(point.step>=1){s.frameReleased=true;s.coinTaken=true;addItem(s,'filmA');addItem(s,'filmB');combineFilms(s);alignFilm(s,2,1,0);s.frameTaken=true;}
 if(point.step>=2)setClock(s,5,40);

 if(point.step>=3){useItem(s,'key','drawer');addItem(s,'bulb');s.bulbTaken=true;useItem(s,'bulb','lamp');s.lightOn=false;s.curtainsClosed=true;}
 if(point.step>=4){s.inlayMounted=[true,true];s.inlayFound=[true,true];s.batteriesInstalled=[true,true];s.batteriesTaken=[true,true];s.tagWiped=true;s.wheelInstalled=true;s.bathUnlocked=true;s.bathKeyTaken=true;s.linenSolved=true;s.linenCabinetOpen=true;s.tinKeyTaken=true;s.rings=[...RING_TARGET];unlockDoor(s);s.twinOpen=true;s.kitchenOpen=true;s.stockSolved=true;s.stockKeyTaken=true;s.suiteEscaped=!['companion','postcards','searchTwin','latchNote'].includes(point.id);s.doorOpen=s.suiteEscaped;s.lightOn=true;s.curtainsClosed=false;if(s.suiteEscaped){s.travelPostcardsSeen=true;unlockCompanionCase(s,COMPANION_TARGET);takeCompanionKeys(s);useItem(s,'suiteKey','suiteDoor');}}
 if(point.step>=5){useItem(s,'passKey','entry317');s.room317Entered=true;}
 if(point.step>=6){unlockLuggage(s,LUGGAGE_CODE);takeWindingKey(s);}
 if(point.step>=7){s.cylinderInstalled=true;useItem(s,'windingKey','musicBox');hearTune(s);}
 if(point.step>=8){unlockSafe(s,MUSIC_SEQUENCE);takeInnerKey(s);useItem(s,'exitKey','exit317');}
 if(point.step>=9){s.routeRestored=true;s.routeTurns=[0,0,0];s.routeOrder=[0,1,2];s.routeFound=[true,true,true];s.routeMounted=[true,true,true];s.evacuationRead=true;s.evacuationBoxOpen=true;takeStairKey(s);}
 if(point.step>=10)useItem(s,'stairKey','stairDoor');
 const zone=point.id;
 if(['teaBox','teaDoor','water','waterKey'].includes(zone)){s.bedroomOpen=true;s.bathUnlocked=true;s.bathDoorOpen=true;s.bathKeyTaken=true;s.linenSolved=true;s.tinKeyTaken=true;}
 if(zone==='teaBox'){s.teaTraySeen=true;s.tinKeyTaken=true;addItem(s,'tinKey');}
 if(zone==='teaDoor'){s.inlayFound=[true,true];addItem(s,'inlayA');addItem(s,'inlayB');s.teaTraySeen=true;s.tinKeyTaken=true;s.teaTinOpen=true;s.inlayTaken=true;addItem(s,'inlay');}
 if(['water','waterKey'].includes(zone))s.kitchenOpen=true;
 if(zone==='waterKey'){s.stockSolved=true;}
 if(['living','cups','bathEntry','searchLiving','searchBook'].includes(zone))s.bedroomOpen=true;
 if(['kitchen','kettle','twin','scale','plates','sink','searchKitchen'].includes(zone)){s.bedroomOpen=true;s.bathUnlocked=true;s.bathDoorOpen=true;s.bathKeyTaken=true;s.linenSolved=true;s.tinKeyTaken=true;}
 if(['kitchen','kettle','twin','scale','plates','sink','searchKitchen'].includes(zone))s.kitchenOpen=true;
 if(['twin','companion','postcards','searchTwin'].includes(zone)){s.stockSolved=true;s.stockKeyTaken=true;s.twinOpen=true;addItem(s,'tourMap');}
 if(['desk317','rubbing'].includes(zone)){addItem(s,'receipt');addItem(s,'tag');}if(zone==='rubbing'){s.pencilTaken=true;addItem(s,'pencil');}
 if(zone==='basinFlow'){s.clothTaken=true;addItem(s,'cloth');}
 if(zone==='searchBathWipe'){s.clothTaken=true;s.clothWet=true;addItem(s,'cloth');s.selected='cloth';}
 if(zone==='searchRouteReady'){s.routeFound=[true,true,true];s.routeMounted=[true,true,true];}
 if(zone==='search317'){s.magnetTaken=true;addItem(s,'magnet');}
 if(['searchTwin','latchNote'].includes(zone)){s.wheelInstalled=false;s.wheelDrawerOpen=false;s.wheelTaken=false;s.companionSolved=false;s.companionKeysTaken=false;}
 if(zone==='shower')s.showerOpen=true;
 if(['bath','towels','shower','linen','linenLock','searchBath','searchBathWipe','basinFlow','steam'].includes(zone)){s.bedroomOpen=true;s.bathKeyTaken=true;s.bathUnlocked=true;s.bathDoorOpen=true;}
 if(free){s.bedroomOpen=true;s.kitchenOpen=true;s.twinOpen=true;s.bathUnlocked=true;s.explore=true;s.doorOpen=true;s.room317Open=true;s.exitOpen=true;s.stairsOpen=true;s.bathDoorOpen=true;s.showerOpen=true;}
 return{state:s,point,clockHour:point.step>=2?5:11,clockMinute:point.step>=2?40:10};
}

export const CHECKPOINT_KEY='after-hours.admin.checkpoint.v2';
export const SETTINGS_KEY='after-hours.admin.settings.v1';
// Save only serializable gameplay state. Unknown fields from later/older versions are ignored.
export function readCheckpoint(raw){
 try{const v=JSON.parse(raw);if(v?.version!==2||!v.state||!Array.isArray(v.position)||v.position.length!==3||!v.position.every(Number.isFinite)||!Number.isFinite(v.yaw)||!Number.isFinite(v.pitch))return null;
  const s=createState();for(const key of Object.keys(s))if(typeof s[key]==='boolean'&&typeof v.state[key]==='boolean')s[key]=v.state[key];
  s.basinWetting=false;
  if(!Object.hasOwn(v.state,'drawerUnlocked')&&s.clockSolved&&(s.drawerOpen||s.bulbTaken||s.uvInstalled))s.drawerUnlocked=true;
  if(!Object.hasOwn(v.state,'linenSolved')&&(s.teaTinOpen||s.inlayTaken||s.kitchenOpen||s.tinKeyTaken)){s.linenSolved=true;s.bathUnlocked=true;s.bathKeyTaken=true;}
  // Saves made before the twin bedroom already obtained the spare key from the old rack.
  if(s.passTaken&&!Object.hasOwn(v.state,'companionSolved'))s.companionSolved=true;
  s.inventory=Array.isArray(v.state.inventory)?[...new Set(v.state.inventory.filter(id=>Object.hasOwn(ITEMS,id)))]:[];s.selected=s.inventory.includes(v.state.selected)?v.state.selected:null;
  if(Number.isInteger(v.state.stockOnScale)&&v.state.stockOnScale>=0&&v.state.stockOnScale<4){s.stockOnScale=v.state.stockOnScale;s.inventory=s.inventory.filter(id=>id!==['stock_tea','stock_coffee','stock_sugar','stock_empty'][s.stockOnScale]);if(!s.inventory.includes(s.selected))s.selected=null;}
  for(const key of ['wipePatches','inlayFound','inlayMounted','batteriesTaken','batteriesInstalled','postcardFound','routeFound','routeMounted'])if(Array.isArray(v.state[key])&&v.state[key].length===s[key].length&&v.state[key].every(n=>typeof n==='boolean'))s[key]=[...v.state[key]];
  for(const key of ['wheelSliders','routeOrder'])if(Array.isArray(v.state[key])&&v.state[key].length===3&&v.state[key].every(n=>Number.isInteger(n)&&n>=0&&n<3)&&(key!=='routeOrder'||new Set(v.state[key]).size===3))s[key]=[...v.state[key]];
  if(Array.isArray(v.state.routeTurns)&&v.state.routeTurns.length===3&&v.state.routeTurns.every(n=>n===0||n===1))s.routeTurns=[...v.state.routeTurns];
  if(Array.isArray(v.state.rubbingOffset)&&v.state.rubbingOffset.length===2&&v.state.rubbingOffset.every(n=>Number.isInteger(n)&&n>=-2&&n<=2))s.rubbingOffset=[...v.state.rubbingOffset];
  if(Number.isInteger(v.state.rubbingTurn)&&v.state.rubbingTurn>=0&&v.state.rubbingTurn<4)s.rubbingTurn=v.state.rubbingTurn;
  if(Array.isArray(v.state.rubbingMarks)&&v.state.rubbingMarks.length===6&&v.state.rubbingMarks.every(n=>Number.isInteger(n)&&n>=0&&n<=3))s.rubbingMarks=[...v.state.rubbingMarks];
  if(s.tagRubbed){s.rubbingPrepared=true;s.rubbingAligned=true;s.rubbingBlank=true;s.rubbingOffset=[0,0];s.rubbingTurn=0;s.rubbingMarks=[3,3,3,3,3,3];}
  if(s.rubbingAligned&&(!s.rubbingBlank||s.rubbingTurn!==0||s.rubbingOffset.some(Boolean)))s.rubbingAligned=false;
  if(Number.isFinite(v.state.bathSteam)&&v.state.bathSteam>=0&&v.state.bathSteam<=1)s.bathSteam=v.state.bathSteam;
  if(s.routeRestored){s.routeOrder=[0,1,2];s.routeTurns=[0,0,0];}
  if(!Object.hasOwn(v.state,'frameReleased')){s.frameReleased=s.filmJoined||s.aligned||s.inventory.includes('filmB');s.coinTaken=s.frameReleased;}
  if(!Object.hasOwn(v.state,'inlayMounted')&&(s.traySolved||s.kitchenOpen)){s.inlayMounted=[true,true];s.inlayFound=[true,true];}
  if(!Object.hasOwn(v.state,'batteriesInstalled')&&(s.stockWeights.some(Boolean)||s.stockSolved)){s.batteriesInstalled=[true,true];s.batteriesTaken=[true,true];}
  if(!Object.hasOwn(v.state,'wheelInstalled')&&s.companionSolved)s.wheelInstalled=true;
  if(!Object.hasOwn(v.state,'cylinderInstalled')&&(s.tuneHeard||s.safeOpen))s.cylinderInstalled=true;
  if(!Object.hasOwn(v.state,'routeRestored')&&s.evacuationRead){s.routeRestored=true;s.routeTurns=[0,0,0];s.routeOrder=[0,1,2];s.routeFound=[true,true,true];s.routeMounted=[true,true,true];}
  if(Array.isArray(v.state.rings)&&v.state.rings.length===3&&v.state.rings.every(n=>Number.isInteger(n)&&n>=0&&n<8))s.rings=[...v.state.rings];
  for(const key of ['stockWeights','stockBottoms'])if(Array.isArray(v.state[key])&&[3,s[key].length].includes(v.state[key].length)&&v.state[key].every(n=>typeof n==='boolean'))s[key]=s[key].map((value,i)=>v.state[key][i]??value);
  for(const [key,max]of [['linenDigits',9],['stockDigits',9],['companionArrows',7],['evacArrows',3]])if(Array.isArray(v.state[key])&&v.state[key].length===3&&v.state[key].every(n=>Number.isInteger(n)&&n>=0&&n<=max))s[key]=[...v.state[key]];
  if(Array.isArray(v.state.trayTurns)&&v.state.trayTurns.length===4&&v.state.trayTurns.every(n=>Number.isInteger(n)&&n>=0&&n<4))s.trayTurns=[...v.state.trayTurns];
  if(!Object.hasOwn(v.state,'bedroomOpen')){s.bedroomOpen=s.doorOpen||v.position[2]>4.5;s.bathUnlocked=true;s.bathDoorOpen=true;s.kitchenOpen=v.position[0]>3.6&&v.position[2]>4.5||s.companionSolved||s.doorOpen;s.twinOpen=s.companionSolved||v.position[0]<-3.6;s.stockSolved=s.twinOpen;}
  for(const key of ['seconds','hints'])if(Number.isFinite(v.state[key])&&v.state[key]>=0)s[key]=v.state[key];
  s.notes=Array.isArray(v.state.notes)?v.state.notes.filter(n=>typeof n?.title==='string'&&typeof n?.text==='string').slice(-100).map(n=>({title:n.title.slice(0,300),text:n.text.slice(0,5000)})):[];s.complete=false;
  const point=getTestStart(v.pointId),digits=(value,length,max)=>Array.isArray(value)&&value.length===length&&value.every(n=>Number.isInteger(n)&&n>=0&&n<=max)?[...value]:Array(length).fill(0);
  return{version:2,state:s,pointId:point.id,position:[...v.position],yaw:v.yaw,pitch:Math.max(-1.3,Math.min(1.3,v.pitch)),clockHour:Number.isInteger(v.clockHour)&&v.clockHour>=1&&v.clockHour<=12?v.clockHour:11,clockMinute:Number.isInteger(v.clockMinute)&&v.clockMinute>=0&&v.clockMinute<60?v.clockMinute:10,luggageDigits:digits(v.luggageDigits,3,9),safeSymbols:digits(v.safeSymbols,4,3),savedAt:typeof v.savedAt==='string'?v.savedAt:''};
 }catch{return null;}
}
export function writeCheckpoint({state,pointId,position,yaw,pitch,clockHour,clockMinute,luggageDigits,safeSymbols}){
 return JSON.stringify({version:2,state,pointId,position,yaw,pitch,clockHour,clockMinute,luggageDigits,safeSymbols,savedAt:new Date().toISOString()});
}

// A restart leaves administrator restore mode before reloading the whole game.
// Only this game's checkpoint/settings are changed; unrelated local storage is preserved.
export function prepareRestart(storage,href){
 try{storage.removeItem(CHECKPOINT_KEY);}catch{}
 try{storage.setItem(SETTINGS_KEY,JSON.stringify({pointId:'bedroom',free:false,autoResume:false}));}catch{}
 const url=new URL(href);for(const key of ['admin','start','free'])url.searchParams.delete(key);url.hash='';return url.href;
}
