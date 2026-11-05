/* Browser fullscreen includes the page's dialogs, not only its canvas. */
(() => {
 'use strict';
 const root=document.documentElement;
 const buttons=[...new Set(['fullscreenBtn','settingsFullscreenBtn','headerFullscreenBtn','startFullscreenBtn'].map(id=>document.getElementById(id)).filter(Boolean))];
 const status=document.getElementById('fullscreenStatus');
 let windowMode=false;
 const nativeFullscreen=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
 const isFullscreen=()=>nativeFullscreen()||windowMode;
 function sync(){
  const active=isFullscreen(),wasActive=root.classList.contains('game-fullscreen');root.classList.toggle('game-fullscreen',active);root.classList.toggle('game-window-screen',windowMode);
  if(wasActive&&!active)status.textContent='전체화면에서는 브라우저 주소창 없이 전장을 볼 수 있습니다.';
  for(const b of buttons){const label=active?(windowMode?'화면 맞춤 끄기':'전체화면 끄기'):'전체화면 켜기';b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-label',label);b.title=label;b.textContent=active?(windowMode?'⊡ 화면 복원':'⊡ 전체화면 끄기'):'⛶ 전체화면';}
  window.dispatchEvent(new Event('resize'));
 }
 function unavailable(){
  windowMode=true;
  const message='이 브라우저는 주소창 숨기기를 지원하지 않아 게임을 창에 맞춘 화면으로 전환했습니다. 화면 복원 버튼으로 돌아갈 수 있습니다.';
  status.textContent=message;
  window.dispatchEvent(new CustomEvent('front-screen-message',{detail:message}));
 }
 async function toggle(){
  try{
   if(windowMode){windowMode=false;}else if(nativeFullscreen()){
    const exit=document.exitFullscreen||document.webkitExitFullscreen;
    if(exit)await exit.call(document);
   }else{
    const request=root.requestFullscreen||root.webkitRequestFullscreen;
    if(!request){unavailable();sync();return;}
    await request.call(root,document.fullscreenEnabled?{navigationUI:'hide'}:undefined);
    status.textContent='전체화면 사용 중 · 전장 우측 ⊡ 버튼으로 돌아올 수 있습니다.';
   }
   sync();
  }catch{unavailable();sync();}
 }
 for(const b of buttons)b.addEventListener('click',toggle);
 document.addEventListener('fullscreenchange',sync);
 document.addEventListener('webkitfullscreenchange',sync);
 // Embedded mobile browsers can resize their visual viewport independently.
 function viewport(){root.style.setProperty('--ui-height',`${window.visualViewport?.height||window.innerHeight}px`);}
 window.visualViewport?.addEventListener('resize',viewport);
 window.addEventListener('resize',viewport);viewport();
 // Keep touch controls at the bottom of the visible portion of the battlefield.
 // The canvas remains tall and the surrounding document can still scroll.
 const frame=document.getElementById('battleFrame');
 const touchLayout=window.matchMedia('(max-width:760px), (pointer:coarse), (orientation:landscape) and (max-height:560px)');
 let scheduled=false;
 function placeControls(){
  scheduled=false;
  const mobile=touchLayout.matches;frame.classList.toggle('mobile-touch-controls',mobile);
  if(!mobile){frame.classList.remove('touch-controls-outside');return;}
  const r=frame.getBoundingClientRect(),v=window.visualViewport,top=v?.offsetTop||0,bottom=top+(v?.height||window.innerHeight);
  const visibleTop=Math.max(r.top,top),visibleBottom=Math.min(r.bottom,bottom);
  frame.classList.toggle('touch-controls-outside',visibleBottom-visibleTop<115);
  frame.style.setProperty('--screen-top',`${Math.max(40,visibleTop-r.top+8)}px`);
  frame.style.setProperty('--touch-bottom',`${Math.max(18,r.bottom-visibleBottom+18)}px`);
 }
 function scheduleControls(){if(!scheduled){scheduled=true;window.requestAnimationFrame(placeControls);}}
 window.addEventListener('scroll',scheduleControls,{passive:true,capture:true});
 window.addEventListener('resize',scheduleControls);
 window.visualViewport?.addEventListener('scroll',scheduleControls,{passive:true});
 window.visualViewport?.addEventListener('resize',scheduleControls);
 touchLayout.addEventListener('change',scheduleControls);
 new ResizeObserver(scheduleControls).observe(frame);placeControls();
 sync();
 window.FrontMobileUI={isFullscreen,nativeFullscreen};
})();
