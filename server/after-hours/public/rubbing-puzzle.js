import {prepareRubbing,alignRubbing,rubImprint,rubbingDigit} from './puzzle-tricks.js?v=20261117-tricks1';
import {LUGGAGE_IMPRINT} from './puzzle-evidence.js?v=20261117-tricks1';
const $=s=>document.querySelector(s);
const marker=(x,y)=>`<path d="M${x} ${y+14}V${y}h14" fill="none" stroke="#44534b" stroke-width="2.5"/>`;
export function openRubbingPuzzle({state:s,modal,inventory,record,sound,caption}){
 if(!prepareRubbing(s)){caption('수하물표와 영수증, 연필을 함께 챙겨야 한다.');return;}
 if(s.tagRubbed){result();return;}
 if(s.rubbingAligned){rubbing();return;}alignment();
 function result(){s.selected=null;inventory();record('수하물표의 압흔','영수증의 빈 뒷면을 표에 맞춰 대고 연필 옆면으로 문질렀다. 눌린 획은 5 · 7 · 1이다.');modal(`<h2>종이에 남은 자국</h2><div class="story-paper"><div class="rubbing-code">${LUGGAGE_IMPRINT}</div><p>연필 가루가 눌린 획을 따라 모였다. 인벤토리의 수하물표와 J에서 다시 볼 수 있다.</p></div>`);}
 function alignment(){
  modal('<h2>압흔 위에 영수증 대기</h2><p>인쇄되지 않은 면을 위로 놓고, 종이와 수하물표의 왼쪽 위 꺾인 표시를 겹친다.</p><svg id="rubbingAlign" class="rubbing-align" viewBox="0 0 400 260" role="img" aria-label="수하물표 위에 위치와 방향이 어긋난 영수증"></svg><div class="rubbing-controls"><button class="outline" id="rubFlip">영수증 뒤집기</button><button class="outline" id="rubTurn">종이 90도 돌리기</button><button class="outline" data-rub-move="-1,0">왼쪽으로</button><button class="outline" data-rub-move="1,0">오른쪽으로</button><button class="outline" data-rub-move="0,-1">위로</button><button class="outline" data-rub-move="0,1">아래로</button></div><button class="primary" id="rubMount">모서리 고정하기</button><p id="rubbingStatus" role="status"></p>');
  const draw=()=>{const[x,y]=s.rubbingOffset;$('#rubbingStatus').textContent='';$('#rubbingAlign').innerHTML=`<rect width="400" height="260" fill="#3c342c"/><rect x="94" y="55" width="212" height="150" rx="5" fill="#a99b7d" stroke="#786647"/>${marker(102,63)}<g transform="translate(${x*24} ${y*24}) rotate(${s.rubbingTurn*90} 200 130)"><rect x="94" y="55" width="212" height="150" fill="#e2d6b9" fill-opacity=".83" stroke="#ece2c9" stroke-width="2"/>${marker(102,63)}<text x="200" y="126" text-anchor="middle" fill="#33453b" font-size="18">${s.rubbingBlank?'빈 뒷면':'HOTEL · 317'}</text>${s.rubbingBlank?'':'<path d="M125 145H275M125 160H240M125 175H265" stroke="#6e705d"/>'}</g>`;};draw();
  $('#rubFlip').onclick=()=>{s.rubbingBlank=!s.rubbingBlank;sound('paper');draw();};$('#rubTurn').onclick=()=>{s.rubbingTurn=(s.rubbingTurn+1)%4;sound('paper');draw();};
  document.querySelectorAll('[data-rub-move]').forEach(b=>b.onclick=()=>{const d=b.dataset.rubMove.split(',').map(Number);s.rubbingOffset=s.rubbingOffset.map((v,i)=>Math.max(-2,Math.min(2,v+d[i])));draw();});
  $('#rubMount').onclick=()=>{if(alignRubbing(s)){sound('paper');rubbing();}else $('#rubbingStatus').textContent=!s.rubbingBlank?'인쇄면에는 글씨가 겹친다. 빈 뒷면을 위로 놓자.':'표와 종이의 모서리가 어긋나 있다. 꺾인 표시도 같은 방향이어야 한다.';};
 }
 function rubbing(){
  modal('<h2>연필 옆면으로 압흔 옮기기</h2><p>종이 위를 누른 채 가로질러 문지르세요. 각 부분을 클릭하거나 Tab·Enter로도 문지를 수 있어요.</p><div class="rubbing-sheet" id="rubbingSheet"><div class="rubbing-cells">'+Array.from({length:6},(_,i)=>`<button class="rub-cell" data-rub-cell="${i}" aria-label="${['왼쪽 위','왼쪽 아래','가운데 위','가운데 아래','오른쪽 위','오른쪽 아래'][i]} 문지르기"></button>`).join('')+'</div></div><p id="rubbingStatus" role="status"></p><button class="primary" id="finishRubbing" hidden>드러난 자국 기록하기</button>');
  const labels=['왼쪽 위','왼쪽 아래','가운데 위','가운데 아래','오른쪽 위','오른쪽 아래'];
  const draw=(i)=>{const n=s.rubbingMarks[i],b=$(`[data-rub-cell="${i}"]`),top=i%2===0;b.innerHTML=`<svg viewBox="0 ${top?0:70} 100 70" aria-hidden="true"><path d="M8 8 92 22M8 21 92 35M8 34 92 48M8 47 92 61M8 60 92 74M8 73 92 87M8 86 92 100M8 99 92 113M8 112 92 126M8 125 92 139" stroke="#646354" stroke-width="3" opacity="${n*.08}"/><text x="50" y="112" text-anchor="middle" font-family="Georgia,serif" font-size="112" fill="#3b443b" opacity="${n/3}">${n?LUGGAGE_IMPRINT[Math.floor(i/2)]:''}</text></svg>`;b.setAttribute('aria-label',labels[i]+(n===3?' 문지름 완료':' 문지르기 '+n+'/3'));};
  const apply=(i)=>{if(!rubImprint(s,i))return;draw(i);if(s.tagRubbed){$('#rubbingStatus').textContent='세 자리의 눌린 획이 모두 드러났다.';$('#finishRubbing').hidden=false;sound('paper');}else{const digits=[0,1,2].map(n=>rubbingDigit(s,n)||'…');$('#rubbingStatus').textContent='옮긴 자국: '+digits.join(' · ');}};
  document.querySelectorAll('[data-rub-cell]').forEach(b=>{draw(+b.dataset.rubCell);b.onclick=()=>apply(+b.dataset.rubCell);});
  const sheet=$('#rubbingSheet');let down=false,last=null;
  sheet.onpointerdown=e=>{down=true;last=[e.clientX,e.clientY];sheet.setPointerCapture?.(e.pointerId);};sheet.onpointerup=sheet.onpointercancel=()=>{down=false;last=null;};
  sheet.onpointermove=e=>{if(!down||!last||Math.hypot(e.clientX-last[0],e.clientY-last[1])<12)return;const rect=sheet.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;if(x>=0&&x<1&&y>=0&&y<1)apply(Math.floor(x*3)*2+Math.floor(y*2));last=[e.clientX,e.clientY];};
  $('#finishRubbing').onclick=result;
 }
}
