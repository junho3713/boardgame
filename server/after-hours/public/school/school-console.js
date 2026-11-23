import {act, GLASS, holes, orient, REGISTERS, TAPE, remember, hint} from './school-state.js';

export function schoolConsole(s, audio, say) {
  const dialog=document.querySelector('#dialog'), content=document.querySelector('#detail');
  let pending=[], hintPhase='', hintLevel=0;
  const stopTape=()=>{pending.forEach(clearTimeout);pending=[];};
  function close(){stopTape();if(dialog.open)dialog.close();}
  dialog.addEventListener('close',stopTape);
  document.querySelector('#close').onclick=close;
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  function element(tag,text,cls,parent=content){
    const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;
  }
  function show(tag,title,body){
    stopTape();content.replaceChildren();element('div',tag,'doc-tag');element('h2',title);
    if(body)element('p',body);
    if(!dialog.open)dialog.showModal();
  }
  function button(text,fn,parent=content){const b=element('button',text,'action',parent);b.onclick=fn;return b;}
  function finish(text,kind='key'){audio.sound(kind);close();say(text);}
  function windowView(){
    show('2학년 3반 · 동쪽 창','창틀의 원고걸이',s.dark?'유리의 차가운 면에 숫자가 떠 있다. 걸쇠 옆에 작은 글씨가 긁혀 있다.':'형광등이 유리에 길게 비친다. 창틀 가운데에 오래된 원고걸이가 있다.');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 240 240');svg.setAttribute('class','viewglass');
    svg.setAttribute('role','img');
    function shape(name,attrs,parent=svg){
      const n=document.createElementNS(svg.namespaceURI,name);
      for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);
      parent.append(n);return n;
    }
    const coord=n=>120+48*n;
    shape('rect',{width:240,height:240,fill:s.dark?'#294044':'#63786e'});
    for(let i=0;i<9;i++){
      const x=coord(i%3-1),y=coord(Math.floor(i/3)-1);
      shape('path',{d:'M '+(x-17)+' '+(y+24)+' h 34',stroke:'#9cb2aa','stroke-opacity':'.25'});
      if(s.dark)shape('text',{x,y:y+11,fill:'#f0ead2','font-size':31,'text-anchor':'middle','font-family':'monospace'}).textContent=GLASS[i];
    }
    if(s.mounted){
      const mask=shape('mask',{id:'film-holes'},shape('defs',{}));shape('rect',{width:240,height:240,fill:'white'},mask);
      for(const [x,y] of holes(s.turn,s.back))shape('circle',{cx:coord(x),cy:coord(y),r:19,fill:'black'},mask);
      shape('rect',{x:12,y:12,width:216,height:216,rx:3,fill:'#233b36','fill-opacity':'.96',stroke:'#b2ac81',mask:'url(#film-holes)'});
    }
    const marks=[[-1.76,-1.76],[1.75,-1.38]];
    function drawMark(index,p,ink,dashed){
      const x=coord(p[0]),y=coord(p[1]),attrs={fill:'none',stroke:ink,'stroke-width':dashed?3:2,'stroke-dasharray':dashed?'3 3':'none'};
      if(index)shape('circle',{...attrs,cx:x,cy:y,r:6});else shape('path',{...attrs,d:'M '+x+' '+(y-7)+' l 7 12 h -14 Z'});
    }
    marks.forEach((m,i)=>{drawMark(i,orient(m,1,true),'#ffda98',true);if(s.mounted)drawMark(i,orient(m,s.turn,s.back),'#d4ece2',false);});
    const rows=holes(s.turn,s.back).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
    const digits=(s.mounted?rows.map(([x,y])=>GLASS[(y+1)*3+x+1]):GLASS).join(' · ');
    const aligned=s.mounted&&s.turn===1&&s.back;
    svg.setAttribute('aria-label',(s.dark?'보이는 숫자 '+digits:'글씨가 반사광에 가려져 있다.')+(s.mounted?(aligned?' / 두 표식이 일치한다.':' / 표식이 어긋나 있다.'):''));
    content.append(svg);
    if(s.mounted){
      element('div',(s.back?'원고 뒷면':'원고 앞면')+'　·　'+(aligned?'삼각과 원이 모두 겹친다.':'창틀의 점선과 원고 표식이 어긋난다.'),'response');
      button('앞뒤 뒤집기',()=>{act(s,'flip');audio.sound('slide');windowView();});
      button('90° 돌리기',()=>{act(s,'turn');audio.sound('click');windowView();});
      if(aligned&&s.dark)remember(s,'원고의 표식을 맞췄다. 창에 남은 세 숫자는 위에서부터 '+digits+'였다.');
    }else if(s.film)button('투명 원고 끼우기',()=>{act(s,'mount');audio.sound('slide');windowView();});
    element('p','창틀에 새긴 글씨　「윗줄부터 출석을 부를 것.」');
  }
  const digits=[0,0,0],channels=[0,0,0];
  function dial(title,radio){
    const values=radio?channels:digits,chars=radio?'ABC':'0123456789';
    show(radio?'교내 방송실 · 송출반':'교탁 · 잠금장치',title,radio?'인계용 녹음의 장소를 차례로 연결한다. 세 회선의 순서가 맞으면 당직함 빗장이 풀린다.':'세 개의 낡은 숫자 바퀴. 다이얼 아래에는 작은 원고걸이 모양이 찍혀 있다.');
    const row=element('div','','dials'),reply=element('div','','response');reply.setAttribute('role','status');
    for(let i=0;i<3;i++){
      const btn=button('',()=>{values[i]=(values[i]+1)%chars.length;paint();audio.sound('click');},row);
      const digit=element('span','','',btn);element('small','돌리기','',btn);
      function paint(){digit.textContent=chars[values[i]];btn.setAttribute('aria-label',(i+1)+'번째 '+(radio?'회선 ':'숫자 ')+digit.textContent+' 돌리기');}
      paint();
    }
    button(radio?'회선 송출':'손잡이 당기기',()=>{
      if(radio&&!s.loaded){reply.textContent='입력 신호가 없다. 옆의 카세트 데크가 비어 있다.';return;}
      if(!act(s,radio?'air':'drawer',values.map(i=>chars[i]).join(''))){reply.textContent=radio?'반송음만 되돌아온다.':'걸쇠가 걸린 채 움직이지 않는다.';audio.sound('wrong');return;}
      if(radio)remember(s,'당직 방송이 끝나자 벽 쪽의 열쇠함이 열렸다.');
      finish(radio?'송출등이 켜지고 뒤쪽 열쇠함에서 철컥 소리가 난다.':'교탁 서랍이 앞으로 미끄러진다.','slide');
    });
  }
  function chart(){
    show('본관 서쪽 복도 · 시설계','방송 회선 점검표');
    element('div','11월 7일　야간 점검\n━━━━━━━━━━━━\n도서실 스피커　　B 회선\n과학실 스피커　　C 회선\n운동장 스피커　　A 회선','paper');
    element('p','야간 당번 메모　「테이프에 담긴 순서로 송출한 뒤, 마지막 학생에게 현관 열쇠를 건넬 것.」');
    remember(s,'회선 점검표　B 도서실 / C 과학실 / A 운동장. 야간 인계 녹음에 담긴 순서대로 송출한다.');
  }
  function attendance(){
    show('2학년 3반 · 11월 7일','야간 점호표');
    element('div','재적　32명　　 하교　31명\n잔류　0명\n\n당번 서명 옆, 눌러 쓴 연필 자국.\n「마지막으로 나가는 사람이 내 목소리를 지워 줘.」','paper');
    remember(s,'점호표에서 한 명이 비었다. 재적 32명, 하교 31명, 잔류 0명.');
  }
  function deck(){
    show('교내 방송실 · DECK 01','야간 인계 녹음',s.loaded?'데크 안에 「11월 7일 · 마지막 점검」 테이프가 걸려 있다.':'카세트 덮개에 손가락이 닿은 자리만 깨끗하다.');
    if(!s.loaded){if(s.tape)button('카세트 넣기',()=>{act(s,'load');audio.sound('tape');deck();});return;}
    const caption=element('div','정지　■','paper');caption.setAttribute('aria-live','polite');
    button('처음부터 재생　▶',()=>{
      stopTape();audio.sound('tape');caption.textContent='재생　▶　리더 테이프의 잡음';
      TAPE.forEach((n,i)=>pending.push(setTimeout(()=>{audio.field(n);caption.textContent='0'+(i+1)+'　'+REGISTERS[n].sound;},650+1800*i)));
      pending.push(setTimeout(()=>{caption.textContent='끝　■　릴이 멈춘다.';remember(s,'야간 인계 녹음　'+TAPE.map(n=>REGISTERS[n].sound).join(' / '));},6100));
    });
  }
  function journal(){
    show('서령고등학교 · 학생 수첩','조사 기록');
    const items=[[s.film,s.mounted?'투명 원고 (창틀)':'투명 원고'],[s.roomKey,'교실 열쇠'],[s.tape,s.loaded?'인계 테이프 (데크)':'인계 테이프'],[s.exitKey,'현관 열쇠']].filter(x=>x[0]);
    element('div','소지품　'+(items.map(x=>x[1]).join(' · ')||'비어 있다'),'paper');
    if(!s.notes.length)element('p','발견한 흔적을 여기에 적어 두자.');
    for(const n of s.notes)element('div',n,'entry');
  }
  function hints(){
    const pair=hint(s);if(hintPhase!==pair[0]){hintPhase=pair[0];hintLevel=0;}
    show('막혔을 때 · 당번의 메모','접힌 귀퉁이',pair[hintLevel]);
    if(!hintLevel)button('조금 더 펼쳐 보기',()=>{hintLevel=1;hints();});
  }
  function pause(){show('탐색 일시정지','복도는 조용하다.','WASD 이동 · 드래그 또는 방향키로 시점 조절 · E 조사\nJ 수첩 · H 힌트 · F 손전등');button('이어서 조사하기',close);button('시작 화면으로',()=>location.reload());}
  return {windowView,drawer:()=>dial('교탁의 번호 서랍',false),patch:()=>dial('구내 방송 송출반',true),attendance,chart,deck,journal,hints,pause,close,isOpen:()=>dialog.open};
}
