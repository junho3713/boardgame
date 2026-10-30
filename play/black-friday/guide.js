'use strict';
(() => {
  const lesson = document.querySelector('#lesson');
  if (!lesson) return;
  const steps = [
    {cash:100,owned:0,market:4,track:0},
    {cash:70,owned:0,market:4,track:0},
    {cash:70,owned:1,market:3,track:0},
    {cash:70,owned:1,market:2,track:1},
    {cash:70,owned:1,market:2,track:1}
  ];
  const titles = ['먼저 현재 상태를 봐요','은행에 $30을 내요','파랑 주식 한 개를 받아요','시장 파랑을 하나 더 트랙에 둬요','즉시 주가와 큰 변동 조건을 확인해요'];
  const explanations = ['현금은 $100, 파랑 주가는 $30이에요. 시장 파랑은 4개이고, 이 예시에서는 매수 트랙이 비어 있어요. 다음 단계로 거래를 따라가 보세요.','$100 − $30 = $70. 아직 주식이나 행동 기록은 옮기기 전이에요.','시장에 있던 파랑 하나를 내 가림막 뒤로 가져와요. 이것이 내가 산 주식이에요. 시장에는 3개가 남아요.','시장 파랑 하나를 주식 매수 트랙으로 옮겨요. 추가로 돈을 내거나 내 주식을 꺼내는 것이 아니에요. 시장에는 2개가 남고 트랙에 1개가 생겨요.','시장이 비지 않았고 파랑의 세 번째 기록도 아니므로 가격은 $30 그대로예요. 전체 매수 트랙도 아직 차지 않아 큰 주가 변동은 없어요. 여기까지 하면 이 차례가 끝나요.'];
  let current = 0;
  const previous = document.querySelector('#previousStep');
  const next = document.querySelector('#nextStep');
  function render() {
    const step = steps[current];
    document.querySelector('#stepCount').textContent = `${current + 1} / ${steps.length} 단계`;
    document.querySelector('#lessonCash').textContent = `$${step.cash}`;
    document.querySelector('#lessonOwned').textContent = `${step.owned}개`;
    document.querySelector('#lessonMarket').textContent = `${step.market}개`;
    document.querySelector('#lessonTrack').textContent = `${step.track}개`;
    document.querySelector('#lessonTitle').textContent = titles[current];
    document.querySelector('#lessonText').textContent = explanations[current];
    const briefcase = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M14 12V7h12v5" fill="none" stroke="#174f87" stroke-width="4"/><rect x="3" y="12" width="34" height="24" rx="4" fill="#397fc1" stroke="#174f87" stroke-width="2"/><path d="M4 23h32" stroke="#9ac9ed" stroke-width="2"/><rect x="17" y="20" width="6" height="7" rx="1" fill="#d3e8f7"/></svg>';
    const group = (label,count,active,track=false) => `<div class="token-place" data-active="${active}"><strong>${label}</strong><div class="${track?'tokens-track':''}"><div class="token-pieces">${count?briefcase.repeat(count):'<span class="empty">없음</span>'}</div></div><span>${count}개</span></div>`;
    const moves = ['아직 토큰을 옮기기 전이에요.','내 돈 $30 → 은행','시장 파랑 한 개 → 내 가림막 뒤','시장 파랑 한 개 → 매수 트랙','파랑 주식과 구매 기록을 구분해요.'];
    document.querySelector('#lessonPicture').innerHTML = group('주식 시장',step.market,current===2||current===3)+group('내가 산 주식',step.owned,current===2)+group('매수 트랙',step.track,current===3,true)+`<p class="movement-note">${moves[current]}</p>`;
    previous.disabled = current === 0;
    next.textContent = current === steps.length - 1 ? '처음부터 다시 보기' : '다음 단계';
  }
  previous.addEventListener('click', () => { current = Math.max(0,current-1); render(); });
  next.addEventListener('click', () => { current = (current+1)%steps.length; render(); });
  render();
  lesson.hidden = false;
})();

(() => {
  const color=document.querySelector('#referenceColor'),black=document.querySelector('#referenceBlack'),out=document.querySelector('#referenceResult');
  if(!color||!black||!out)return;
  function update(){
    const c=Number(color.value),b=Number(black.value);
    document.querySelectorAll('.reference-grid [data-value]').forEach(el=>{el.classList.remove('chosen');el.removeAttribute('aria-current');});
    if(color.value===''||black.value===''||!Number.isInteger(c)||!Number.isInteger(b)||c<0||b<0||c+b>12){out.dataset.error='true';out.innerHTML='<strong>토큰 수를 확인해 주세요.</strong><p>0 이상의 정수를 넣고, 두 수의 합이 12개를 넘지 않게 해요. 실제로 뽑은 다른 색 토큰은 입력하지 않아요.</p>';return;}
    out.dataset.error='false';
    const value=b>=2?c-b:c,vertical=Math.ceil(Math.abs(value)/2),horizontal=value===0?'왼쪽 한 칸':value>0?(value%2===0?'오른쪽 한 칸':''):(Math.abs(value)%2===0?'왼쪽 한 칸':'');
    const parts=[];if(value!==0)parts.push(`${value>0?'위':'아래'} ${vertical}칸`);if(horizontal)parts.push(horizontal);
    const found=document.querySelector(`.reference-grid [data-value="${value}"]`);if(found){found.classList.add('chosen');found.setAttribute('aria-current','true');}
    const formula=b>=2?`${c} − ${b} = ${value}`:`계산값 ${value}`;
    const why=b===1?'검정이 한 개이므로 빼지 않아요. 금값에는 영향을 주지만, 이 색의 주가는 색 토큰 수 그대로 읽어요.':b===0?'검정이 없으므로 그 색의 토큰 수 그대로 읽어요.':'검정이 두 개 이상이므로 그 색 개수에서 검정 수를 빼요.';
    out.innerHTML=`<strong>${formula}</strong><p>${why}</p><p><b>${parts.join(' + ')}</b> 이동해요.${value===0?' 0은 제자리 유지가 아니에요.':''}</p>${Math.abs(value)>6?'<p>표 밖의 값이에요. 같은 배치를 위아래로 이어 읽어요.</p>':''}<p class="note">가장자리에 닿으면 아래의 예외 규칙을 적용해요.</p>`;
  }
  color.addEventListener('input',update);black.addEventListener('input',update);
  document.querySelectorAll('#referencePresets button').forEach(button=>button.addEventListener('click',()=>{color.value=button.dataset.color;black.value=button.dataset.black;update();}));
  document.querySelector('#referenceControls').hidden=false;document.querySelector('#referencePresets').hidden=false;update();
})();
