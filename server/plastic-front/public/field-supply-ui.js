(function(root){'use strict';
root.FrontSupplyUI={create({getGame,toast,clearInput}){
 const bar=document.createElement('section');bar.className='field-supply-bar';bar.setAttribute('aria-label','보급 장비');bar.hidden=true;
 bar.innerHTML='<div class="supply-tools"><button type="button" class="supply-medkit" title="생존 분대 전체 회복과 상태이상 제거">✚ 힐팩 <b>0</b></button><button type="button" class="supply-artillery" title="사거리 900 안에서 가장 밀집한 적에게 자동 포격">◎ 포격 지원권 <b>0</b></button></div><div class="supply-buffs"></div><p class="supply-hint" hidden></p>';
 const frame=document.getElementById('battleFrame');frame.append(bar);
 const toyPanel=document.createElement('div');toyPanel.className='support-toy-panel';toyPanel.setAttribute('aria-label','서포토이 편성');bar.prepend(toyPanel);let toyKey='';
 function updateToys(g){
  const own=g.supportToys(),offer=g.supportToyOffer(),defs=root.FrontSupportToys.toys,key=own.map(t=>t.id+':'+t.type+':'+g.supportToyUpgrades(t)).join(',')+'|'+(offer?.type||'');
  if(key!==toyKey){toyKey=key;toyPanel.innerHTML='<b>서포토이 '+own.length+'/2</b><div class="support-toy-cards">'+own.map(t=>'<div class="support-toy-card" title="'+defs[t.type].detail+' · 중복 최대 2회, 주기 5%씩 단축"><strong>'+defs[t.type].icon+' '+defs[t.type].name+' '+(g.supportToyUpgrades(t)===2?'★★':'★ ('+(g.supportToyUpgrades(t)+1)+'/3)')+'</strong><small data-toy-state="'+t.id+'"></small><progress data-toy-charge="'+t.id+'" max="1" value="0"></progress></div>').join('')+'</div>'+(offer?'<div class="support-toy-offer"><strong>새 서포토이 · '+defs[offer.type].name+'</strong><p>'+defs[offer.type].detail+'</p>'+own.map(t=>'<button type="button" data-toy-replace="'+t.id+'">'+defs[t.type].name+' 교체</button>').join('')+'<button type="button" data-toy-replace="keep">현재 편성 유지</button></div>':'');}
  toyPanel.hidden=!own.length&&!offer;
  for(const t of own){
   const d=defs[t.type],down=t.hp<=0,remaining=down?Math.max(0,t.toyDownUntil-g.time):Math.max(0,(t.toyNextAt||0)-g.time);
   const state=toyPanel.querySelector('[data-toy-state="'+t.id+'"]'),charge=toyPanel.querySelector('[data-toy-charge="'+t.id+'"]');
   const boosting=t.type==='toyDrum'&&g.time<(t.toyBoostUntil||0);
   let status=remaining?'다음 발동 '+Math.ceil(remaining)+'초':'발동 대기';
   const baits=t.type==='toyDecoyMaker'?g.supportBaits():[];
   if(baits.length)status='미끼 '+baits.length+'/3 · 남음 '+baits.map(d=>Math.ceil(d.toyExpires-g.time)).join('/')+'초 · 다음 '+Math.ceil(remaining)+'초';
   else if(t.type==='toyDrum')status=boosting?(t.toyProcTier===2?'대박':'강화')+' '+Math.ceil(t.toyBoostUntil-g.time)+'초 · 다음 '+Math.ceil(remaining)+'초':'오라 · 다음 추첨 '+Math.ceil(remaining)+'초';
   else if(g.time<(t.toyHighlightUntil||0))status=(t.toyProcTier===2?'대박':'강화')+' · '+status;
   if(state)state.textContent=(down?'수리 '+Math.ceil(remaining)+'초':'HP '+Math.ceil(t.hp)+'/'+Math.ceil(t.maxHp)+' · '+status)+' · 주기 '+Number(g.supportToyCooldown(t).toFixed(2))+'초';
   if(charge){charge.setAttribute('aria-label',d.name+' · '+(down?'수리':boosting?'강화 남은 시간':t.type==='toyDrum'?'다음 추첨':'재사용 충전'));charge.setAttribute('aria-valuetext',state?.textContent||status);charge.value=down?1-remaining/20:boosting?(t.toyBoostUntil-g.time)/root.FrontSupportToys.rules.drum.duration:1-Math.min(1,remaining/g.supportToyCooldown(t));}
  }
 }
 toyPanel.addEventListener('click',e=>{const b=e.target.closest('[data-toy-replace]');if(!b)return;const id=b.dataset.toyReplace;if(!getGame().resolveSupportToyOffer(id==='keep'?'keep':Number(id)))toast('전투 중에 자신의 서포토이 슬롯을 선택하세요.');});
 const heal=bar.querySelector('.supply-medkit'),strike=bar.querySelector('.supply-artillery'),buff=bar.querySelector('.supply-buffs'),hint=bar.querySelector('.supply-hint');
 const marker=document.createElement('div');marker.className='rare-supply-marker';marker.setAttribute('role','status');marker.hidden=true;frame.append(marker);
 const miniMarker=document.createElement('div');miniMarker.className='rare-supply-marker';miniMarker.style.cssText='left:50%;top:105px;background:#382617e8;color:#ffe2a1;border-color:#d9a055;pointer-events:none';miniMarker.setAttribute('role','status');miniMarker.hidden=true;frame.append(miniMarker);
 const ui={armed:false,update(){const g=getGame(),s=g.supplyState();bar.hidden=['ready','ended'].includes(g.phase);const usable=g.phase==='playing'&&g.commander(0).hp>0;updateToys(g);heal.hidden=!s.medkits;strike.hidden=!s.artillery;
  heal.disabled=!usable||!s.medkits;strike.disabled=!usable||!s.artillery;heal.querySelector('b').textContent=s.medkits;strike.querySelector('b').textContent=s.artillery;
  if(!usable||!s.artillery)ui.armed=false;strike.classList.toggle('armed',ui.armed);strike.setAttribute('aria-pressed',String(ui.armed));hint.hidden=!ui.armed;hint.textContent='포격할 지점을 누르세요 · 사거리 900 · 버튼을 다시 누르면 취소';
  const mini=g.units.find(u=>u.miniBoss&&u.hp>0);miniMarker.hidden=!mini||['ready','ended'].includes(g.phase);if(mini){const c=g.commander(0),a=Math.atan2(mini.y-c.y,mini.x-c.x);miniMarker.innerHTML='<span style="display:inline-block;transform:rotate('+a+'rad)">➜</span> '+mini.bossName+' · '+Math.round(Math.hypot(mini.x-c.x,mini.y-c.y)/10)+'m';}
  const active=g.evolutionLinks?.().filter(l=>l.active)||[],rare=g.pickups.filter(p=>p.active&&p.rareSupply&&g.time<(p.expires||Infinity)).sort((a,b)=>Math.hypot(a.x-g.camera.x,a.y-g.camera.y)-Math.hypot(b.x-g.camera.x,b.y-g.camera.y))[0];
  marker.hidden=!rare||['ready','ended'].includes(g.phase);if(rare){const dx=rare.x-g.camera.x,dy=rare.y-g.camera.y,angle=Math.atan2(dy,dx),c=g.commander(0),distance=Math.round(Math.hypot(rare.x-c.x,rare.y-c.y)/10),view=frame.querySelector('canvas'),visible=Math.abs(dx)<(g.viewport?.width||1200)*.43&&Math.abs(dy)<(g.viewport?.height||800)*.43;marker.innerHTML='<span style="display:inline-block;transform:rotate('+angle+'rad)">➜</span> 희귀 보급 · '+distance+'m · '+Math.max(0,Math.ceil(rare.expires-g.time))+'초 · 접근해 획득'+(g.rareSupplyGuards(rare).length?' · 호위 '+g.rareSupplyGuards(rare).length+(rare.ambushPending?' · 증원 4기 경계':''):(rare.ambushPending?' · 접근 증원 경계':' · 확보 가능'));const vw=view?.clientWidth||frame.clientWidth,vh=view?.clientHeight||frame.clientHeight,half=Math.min(marker.offsetWidth/2,vw/2-8),x=visible?vw/2:vw*(.5+Math.cos(angle)*.38),y=visible?vh*.16:vh*(.5+Math.sin(angle)*.36);marker.style.left=((view?.offsetLeft||0)+Math.max(half+8,Math.min(vw-half-8,x)))+'px';marker.style.top=((view?.offsetTop||0)+Math.max(28,Math.min(vh-28,y)))+'px';}
  const remaining=Math.max(0,Math.ceil(s.boostUntil-g.time)),special=g.supplySquad().filter(u=>g.isSupplyTroop(u)).length;buff.textContent=(remaining?'⚡ 전투 강화 '+remaining+'초 · 공격 +30% / 공속 +20%':'')+(special?(remaining?' · ':'')+'✦ 특수부대 '+special+'명':'')+(active.length?(remaining||special?' · ':'')+'연계 '+active.length+'종':'');buff.title=active.map(l=>l.name+': '+l.detail).join('\n');
  bar.hidden=['ready','ended'].includes(g.phase)||(!g.supportToys().length&&!g.supportToyOffer()&&!s.medkits&&!s.artillery&&!remaining&&!special&&!active.length);
 },target(p){if(!ui.armed)return false;const g=getGame();if(g.useArtilleryTicket(p.x,p.y)){ui.armed=false;clearInput();ui.update();return true;}toast('대장으로부터 사거리 900 안의 전장 지점을 선택하세요.');return false;}};
 heal.onclick=()=>{if(!getGame().useMedkit())toast('회복이나 정화가 필요한 생존 분대원이 있을 때 사용하세요.');ui.update();};
 strike.onclick=()=>{ui.armed=false;clearInput();if(!getGame().useArtilleryTicket())toast('사거리 900 안에 보이는 공격 가능한 적이 없습니다. 지원권은 유지됩니다.');ui.update();};
 return ui;
}};
})(window);
