export const CLOCK_TARGET={hour:5,minute:40};
export const RING_TARGET=[5,0,3]; // clockwise eighth-turns from twelve o'clock
export const ITEMS={filmA:'찢어진 필름 · A',filmB:'찢어진 필름 · B',film:'구멍 난 필름',key:'작은 황동 열쇠',bulb:'보랏빛 전구',receipt:'룸서비스 영수증',tag:'317호 수하물표',windingKey:'오르골 태엽 열쇠',exitKey:'비상문 열쇠',passKey:'317호 예비 열쇠',tinKey:'꽃무늬 작은 열쇠',twinKey:'트윈 침실 열쇠',suiteKey:'316호 출입문 열쇠'};
export function createState(explore=false){return{explore,inventory:[],selected:null,frameTaken:false,filmJoined:false,aligned:false,clockSolved:false,drawerOpen:false,bulbTaken:false,uvInstalled:false,lampOn:true,lightOn:true,curtainsClosed:false,rings:[2,6,1],doorOpen:explore,phoneHeard:false,wardrobeOpen:false,suitcaseOpen:false,bathDoorOpen:explore,bathUnlocked:explore,bedroomOpen:explore,kitchenOpen:explore,twinOpen:explore,tinKeyTaken:false,teaTinOpen:false,jugKeyTaken:false,teaNoteSeen:false,teaTraySeen:false,jugSolved:false,jugSmall:0,jugLarge:0,showerOpen:false,suiteEscaped:false,passTaken:false,travelPostcardsSeen:false,companionSolved:false,room317Open:explore,room317Entered:false,luggageOpen:false,musicWound:false,tuneHeard:false,safeOpen:false,exitOpen:false,complete:false,seconds:0,hints:0,notes:[]};}
export function addItem(s,id){if(!s.inventory.includes(id))s.inventory.push(id);}
export function removeItem(s,id){s.inventory=s.inventory.filter(x=>x!==id);if(s.selected===id)s.selected=null;}
export function combineFilms(s){if(!s.inventory.includes('filmA')||!s.inventory.includes('filmB'))return false;removeItem(s,'filmA');removeItem(s,'filmB');addItem(s,'film');s.filmJoined=true;return true;}
export function alignFilm(s,x,y,rotation){if(!s.filmJoined)return false;const aligned=Math.abs(x-2)<.16&&Math.abs(y-1)<.16&&((rotation%4)+4)%4===0;if(aligned)s.aligned=true;return aligned;}
export function setClock(s,hour,minute){if(!s.aligned||hour!==CLOCK_TARGET.hour||minute!==CLOCK_TARGET.minute)return false;s.clockSolved=true;addItem(s,'key');return true;}
export function useItem(s,item,target){if(!s.inventory.includes(item))return false;if(item==='tinKey'&&target==='teaTin'){s.teaTinOpen=true;removeItem(s,item);return true;}if(item==='key'&&target==='bathDoor'&&s.clockSolved){s.bathUnlocked=true;s.bathDoorOpen=true;return true;}if(item==='twinKey'&&target==='twinDoor'&&s.jugSolved){s.twinOpen=true;removeItem(s,item);return true;}if(item==='suiteKey'&&target==='suiteDoor'&&s.companionSolved){s.doorOpen=true;removeItem(s,item);return true;}if(item==='passKey'&&target==='entry317'&&s.doorOpen){s.room317Open=true;removeItem(s,'passKey');return true;}if(item==='key'&&target==='drawer'&&s.bathUnlocked){s.drawerOpen=true;removeItem(s,'key');return true;}if(item==='windingKey'&&target==='musicBox'&&!s.musicWound){s.musicWound=true;removeItem(s,'windingKey');return true;}if(item==='exitKey'&&target==='exit317'&&s.safeOpen){s.exitOpen=true;removeItem(s,'exitKey');return true;}if(item==='bulb'&&target==='lamp'){s.uvInstalled=true;s.lampOn=true;removeItem(s,'bulb');return true;}return false;}
export function uvVisible(s){return s.uvInstalled&&s.lampOn&&!s.lightOn&&s.curtainsClosed;}
export function unlockDoor(s){if(!s.uvInstalled||!s.rings.every((x,i)=>x===RING_TARGET[i]))return false;s.bedroomOpen=true;return true;}
export function phase(s){if(s.suiteEscaped&&!s.room317Entered){if(!s.room317Open&&!s.inventory.includes('passKey'))return'neighborKey';return'enter317';}if(s.doorOpen&&!s.room317Entered)return'exit';if(s.room317Entered){if(!s.luggageOpen)return'luggage';if(!s.musicWound)return'music';if(!s.tuneHeard)return'listen';if(!s.safeOpen)return'safe';return'corridor';}if(s.bedroomOpen){if(!s.kitchenOpen)return'tea';if(!s.jugSolved)return'jugs';if(!s.jugKeyTaken&&!s.twinOpen)return'jugKey';if(!s.twinOpen)return'twinEntry';if(!s.companionSolved)return'neighborKey';return'suiteEntry';}if(!s.inventory.includes('filmA')&&!s.filmJoined)return'low';if(!s.inventory.includes('filmB')&&!s.filmJoined)return'back';if(!s.filmJoined)return'join';if(!s.aligned)return'overlay';if(!s.clockSolved)return'clock';if(!s.bathUnlocked)return'bathEntry';if(!s.drawerOpen)return'drawer';if(!s.bulbTaken)return'bulb';if(!s.uvInstalled)return'lamp';if(!uvVisible(s))return'dark';if(!s.bedroomOpen)return'mirror';if(!s.kitchenOpen)return'tea';if(!s.jugSolved)return'jugs';if(!s.twinOpen)return'twinEntry';if(!s.companionSolved)return'neighborKey';if(!s.doorOpen)return'suiteEntry';return'exit';}
export const HINTS={low:['눈높이에서 보이는 것이 방의 전부는 아니다.','침대 밑에 종이처럼 얇은 것이 끼어 있다.','C로 몸을 낮춘 뒤 침대의 오른쪽 아래를 살펴보자.'],back:['물건의 앞면은 누군가 보여주기로 한 부분이다.','침실 벽에 걸린 호텔 사진은 액자째 들어볼 수 있다.','액자를 조사하고 드래그해서 뒤집으면 뒷판의 조각을 떼어낼 수 있다.'],join:['두 조각의 찢긴 가장자리가 닮아 있다.','인벤토리에서 두 필름을 함께 살펴보자.','인벤토리에서 필름 조각을 선택한 뒤 조각 합치기를 누르면 된다.'],overlay:['구멍은 빈 자리가 아니라, 무언가를 골라내는 틀이다.','침실 책상 위 인화 작업표의 표식과 필름의 표식을 맞춰보자.','합친 필름을 선택한 채 작업표에 사용하자. 필름을 회전시키고, 왼쪽 위 삼각 표식을 작업표의 삼각 표식에 겹치면 네 숫자가 남는다.'],clock:['남은 숫자 사이에는 칸 하나가 비어 있다.','작업표와 같은 무늬가 시계 뒷판에 새겨져 있다.','맞춘 필름의 I·II·III·IV를 시각 HH:MM으로 읽고, 벽시계의 두 바늘을 맞추자.'],drawer:['작은 열쇠가 문에 들어갈 크기는 아니다.','욕실 세면대 아래 수납장에 작은 황동 열쇠 구멍이 있다.','인벤토리에서 열쇠를 선택하고 욕실 수납장을 조사하자.'],bulb:['잠금을 푼 것과 안을 살핀 것은 다르다.','욕실의 열린 수납장 안쪽을 내려다보자.','수납장 안의 보랏빛 전구를 E로 집을 수 있다.'],lamp:['같은 물건도 다른 빛 아래에서는 달라진다.','침실 스탠드에 전구를 끼울 수 있다.','전구를 선택한 채 스탠드를 조사하자.'],dark:['밝은 빛은 약한 흔적을 덮어버린다.','실내 조명뿐 아니라 창밖에서 들어오는 빛도 줄여보자.','벽 스위치로 조명을 끄고 커튼을 닫자. 보라색 스탠드만 남으면 거울 속 방에 다른 흔적이 드러난다.'],mirror:['거울이 언제나 지금의 방을 비추는 것은 아니다.','액자를 떼어낸 자리. 현실의 벽과 거울 속의 벽을 비교해 보자.','거울 속 문장을 읽어 문 고리를 바깥 ↙, 가운데 ↑, 안쪽 ↘ 방향으로 맞춘 뒤 잠금을 눌러보자.'],exit:['스위트룸의 출입문은 거실에 있다.','거실의 열린 문 너머로 직접 걸어가 보자.','316호를 빠져나오면 호텔 복도가 나온다. 317호 입구는 복도 건너편이다.'],neighborKey:['동행인이 머물던 침실에 317호 예비 열쇠가 남아 있다.','316호 거실 왼쪽 트윈 침실에서 여행 엽서와 보관함을 살펴보자.','엽서의 날짜를 이른 순서로 읽으면 바다 → 산 → 도시다. 보관함을 이 순서로 맞추면 예비 열쇠를 얻는다.'],enter317:['다음 객실은 복도 건너편이다.','복도에서 317호 번호가 붙은 출입문을 찾아보자.','I 인벤토리에서 317호 예비 열쇠를 손에 들고 출입문에 사용한 뒤 걸어 들어가자.'],luggage:['다른 투숙객도 무언가를 남겨 두었다.','테이블의 영수증과 침대 위 수하물표를 함께 살펴보자.','수하물표를 뒤집자. 영수증의 주문을 늦은 시각부터 정렬하고 잔 수를 읽으면 2·8·4다.'],music:['여행가방 안의 열쇠는 객실용이 아니다.','화장대의 오르골 옆면에 작은 태엽 구멍이 있다.','I 인벤토리에서 태엽 열쇠를 손에 든 뒤 오르골 앞에서 E를 누르자.'],listen:['소리만이 오르골의 전부는 아니다.','오르골을 재생하면서 움직이는 문양도 살펴보자.','재생 버튼을 누르면 달·종·물결·별 순서로 문양이 드러난다. 소리를 꺼도 볼 수 있다.'],safe:['서로 다른 물건에 같은 문양이 있다.','옷장 아래 금고의 네 문양을 오르골과 비교하자.','왼쪽부터 달·종·물결·별로 맞추고 금고 손잡이를 당기자.'],corridor:['이제 객실 밖으로 나갈 수 있다.','금고에서 얻은 열쇠에는 EXIT라는 글씨가 있다.','비상문 열쇠를 손에 들고 317호 안쪽 비상문 앞에서 E를 누른 뒤 복도로 걸어 나가자.']};
export const LUGGAGE_CODE='284';
export const MUSIC_SEQUENCE=[1,0,2,3]; // moon, bell, wave, star
export function unlockLuggage(s,code){if(!s.room317Entered||String(code)!==LUGGAGE_CODE)return false;if(!s.luggageOpen){s.luggageOpen=true;addItem(s,'windingKey');}return true;}
export function hearTune(s){if(!s.musicWound)return false;s.tuneHeard=true;return true;}
export function unlockSafe(s,symbols){if(!s.musicWound||!s.tuneHeard||symbols.length!==4||!symbols.every((x,i)=>x===MUSIC_SEQUENCE[i]))return false;if(!s.safeOpen){s.safeOpen=true;addItem(s,'exitKey');}return true;}

