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
    previous.disabled = current === 0;
    next.textContent = current === steps.length - 1 ? '처음부터 다시 보기' : '다음 단계';
  }
  previous.addEventListener('click', () => { current = Math.max(0,current-1); render(); });
  next.addEventListener('click', () => { current = (current+1)%steps.length; render(); });
  render();
  lesson.hidden = false;
})();
