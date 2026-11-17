import {createState,ITEMS,addItem,combineFilms,alignFilm,setClock,useItem,unlockDoor,RING_TARGET,unlockLuggage,hearTune,unlockSafe,MUSIC_SEQUENCE} from './room-state.js?v=20261117-test-start';

export const TEST_STARTS=[
 {id:'bedroom',group:'공간으로 이동',label:'316호 · 침실',step:0,position:[0,1.62,2.7],look:[0,1.4,-1],description:'처음 상태로 침실에서 시작합니다.'},
 {id:'living',group:'공간으로 이동',label:'316호 · 거실',step:0,position:[2.1,1.62,5.3],look:[-1.35,1.05,7.6],description:'거실의 가구·사진·스탠드를 바로 확인합니다.'},
 {id:'kitchen',group:'공간으로 이동',label:'316호 · 간이주방',step:0,position:[4.5,1.62,8.2],look:[6.4,1.3,5.0],description:'주방 가구와 싱크대를 바로 확인합니다.'},
 {id:'bath',group:'공간으로 이동',label:'316호 · 욕실',step:0,position:[5.3,1.62,.05],look:[7.45,1.2,-.6],description:'욕실 구조와 세면대·샤워부스를 바로 확인합니다.'},
 {id:'hall',group:'공간으로 이동',label:'3층 · 호텔 복도',step:4,position:[2.12,1.62,11.85],look:[5.12,1.55,13.5],description:'316호를 해결한 상태입니다. 317호 예비 열쇠를 가지고 있습니다.'},
 {id:'room317',group:'공간으로 이동',label:'317호 · 객실',step:5,position:[5.12,1.62,14.2],look:[6.9,1.2,17.2],description:'이전 객실과 출입문을 통과한 상태로 317호 퍼즐을 시작합니다.'},
 {id:'exit',group:'공간으로 이동',label:'317호 뒤 · 비상구',step:8,position:[5.65,1.62,21.35],look:[5.65,1.6,23.7],description:'두 객실을 해결한 상태입니다. 앞으로 걸어가면 완료 화면을 확인할 수 있습니다.'},
 {id:'clock',group:'퍼즐 단계부터 시작',label:'주방 · 벽시계 퍼즐부터',step:1,position:[8,1.62,5.9],look:[8.65,2.08,4.74],description:'필름 조합과 정렬까지 완료했습니다. 시계 바늘 조작부터 확인합니다.'},
 {id:'vanity',group:'퍼즐 단계부터 시작',label:'욕실 · 수납장 열기부터',step:2,position:[6.3,1.62,-.3],look:[7.38,.55,-.2],description:'시계에서 얻은 작은 열쇠를 가지고 있습니다. I에서 손에 들어 수납장에 사용하세요.'},
 {id:'uv',group:'퍼즐 단계부터 시작',label:'거실 · UV 거울 단서부터',step:3,position:[2.05,1.62,5.45],look:[3.48,1.83,5.45],description:'전구 설치·액자 조사·조명 차단을 마쳤습니다. 거울 단서와 출입문 잠금을 확인합니다.'},
 {id:'music',group:'퍼즐 단계부터 시작',label:'317호 · 오르골부터',step:6,position:[7.5,1.62,19.1],look:[8.5,1.18,20.06],description:'여행가방을 열어 태엽 열쇠를 얻었습니다. 오르골에 사용하는 단계부터 확인합니다.'},
 {id:'safe',group:'퍼즐 단계부터 시작',label:'317호 · 금고부터',step:7,position:[5.4,1.62,18.3],look:[4.24,.72,19.32],description:'오르골 재생까지 마쳤습니다. 금고의 문양을 맞추는 단계부터 확인합니다.'},
];
export const getTestStart=id=>TEST_STARTS.find(p=>p.id===id)||TEST_STARTS[0];
export function createTestStart(id,free=false){
 const point=getTestStart(id),s=createState();
 if(point.step>=1){addItem(s,'filmA');addItem(s,'filmB');combineFilms(s);alignFilm(s,2,1,0);s.frameTaken=true;}
 if(point.step>=2)setClock(s,5,40);
 if(point.step>=3){useItem(s,'key','drawer');addItem(s,'bulb');s.bulbTaken=true;useItem(s,'bulb','lamp');s.lightOn=false;s.curtainsClosed=true;}
 if(point.step>=4){s.rings=[...RING_TARGET];unlockDoor(s);s.suiteEscaped=true;s.lightOn=true;s.curtainsClosed=false;s.passTaken=true;addItem(s,'passKey');}
 if(point.step>=5){useItem(s,'passKey','entry317');s.room317Entered=true;}
 if(point.step>=6)unlockLuggage(s,'284');
 if(point.step>=7){useItem(s,'windingKey','musicBox');hearTune(s);}
 if(point.step>=8){unlockSafe(s,MUSIC_SEQUENCE);useItem(s,'exitKey','exit317');}
 if(free){s.explore=true;s.doorOpen=true;s.room317Open=true;s.exitOpen=true;s.bathDoorOpen=true;s.showerOpen=true;}
 return{state:s,point,clockHour:point.step>=2?5:11,clockMinute:point.step>=2?40:10};
}

