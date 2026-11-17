import {createState,ITEMS,addItem,combineFilms,alignFilm,setClock,useItem,unlockDoor,RING_TARGET,unlockLuggage,hearTune,unlockSafe,takeStairKey,MUSIC_SEQUENCE,unlockCompanionCase,COMPANION_TARGET} from './room-state.js?v=20261117-stairs1';

export const TEST_STARTS=[
 {id:'bedroom',group:'공간으로 이동',label:'316호 · 침실',step:0,position:[0,1.62,2.7],look:[0,1.4,-1],description:'처음 상태로 침실에서 시작합니다.'},
 {id:'towels',group:'소품 모델 확인',label:'욕실 · 수건 가까이 보기',step:0,position:[5.85,1.63,.75],look:[6.38,1.42,1.36],description:'Blender에서 다시 만든 수건의 접힘·두께·직물 표면을 확인합니다.'},
 {id:'cups',group:'소품 모델 확인',label:'거실 · 찻잔 가까이 보기',step:0,position:[-.80,1.62,5.85],look:[-1.0,.61,6.91],description:'찻잔 내부와 손잡이, 받침 접시를 확인합니다.'},
 {id:'kettle',group:'소품 모델 확인',label:'주방 · 주전자 가까이 보기',step:0,position:[7.80,1.62,5.95],look:[7.79,1.12,5.04],description:'전기 주전자의 주둥이·뚜껑·손잡이 연결부를 확인합니다.'},
 {id:'twin',group:'공간으로 이동',label:'316호 · 트윈 침실',step:0,position:[-4.3,1.62,7.0],look:[-6.5,1,9.0],description:'거실 옆 두 번째 침실. 여행 엽서와 보관함을 확인합니다.'},
 {id:'teaBox',group:'퍼즐 단계부터 시작',label:'거실 · 차 상자 열기',step:0,position:[-1.95,1.62,9.3],look:[-2.92,1.12,9.5],description:'받침에서 찾은 꽃무늬 열쇠로 차 상자를 여세요.'},
 {id:'teaDoor',group:'퍼즐 단계부터 시작',label:'거실 · 주방 문 순서 장치',step:0,position:[2.7,1.62,7.65],look:[3.6,1.4,7.65],description:'받침과 서비스 카드를 조사한 상태입니다.'},
 {id:'water',group:'퍼즐 단계부터 시작',label:'주방 · 계량 보관함',step:0,position:[6.24,1.62,6.1],look:[6.4,1.15,5.22],description:'3L와 5L 통으로 큰 통에 정확히 4L를 만드세요.'},
 {id:'waterKey',group:'퍼즐 단계부터 시작',label:'주방 · 열린 보관함의 열쇠',step:0,position:[4.65,1.62,6.0],look:[4.65,1.02,5.21],description:'계량을 마친 상태입니다. 열린 상자에서 열쇠를 직접 꺼내세요.'},
 {id:'companion',group:'퍼즐 단계부터 시작',label:'트윈 침실 · 동행인의 보관함부터',step:4,position:[-6.55,1.62,6.1],look:[-6.55,1.0,5.0],description:'처음 방의 트릭은 해결한 상태입니다. 엽서의 날짜를 읽고 317호 예비 열쇠를 찾으세요.'},
 {id:'living',group:'공간으로 이동',label:'316호 · 거실',step:0,position:[.4,1.62,5.5],look:[-1.35,1.05,7.6],description:'거실의 가구·사진·스탠드를 바로 확인합니다.'},
 {id:'kitchen',group:'공간으로 이동',label:'316호 · 간이주방',step:0,position:[4.5,1.62,8.2],look:[6.4,1.3,5.0],description:'주방 가구와 싱크대를 바로 확인합니다.'},
 {id:'bath',group:'공간으로 이동',label:'316호 · 욕실',step:0,position:[5.3,1.62,.05],look:[7.45,1.2,-.6],description:'욕실 구조와 세면대·샤워부스를 바로 확인합니다.'},
 {id:'hall',group:'공간으로 이동',label:'3층 · 호텔 복도',step:4,position:[2.12,1.62,11.85],look:[5.12,1.55,13.5],description:'316호를 해결한 상태입니다. 317호 예비 열쇠를 가지고 있습니다.'},
 {id:'room317',group:'공간으로 이동',label:'317호 · 객실',step:5,position:[5.12,1.62,14.2],look:[6.9,1.2,17.2],description:'이전 객실과 출입문을 통과한 상태로 317호 퍼즐을 시작합니다.'},
 {id:'exit',group:'공간으로 이동',label:'317호 · 마지막 방 / 계단 열쇠',step:8,position:[7.5,1.62,22.0],look:[7.5,.85,24.0],description:'317호 안쪽 방을 연 상태입니다. 대피 안내 아래 계단문 열쇠를 찾으세요.'},
 {id:'stairs',group:'퍼즐 단계부터 시작',label:'3층 · 잠긴 계단문',step:9,position:[-2.7,1.62,12],look:[-3.6,1.4,12],description:'317호에서 찾은 계단문 열쇠를 가지고 있습니다.'},
 {id:'downstairs',group:'공간으로 이동',label:'2층 · 계단 로비',step:10,position:[-11.4,-1.62,12],look:[-9.0,-1.5,12],description:'계단문을 열고 2층에 도착한 상태. 위층까지 걸어 올라갈 수도 있습니다.'},
 {id:'clock',group:'퍼즐 단계부터 시작',label:'침실 · 벽시계 퍼즐부터',step:1,position:[2.55,1.62,-3.4],look:[2.65,2.08,-4.40],description:'필름 조합과 정렬까지 완료했습니다. 시계 바늘 조작부터 확인합니다.'},
 {id:'vanity',group:'퍼즐 단계부터 시작',label:'욕실 · 수납장 열기부터',step:2,position:[6.3,1.62,-.3],look:[7.38,.55,-.2],description:'시계에서 얻은 작은 열쇠를 가지고 있습니다. I에서 손에 들어 수납장에 사용하세요.'},
 {id:'uv',group:'퍼즐 단계부터 시작',label:'침실 · UV 거울 단서부터',step:3,position:[1.65,1.62,1.15],look:[3.48,1.83,1.15],description:'전구 설치·액자 조사·조명 차단을 마쳤습니다. 거울 단서와 출입문 잠금을 확인합니다.'},
 {id:'music',group:'퍼즐 단계부터 시작',label:'317호 · 오르골부터',step:6,position:[7.5,1.62,19.1],look:[8.5,1.03,20.06],description:'여행가방을 열어 태엽 열쇠를 얻었습니다. 오르골에 사용하는 단계부터 확인합니다.'},
 {id:'safe',group:'퍼즐 단계부터 시작',label:'317호 · 금고부터',step:7,position:[5.4,1.62,18.3],look:[4.24,.72,19.32],description:'오르골 재생까지 마쳤습니다. 금고의 문양을 맞추는 단계부터 확인합니다.'},
];
export const getTestStart=id=>TEST_STARTS.find(p=>p.id===id)||TEST_STARTS[0];
export function createTestStart(id,free=false){
 const point=getTestStart(id),s=createState();
 if(point.step>=1){addItem(s,'filmA');addItem(s,'filmB');combineFilms(s);alignFilm(s,2,1,0);s.frameTaken=true;}
 if(point.step>=2)setClock(s,5,40);
 if(point.step>=2){useItem(s,'key','bathDoor');}
 if(point.step>=3){useItem(s,'key','drawer');addItem(s,'bulb');s.bulbTaken=true;useItem(s,'bulb','lamp');s.lightOn=false;s.curtainsClosed=true;}
 if(point.step>=4){s.rings=[...RING_TARGET];unlockDoor(s);s.twinOpen=true;s.kitchenOpen=true;s.jugSolved=true;s.jugKeyTaken=true;s.suiteEscaped=point.id!=='companion';s.doorOpen=point.id!=='companion';s.lightOn=true;s.curtainsClosed=false;if(point.id!=='companion'){s.travelPostcardsSeen=true;unlockCompanionCase(s,COMPANION_TARGET);useItem(s,'suiteKey','suiteDoor');}}
 if(point.step>=5){useItem(s,'passKey','entry317');s.room317Entered=true;}
 if(point.step>=6)unlockLuggage(s,'284');
 if(point.step>=7){useItem(s,'windingKey','musicBox');hearTune(s);}
 if(point.step>=8){unlockSafe(s,MUSIC_SEQUENCE);useItem(s,'exitKey','exit317');}
 if(point.step>=9){s.evacuationRead=true;takeStairKey(s);}
 if(point.step>=10)useItem(s,'stairKey','stairDoor');
 const zone=point.id;
 if(['teaBox','teaDoor','water','waterKey'].includes(zone)){s.bedroomOpen=true;s.bathUnlocked=true;s.bathDoorOpen=true;}
 if(zone==='teaBox'){s.teaTraySeen=true;s.tinKeyTaken=true;addItem(s,'tinKey');}
 if(zone==='teaDoor'){s.teaTraySeen=true;s.tinKeyTaken=true;s.teaTinOpen=true;s.teaNoteSeen=true;}
 if(['water','waterKey'].includes(zone))s.kitchenOpen=true;
 if(zone==='waterKey'){s.jugSolved=true;s.jugSmall=3;s.jugLarge=4;}
 if(['living','cups','kitchen','kettle','twin'].includes(zone)){s.bedroomOpen=true;s.bathUnlocked=true;s.bathDoorOpen=true;}
 if(['kitchen','kettle','twin'].includes(zone))s.kitchenOpen=true;
 if(zone==='twin'){s.jugSolved=true;s.twinOpen=true;}
 if(['bath','towels'].includes(zone)){s.bathUnlocked=true;s.bathDoorOpen=true;}
 if(free){s.bedroomOpen=true;s.kitchenOpen=true;s.twinOpen=true;s.bathUnlocked=true;s.explore=true;s.doorOpen=true;s.room317Open=true;s.exitOpen=true;s.stairsOpen=true;s.bathDoorOpen=true;s.showerOpen=true;}
 return{state:s,point,clockHour:point.step>=2?5:11,clockMinute:point.step>=2?40:10};
}

