/* Put the existing controls inside one game surface; keep their IDs and handlers. */
(function(root){'use strict';
 const doc=root.document,$=id=>doc.getElementById(id),frame=$('battleFrame');if(!frame)return;
 doc.documentElement.classList.add('game-hud');
 function panel(id,title){
  const overlay=doc.createElement('div');overlay.id=id;overlay.className='overlay hud-overlay';overlay.hidden=true;
  const modal=doc.createElement('section');modal.className='modal hud-info-modal';
  modal.innerHTML='<div class="hud-panel-head"><h2>'+title+'</h2><button type="button" data-hud-close="'+id+'" aria-label="'+title+' 닫기">닫기</button></div><div class="hud-panel-body"></div>';
  overlay.append(modal);doc.body.append(overlay);
  return modal.querySelector('.hud-panel-body');
 }
 const squad=panel('battleSquadOverlay','분대 · 강화'),menu=panel('battleMenuOverlay','게임 메뉴');
 const sidebar=doc.querySelector('.sidebar'),abilities=doc.querySelector('.run-build-bar');
 if(sidebar)squad.append(sidebar);if(abilities)squad.append(abilities);
 const actions=doc.querySelector('.top-actions');if(actions)menu.append(actions);
 const footer=doc.querySelector('.battle-footer');if(footer)menu.append(footer);
 const map=doc.querySelector('.map-label');if(map)menu.prepend(map);
 const hud=doc.querySelector('.battle-hud');if(hud)frame.prepend(hud);
 const toolbar=doc.querySelector('.tactical-toolbar');if(toolbar)frame.append(toolbar);
 const tools=doc.createElement('nav');tools.className='hud-quick-actions';tools.setAttribute('aria-label','전장 정보와 메뉴');
 tools.innerHTML='<button id="battleSquadBtn" type="button" aria-haspopup="dialog" aria-controls="battleSquadOverlay">분대 · 강화 <span id="hudUnitCount"></span></button><button id="battleMenuBtn" type="button" aria-haspopup="dialog" aria-controls="battleMenuOverlay">메뉴</button>';
 for(const id of ['displayBtn','pauseBtn'])if($(id))tools.append($(id));frame.append(tools);
 for(const [button,id]of [['battleSquadBtn','battleSquadOverlay'],['battleMenuBtn','battleMenuOverlay']])$(button).addEventListener('click',()=>root.dispatchEvent(new root.CustomEvent('front-hud-open',{detail:id})));
 const count=$('unitCount');if(count){const sync=()=>{$('hudUnitCount').textContent=count.textContent.replace(/\s*UNITS/i,'');};new root.MutationObserver(sync).observe(count,{childList:true,characterData:true,subtree:true});sync();}
 const fieldFullscreen=$('fullscreenBtn');if(fieldFullscreen){fieldFullscreen.classList.remove('field-fullscreen');fieldFullscreen.classList.add('hud-menu-fullscreen');menu.append(fieldFullscreen);}
 const test=$('waveTestStrip');if(test)frame.append(test);
 const auto=$('autoState');if(auto)frame.append(auto);
 // Register before game.js attaches the existing action handlers. New buttons
 // (including automatic reinforcement) receive the same handoff after insertion.
 const wired=new WeakSet();
 for(const id of ['battleSquadOverlay','battleMenuOverlay']){
  const overlay=$(id),wire=()=>{for(const button of overlay.querySelectorAll('button')){if(wired.has(button))continue;wired.add(button);button.addEventListener('click',()=>root.dispatchEvent(new root.CustomEvent('front-hud-close',{detail:id})));}};
  overlay.addEventListener('click',e=>{if(e.target.closest('button'))root.dispatchEvent(new root.CustomEvent('front-hud-close',{detail:id}));},true);
  wire();new root.MutationObserver(wire).observe(overlay,{childList:true,subtree:true});
 }
})(window);
