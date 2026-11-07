(function(root){'use strict';
root.FrontSupplyUI={create({getGame,toast,clearInput}){
 const bar=document.createElement('section');bar.className='field-supply-bar';bar.setAttribute('aria-label','보급 장비');bar.hidden=true;
 bar.innerHTML='<div class="supply-tools"><button type="button" class="supply-medkit" title="생존 분대 전체 회복과 상태이상 제거">✚ 힐팩 <b>0</b></button><button type="button" class="supply-artillery" title="지원권 선택 후 전장에 목표 지정 · 사거리 900">◎ 포격 지원권 <b>0</b></button></div><div class="supply-buffs"></div><p class="supply-hint" hidden></p>';
 const frame=document.getElementById('battleFrame');frame.append(bar);
 const heal=bar.querySelector('.supply-medkit'),strike=bar.querySelector('.supply-artillery'),buff=bar.querySelector('.supply-buffs'),hint=bar.querySelector('.supply-hint');
 const ui={armed:false,update(){const g=getGame(),s=g.supplyState();bar.hidden=['ready','ended'].includes(g.phase);const usable=g.phase==='playing'&&g.commander(0).hp>0;
  heal.disabled=!usable||!s.medkits;strike.disabled=!usable||!s.artillery;heal.querySelector('b').textContent=s.medkits;strike.querySelector('b').textContent=s.artillery;
  if(!usable||!s.artillery)ui.armed=false;strike.classList.toggle('armed',ui.armed);strike.setAttribute('aria-pressed',String(ui.armed));hint.hidden=!ui.armed;hint.textContent='포격할 지점을 누르세요 · 사거리 900 · 버튼을 다시 누르면 취소';
  const remaining=Math.max(0,Math.ceil(s.boostUntil-g.time)),special=g.supplySquad().filter(u=>u.type==='commando').length;buff.textContent=(remaining?'⚡ 전투 강화 '+remaining+'초 · 공격 +30% / 공속 +20%':'')+(special?(remaining?' · ':'')+'✦ 블랙베어 '+special+'명':'');
 },target(p){if(!ui.armed)return false;const g=getGame();if(g.useArtilleryTicket(p.x,p.y)){ui.armed=false;clearInput();ui.update();return true;}toast('대장으로부터 사거리 900 안의 전장 지점을 선택하세요.');return false;}};
 heal.onclick=()=>{if(!getGame().useMedkit())toast('회복이나 정화가 필요한 생존 분대원이 있을 때 사용하세요.');ui.update();};
 strike.onclick=()=>{ui.armed=!ui.armed;clearInput();ui.update();};
 return ui;
}};
})(window);
