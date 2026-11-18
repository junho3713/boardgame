import {prepareRubbing} from './puzzle-tricks.js?v=20261117-tricks1';
import {SEARCH_DEFAULTS,SEARCH_ITEMS,useSearchItem,scalePowered} from './search-state.js?v=20261117-tricks1';
import {trayFits,STOCK_CODE,MAP_TARGET,LUGGAGE_IMPRINT,SAFE_TARGET,EVAC_TARGET,LINEN_CODE,WEIGHABLES} from './puzzle-evidence.js?v=20261117-tricks1';
export const CLOCK_TARGET={hour:5,minute:40};
export const RING_TARGET=[5,0,3]; // clockwise eighth-turns from twelve o'clock
export const DRAWER_NOTE={
 title:'서랍 속 쪽지',
 lines:[
  '어둠이 찾아오면 방 어딘가에서 귀신이 보인대.',
  '어젯밤엔 나도 봤어. 다시 보려니까 벌써 사라졌더라.'
 ]
};
export const ITEMS={...SEARCH_ITEMS,filmA:'인화실 쪽지 · 필름 A',filmB:'찢어진 필름 · B',film:'구멍 난 필름',key:'책상 서랍 열쇠',bathKey:'물방울 표식 열쇠',stock_tea:'홍차 통',stock_coffee:'커피 통',stock_sugar:'설탕 통',stock_empty:'빈 예비 통',bulb:'보랏빛 전구',receipt:'호텔 영수증',tag:'317호 수하물표',windingKey:'오르골 태엽 열쇠',galleyKey317:'317호 주방 열쇠',bathKey317:'317호 욕실 열쇠',safeKey317:'객실 금고의 작은 열쇠',exitKey:'317호 침실 열쇠',stairKey:'3층 계단문 열쇠',passKey:'317호 예비 열쇠',tinKey:'꽃무늬 작은 열쇠',inlay:'상감 나무 조각',kitchenKey:'간이주방 열쇠',tourMap:'접힌 관광 지도',pencil:'짧은 연필',twinKey:'트윈 침실 열쇠',suiteKey:'316호 출입문 열쇠'};
export function createState(explore=false){return{...structuredClone(SEARCH_DEFAULTS),explore,inventory:[],selected:null,bedCoverFolded:false,frameTaken:false,filmJoined:false,aligned:false,clockSolved:false,drawerUnlocked:false,drawerOpen:false,bathKeyTaken:false,linenSolved:false,linenCabinetOpen:false,linenDigits:[0,0,0],bulbTaken:false,uvInstalled:false,lampOn:true,lightOn:true,curtainsClosed:false,rings:[2,6,1],doorOpen:explore,phoneHeard:false,wardrobeOpen:false,suitcaseOpen:false,bathDoorOpen:explore,bathUnlocked:explore,bedroomOpen:explore,kitchenOpen:explore,twinOpen:explore,inlayTaken:false,inlayInstalled:false,trayTurns:[0,0,0,0],stockDigits:[0,0,0],companionArrows:[0,0,0],evacArrows:[0,0,0],traySolved:false,kitchenKeyTaken:false,stockOnScale:-1,stockWeights:[false,false,false,false],stockBottoms:[false,false,false],companionKeysTaken:false,pencilTaken:false,tagRubbed:false,windingKeyTaken:false,innerKeyTaken:false,evacuationBoxOpen:false,tinKeyTaken:false,teaTinOpen:false,stockKeyTaken:false,teaNoteSeen:false,teaTraySeen:false,stockSolved:false,showerOpen:false,suiteEscaped:false,passTaken:false,travelPostcardsSeen:false,companionSolved:false,room317Open:explore,room317Entered:false,kitchen317Open:explore,bath317Open:explore,galleyKey317Taken:false,bathKey317Taken:false,breakfast317Open:false,vanity317Open:false,safeUnlocked317:false,luggageOpen:false,musicWound:false,tuneHeard:false,safeOpen:false,exitOpen:explore,evacuationRead:false,stairKeyTaken:false,stairsOpen:explore,lowerHallEntered:false,complete:false,seconds:0,hints:0,notes:[]};}
export function addItem(s,id){if(!s.inventory.includes(id))s.inventory.push(id);}
export function removeItem(s,id){s.inventory=s.inventory.filter(x=>x!==id);if(s.selected===id)s.selected=null;}
export function canCombineFilms(s){return s.inventory.includes('filmA')&&s.inventory.includes('filmB');}
export function combineFilms(s){if(!canCombineFilms(s))return false;removeItem(s,'filmA');removeItem(s,'filmB');addItem(s,'film');s.filmJoined=true;return true;}
export function alignFilm(s,x,y,rotation){if(!s.filmJoined)return false;const aligned=Math.abs(x-2)<.16&&Math.abs(y-1)<.16&&((rotation%4)+4)%4===0;if(aligned)s.aligned=true;return aligned;}
export function setClock(s,hour,minute){if(!s.aligned||hour!==CLOCK_TARGET.hour||minute!==CLOCK_TARGET.minute)return false;s.clockSolved=true;addItem(s,'key');return true;}
export function takeGalleyKey317(s){
 if(!s.room317Entered||s.galleyKey317Taken||s.kitchen317Open)return false;
 s.galleyKey317Taken=true;addItem(s,'galleyKey317');return true;
}
export function takeBreakfastKey317(s){
 if(!s.kitchen317Open||!s.breakfast317Open||s.bathKey317Taken||s.bath317Open)return false;
 s.bathKey317Taken=true;addItem(s,'bathKey317');return true;
}
export function takeTaggedKey317(s){
 if(!s.bath317Open||!s.vanity317Open||s.inventory.includes('tag'))return false;
 addItem(s,'tag');if(!s.safeUnlocked317)addItem(s,'safeKey317');return true;
}
export function useItem(s,item,target){if(!s.inventory.includes(item))return false;
 if(item==='galleyKey317'&&target==='galleyDoor317'&&s.room317Entered){s.kitchen317Open=true;removeItem(s,item);return true;}
 if(item==='bathKey317'&&target==='bathDoor317'&&s.kitchen317Open){s.bath317Open=true;removeItem(s,item);return true;}
 if(item==='safeKey317'&&target==='safe317'&&s.bath317Open){s.safeUnlocked317=true;removeItem(s,item);return true;}
 const search=useSearchItem(s,item,target);if(search!==null)return search;const jarIndex=WEIGHABLES.findIndex(j=>'stock_'+j.id===item);if(jarIndex>=0&&target==='kitchenScale'){if(!s.kitchenOpen||!scalePowered(s)||s.stockOnScale!==-1)return false;s.stockOnScale=jarIndex;s.stockWeights[jarIndex]=true;removeItem(s,item);return true;}if(item==='inlay'&&target==='teaTray'){s.inlayInstalled=true;removeItem(s,item);return true;}if(item==='kitchenKey'&&target==='kitchenDoor'&&s.traySolved){s.kitchenOpen=true;removeItem(s,item);return true;}if(item==='pencil'&&target==='tag317'&&s.inventory.includes('tag')&&s.inventory.includes('receipt')){return prepareRubbing(s);}if(item==='stairKey'&&target==='stairDoor'&&s.stairKeyTaken&&s.exitOpen){s.stairsOpen=true;removeItem(s,item);return true;}if(item==='tinKey'&&target==='teaTin'){s.teaTinOpen=true;removeItem(s,item);return true;}if(item==='bathKey'&&target==='bathDoor'){s.bathUnlocked=true;s.bathDoorOpen=true;removeItem(s,item);return true;}if(item==='twinKey'&&target==='twinDoor'&&s.stockSolved){s.twinOpen=true;removeItem(s,item);return true;}if(item==='suiteKey'&&target==='suiteDoor'&&s.companionSolved){s.doorOpen=true;removeItem(s,item);return true;}if(item==='passKey'&&target==='entry317'&&s.doorOpen){s.room317Open=true;removeItem(s,'passKey');return true;}if(item==='key'&&target==='drawer'&&s.clockSolved){s.drawerUnlocked=true;s.drawerOpen=true;removeItem(s,'key');return true;}if(item==='windingKey'&&target==='musicBox'&&!s.musicWound){s.musicWound=true;removeItem(s,'windingKey');return true;}if(item==='exitKey'&&target==='exit317'&&s.safeOpen){s.exitOpen=true;removeItem(s,'exitKey');return true;}if(item==='bulb'&&target==='lamp'){s.uvInstalled=true;s.lampOn=true;removeItem(s,'bulb');return true;}return false;}
