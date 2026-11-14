/* Browser controls for the isolated laboratory. No game save or profile is read or written. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),api=FrontCombatLab,canvas=$('battle'),c=canvas.getContext('2d'),models=new FrontModels(),fx=new FrontEffects({weaponPoint:e=>models.weaponPoint(e)}),floor=new Image();
 floor.src='assets/room/floor-toy-oak-soft-seams-v104.webp';let game,ui,busy=false,serial=0,last=0,acc=0,elapsed=0,repeatPending=false;
 const fields=['mode','outcome','toy','troop','commander','stars','level','count','tier','layout','enemy','moving','highHealth','evolved'];
 function options(id,entries){$(id).replaceChildren(...Object.entries(entries).map(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;return o;}));}
 options('outcome',api.OUTCOMES);options('toy',Object.fromEntries(api.TOYS.map(k=>[k,FrontSupportToys.toys[k].name])));options('troop',Object.fromEntries(Object.entries(FrontEvolutions).map(([k,v])=>[k,v.name])));options('enemy',api.ENEMIES);options('commander',api.COMMANDERS);
 $('troop').value='tank';$('enemy').value='ant';
 function settings(){return api.clean(Object.fromEntries(fields.map(id=>[id,$(id).type==='checkbox'?$(id).checked:$(id).value])));}
 function message(text){$('message').textContent=text;}
 function title(config){return config.mode==='lucky'?api.OUTCOMES[config.outcome]:config.mode==='support'?FrontSupportToys.toys[config.toy].name+' · '+(config.tier<0?'실제 추첨':['기본 3명','강화 25%','대박 5%'][config.tier]):config.mode==='evolution'?FrontEvolutions[config.troop].name:api.COMMANDERS[config.commander]+' · 궁극기';}
 function renderSettings(){
  const config=settings();if(config.enemy!==$('enemy').value)$('enemy').value=config.enemy;
  if(config.outcome==='bossKiller'&&config.mode==='lucky')$('evolved').checked=true;
  document.querySelectorAll('[data-mode]').forEach(el=>el.hidden=el.dataset.mode!==config.mode);$('toyActions').hidden=config.mode!=='support';$('starsLabel').hidden=config.mode==='ultimate';
  $('detail').textContent=config.mode==='support'?FrontSupportToys.toys[config.toy].detail:config.mode==='evolution'?'병과 레벨 5 · '+FrontEvolutions[config.troop].detail:config.mode==='lucky'?'병과 레벨 5 · 성장·당첨 대기 없이 바로 시전합니다. 2성 이상은 독립 룰렛 3개에 같은 결과를 적용합니다. 보스킬러는 진화 상태와 보스를 자동 준비합니다.':'실제 궁극기 4초와 피해 판정을 재생합니다. 재시전은 쿨타임 없이 새 전장에서 시작합니다.';
  if(config.mode==='support'&&config.toy==='toyDrum')$('detail').textContent=FrontSupportToys.toys.toyDrum.detail+' · 북은 적을 공격하지 않으며 아군 강화 효과를 시험합니다.';
 }
 function toyState(){if(!game||game.lab.mode!=='support'){$('toyState').textContent='';return;}$('toyState').textContent=game.supportToys().map(t=>FrontSupportToys.toys[t.type].name+' '+ '★'.repeat(game.supportToyStars(t))+' · '+game.supportToyCooldown(t)+'초').join(' / ');}
 function hud(){if(!game)return;const r=game.result();$('clock').textContent=r.time.toFixed(2)+'초';$('affected').textContent=r.affected+' / '+game.lab.count;$('damage').textContent=Math.round(r.damage).toLocaleString();$('healing').textContent=Math.round(r.healing).toLocaleString();$('hits').textContent=r.hits.toLocaleString();$('pause').textContent=game.phase==='paused'?'재개':'일시정지';ui?.update();toyState();}
 async function start(shouldCast=true){
  const token=++serial;busy=true;$('cast').disabled=$('pause').disabled=true;$('loading').hidden=false;repeatPending=false;
  try{
   const config=settings();if(config.mode==='lucky'&&config.outcome==='bossKiller')config.evolved=true;
   const next=new api.Lab(config,{toast:message});await models.prepare(next);await models.waitFor(next.units.map(u=>models.ensure(models.visualFor(u),u.type==='bayonetCaptain'?1:u.team)?.loading).filter(Boolean));
   await models.waitFor([fx.prepareCommanderMaterials?.(),fx.prepareCombatMaterials?.(),config.mode==='support'?FrontSupportToyView.prepare(config.toy):Promise.resolve()]);if(token!==serial)return;
   game=next;game.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;game.camera={x:1450,y:5870};fx.reset();acc=0;
   $('sceneTitle').textContent=title(config);document.querySelectorAll('.field-supply-bar,.rare-supply-marker').forEach(el=>el.remove());
   ui=FrontSupplyUI.create({getGame:()=>game,toast:message,clearInput(){}});
   const ok=!shouldCast||game.cast();message(!shouldCast?'배치 완료 · 새로 배치하고 발동을 눌러 시작하세요.':ok?(config.mode==='evolution'?(config.troop==='medic'?'의무관 치료·정화 12초 시험 중':'진화 병과 8초 연속 사격 중'):'확정 발동 · 재생 속도를 낮추거나 일시정지해 자세히 확인하세요.'):'현재 배치에서 시전할 수 없습니다. 접근을 켜거나 배치를 바꿔주세요.');hud();
  }catch(error){message('실험 준비 실패 · '+error.message);}
  finally{if(token===serial){busy=false;$('loading').hidden=true;$('cast').disabled=$('pause').disabled=false;}}
 }
 $('cast').onclick=()=>start();$('pause').onclick=()=>{if(!game||busy)return;game.phase=game.phase==='playing'?'paused':'playing';acc=0;hud();};
 $('step').onclick=()=>{if(!game||busy)return;game.phase='playing';game.update(.025);game.update(.025);fx.update(game);game.phase='paused';acc=0;hud();};
 $('duplicate').onclick=()=>{if(!game||busy||game.lab.mode!=='support')return;game.duplicate();$('stars').value=game.supportToyStars(game.actor);hud();};
 $('offer').onclick=()=>{if(!game||busy||game.lab.mode!=='support')return;game.offer();hud();};
 $('battleFrame').addEventListener('click',e=>{if(!e.target.closest('[data-toy-replace]')||game?.lab.mode!=='support')return;$('toy').value=game.actor.type;$('stars').value=game.supportToyStars(game.actor);$('sceneTitle').textContent=title(game.lab);hud();});
 fields.forEach(id=>$(id).addEventListener('change',()=>{if(id==='outcome'&&$('outcome').value==='mine')$('moving').checked=true;renderSettings();message('설정 변경됨 · 새로 배치하고 발동을 눌러 적용하세요.');}));
 const presets={777:{mode:'lucky',outcome:'missiles'},boss:{mode:'lucky',outcome:'bossKiller',enemy:'rhinoBeetle',count:1,evolved:true},storm:{mode:'support',toy:'toyStunner',tier:2},shark:{mode:'support',toy:'toyDecoyMaker',tier:2},wave:{mode:'support',toy:'toyTurtle',tier:2},ultimate:{mode:'ultimate',commander:'sarge'}};
 document.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{const p={enemy:'ant',count:24,moving:false,...presets[button.dataset.preset]};for(const [id,value]of Object.entries(p)){if($(id).type==='checkbox')$(id).checked=value;else $(id).value=value;}document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderSettings();start();});
 $('reset').onclick=()=>{const value=api.clean({tier:2});for(const id of fields){if($(id).type==='checkbox')$(id).checked=value[id];else $(id).value=value[id];}$('repeat').checked=false;$('speed').value='1';renderSettings();start(false);};
 function text(value,x,y,color='#f2edd0',size=11){c.save();c.font='650 '+size+'px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#19352bd9';c.strokeText(value,x,y);c.fillStyle=color;c.fillText(value,x,y);c.restore();}
 function unit(u){
  if(game.isSupportEntity(u)){FrontSupportToyView.draw(c,u,game);return;}if(u.hp<=0)return;
  c.save();c.translate(u.x,u.y);FrontHitFeedback.transform(c,u,game.time);if(!models.draw(c,u,game.time)){c.fillStyle=u.team?'#bc7151':'#9ccf92';c.beginPath();c.arc(0,-10,12,0,Math.PI*2);c.fill();}c.restore();
  const y=u.y-(['ant','rhinoBeetle','hornet'].includes(u.type)?u.boss?95:40:80),w=u.boss?70:36;c.fillStyle='#18362c';c.fillRect(u.x-w/2,y,w,4);c.fillStyle=u.team?'#f1b37b':'#b8de9f';c.fillRect(u.x-w/2,y,w*Math.max(0,u.hp/u.maxHp),4);
  if(u.boss)text(api.ENEMIES[u.type],u.x,y-8,'#ffdda1',10);
  else if(u===game.actor){text(game.stats(u).name+' '+ '★'.repeat(u.star||1),u.x,y-8,'#ffe7a4');}
 }
 function draw(){
  const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,r.width),h=Math.max(1,r.height);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  if(floor.complete&&floor.naturalWidth)c.drawImage(floor,0,0,w,h);else{c.fillStyle='#8a7956';c.fillRect(0,0,w,h);}if(!game)return;
  const scale=Math.min(w/1080,h/720);c.save();c.translate(w/2,h/2);c.scale(scale,scale);c.translate(-game.camera.x,-game.camera.y);fx.ground(c);fx.luckyGround(c,game);
  if(game.actor.type==='leader'&&game.ultimateStatus().active)fx.drawUltimateArea?.(c,game.actor,game.ultimate,game.time);
  for(const u of [...game.units].sort((a,b)=>a.y-b.y||a.id-b.id)){unit(u);if(u.type==='lucky')fx.luckyReels(c,u,game);}
  fx.drawLuckySprays(c,game);for(const p of game.mortarShells)fx.drawMortar(c,p,game.time);for(const p of game.shots)fx.drawShot(c,p,game.evolved[p.source.type]);
  for(const e of game.effects)if(!FrontSupportToyView.event(c,e,game))fx.drawEvent(c,e);fx.drawParticles(c);c.restore();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&game){game.phase='paused';acc=0;hud();}});
 window.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();$('pause').click();}if(e.key.toLowerCase()==='r')$('cast').click();});
 function frame(now){const dt=Math.min(.1,(now-last)/1000||0);last=now;if(game?.phase==='playing'&&!busy){acc+=dt*Number($('speed').value);let n=0;while(acc>=.025&&n++<10){game.update(.025);fx.update(game);acc-=.025;}if($('repeat').checked&&game.time>=8&&!repeatPending){repeatPending=true;start();}}elapsed+=dt;if(elapsed>.1){elapsed=0;hud();}draw();requestAnimationFrame(frame);}
 renderSettings();start(false);requestAnimationFrame(frame);
})();
