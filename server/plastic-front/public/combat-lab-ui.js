/* Browser controls for the isolated laboratory. No game save or profile is read or written. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),api=FrontCombatLab,canvas=$('battle'),c=canvas.getContext('2d'),models=new FrontModels(),fx=new FrontEffects({weaponPoint:e=>models.weaponPoint(e)}),floor=new Image();
 floor.src='assets/room/floor-toy-oak-soft-seams-v104.webp';let game,ui,busy=false,serial=0,last=0,acc=0,elapsed=0;const keys=new Set();let stick={x:0,y:0},projection=null;
 const fields=['mode','outcome','toy','troop','commander','stars','level','count','tier','enemy','highHealth','evolved','skillInterval'];
 function options(id,entries){$(id).replaceChildren(...Object.entries(entries).map(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;return o;}));}
 options('outcome',api.OUTCOMES);options('toy',Object.fromEntries(api.TOYS.map(k=>[k,FrontSupportToys.toys[k].name])));options('troop',Object.fromEntries(Object.entries(FrontEvolutions).map(([k,v])=>[k,v.name])));options('enemy',api.ENEMIES);options('commander',api.COMMANDERS);
 $('troop').value='tank';$('enemy').value='ant';
 function settings(){const value=Object.fromEntries(fields.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value]));return{...api.clean(value),highHealth:value.highHealth,skillInterval:Number(value.skillInterval),autoSkills:$('repeat').checked};}
 function message(text){$('message').textContent=text;}
 function title(config){return config.mode==='lucky'?api.OUTCOMES[config.outcome]:config.mode==='support'?FrontSupportToys.toys[config.toy].name+' · '+(config.tier<0?'실제 추첨':['기본 3명','강화 25%','대박 5%'][config.tier]):config.mode==='evolution'?FrontEvolutions[config.troop].name:api.COMMANDERS[config.commander]+' · 궁극기';}
 function renderSettings(){
  const config=settings();if(config.enemy!==$('enemy').value)$('enemy').value=config.enemy;
  if(config.outcome==='bossKiller'&&config.mode==='lucky')$('evolved').checked=true;
  document.querySelectorAll('[data-mode]').forEach(el=>el.hidden=el.dataset.mode!==config.mode);$('toyActions').hidden=config.mode!=='support';$('starsLabel').hidden=config.mode==='ultimate';
  $('detail').textContent=config.mode==='support'?FrontSupportToys.toys[config.toy].detail:config.mode==='evolution'?'병과 레벨 5 · '+FrontEvolutions[config.troop].detail:config.mode==='lucky'?'병과 레벨 5 · 성장·당첨 대기 없이 바로 시전합니다. 2성 이상은 독립 룰렛 3개에 같은 결과를 적용합니다. 보스킬러는 진화 상태와 보스를 자동 준비합니다.':'직접 움직이며 5초마다 실제 4초 궁극기를 발동합니다. 즉시 스킬 버튼으로도 재시전합니다.';
  if(config.mode==='support'&&config.toy==='toyDrum')$('detail').textContent=FrontSupportToys.toys.toyDrum.detail+' · 북은 적을 공격하지 않으며 아군 강화 효과를 시험합니다.';
 }
 function toyState(){if(!game||game.lab.mode!=='support'){$('toyState').textContent='';return;}$('toyState').textContent='본게임 쿨타임: '+game.supportToys().map(t=>FrontSupportToys.toys[t.type].name+' '+ '★'.repeat(game.supportToyStars(t))+' · '+game.supportToyCooldown(t)+'초').join(' / ')+' · 실험실은 설정한 주기로 발동';}
 function hud(){if(!game)return;const r=game.result();$('clock').textContent=r.time.toFixed(2)+'초';$('affected').textContent=r.affected+' / '+r.spawned;$('damage').textContent=Math.round(r.damage).toLocaleString();$('healing').textContent=Math.round(r.healing).toLocaleString();$('hits').textContent=r.hits.toLocaleString();$('pause').textContent=game.phase==='paused'?'재개':'일시정지';$('liveState').textContent='생존 적 '+r.alive+' · 처치 '+r.killed+' · 스킬 '+r.casts+'회 · '+(game.autoSkills?'다음 '+r.nextSkill.toFixed(1)+'초':'자동 발동 꺼짐');$('position').textContent='대장 위치 '+Math.round(r.x)+', '+Math.round(r.y);ui?.update();toyState();}
 async function start(){
  const token=++serial;busy=true;$('cast').disabled=$('pause').disabled=true;$('loading').hidden=false;keys.clear();stick={x:0,y:0};
  try{
   const config=settings();if(config.mode==='lucky'&&config.outcome==='bossKiller')config.evolved=true;
   const next=new api.PlayLab(config,{toast:message});await models.prepare(next);await models.waitFor(next.units.map(u=>models.ensure(models.visualFor(u),u.type==='bayonetCaptain'?1:u.team)?.loading).filter(Boolean));
   await models.waitFor([fx.prepareCommanderMaterials?.(),fx.prepareCombatMaterials?.(),config.mode==='support'?FrontSupportToyView.prepare(config.toy):Promise.resolve()]);if(token!==serial)return;
   game=next;game.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;fx.reset();acc=0;
   $('sceneTitle').textContent=title(config);document.querySelectorAll('.field-supply-bar,.rare-supply-marker').forEach(el=>el.remove());
   ui=FrontSupplyUI.create({getGame:()=>game,toast:message,clearInput(){}});
   message('WASD·방향키 / 전장 클릭 / 스틱으로 이동 · 선택한 스킬 '+config.skillInterval+'초마다 자동 발동 · 분대 무적');hud();
  }catch(error){message('실험 준비 실패 · '+error.message);}
  finally{if(token===serial){busy=false;$('loading').hidden=true;$('cast').disabled=$('pause').disabled=false;}}
 }
 function expand(on){$('battleFrame').classList.toggle('expanded',on);document.body.classList.toggle('lab-expanded',on);$('exitExpand').hidden=!on;}$('full').onclick=()=>expand(true);$('exitExpand').onclick=()=>expand(false);
 $('cast').onclick=()=>{if(!game||busy)return;if(game.phase==='paused')game.phase='playing';message(game.cast()?'현재 전장에서 스킬 즉시 발동':'대상이 사거리 안으로 들어오면 발동합니다.');hud();};$('apply').onclick=()=>start();$('pause').onclick=()=>{if(!game||busy)return;game.phase=game.phase==='playing'?'paused':'playing';keys.clear();stick={x:0,y:0};game.input={x:0,y:0};acc=0;hud();};
 $('step').onclick=()=>{if(!game||busy)return;game.phase='playing';game.update(.025);game.update(.025);fx.update(game);game.phase='paused';acc=0;hud();};
 $('duplicate').onclick=()=>{if(!game||busy||game.lab.mode!=='support')return;game.duplicate();$('stars').value=game.supportToyStars(game.actor);hud();};
 $('offer').onclick=()=>{if(!game||busy||game.lab.mode!=='support')return;game.offer();hud();};
 $('battleFrame').addEventListener('click',e=>{if(!e.target.closest('[data-toy-replace]')||game?.lab.mode!=='support')return;$('toy').value=game.actor.type;$('stars').value=game.supportToyStars(game.actor);$('sceneTitle').textContent=title(game.lab);hud();});
 fields.forEach(id=>$(id).addEventListener('change',()=>{renderSettings();message('설정 변경됨 · 설정 적용·재시작을 눌러 적용하세요.');}));$('repeat').onchange=()=>{if(game)game.autoSkills=$('repeat').checked;hud();};
 const presets={777:{mode:'lucky',outcome:'missiles'},boss:{mode:'lucky',outcome:'bossKiller',enemy:'rhinoBeetle',count:4,evolved:true},storm:{mode:'support',toy:'toyStunner',tier:2},shark:{mode:'support',toy:'toyDecoyMaker',tier:2},wave:{mode:'support',toy:'toyTurtle',tier:2},ultimate:{mode:'ultimate',commander:'sarge'}};
 document.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{const p={enemy:'ant',count:8,...presets[button.dataset.preset]};delete p.moving;for(const [id,value]of Object.entries(p)){if($(id).type==='checkbox')$(id).checked=value;else $(id).value=value;}$('repeat').checked=true;document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderSettings();start();});
 $('reset').onclick=()=>{const value={...api.clean({tier:2}),count:8,highHealth:false,skillInterval:5};for(const id of fields){if($(id).type==='checkbox')$(id).checked=value[id];else $(id).value=value[id];}$('repeat').checked=true;$('speed').value='1';renderSettings();start();};
 function text(value,x,y,color='#f2edd0',size=11){c.save();c.font='650 '+size+'px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#19352bd9';c.strokeText(value,x,y);c.fillStyle=color;c.fillText(value,x,y);c.restore();}
 function unit(u){
  if(game.isSupportEntity(u)){FrontSupportToyView.draw(c,u,game);return;}if(u.hp<=0)return;
  c.save();c.translate(u.x,u.y);FrontHitFeedback.transform(c,u,game.time);if(!models.draw(c,u,game.time,!!game.evolved[u.type])){c.fillStyle=u.team?'#bc7151':'#9ccf92';c.beginPath();c.arc(0,-10,12,0,Math.PI*2);c.fill();}c.restore();
  const y=u.y-(['ant','rhinoBeetle','hornet'].includes(u.type)?u.boss?95:40:80),w=u.boss?70:36,left=u.x-w/2;
  const bar=FrontBubbleOctopusView.healthBarLayout(u.hp,u.maxHp,u.bubbleShield?.hp);
  c.fillStyle='#18362c';c.fillRect(left,y,w*bar.track,4);
  c.fillStyle=FrontBubbleOctopusView.healthPaint(c,bar,left,w,u.team?'#f1b37b':'#b8de9f');c.fillRect(left,y,w*bar.filled,4);
  if(u.boss)text(api.ENEMIES[u.type],u.x,y-8,'#ffdda1',10);
  else if(u===game.actor){text(game.stats(u).name+' '+ '★'.repeat(u.star||1),u.x,y-8,'#ffe7a4');}
 }
 function draw(dt){
  const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,r.width),h=Math.max(1,r.height);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  c.fillStyle='#8a7956';c.fillRect(0,0,w,h);if(!game)return;
  const scale=Math.max(.38,Math.min(1.15,w/1080)),leader=game.commander(0),halfW=w/scale/2,halfH=h/scale/2;game.viewport={width:w/scale,height:h/scale};const target={x:Math.max(halfW,Math.min(game.bounds().width-halfW,leader.x)),y:Math.max(halfH,Math.min(game.bounds().height-halfH,leader.y-h/scale*.08))},smooth=Math.min(1,dt*10);game.camera.x+=(target.x-game.camera.x)*smooth;game.camera.y+=(target.y-game.camera.y)*smooth;
  projection={scale,w,h};c.save();c.translate(w/2,h/2);c.scale(scale,scale);c.translate(-game.camera.x,-game.camera.y);const shake=FrontHitFeedback.nuclearShake(game);c.translate(shake.x,shake.y);
  if(floor.complete&&floor.naturalWidth){const tw=1080,th=tw*floor.naturalHeight/floor.naturalWidth;for(let x=Math.floor((game.camera.x-halfW)/tw)*tw;x<game.camera.x+halfW;x+=tw)for(let y=Math.floor((game.camera.y-halfH)/th)*th;y<game.camera.y+halfH;y+=th)c.drawImage(floor,x,y,tw,th);}
  fx.ground(c);fx.luckyGround(c,game);c.strokeStyle='#d3f5a5';c.lineWidth=2;c.beginPath();c.ellipse(leader.x,leader.y,25,15,0,0,Math.PI*2);c.stroke();if(game.moveOrder){c.beginPath();c.arc(game.moveOrder.x,game.moveOrder.y,16,0,Math.PI*2);c.stroke();}
  if(game.actor.type==='leader'&&game.ultimateStatus().active)fx.drawUltimateArea?.(c,game.actor,game.ultimate,game.time);
  for(const u of [...game.units].sort((a,b)=>a.y-b.y||a.id-b.id)){if(FrontHitFeedback.airborne(u,game.time))continue;unit(u);if(u.type==='lucky')fx.luckyReels(c,u,game);}
  window.FrontRosterArt?.field(c,game);fx.drawLuckySprays(c,game);for(const p of game.mortarShells)fx.drawMortar(c,p,game.time);for(const p of game.shots)fx.drawShot(c,p,game.evolved[p.source.type]);
  for(const e of game.effects)if(!FrontSupportToyView.event(c,e,game))fx.drawEvent(c,e);for(const u of game.units.filter(u=>FrontHitFeedback.airborne(u,game.time)).sort((a,b)=>a.y-b.y||a.id-b.id))unit(u);fx.drawParticles(c);window.FrontRosterArt?.results(c,game);fx.drawStunStatuses(c,game);c.restore();FrontHitFeedback.screenFlash(c,game);
 }
 function clearControls(){keys.clear();stick={x:0,y:0};if(game)game.input={x:0,y:0};$('joy').querySelector('i').style.transform='';}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&game){game.phase='paused';clearControls();acc=0;hud();}});window.addEventListener('blur',clearControls);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){expand(false);clearControls();return;}if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown'].includes(key)){e.preventDefault();keys.add(key);}if(e.code==='Space'&&!e.repeat){e.preventDefault();$('pause').click();}if(key==='r'&&!e.repeat)$('cast').click();});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 canvas.addEventListener('pointerdown',e=>{if(!game||busy||game.phase!=='playing'||!projection)return;const r=canvas.getBoundingClientRect(),p=projection;game.setMoveOrder((e.clientX-r.left-p.w/2)/p.scale+game.camera.x,(e.clientY-r.top-p.h/2)/p.scale+game.camera.y,false);canvas.focus({preventScroll:true});});
 const joy=$('joy');let pointer=null;function steer(e){const r=joy.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,n=Math.max(26,Math.hypot(x,y));stick={x:x/n,y:y/n};joy.querySelector('i').style.transform='translate('+stick.x*25+'px,'+stick.y*25+'px)';}
 joy.onpointerdown=e=>{e.preventDefault();pointer=e.pointerId;joy.setPointerCapture(pointer);steer(e);};joy.onpointermove=e=>{if(e.pointerId===pointer)steer(e);};joy.onpointerup=joy.onpointercancel=()=>{pointer=null;stick={x:0,y:0};joy.querySelector('i').style.transform='';};
 function frame(now){const dt=Math.min(.1,(now-last)/1000||0);last=now;if(game?.phase==='playing'&&!busy){const x=stick.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=stick.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),n=Math.max(1,Math.hypot(x,y));game.input={x:x/n,y:y/n};acc+=dt*Number($('speed').value);let steps=0;while(acc>=.025&&steps++<10){game.update(.025);fx.update(game);acc-=.025;}}elapsed+=dt;if(elapsed>.1){elapsed=0;hud();}draw(dt);requestAnimationFrame(frame);}
 renderSettings();start();requestAnimationFrame(frame);
})();