export const CHECKPOINT_KEY='after-hours.admin.checkpoint.v1';
export const SETTINGS_KEY='after-hours.admin.settings.v1';
// Save only serializable gameplay state. Unknown fields from later/older versions are ignored.
export function readCheckpoint(raw){
 try{const v=JSON.parse(raw);if(v?.version!==1||!v.state||!Array.isArray(v.position)||v.position.length!==3||!v.position.every(Number.isFinite)||!Number.isFinite(v.yaw)||!Number.isFinite(v.pitch))return null;
  const s=createState();for(const key of Object.keys(s))if(typeof s[key]==='boolean'&&typeof v.state[key]==='boolean')s[key]=v.state[key];
  s.inventory=Array.isArray(v.state.inventory)?[...new Set(v.state.inventory.filter(id=>Object.hasOwn(ITEMS,id)))]:[];s.selected=s.inventory.includes(v.state.selected)?v.state.selected:null;
  if(Array.isArray(v.state.rings)&&v.state.rings.length===3&&v.state.rings.every(n=>Number.isInteger(n)&&n>=0&&n<8))s.rings=[...v.state.rings];
  for(const key of ['seconds','hints'])if(Number.isFinite(v.state[key])&&v.state[key]>=0)s[key]=v.state[key];
  s.notes=Array.isArray(v.state.notes)?v.state.notes.filter(n=>typeof n?.title==='string'&&typeof n?.text==='string').slice(-100).map(n=>({title:n.title.slice(0,300),text:n.text.slice(0,5000)})):[];s.complete=false;
  const point=getTestStart(v.pointId),digits=(value,length,max)=>Array.isArray(value)&&value.length===length&&value.every(n=>Number.isInteger(n)&&n>=0&&n<=max)?[...value]:Array(length).fill(0);
  return{version:1,state:s,pointId:point.id,position:[...v.position],yaw:v.yaw,pitch:Math.max(-1.3,Math.min(1.3,v.pitch)),clockHour:Number.isInteger(v.clockHour)&&v.clockHour>=1&&v.clockHour<=12?v.clockHour:11,clockMinute:Number.isInteger(v.clockMinute)&&v.clockMinute>=0&&v.clockMinute<60?v.clockMinute:10,luggageDigits:digits(v.luggageDigits,3,9),safeSymbols:digits(v.safeSymbols,4,3),savedAt:typeof v.savedAt==='string'?v.savedAt:''};
 }catch{return null;}
}
export function writeCheckpoint({state,pointId,position,yaw,pitch,clockHour,clockMinute,luggageDigits,safeSymbols}){
 return JSON.stringify({version:1,state,pointId,position,yaw,pitch,clockHour,clockMinute,luggageDigits,safeSymbols,savedAt:new Date().toISOString()});
}
