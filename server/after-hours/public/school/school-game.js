import * as T from '../three.module.js';
import {buildSchool} from './school-scene.js';
import {GLTFLoader} from '../GLTFLoader.js';
import {schoolAudio} from './school-audio.js';
import {schoolConsole} from './school-console.js';
import {fresh,act,where,walkable,remember,ROOMS,advancePlumbing} from './school-state.js';

const $=id=>document.getElementById(id),canvas=$('world'),s=fresh(),audio=schoolAudio();
let captionTimer,renderer,level,playing=false,starting=false,soundOn=true,torch=false;
let yaw=0,pitch=0,elapsed=0,prev=0,nextPick=0,foot=0,lastZone='',target=null;
const held=new Set(),ray=new T.Raycaster(),center=new T.Vector2(),cam=new T.PerspectiveCamera(65,1,.04,60);
cam.rotation.order='YXZ';ray.far=2.65;
function say(text){clearTimeout(captionTimer);$('message').textContent=text;captionTimer=setTimeout(()=>{$('message').textContent='';},4200);}
const book=schoolConsole(s,audio,say);
const collect={
  film:['칠판 뒤에서 투명 원고를 꺼냈다. 모서리에 삼각과 원이 찍혀 있다.','투명 원고를 챙겼다.'],
  roomKey:['교탁에서 빨간 꼬리표가 달린 교실 열쇠를 찾았다.','교실 열쇠를 챙겼다.'],
  lostKey:['비어 있는 둘째 칸 물탱크 안에서 「분실물」이라고 찍힌 열쇠를 건졌다.','꼬리표의 글씨가 보인다. 「분실물」.'],
  tape:['분실물함 받침에서 「11월 7일 · 마지막 점검」 테이프를 찾았다.','인계 테이프를 챙겼다.'],
  exitKey:['당직 열쇠함에서 서쪽 현관 열쇠를 찾았다.','현관 열쇠를 챙겼다.']
};
function lookAtTarget(point=center){
  cam.updateMatrixWorld();ray.setFromCamera(point,cam);return level.pick(ray);
}
function interact(hit){
  if(!playing||book.isOpen()||!hit)return;
  const id=hit.id;
  if(collect[id]){
    if(act(s,id)){remember(s,collect[id][0]);say(collect[id][1]);audio.sound('key');}
  }else switch(id){
    case 'board':act(s,id);audio.sound('slide');say(s.board?'칠판이 레일 끝에 닿는다.':'칠판을 제자리로 밀었다.');break;
    case 'light':act(s,id);audio.sound('click');audio.ambience(s.dark);say(s.dark?'형광등이 꺼진다. 빗소리가 가까워졌다.':'교실에 형광등이 켜졌다.');break;
    case 'window':book.windowView();break;
    case 'drawer':if(s.drawer)say(s.roomKey?'서랍이 비어 있다.':'서랍 안쪽에 빨간 꼬리표가 보인다.');else book.drawer();break;
    case 'classDoor':
      if(s.classDoor){say('미닫이문이 열려 있다.');break;}
      if(act(s,id)){audio.sound('slide');say('열쇠가 돌아가고 문 너머 복도가 드러난다.');}else{audio.sound('click');say('문이 손가락 하나만큼 흔들린다. 잠겼다.');}break;
    case 'boothDoor':
      if(!s.boothDoor&&act(s,id)){audio.sound('slide');say('방음문을 밀자 안쪽에서 약한 잡음이 샌다.');}break;
    case 'washDoor':if(!s.washDoor&&act(s,id)){audio.sound('slide');say('문 너머 타일 바닥에서 발소리가 길게 울린다.');}break;
    case 'stall1':case 'stall2':act(s,id);audio.sound('hinge');break;
    case 'lid':act(s,id);audio.sound('china');say(s.lid?'도기 뚜껑을 옆 턱으로 밀었다.':'물탱크 위에 뚜껑을 다시 얹었다.');break;
    case 'supply':act(s,id);audio.sound('hinge');say(s.supply?'관 속에서 물이 밀려오는 소리가 난다.':'붉은 밸브가 끝까지 돌아갔다.');break;
    case 'flush1':case 'flush2':
      if(!act(s,id)){say('손잡이가 헛돈다.');break;}
      audio.sound('flush');
      if(id==='flush2'&&!s.lostKey){audio.sound('rattle');say('물이 빠지자 도기 안에서 쇠붙이가 두 번 부딪힌다.');}
      else say('물 내리는 소리가 빈 칸에 울린다.');
      break;
    case 'tap1':case 'tap2':act(s,id);audio.sound('click');break;
    case 'plug1':case 'plug2':act(s,id);audio.sound('click');say(s.basins[id==='plug1'?0:1].drainClosed?'고무마개로 배수구를 막았다.':'물마개를 옆으로 꺼냈다.');break;
    case 'washLog':book.washLog();break;
    case 'tray':
      if(!act(s,id)){audio.sound('click');say('받침에 작은 자물쇠가 걸려 있다. 붉은 실 한 올이 끼었다.');break;}
      audio.sound('slide');say(s.tray?'받침이 앞으로 나온다.':'받침을 밀어 넣었다.');break;
    case 'chart':book.chart();break;
    case 'attendance':book.attendance();break;
    case 'deck':book.deck();break;
    case 'patch':if(s.cabinet)say('송출이 끝났다. 벽의 당직 열쇠함이 열려 있다.');else book.patch();break;
    case 'cabinet':say(s.cabinet?(s.exitKey?'고리만 남았다.':'열린 함 안에 꼬리표가 매달려 있다.'):'당직함의 빗장이 걸려 있다. 전선 하나가 송출반으로 이어진다.');break;
    case 'exitDoor':
      if(s.exitDoor){say('현관 너머로 빗물이 떨어진다.');break;}
      if(act(s,id)){audio.sound('slide');say('현관문이 열린다. 바깥으로 걸어 나갈 수 있다.');}else{audio.sound('wrong');say('서쪽 현관. 당직 열쇠로 잠겨 있다.');}break;
  }
  nextPick=0;held.clear();
}
function resize(){
  if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();
}
function light(){torch=!torch;$('flash').setAttribute('aria-pressed',String(torch));audio.sound('click');}
function ending(){
  act(s,'leave');playing=false;held.clear();$('hud').hidden=true;$('pause').hidden=true;$('end').hidden=false;$('message').textContent='';audio.sound('bell');$('replay').focus();
}
function frame(now){
  const dt=Math.min(.065,(now-prev)/1000||0);prev=now;elapsed+=dt;
  if(playing){
    let moved=false;
    if(!book.isOpen()&&!document.hidden){
      yaw+=(Number(held.has('arrowleft'))-Number(held.has('arrowright')))*dt*1.6;
      pitch=T.MathUtils.clamp(pitch+(Number(held.has('arrowup'))-Number(held.has('arrowdown')))*dt*1.3,-1.39,1.39);
      const side=Number(held.has('d'))-Number(held.has('a')),forward=Number(held.has('s'))-Number(held.has('w'));
      const distance=dt*(held.has('shift')?3.25:2.18)/Math.max(1,Math.hypot(side,forward));
      const dx=distance*(Math.cos(yaw)*side+Math.sin(yaw)*forward),dz=distance*(Math.cos(yaw)*forward-Math.sin(yaw)*side);
      const p=cam.position;
      if(dx&&walkable(s,p.x+dx,p.z,level.blocks)){p.x+=dx;moved=true;}
      if(dz&&walkable(s,p.x,p.z+dz,level.blocks)){p.z+=dz;moved=true;}
      if(moved){foot+=Math.hypot(dx,dz);if(foot>.92){audio.sound(lastZone==='washroom'?'tileStep':'step');foot=0;}}
      p.y=1.57+(moved?Math.sin(elapsed*10)*.021:0);cam.rotation.set(pitch,yaw,0,'YXZ');
      const zone=where(p.x,p.z);
      if(zone&&zone!==lastZone){if(!s.free&&zone==='hall'&&lastZone==='classroom'&&!s.notes.some(n=>n.startsWith('복도에'))){remember(s,'복도에 들어서자 빈 방송실 쪽에서 종례 예비종이 한 번 울렸다.');audio.sound('bell');say('빈 복도 끝에서 종례 예비종이 울린다.');}lastZone=zone;$('zone').textContent=ROOMS[zone].label;}
      advancePlumbing(s,dt);
      if(!s.free&&zone==='yard'&&p.z>8.34)ending();
    }else held.clear();
    level.update(dt,elapsed,cam,torch);
    audio.plumbing(s,cam.position,yaw,lastZone==='washroom',playing&&!book.isOpen());
    renderer.render(level.scene,cam);
    if(now>=nextPick){
      nextPick=now+95;target=playing&&!book.isOpen()?lookAtTarget():null;
      $('use').hidden=!target;
      if(target)$('use').querySelector('span').textContent=target.label;
    }
  }
  requestAnimationFrame(frame);
}
const washPreview=new URLSearchParams(location.search).get('room')==='washroom';
if(washPreview){
  const free=$('free'),story=$('start');
  free.textContent='화장실에서 둘러보기 ↗';free.className='primary';story.className='quiet';story.textContent='교실에서 탈출 시작';
  free.parentElement.insertBefore(free,story);
}
async function start(free){
  if(starting||playing)return;
  starting=true;$('load').textContent='교실을 여는 중…';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  try{
    if(!renderer){
      renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
      resize();
    }
    if(!level){
      $('load').textContent='학교 시설을 준비하는 중…';
      const asset=await new GLTFLoader().loadAsync(new URL('washroom.glb',import.meta.url).href);
      level=buildSchool(renderer,s,asset.scene);
    }
    Object.assign(s,fresh(free));yaw=-.10;pitch=-.045;cam.position.set(-.75,1.57,4.64);
    if(free&&washPreview){cam.position.set(-8.34,1.57,6.18);yaw=1.16;pitch=-.085;}
    cam.rotation.set(pitch,yaw,0,'YXZ');
    level.update(2,0,cam,false);renderer.render(level.scene,cam);
    playing=true;$('cover').hidden=true;$('end').hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('mode').textContent=free?'자유 탐색':'야간 자율학습 · 탈출';$('load').textContent='';
    audio.sound(free&&washPreview?'china':'bell');say(free&&washPreview?'서쪽 화장실 · 문과 수도꼭지는 E로 조작할 수 있다.':free?'자유 탐색 · 복도와 방송실의 문이 열려 있다.':'스피커에서 마지막 종례 예비종이 울렸다. 교실에는 나뿐이다.');canvas.focus();
  }catch(e){console.error(e);$('load').textContent=renderer?'학교 모델을 열지 못했어. 연결을 확인하고 한 번 더 눌러 줘.':'3D 화면을 열지 못했어. WebGL 2를 지원하는 브라우저에서 하드웨어 가속을 켜고 다시 시도해 줘.';}
  finally{starting=false;}
}
$('start').onclick=()=>{audio.wake();start(false);};$('free').onclick=()=>{audio.wake();start(true);};
$('replay').onclick=()=>location.reload();$('pause').onclick=book.pause;$('journal').onclick=book.journal;$('hint').onclick=book.hints;$('flash').onclick=light;
$('use').onclick=()=>interact(lookAtTarget());
$('audio').onclick=()=>{soundOn=!soundOn;audio.enable(soundOn);if(soundOn)audio.wake();$('audio').textContent=soundOn?'소리 켬':'소리 끔';$('audio').setAttribute('aria-pressed',String(soundOn));};
function keyName(e){return e.code.startsWith('Key')?e.code.slice(3).toLowerCase():e.key.toLowerCase();}
addEventListener('keydown',e=>{
  if(!playing||book.isOpen())return;
  const k=keyName(e);
  if(['w','a','s','d','shift','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();held.add(k);return;}
  if(e.repeat)return;
  const fn={e:()=>interact(lookAtTarget()),j:book.journal,h:book.hints,f:light,escape:book.pause}[k];
  if(fn){e.preventDefault();held.clear();fn();}
});
addEventListener('keyup',e=>held.delete(keyName(e)));addEventListener('blur',()=>held.clear());addEventListener('resize',resize);
let drag=null;
canvas.onpointerdown=e=>{if(!playing||book.isOpen()||drag)return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,travel:0};};
canvas.onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.travel+=Math.abs(dx)+Math.abs(dy);
  yaw-=dx*.0044;pitch=T.MathUtils.clamp(pitch-dy*.0044,-1.39,1.39);drag.x=e.clientX;drag.y=e.clientY;
};
canvas.onpointerup=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.travel<6){const pt=new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);interact(lookAtTarget(pt));}
  drag=null;
};
canvas.onlostpointercapture=()=>{drag=null;};
for(const btn of document.querySelectorAll('[data-move]')){
  btn.onpointerdown=e=>{e.preventDefault();if(!playing||book.isOpen())return;btn.setPointerCapture(e.pointerId);held.add(btn.dataset.move);};
  btn.onlostpointercapture=()=>held.delete(btn.dataset.move);
}
requestAnimationFrame(frame);
