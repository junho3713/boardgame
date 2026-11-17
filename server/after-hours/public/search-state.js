import {TRICK_DEFAULTS,routeFits} from './puzzle-tricks.js?v=20261117-tricks1';
export const SEARCH_DEFAULTS={...TRICK_DEFAULTS,faucetOn:false,drainClosed:true,basinVolume:0,basinWetting:false,coinTaken:false,caseLiningLifted:false,frameReleased:false,clothTaken:false,clothWet:false,tagWiped:false,wipePatches:[false,false,false,false,false,false],sofaLifted:false,bookLifted:false,inlayFound:[false,false],inlayMounted:[false,false],batteryDrawerOpen:false,batteriesTaken:[false,false],batteriesInstalled:[false,false],wheelDrawerOpen:false,wheelSliders:[0,0,0],wheelTaken:false,wheelInstalled:false,postcardFound:[false,false,false],magnetTaken:false,cylinderTaken:false,cylinderInstalled:false,routeFound:[false,false,false],routeMounted:[false,false,false],routeOrder:[2,0,1],routeRestored:false,innerDrawerOpen:false};
export const SEARCH_ITEMS={coin:'넓은 홈에 맞는 동전',cloth:'극세사 천',inlayA:'상감 조각 · 왼쪽 아래',inlayB:'상감 조각 · 오른쪽 위',batteryA:'AA 전지 · A',batteryB:'AA 전지 · B',compassWheel:'북쪽 표식의 방향판',postcard0:'여행 엽서 · 시계탑',postcard1:'여행 엽서 · 풍차',postcard2:'여행 엽서 · 등대',magnet:'끈 달린 자석',musicCylinder:'오르골 문양 실린더',route0:'대피도 조각 · 서랍',route1:'대피도 조각 · 의자',route2:'대피도 조각 · 휴지통'};
const give=(s,id)=>{if(!s.inventory.includes(id))s.inventory.push(id);};
const consume=(s,id)=>{s.inventory=s.inventory.filter(v=>v!==id);if(s.selected===id)s.selected=null;};
export function collectSearchItem(s,id){
 const simple={coin:['coinTaken',s.caseLiningLifted],cloth:['clothTaken',s.bathUnlocked],compassWheel:['wheelTaken',s.wheelDrawerOpen],magnet:['magnetTaken',s.luggageOpen],musicCylinder:['cylinderTaken',s.room317Entered&&s.inventory.includes('magnet')]};
 if(simple[id]){const [flag,allowed]=simple[id];if(!allowed||s[flag])return false;s[flag]=true;give(s,id);return true;}
 for(const [pattern,field,allowed,ids]of [[/^inlay[AB]$/,'inlayFound',s.bedroomOpen,['inlayA','inlayB']],[/^battery[AB]$/,'batteriesTaken',s.batteryDrawerOpen,['batteryA','batteryB']],[/^postcard[0-2]$/,'postcardFound',s.twinOpen,['postcard0','postcard1','postcard2']],[/^route[0-2]$/,'routeFound',s.exitOpen,['route0','route1','route2']]]){
  if(!pattern.test(id))continue;const i=ids.indexOf(id);if(!allowed||s[field][i]||(id==='inlayA'&&!s.sofaLifted)||(id==='inlayB'&&!s.bookLifted)||(id==='route0'&&!s.innerDrawerOpen))return false;s[field][i]=true;give(s,id);return true;
 }
 return false;
}
export function useSearchItem(s,id,target){
 const known=(id==='coin'&&target==='frame')||(id==='cloth'&&['basin','linenTag2'].includes(target))||(/^inlay[AB]$/.test(id)&&target==='teaTray')||(/^battery[AB]$/.test(id)&&target==='kitchenScale')||(id==='compassWheel'&&target==='companionCase')||(id==='magnet'&&target==='cylinderGap')||(id==='musicCylinder'&&target==='musicBox')||(/^route[0-2]$/.test(id)&&target==='evacuationPlan');
 if(!known)return null;if(!s.inventory.includes(id))return false;
 if(id==='coin'){s.frameReleased=true;return true;}
 if(id==='cloth'){if(target==='basin'){s.faucetOn=true;s.basinWetting=true;return true;}return s.clothWet;}
 if(id==='magnet')return collectSearchItem(s,'musicCylinder');
 if(id==='musicCylinder'){s.cylinderInstalled=true;consume(s,id);return true;}
 if(id==='compassWheel'){s.wheelInstalled=true;consume(s,id);return true;}
 if(id.startsWith('inlay'))s.inlayMounted[id==='inlayA'?0:1]=true;
 if(id.startsWith('battery'))s.batteriesInstalled[id==='batteryA'?0:1]=true;
 if(id.startsWith('route'))s.routeMounted[+id.slice(-1)]=true;
 consume(s,id);return true;
}
export const scalePowered=s=>s.batteriesInstalled.every(Boolean);
export function openWheelDrawer(s,sliders){if(!s.twinOpen||!Array.isArray(sliders)||sliders.length!==3||!sliders.every((v,i)=>v===[2,0,1][i]))return false;s.wheelSliders=[...sliders];s.wheelDrawerOpen=true;return true;}
export function wipeTag(s,i){if(!s.clothWet||!s.inventory.includes('cloth')||!Number.isInteger(i)||i<0||i>5)return false;s.wipePatches[i]=true;s.tagWiped=s.wipePatches.every(Boolean);return true;}
export function restoreRoute(s,order){if(!s.routeMounted.every(Boolean)||!routeFits(order,s.routeTurns))return false;s.routeOrder=[...order];s.routeRestored=true;return true;}