export function uvVisible(s){return s.uvInstalled&&s.lampOn&&!s.lightOn&&s.curtainsClosed;}
export function unlockDoor(s){if(!s.uvInstalled||!s.rings.every((x,i)=>x===RING_TARGET[i]))return false;s.bedroomOpen=true;return true;}
export function phase(s){
 if(s.room317Entered){if(!s.kitchen317Open)return'galley317';if(!s.bath317Open)return'breakfast317';if(!s.luggageOpen)return'luggage';if(!s.windingKeyTaken||!s.musicWound||!s.cylinderInstalled)return'music';if(!s.tuneHeard)return'listen';if(!s.safeOpen||!s.innerKeyTaken)return'safe';if(!s.exitOpen)return'corridor';if(!s.stairKeyTaken)return'lastRoom';if(!s.stairsOpen)return'stairs';return'descend';}
 if(s.suiteEscaped)return !s.room317Open&&!s.inventory.includes('passKey')?'neighborKey':'enter317';if(s.doorOpen)return'exit';
 if(s.bedroomOpen){if(!s.kitchenOpen){if(!s.bathUnlocked)return'bathEntry';if(!s.linenSolved)return'linen';if(!s.tinKeyTaken)return'linenReward';return'tea';}if(!s.stockSolved)return'stock';if(!s.stockKeyTaken&&!s.twinOpen)return'stockKey';if(!s.twinOpen)return'twinEntry';if(!s.companionKeysTaken)return'neighborKey';return'suiteEntry';}
 if(!s.inventory.includes('filmA')&&!s.filmJoined)return'low';if(!s.inventory.includes('filmB')&&!s.filmJoined)return'back';if(!s.filmJoined)return'join';if(!s.aligned)return'overlay';if(!s.clockSolved)return'clock';if(!s.drawerOpen)return'drawer';if(!s.bulbTaken)return'bulb';if(!s.uvInstalled)return'lamp';if(!uvVisible(s))return'dark';return'mirror';
}
export const HINTS={
 "low": [
  "침대 한쪽만 천의 결이 흐트러져 있다.",
  "베개 가까이에 이불이 한 겹 접혀 있다.",
  "침대를 향해 E로 이불을 걷고, 시트 위 쪽지를 바라보고 E로 집자."
 ],
 "back": [
  "물건의 앞면은 누군가 보여주기로 한 부분이다.",
  "침실 벽에 걸린 호텔 사진은 액자째 들어볼 수 있다.",
  "짐 받침대의 가방을 열고 안감을 들춰 동전을 찾자. 동전을 액자 고정판에 사용한 뒤 액자를 뒤집어 필름을 꺼낸다."
 ],
 "join": [
  "두 조각의 찢긴 가장자리가 닮아 있다.",
  "인벤토리에서 두 필름을 함께 살펴보자.",
  "I로 인벤토리를 열고 ‘두 필름 조각 합치기’를 누르면 된다."
 ],
 "overlay": [
  "구멍은 빈 자리가 아니라, 무언가를 골라내는 틀이다.",
  "침실 책상 위 인화 작업표의 표식과 필름의 표식을 맞춰보자.",
  "합친 필름을 선택한 채 작업표에 사용하자. 필름을 회전시키고, 왼쪽 위 삼각 표식을 작업표의 삼각 표식에 겹치면 네 숫자가 남는다."
 ],
 "clock": [
  "남은 숫자 사이에는 칸 하나가 비어 있다.",
  "작업표와 같은 무늬가 시계 뒷판에 새겨져 있다.",
  "맞춘 필름의 I·II·III·IV를 시각 HH:MM으로 읽고, 벽시계의 두 바늘을 맞추자."
 ],
 "drawer": [
  "시계에서 나온 열쇠와 같은 삼각 표식을 찾아보자.",
  "침실 인화 작업표 바로 아래에 잠긴 서랍이 있다.",
  "I에서 책상 서랍 열쇠를 손에 들고 침실 책상 아래 서랍에 사용하자."
 ],
 "bulb": [
  "잠금을 푼 것과 안을 살핀 것은 다르다.",
  "침실 책상의 열린 서랍 안쪽을 내려다보자.",
  "책상 서랍 안의 보랏빛 전구를 E로 집을 수 있다."
 ],
 "lamp": [
  "같은 물건도 다른 빛 아래에서는 달라진다.",
  "침실 스탠드에 전구를 끼울 수 있다.",
  "전구를 선택한 채 스탠드를 조사하자."
 ],
 "dark": [
  "밝은 빛은 약한 흔적을 덮어버린다.",
  "실내 조명뿐 아니라 창밖에서 들어오는 빛도 줄여보자.",
  "벽 스위치로 조명을 끄고 커튼을 닫자. 보라색 스탠드만 남으면 거울 속 방에 다른 흔적이 드러난다."
 ],
 "mirror": [
  "거울이 언제나 지금의 방을 비추는 것은 아니다.",
  "액자를 떼어낸 자리. 현실의 벽과 거울 속의 벽을 비교해 보자.",
  "거울 속 문장을 읽어 문 고리를 바깥 ↙, 가운데 ↑, 안쪽 ↘ 방향으로 맞춘 뒤 잠금을 눌러보자."
 ],
 "exit": [
  "스위트룸의 출입문은 거실에 있다.",
  "거실의 열린 문 너머로 직접 걸어가 보자.",
  "316호를 빠져나오면 호텔 복도가 나온다. 317호 입구는 복도 건너편이다."
 ],
 "neighborKey": [
  "풍경을 그린 사람은 어디에 서 있었을까?",
  "엽서 뒷면의 출발 장소와 앞면의 건물을 지도에서 찾아보자. 보관함에는 북쪽 표식이 있다.",
  "화장대의 접힌 수리 메모를 조사해 협탁의 세 핀을 맞추고 방향판을 찾아 보관함에 끼운다. 엽서는 두 침대와 협탁에서 찾는다. 지도를 북쪽이 위로 오게 보고 부두에서 시계탑, 역에서 풍차, 정원에서 등대 방향을 찾는다. 보관함의 화살표는 북동·서·남동이다. 열린 상자에서 두 열쇠를 직접 꺼낸다."
 ],
 "enter317": [
  "다음 객실은 복도 건너편이다.",
  "복도에서 317호 번호가 붙은 출입문을 찾아보자.",
  "I 인벤토리에서 317호 예비 열쇠를 손에 들고 출입문에 사용한 뒤 걸어 들어가자."
 ],
 "galley317": [
  "거실에 두 사람 몫의 조식 주문 봉투가 남아 있다.",
  "거실의 작은 탁자에서 봉투를 열어 보자. 주방으로 향한 동행인이 남긴 글이 있다.",
  "봉투에서 주방 열쇠를 챙기고 I에서 손에 든 뒤 317호 주방 문에 사용하자."
 ],
 "breakfast317": [
  "식탁에는 한 사람 몫만 차려져 있다. 나머지 한 사람은 방에 오지 못했다.",
  "은색 덮개 밑에서 냅킨과 함께 돌아온 물건을 살펴보자. 쟁반에 남은 영수증도 챙길 수 있다.",
  "덮개를 옆으로 밀고 냅킨 고리의 욕실 열쇠를 꺼내자. I에서 손에 들어 거실 건너편 욕실 문에 사용하자."
 ],
 "luggage": [
  "수하물표 뒷면의 글씨는 잉크가 아니라 눌린 자국이다.",
  "밝은 종이를 대고 연필 옆면으로 문지르면 요철을 옮길 수 있다. 주방 쟁반의 영수증과 거실 화장대의 연필을 찾아보자.",
  "욕실 세면대 아래에서 수하물표를, 주방에서 영수증을 챙기고 연필을 수하물표에 사용하자. 영수증의 빈 면을 위로 돌리고 꺾인 모서리를 겹쳐 고정한 뒤 가로질러 문지른다. 전사된 571을 가방에 맞추고 열린 안감에서 태엽 열쇠를 꺼낸다."
 ],
 "music": [
  "가방의 잠금을 푼 뒤에도 안감을 살펴볼 수 있다.",
  "작은 날개 모양 열쇠는 오르골 태엽에 맞는다.",
  "가방 안감에서 태엽 열쇠와 끈 달린 자석을 꺼내자. 거실 협탁 아래 틈의 실린더를 자석으로 회수해 오르골에 끼운 뒤 태엽을 감는다."
 ],
 "listen": [
  "문양마다 두드리는 횟수가 다르다.",
  "오르골을 재생하고 문양과 타격 수를 함께 관찰하자. 음소거에서도 타격이 보인다.",
  "별은 두 번, 물결은 네 번, 종은 한 번, 달은 세 번 울린다. 금고 각 칸의 눈금 수와 대조하자."
 ],
 "safe": [
  "문양판 아래 열쇠 구멍의 크기가 유난히 작다. 투숙객의 수하물표에는 열쇠가 매달려 있었다.",
  "각 문양판 위에 서로 다른 개수의 눈금이 새겨져 있다.",
  "욕실 수납장의 수하물표에서 얻은 작은 열쇠로 금고 잠금쇠를 풀자. 금고 눈금은 3·1·4·2다. 해당 타격 수의 문양인 달·종·물결·별을 맞추고 침실 열쇠를 직접 챙기자."
 ],
 "corridor": [
  "거실 끝의 침실 문은 아직 잠겨 있다.",
  "금고의 열쇠에는 ‘침실’이라는 꼬리표가 달려 있다.",
  "317호 침실 열쇠를 손에 들고 객실 끝의 잠긴 문에 사용하자."
 ],
 "lastRoom": [
  "대피 안내와 열쇠함에 같은 출발·도착 표식이 있다.",
  "침실의 서랍·의자 아래·휴지통에서 찢긴 대피도를 찾고 테이블에서 순서와 회전을 바꾸어 찢긴 가장자리와 복도 선을 맞춰 복원하자. 고장 난 엘리베이터는 갈 길이 아니다.",
  "317 → 복도 접점 → 복도 서쪽 → 계단. 지도 기준 아래·왼쪽·왼쪽으로 맞추면 열쇠함이 열린다."
 ],
 "stairs": [
  "계단문은 객실 바깥에 있다.",
  "317호 출입문으로 돌아가 복도 왼쪽 끝을 살펴보자.",
  "3층 계단문 열쇠를 선택하고 복도 왼쪽 끝 문에 사용하자."
 ],
 "descend": [
  "열린 계단문 너머로 내려갈 수 있다.",
  "계단의 난간을 따라 아래층으로 걸어가자.",
  "계단 아래 2층 로비까지 이동할 수 있다."
 ],
 "bathEntry": [
  "거실에 나왔다. 문마다 다른 표식이 있다.",
  "찻잔 받침 아래에 테이프 끝이 보인다. 뒤집어 보자.",
  "받침 뒤의 물방울 열쇠를 꺼내 침실 옆 욕실 문에 사용하자. 시계 열쇠와는 별개다."
 ],
 "linen": [
  "세탁 담당자가 남긴 흔적은 종이뿐 아니라 거울에도 있다.",
  "세면대 옆 C/H 온도 표시를 H로 돌리고 물을 틀어 보자. 김이 서리면 비누로 남긴 기호가 드러난다.",
  "거울의 기호 순서를 각 의뢰표 앞면의 옷 기호와 연결한다. 보관 번호는 의뢰표 뒷면에 있다. 흰 손수건 표의 비눗물은 세면대에서 적신 천으로 닦는다. 접수 순서대로 6·2·8이다."
 ],
 "linenReward": ["잠금을 푼 수납장 안쪽을 살펴보자.","꽃무늬 열쇠와 짧은 쪽지가 들어 있다.","린넨장에서 꽃무늬 열쇠를 꺼내 거실의 차 상자에 사용하자."],
 "tea": [
  "거실 탁자의 나무판은 한 칸이 비어 있다.",
  "욕실 린넨장에서 찾은 꽃무늬 열쇠와 미니바 상자의 자물쇠를 비교하자. 소파 쿠션 아래와 미니바 장부 아래에도 조각이 있다. 세 조각 모두 찻상에 끼워야 한다.",
  "린넨장에서 꺼낸 꽃무늬 열쇠로 차 상자를 열자. 조각을 나무판에 끼운 뒤 각 타일의 가장자리 무늬를 인접 타일과 바깥 테두리에 맞추자. 열린 서랍의 주방 열쇠를 직접 챙긴다."
 ],
 "stock": [
  "같은 크기의 통 중 하나만 내용물이 없다.",
  "주방 오른쪽 낮은 서랍에서 전지 두 개를 찾아 저울에 넣자. 빈 예비 통도 저울에 올릴 수 있다. 같은 규격이니 그 측정값을 재료 통의 총중량에서 빼면 내용물 무게가 된다.",
  "빈 예비 통을 재면 80 g이다. 현재 내용물 = 재료 통의 측정값 − 빈 통의 측정값. (입고량 − 현재 내용물) ÷ 1회분을 홍차·커피·설탕 순서로 읽으면 3·6·4다."
 ],
 "stockKey": [
  "잠금이 풀린 보관함 안에 물건이 남아 있다.",
  "싱크대 왼쪽 열린 보관함을 조사하자.",
  "열쇠와 접힌 지도를 꺼내자. TWIN 열쇠는 거실 왼쪽 문에 쓴다."
 ],
 "twinEntry": [
  "TWIN 꼬리표는 객실 번호가 아니다.",
  "거실 왼쪽 문에 같은 표식이 있다.",
  "트윈 침실 열쇠를 손에 들고 거실 왼쪽 문에 사용하자."
 ],
 "suiteEntry": [
  "두 열쇠의 꼬리표는 서로 다르다.",
  "316 EXIT와 317을 구별하자.",
  "316호 출입문 열쇠로 거실의 복도 쪽 문을 열고, 복도 건너편에는 317호 예비 열쇠를 쓴다."
 ]
};
export const LUGGAGE_CODE=LUGGAGE_IMPRINT;
export const MUSIC_SEQUENCE=SAFE_TARGET;
export const COMPANION_TARGET=MAP_TARGET;
export const TRAVEL_STOPS=[{id:0,name:'시계탑',date:'부두에서',path:'M10 28V9h12v19M8 9l8-6 8 6M12 16h8M16 11v5h3'},{id:1,name:'풍차',date:'역에서',path:'M10 28l3-16h6l3 16ZM16 12 5 3M16 12 27 3M16 12 5 21M16 12 27 21'},{id:2,name:'등대',date:'정원에서',path:'M10 28l2-19h8l2 19ZM10 9h12M16 3l6 6H10ZM11 21h10'}];
export function takeInlay(s){if(!s.teaTinOpen||s.inlayTaken)return false;s.inlayTaken=true;addItem(s,'inlay');return true;}
export function solveTray(s,turns){if(!s.bedroomOpen||!s.inlayInstalled||!s.inlayMounted.every(Boolean)||!trayFits(turns))return false;s.trayTurns=[...turns];s.traySolved=true;return true;}
export function takeKitchenKey(s){if(!s.traySolved||s.kitchenKeyTaken)return false;s.kitchenKeyTaken=true;addItem(s,'kitchenKey');return true;}
export function unlockStock(s,code){if(!s.kitchenOpen||String(code)!==STOCK_CODE)return false;s.stockSolved=true;return true;}
export function takeStockContents(s){if(!s.stockSolved||s.stockKeyTaken)return false;s.stockKeyTaken=true;addItem(s,'twinKey');addItem(s,'tourMap');return true;}
export function unlockCompanionCase(s,values){if(!s.twinOpen||!s.wheelInstalled||!Array.isArray(values)||values.length!==3||!values.every((v,i)=>v===COMPANION_TARGET[i]))return false;s.companionSolved=true;return true;}
export function takeCompanionKeys(s){if(!s.companionSolved||s.companionKeysTaken)return false;s.companionKeysTaken=true;s.passTaken=true;addItem(s,'suiteKey');addItem(s,'passKey');return true;}
export function unlockLuggage(s,code){if(!s.room317Entered||String(code)!==LUGGAGE_CODE)return false;s.luggageOpen=true;return true;}
export function takeWindingKey(s){if(!s.luggageOpen||s.windingKeyTaken)return false;s.windingKeyTaken=true;addItem(s,'windingKey');return true;}
export function hearTune(s){if(!s.musicWound||!s.cylinderInstalled)return false;s.tuneHeard=true;return true;}
export function unlockSafe(s,symbols){if(!s.room317Entered||!s.safeUnlocked317||!Array.isArray(symbols)||symbols.length!==4||!symbols.every((v,i)=>v===MUSIC_SEQUENCE[i]))return false;s.safeOpen=true;return true;}
export function takeInnerKey(s){if(!s.safeOpen||s.innerKeyTaken)return false;s.innerKeyTaken=true;addItem(s,'exitKey');return true;}
export function unlockEvacuationBox(s,values){if(!s.exitOpen||!Array.isArray(values)||values.length!==3||!values.every((v,i)=>v===EVAC_TARGET[i]))return false;s.evacuationBoxOpen=true;return true;}
export function takeStairKey(s){if(!s.exitOpen||!s.evacuationBoxOpen||s.stairKeyTaken)return false;s.stairKeyTaken=true;addItem(s,'stairKey');return true;}

export function takeBathKey(s){if(!s.bedroomOpen||s.bathKeyTaken)return false;s.bathKeyTaken=true;addItem(s,'bathKey');return true;}
export function unlockLinen(s,code){if(!s.bathUnlocked||String(code)!==LINEN_CODE)return false;s.linenSolved=true;s.linenCabinetOpen=true;return true;}
export function takeLinenKey(s){if(!s.linenSolved||s.tinKeyTaken)return false;s.tinKeyTaken=true;addItem(s,'tinKey');return true;}

export function takeStockJar(s,i){if(!s.kitchenOpen||!Number.isInteger(i)||!WEIGHABLES[i])return false;const id='stock_'+WEIGHABLES[i].id;if(s.inventory.includes(id))return false;if(s.stockOnScale===i)s.stockOnScale=-1;addItem(s,id);return true;}
export function returnStockJar(s,i){if(!Number.isInteger(i)||!WEIGHABLES[i])return false;const id='stock_'+WEIGHABLES[i].id;if(s.stockOnScale!==i&&!s.inventory.includes(id))return false;if(s.stockOnScale===i)s.stockOnScale=-1;removeItem(s,id);return true;}
export function scaleWeight(s){return WEIGHABLES[s.stockOnScale]?.gross||0;}
