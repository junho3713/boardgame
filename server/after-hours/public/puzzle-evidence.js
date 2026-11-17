// The evidence is shared by the visible documents, props and puzzle validation.
// Indices run clockwise from north. No solution depends on an unseen/read flag.
export const DIRECTIONS=['북','북동','동','남동','남','남서','서','북서'];
export const TRAY_TARGET=[1,3,2,0];
export const TRAY_EDGES=[[2,3,4,1],[2,2,3,4],[2,1,3,1],[4,4,3,1]];
export const TRAY_BORDER={0:{0:1,3:4},1:{0:2,1:3},2:{2:2,3:1},3:{1:4,2:3}};
export const rotatedEdges=(tile,turn)=>TRAY_EDGES[tile].map((_,side)=>TRAY_EDGES[tile][(side-turn+4)%4]);
export function trayFits(turns){
 if(!Array.isArray(turns)||turns.length!==4||turns.some(v=>!Number.isInteger(v)||v<0||v>3))return false;
 const e=turns.map((v,i)=>rotatedEdges(i,v));
 return Object.entries(TRAY_BORDER).every(([i,edges])=>Object.entries(edges).every(([side,value])=>e[i][side]===value))&&e[0][1]===e[1][3]&&e[0][2]===e[2][0]&&e[1][2]===e[3][0]&&e[2][1]===e[3][3];
}
export const STOCK=[
 {id:'tea',name:'홍차',initial:180,tare:80,gross:200,portion:20,color:'#728578'},
 {id:'coffee',name:'커피',initial:240,tare:80,gross:200,portion:20,color:'#9a7354'},
 {id:'sugar',name:'설탕',initial:250,tare:80,gross:230,portion:25,color:'#c0b49a'}
];
export const EMPTY_TIN={id:'empty',name:'빈 예비',gross:80,color:'#9ba2a0'};
export const WEIGHABLES=[...STOCK,EMPTY_TIN];
export const STOCK_CODE=STOCK.map(j=>(j.initial-(j.gross-j.tare))/j.portion).join('');
export const MAP_PLACES=[
 {id:'pier',name:'부두',x:1,y:4},{id:'clock',name:'시계탑',x:3,y:2},
 {id:'station',name:'역',x:4,y:1},{id:'mill',name:'풍차',x:1,y:1},
 {id:'garden',name:'정원',x:2,y:2},{id:'lighthouse',name:'등대',x:4,y:4}
];
export const POSTCARDS=[
 {from:'pier',to:'clock',text:'부두 난간에 기대어 시계탑을 그렸다.'},
 {from:'station',to:'mill',text:'역에서 내리자 풍차가 눈에 들어왔다.'},
 {from:'garden',to:'lighthouse',text:'정원 벤치에서 등대를 바라보며.'}
];
export function bearing(from,to){const a=MAP_PLACES.find(p=>p.id===from),b=MAP_PLACES.find(p=>p.id===to);return (Math.round(Math.atan2(b.x-a.x,a.y-b.y)/(Math.PI/4))+8)%8;}
export const MAP_TARGET=POSTCARDS.map(p=>bearing(p.from,p.to));
export const LUGGAGE_IMPRINT='571';
// Playback order is intentionally different from the order engraved on the safe.
export const MUSIC_PHRASES=[{symbol:3,beats:2},{symbol:2,beats:4},{symbol:0,beats:1},{symbol:1,beats:3}];
export const SAFE_BEATS=[3,1,4,2];
export const SAFE_TARGET=SAFE_BEATS.map(n=>MUSIC_PHRASES.find(p=>p.beats===n).symbol);
export const EVAC_NODES=[{id:'317',x:4,y:0},{id:'corridor',x:4,y:2},{id:'junction',x:2,y:2},{id:'stairs',x:0,y:2},{id:'316',x:2,y:0},{id:'lift',x:5,y:2}];
export const EVAC_ROUTE=['317','corridor','junction','stairs'];
export const EVAC_TARGET=[2,3,3]; // south, west, west in the plan printed beside the cabinet
export const LINEN_TAGS=[{id:'scarf',name:'회색 목도리',number:6},{id:'shirt',name:'남색 셔츠',number:2},{id:'handkerchief',name:'흰 손수건',number:8}];
export const LINEN_BEFORE=[['scarf','shirt'],['shirt','handkerchief']];
export const LINEN_CODE=LINEN_TAGS.map(t=>t.number).join('');
export const STORY={
 linen:{title:'세탁 담당자가 접어 둔 기록',paragraphs:[
 '316호의 옷을 돌려준 뒤, 떼어 낸 의뢰표를 이 욕실에 모아 두었다. 젖은 표가 서로 달라붙어 수건 봉과 세면대, 문 옆에 나눠 말렸다. 물건 이름은 앞에, 손님이 맡긴 물건의 보관 번호는 뒤에 남아 있다.',
 '남색 셔츠를 받은 때가 기억난다. 손님이 소매의 단추를 찾느라 바구니를 들췄고, 밑에 있던 회색 목도리에서 물이 떨어졌다. 그 셔츠를 접어 넣고 손을 닦을 새도 없이 마지막 손님이 흰 손수건을 내밀었다. 시간은 적지 못했어도 맡겨진 순서만큼은 틀림없다.',
 '그날 이후 린넨장 번호는 물건을 접수한 차례의 보관 번호로 바꿨다. 동행인이 맡긴 꽃무늬 열쇠도 그 안에 있다. 차 상자에서 꺼낸 편지를 다른 사람이 먼저 읽지 않도록 해 달라고 했다.'
 ]},
 tea:{title:'차 상자에 남긴 편지',paragraphs:[
 '네가 잠든 뒤 317호에서 다시 그 소리가 났어. 이번에는 그냥 넘길 수가 없었어. 먼저 가 볼게. 복도에 누가 있는지 모르니, 방 사이 문은 잠가 두었어.',
 '찻상에서 떨어진 조각 중 하나는 이 상자에 넣어 뒀어. 나머지 둘은 소파에서 책을 읽던 날 굴러간 뒤로 보이지 않아. 소파 밑 천에서 걸리는 소리가 났고, 미니바 장부는 그날부터 기울어 있었어. 처음 그 상을 고치던 날, 나는 가운데 꽃만 보고 다 맞았다고 했지. 그래도 서랍은 열리지 않았어. 너는 바깥 테두리에 남은 작은 무늬와 조각의 끝을 한참 들여다봤어.',
 '요리를 마치면 열쇠를 넣어 두던 얕은 서랍. 오늘도 다른 곳으로 옮기지는 않았어. 내가 돌아오지 않으면, 주방에서 오늘 밤 누가 있었는지부터 확인해 줘.'
 ]},
 stock:{title:'야간 근무자의 수첩',paragraphs:[
 '11월 16일. 316호는 분명 두 명이었는데, 자정까지 찻물을 몇 번이나 다시 올렸다. 그중 한 사람은 복도를 계속 확인했다. 다른 한 사람은 커피를 마시다가도 누가 부르면 바로 일어났다.',
 '한 상자에 담겨 온 같은 규격의 통 네 개. 셋에는 재료를 나눠 담고, 하나는 비운 채 예비로 남겼다. 뚜껑도 모두 같은 것이었다. 재료를 채울 때마다 내용물만의 무게와 한 번에 덜어 쓰는 양을 적어 뒀다. 마감 때는 오늘 쓴 양을 장부에 옮겼다.',
 '동행인이 트윈 침실 열쇠를 맡겼다. 열쇠함에 누가 손댄 흔적이 있어, 재고를 마감하며 늘 적던 세 수를 새 번호로 삼았다. 통은 자리가 뒤섞여도 잠금판에 새긴 재료 이름은 그대로다. 단맛을 넣지 않은 잔도 있었으니, 세 숫자가 같을 리는 없다.'
 ]},
 twin:{title:'엽서 봉투의 글',paragraphs:[
 '여행을 마치고도 네 사진을 버리지 못했어. 날짜는 모두 지웠지만, 네가 서 있던 자리는 기억해. 사진 밖에 있는 너를 생각하면 풍경이 다시 연결돼.',
 '엽서 봉투는 벽에 그대로 있지만, 실제 엽서는 두 침대와 협탁에 나눠 두었어. 빠져 버린 보관함 방향판은 협탁 슬라이드 서랍에 챙겼어. 너는 여행 순서를 날짜로 기억하지 않았지. 부두, 역, 정원. 그 세 곳에 서서 바라본 풍경을 먼저 얘기했어. 기념품 보관함의 화살표도 늘 네 시선을 따라갔고. 낡은 지도는 버리지 못하고 주방 쪽에 맡겨 뒀어.',
 '316호 출입문 열쇠와 317호 예비 열쇠를 함께 넣었다. 317호를 두고 오지 말아 줘. 오늘 밤 우리가 확인한 것은 그 안에 있어.'
 ]},
 desk:{title:'317호 화장대의 메모',paragraphs:[
 '글씨를 지웠는데도 흔적은 남았다. 어릴 때 아버지가 동전 위에 종이를 대고 연필 옆면으로 문지르던 모습을 떠올렸다. 눈으로 읽을 수 없는 것도 종이에는 옮길 수 있었다.',
 '가방에 매단 표를 만지자 글씨를 쓰던 손의 압력이 느껴졌다. 누군가 잉크를 닦아 냈지만 표면까지 평평하게 만들지는 못했을 것이다. 호텔 영수증 뒷면은 아직 깨끗하다.',
 '가방 안감에 오르골 열쇠를 넣었다. 실린더가 협탁 아래 틈으로 굴러가 버려 끈 달린 자석도 가방에 챙겨 두었다. 옆방에서 들리던 소리는 이 작은 상자와 닮아 있었다. 그런데 소리가 났던 순서와, 소리가 반복된 횟수는 서로 다른 기록이었다.'
 ]},
 inner:{title:'접힌 대피 안내의 여백',paragraphs:[
 '엘리베이터 문이 닫힌 뒤에도 층 표시가 움직이지 않았다. 호출 버튼을 다시 누르지 않았다. 나는 317호로 돌아와 이 안내도를 펼쳤다.',
 '엘리베이터까지 갔다 돌아온 길은 지웠다. 안내도에는 객실에서 계단까지 이어지는 접점들만 남겼다. 원래 종이는 세 조각으로 찢겨 서랍과 의자 아래, 휴지통에 흩어졌다. 그 끝의 선을 다시 이어야 한다. 열쇠함의 세 화살표를 돌릴 때, 나는 그 짧은 길을 한 번 더 걸어가는 기분이었다.',
 '계단문 열쇠는 안에 있다. 아래층으로 내려가면 프런트의 야간 장부를 찾아 줘. 오늘 밤 누가 이 층에 올라왔는지, 거기에는 아직 지워지지 않은 기록이 있을 거야.'
 ]}
};
