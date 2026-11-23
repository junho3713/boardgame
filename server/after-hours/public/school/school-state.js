import {advanceBasin} from '../basin-water.js';
export const REGISTERS = [
  {channel:'A', room:'운동장', sound:'체육관 쪽에서 농구공이 세 번 튄다.'},
  {channel:'B', room:'도서실', sound:'책장을 천천히 두 번 넘긴다.'},
  {channel:'C', room:'과학실', sound:'유리 비커 둘이 맞닿아 얇게 울린다.'}
];
export const TAPE = [2, 0, 1];
export const GLASS = [1,7,5,9,2,4,6,3,8];
const negative = [[-1,-1],[1,0],[0,1]];
export const orient = ([x,y],turn,back) => {
  if (back) x=-x;
  for(let i=0;i<turn;i++) [x,y]=[-y,x];
  return [x,y];
};
export function holes(turn,back){return negative.map(p=>orient(p,turn,back));}
export function glassCode(){return holes(1,true).sort((a,b)=>a[1]-b[1]||a[0]-b[0]).map(([x,y])=>GLASS[(y+1)*3+x+1]).join('');}
export function fresh(free=false){
  return {free,board:false,film:false,mounted:false,turn:0,back:false,dark:false,drawer:false,roomKey:false,
    classDoor:free,washDoor:free,stall1:true,stall2:false,lid:false,supply:true,lostKey:false,
    tanks:[1,1],flushing:[false,false],basins:[0,1].map(()=>({faucetOn:false,drainClosed:false,basinVolume:0})),
    tray:false,tape:false,boothDoor:free,loaded:false,cabinet:false,exitKey:false,exitDoor:free,escaped:false,notes:[]};
}
export function advancePlumbing(s,dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  for(const [i,basin] of s.basins.entries()){
    advanceBasin(basin,dt);
    let refillTime=dt;
    if(s.flushing[i]){
      const timeToEmpty=s.tanks[i]/.65;
      s.tanks[i]=Math.max(0,s.tanks[i]-.65*dt);
      if(s.tanks[i]>0)continue;
      s.flushing[i]=false;refillTime=Math.max(0,dt-timeToEmpty);
    }
    if(i===0||s.supply)s.tanks[i]=Math.min(1,s.tanks[i]+.16*refillTime);
  }
}
export function keyExposed(s){return s.lid&&!s.supply&&s.tanks[1]<.095&&!s.lostKey;}
export function act(s,id,value){
  switch(id){
    case 'board': s.board=!s.board;break;
    case 'film': if(!s.board||s.film)return false;s.film=true;break;
    case 'mount': if(!s.film||s.mounted)return false;s.mounted=true;break;
    case 'turn': if(!s.mounted)return false;s.turn=(s.turn+1)%4;break;
    case 'flip': if(!s.mounted)return false;s.back=!s.back;break;
    case 'light': s.dark=!s.dark;break;
    case 'drawer': if(s.drawer||value!==glassCode())return false;s.drawer=true;break;
    case 'roomKey': if(!s.drawer||s.roomKey)return false;s.roomKey=true;break;
    case 'classDoor': if(!s.roomKey&&!s.free)return false;s.classDoor=true;break;
    case 'washDoor': if(!s.classDoor)return false;s.washDoor=true;break;
    case 'stall1':case 'stall2':case 'lid':case 'supply':s[id]=!s[id];break;
    case 'tap1':case 'tap2': {const b=s.basins[id==='tap1'?0:1];b.faucetOn=!b.faucetOn;break;}
    case 'plug1':case 'plug2': {const b=s.basins[id==='plug1'?0:1];b.drainClosed=!b.drainClosed;break;}
    case 'flush1':case 'flush2': {const i=id==='flush1'?0:1;if(s.flushing[i]||s.tanks[i]<.08)return false;s.flushing[i]=true;break;}
    case 'lostKey': if(!keyExposed(s))return false;s.lostKey=true;break;
    case 'tray': if(!s.lostKey&&!s.free)return false;s.tray=!s.tray;break;
    case 'tape': if(!s.tray||s.tape)return false;s.tape=true;break;
    case 'boothDoor': if(!s.classDoor)return false;s.boothDoor=true;break;
    case 'load': if(!s.tape||s.loaded)return false;s.loaded=true;break;
    case 'air': if(!s.loaded||s.cabinet||value!==TAPE.map(i=>REGISTERS[i].channel).join(''))return false;s.cabinet=true;break;
    case 'exitKey': if(!s.cabinet||s.exitKey)return false;s.exitKey=true;break;
    case 'exitDoor': if(!s.exitKey&&!s.free)return false;s.exitDoor=true;break;
    case 'leave': if(!s.exitDoor||s.free)return false;s.escaped=true;break;
    default:return false;
  }
  return true;
}
export function remember(s,text){if(!s.notes.includes(text))s.notes.push(text);}
export function hint(s){
  if(!s.film)return ['칠판 아래 레일에 분필가루가 한쪽으로 밀려 있다.','칠판을 옆으로 밀고 뒤에 끼어 있는 투명 원고를 따로 집어 보자.'];
  if(!s.mounted||!s.drawer)return ['창틀의 삼각과 동그라미는 원고에도 있다.','불을 끄고 창에 원고를 끼우자. 두 표식이 겹치면 세 구멍의 숫자를 위에서 아래로 읽는다.'];
  if(!s.classDoor)return ['교탁 서랍 안에 쇠붙이가 있다.','열쇠를 직접 챙겨 교실 미닫이문을 열자.'];
  if(!s.lostKey&&!s.free)return ['분실물함의 붉은 실밥이 서쪽 화장실 당번 일지에 묻은 것과 같다.','둘째 칸의 급수를 잠그고 물을 내려 보자. 물탱크 뚜껑을 옆으로 밀고 안쪽을 내려다본다.'];
  if(!s.tape)return ['복도의 분실물함 받침에 무언가 끌린 자국이 있다.','복도 분실물함의 받침을 당기고 안쪽 카세트를 집자.'];
  if(!s.cabinet)return ['복도 배선표는 방송실 회선의 목적지를 적어 둔 것이다.','테이프 속 세 장소를 들리는 순서대로 회선에 연결해 송출하자.'];
  return ['방송실 녹음등 아래의 열쇠함이 열렸다.','열쇠를 챙기고 복도 남쪽 현관을 열어 밖으로 걸어 나가자.'];
}
export const ROOMS = {
  classroom:{x0:-4.6,x1:4.6,z0:-5.4,z1:5.4,label:'2학년 3반'},
  hall:{x0:-7.6,x1:-4.6,z0:-8,z1:7.6,label:'본관 서쪽 복도'},
  booth:{x0:-12.8,x1:-7.6,z0:-8,z1:-1.65,label:'교내 방송실'},
  washroom:{x0:-13.8,x1:-7.6,z0:.8,z1:7.6,label:'서쪽 화장실'},
  yard:{x0:-8.45,x1:-3.75,z0:7.6,z1:12.2,label:'서쪽 현관 밖'}
};
export const PORTALS=[
  {axis:'x',at:-4.6,lo:-4.25,hi:-2.62,field:'classDoor'},
  {axis:'x',at:-7.6,lo:-6.83,hi:-5.19,field:'boothDoor'},
  {axis:'z',at:7.6,lo:-7.14,hi:-5.06,field:'exitDoor'},
  {axis:'x',at:-7.6,lo:4.72,hi:6.25,field:'washDoor'}
];
export function where(x,z){return Object.keys(ROOMS).find(k=>{const r=ROOMS[k];return x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;});}
export function hitsBlock(x,z,b,pad=.19){
  const dx=x-b.x,dz=z-b.z;
  if(!b.angle)return Math.abs(dx)<b.w/2+pad&&Math.abs(dz)<b.d/2+pad;
  const c=Math.cos(b.angle),sn=Math.sin(b.angle);
  return Math.abs(c*dx-sn*dz)<b.w/2+pad&&Math.abs(sn*dx+c*dz)<b.d/2+pad;
}
export function walkable(s,x,z,solids){
  const pad=.19;
  const inside=Object.values(ROOMS).some(r=>x>r.x0+pad&&x<r.x1-pad&&z>r.z0+pad&&z<r.z1-pad);
  const gap=PORTALS.some(p=>{const a=p.axis==='x'?z:x,b=p.axis==='x'?x:z;return s[p.field]&&a>p.lo+pad&&a<p.hi-pad&&Math.abs(b-p.at)<pad+.06;});
  return (inside||gap)&&!solids.some(b=>hitsBlock(x,z,b,pad));
}