export const CHECKPOINT_KEY='after-hours.admin.checkpoint.v1';
export const SETTINGS_KEY='after-hours.admin.settings.v1';
// Save only serializable gameplay state. Unknown fields from later/older versions are ignored.
export function readCheckpoint(raw){
 try{const v=JSON.parse(raw);if(v?.version!==1||!v.state||!Array.isArray(v.position)||v.position.length!==3||!v.position.every(Number.isFinite)||!Number.isFinite(v.yaw)||!Number.isFinite(v.pitch))return null;
  const s=createState();for(const key of Object.keys(s))if(typeof s[key]==='boolean'&&typeof v.state[key]==='boolean')s[key]=v.state[key];
  // Saves made before the twin bedroom already obtained the spare key from the old rack.
  if(s.passTaken&&!Object.hasOwn(v.state,'companionSolved'))s.companionSolved=true;
  s.inventory=Array.isArray(v.state.inventory)?[...new Set(v.state.inventory.filter(id=>Object.hasOwn(ITEMS,id)))]:[];s.selected=s.inventory.includes(v.state.selected)?v.state.selected:null;
  if(Array.isArray(v.state.rings)&&v.state.rings.length===3&&v.state.rings.every(n=>Number.isInteger(n)&&n>=0&&n<8))s.rings=[...v.state.rings];
  for(const [key,max]of[['jugSmall',3],['jugLarge',5]])if(Number.isInteger(v.state[key])&&v.state[key]>=0&&v.state[key]<=max)s[key]=v.state[key];
  if(!Object.hasOwn(v.state,'bedroomOpen')){s.bedroomOpen=s.doorOpen||v.position[2]>4.5;s.bathUnlocked=true;s.bathDoorOpen=true;s.kitchenOpen=v.position[0]>3.6&&v.position[2]>4.5||s.companionSolved||s.doorOpen;s.twinOpen=s.companionSolved||v.position[0]<-3.6;s.jugSolved=s.twinOpen;}
  for(const key of ['seconds','hints'])if(Number.isFinite(v.state[key])&&v.state[key]>=0)s[key]=v.state[key];
  s.notes=Array.isArray(v.state.notes)?v.state.notes.filter(n=>typeof n?.title==='string'&&typeof n?.text==='string').slice(-100).map(n=>({title:n.title.slice(0,300),text:n.text.slice(0,5000)})):[];s.complete=false;
  const point=getTestStart(v.pointId),digits=(value,length,max)=>Array.isArray(value)&&value.length===length&&value.every(n=>Number.isInteger(n)&&n>=0&&n<=max)?[...value]:Array(length).fill(0);
  return{version:1,state:s,pointId:point.id,position:[...v.position],yaw:v.yaw,pitch:Math.max(-1.3,Math.min(1.3,v.pitch)),clockHour:Number.isInteger(v.clockHour)&&v.clockHour>=1&&v.clockHour<=12?v.clockHour:11,clockMinute:Number.isInteger(v.clockMinute)&&v.clockMinute>=0&&v.clockMinute<60?v.clockMinute:10,luggageDigits:digits(v.luggageDigits,3,9),safeSymbols:digits(v.safeSymbols,4,3),savedAt:typeof v.savedAt==='string'?v.savedAt:''};
 }catch{return null;}
}
export function writeCheckpoint({state,pointId,position,yaw,pitch,clockHour,clockMinute,luggageDigits,safeSymbols}){
 return JSON.stringify({version:1,state,pointId,position,yaw,pitch,clockHour,clockMinute,luggageDigits,safeSymbols,savedAt:new Date().toISOString()});
}
