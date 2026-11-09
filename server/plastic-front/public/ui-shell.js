/* Presentation only: retains the game's existing controls, saves and combat. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
for(const id of ['greenLabel','redLabel']){const label=$(id);if(!label)continue;const compact=()=>{const text=label.textContent;label.setAttribute('aria-label',text);label.title=text;const lives=text.match(/(?:기회|후퇴) (\d+)회/);label.dataset.compact=id==='greenLabel'&&lives?((text.includes('방어 기지')?'기지':text.includes('내 분대')?'내 분대':'대장')+' · 기회 '+lives[1]+'회'):text.split('/')[0].trim();};new MutationObserver(compact).observe(label,{childList:true,characterData:true,subtree:true});compact();}
function details(label,nodes){const d=document.createElement('details');d.className='ui-details';const s=document.createElement('summary');s.textContent=label;d.append(s);nodes[0]?.before(d);for(const n of nodes)d.append(n);return d;}
const start=$('startOverlay')?.querySelector('.modal');
if(start){
 const footer=document.createElement('footer');footer.className='ui-actions';
 const summary=document.createElement('p');summary.className='ui-launch-summary';footer.append(summary);
 for(const id of ['manualContinue','idleContinue','startBtn'])if($(id))footer.append($(id));
 const content=document.createElement('div');content.className='ui-scroll';while(start.firstChild)content.append(start.firstChild);start.append(content,footer);start.classList.add('ui-split');
 const skins=[...content.querySelectorAll('.unit-skin-picker')];if(skins.length)details('외형 선택 · 능력치 동일',skins);
 const commander=content.querySelector('.commander-picker:not(.unit-skin-picker)');if(commander?.querySelector('p'))details('대장 능력과 상세 규칙',[commander.querySelector('p')]);
 const config=$('idleConfig');if(config){const advanced=[...config.children].filter(n=>!['idlePresets','idlePlanSummary'].includes(n.id));if(advanced.length)details('AI 세부 편성·성장 설정',advanced);}
 const extra=[...content.querySelectorAll('a[href="patch-notes.html"],a[href="boss-test.html"]')];if(extra.length)details('패치 기록·시험실',extra);
 function update(){const selected=name=>{const i=content.querySelector('input[name="'+name+'"]:checked');return i?.closest('label')?.querySelector('b')?.textContent||'';};summary.textContent=[selected('commander'),selected('battlefield')].filter(Boolean).join(' · ');}
 content.addEventListener('change',update);update();
}
const upgrade=$('upgradeOverlay')?.querySelector('.modal');if(upgrade){const footer=document.createElement('footer');footer.className='ui-actions';const button=$('continueBattle');const content=document.createElement('div');content.className='ui-scroll';if(button)footer.append(button);while(upgrade.firstChild)content.append(upgrade.firstChild);upgrade.append(content,footer);upgrade.classList.add('ui-split');}
const overlays=[...document.querySelectorAll('.overlay')],app=document.querySelector('.app');let active=null;const previous=new WeakMap();
function sync(){const open=overlays.filter(o=>!o.hidden);const top=open.sort((a,b)=>(Number(getComputedStyle(a).zIndex)||0)-(Number(getComputedStyle(b).zIndex)||0)).at(-1)||null;
 if(top===active)return;const old=active;active=top;if(app)app.inert=!!top;for(const o of overlays)o.inert=!!top&&o!==top;
 if(top){const back=old?.hidden&&previous.get(old);if(!back||!top.contains(back))previous.set(top,document.activeElement);const modal=top.querySelector('.modal')||top;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');const title=modal.querySelector('h2');if(title){title.id||=top.id+'Title';modal.setAttribute('aria-labelledby',title.id);title.tabIndex=-1;}if(back&&top.contains(back))back.focus({preventScroll:true});else if(!top.contains(document.activeElement))(title||modal).focus({preventScroll:true});}
 else{const target=old&&previous.get(old);if(target?.isConnected&&!target.closest('[hidden]'))target.focus({preventScroll:true});}
}
const visibleControls=()=>active?[...active.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex="0"]')].filter(e=>!e.disabled&&!e.closest('[hidden],[inert]')&&e.getClientRects().length):[];
document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Tab'){const items=visibleControls();if(!items.length){e.preventDefault();return;}const first=items[0],last=items.at(-1);if(!active.contains(document.activeElement)||e.shiftKey&&(document.activeElement===first||!items.includes(document.activeElement))||!e.shiftKey&&document.activeElement===last){e.preventDefault();e.stopImmediatePropagation();(e.shiftKey?last:first).focus();}}
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)||e.code==='KeyR'){e.stopPropagation();}
},true);
const watch=new MutationObserver(sync);for(const o of overlays)watch.observe(o,{attributes:true,attributeFilter:['hidden']});sync();
})();