// Additional bedroom puzzle; the original film / clock / UV / ring sequence is unchanged.
export const TRAVEL_STOPS=[
 {id:0,name:'바다',date:'11.14',path:'M3 11q4-5 8 0t8 0t10 0M3 19q4-5 8 0t8 0t10 0M3 27q4-5 8 0t8 0t10 0'},
 {id:1,name:'산',date:'11.15',path:'M3 27 14 6 27 27ZM9 16l5 3 4-3M19 14l5-7 7 20'},
 {id:2,name:'도시',date:'11.16',path:'M4 28V12h8v16m2 0V4h8v24m2 0V16h5v12M7 16h2m-2 5h2M17 9h2m-2 6h2m-2 6h2'}
];
export const COMPANION_TARGET=[0,1,2];
export function unlockCompanionCase(s,values){
 if(!s.twinOpen||!s.travelPostcardsSeen||!Array.isArray(values)||values.length!==3||!values.every((v,i)=>v===COMPANION_TARGET[i]))return false;
 if(!s.companionSolved){s.companionSolved=true;s.passTaken=true;addItem(s,'passKey');addItem(s,'suiteKey');}return true;
}

export function unlockKitchen(s,order){if(!s.bedroomOpen||!s.teaNoteSeen||!s.teaTraySeen||order.length!==3||!order.every((v,i)=>v===[0,1,2][i]))return false;s.kitchenOpen=true;return true;}
export function moveWater(s,action){
 if(!s.kitchenOpen||s.jugSolved)return false;
 let a=s.jugSmall,b=s.jugLarge;
 switch(action){case 'fillSmall':a=3;break;case 'fillLarge':b=5;break;case 'emptySmall':a=0;break;case 'emptyLarge':b=0;break;case 'toLarge':{const n=Math.min(a,5-b);a-=n;b+=n;break;}case 'toSmall':{const n=Math.min(b,3-a);b-=n;a+=n;break;}default:return false;}
 s.jugSmall=a;s.jugLarge=b;
 if(b===4){s.jugSolved=true;}return true;
}
Object.assign(HINTS,{
 bathEntry:['시계에서 찾은 열쇠에 물방울이 새겨져 있다.','침실 옆 욕실 문에도 같은 물방울 표식이 있다.','작은 황동 열쇠를 손에 들고 욕실 문에 사용하자. 이 열쇠는 세면대 수납장에도 맞는다.'],
 tea:['거실의 서비스 카드는 순서를 설명하고, 찻잔 받침은 문양의 의미를 설명한다.','미니바의 서비스 카드와 소파 앞 찻잔 받침을 모두 조사하자.','빈 잔 예열 → 주전자에 물 → 찻잎. 주방 문에서 잔·주전자·잎 순서로 놓자.'],
 jugs:['주방 계량 장치의 큰 통에서 정확히 4L를 만들어야 한다.','3L 통과 5L 통을 가득 채우거나, 비우거나, 서로 옮길 수 있다.','5L 채움 → 3L로 옮김 → 3L 비움 → 남은 2L를 3L로 → 5L 채움 → 3L가 찰 때까지 옮김. 큰 통에 4L가 남는다.'],
 twinEntry:['계량 장치의 보관함에서 열쇠를 얻었다.','거실 왼쪽 잠긴 문에 TWIN 표식이 있다.','I에서 트윈 침실 열쇠를 손에 들고 그 문에 사용하자.'],
 suiteEntry:['동행인의 보관함에는 두 열쇠가 있었다.','316호 출입문 열쇠와 317호 예비 열쇠는 서로 다른 문에 쓴다.','316호 출입문 열쇠를 거실의 복도 쪽 문에 사용하자.'],
 mirror:['거울 속에서만 보이는 흔적이 있다.','침실 조명과 커튼을 닫고 보라색 스탠드를 켠 뒤 거울을 살펴보자.','침실에서 거실로 이어지는 문의 고리를 바깥 ↙, 가운데 ↑, 안쪽 ↘로 맞추자.']
});

export function takeJugKey(s){if(!s.jugSolved||s.jugKeyTaken)return false;s.jugKeyTaken=true;addItem(s,'twinKey');return true;}
HINTS.jugKey=['수면이 표식에 맞자 작은 보관함이 열렸다.','계량 장치 왼쪽의 열린 상자 안을 살펴보자.','장치 화면을 닫고 열린 보관함 속 열쇠를 E로 집자.'];
HINTS.tea=['찻잔 받침과 잠긴 차 상자에는 같은 꽃무늬가 있다.','소파 앞 찻잔 받침을 뒤집어 작은 열쇠를 찾고, 미니바의 차 상자에 사용하자.','상자 안의 서비스 카드와 받침의 문양 뜻을 연결하면 빈 잔 → 주전자 → 잎 순서다.'];
