/* Evolution attack rewards. Simulation time only; saved queues retain source ownership. */
(function(root){'use strict';
function install(api){
 const {FrontGame:Game,TYPES,LUCKY,multiplier,EVOLUTIONS}=api,p=Game.prototype;
 if(p.evolutionRewardsVersion)return;p.evolutionRewardsVersion=1;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),kind=t=>t.base?'base':t.structure?'structure':t.type;
 const shot=p.fireUnitProjectiles,impact=p.impact,mortar=p.launchMortar,stats=p.stats,odds=p.luckyOdds,cast=p.castLucky,check=p.checkEvolutions;
 const details={rifle:'3점사 · 마지막 강화탄',machinegun:'3초 예열 → 4초 과열 관통',sniper:'최대 3명 관통 · 100/50/25%',rocket:'착탄 뒤 5개 분열탄',mortar:'비행 1초 · 0.25초 간격 2발 · 각 70%',tank:'전방 연쇄 폭발 · 100/60/40% · 중복 적중 없음',guntruck:'최대 4명 도탄 · 100/70/50/35%',lucky:'보스킬러 기본 4444 · 방어력 44% 무시 · 보스 출현 시 꽝 일부 전환',medic:'기존 상태이상 정화 · 파동·연결 연출'};
 EVOLUTIONS.mortar.detail=EVOLUTIONS.mortar.detail.replace('낙탄 시간 2초 유지','진화 포탄 비행 1초');
 for(const [type,detail]of Object.entries(details))EVOLUTIONS[type].detail+=' · '+detail;
 p.evolutionEnabled=function(u){if(!u||u.team!==0)return false;return !!(this.coop?this.withOwner(u.coopOwner,()=>this.evolved[u.type]):this.evolved[u.type]);};
 p.evolutionEnemies=function(u){return this.combatCandidates().filter((t,i,a)=>a.indexOf(t)===i&&t.hp>0&&!t.hidden&&this.canTarget(u,t));};
 p.stats=function(u){const s=stats.call(this,u);if(u.type==='machinegun'&&this.evolutionEnabled(u)){const active=this.time<(u.overheatUntil||0),heat=active?1:Math.min(1,(u.evolutionHeat||0)/3);s.rate/=1+.35*heat;}return s;};
 p.evolutionMuzzle=function(u,target,style){this.effects.push({kind:'evoMuzzle',x:u.x,y:u.y,angle:Math.atan2(target.y-u.y,target.x-u.x),style,t:.22,max:.22,team:0});};
 p.evolutionBullet=function(u,target,attack,s,style){const result=shot.call(this,u,target,attack,s);for(const b of result){b.evoStyle=style;b.evoOrigin={x:u.x,y:u.y};b.evoRange=s.range;}this.evolutionMuzzle(u,target,style);return result;};
 p.fireUnitProjectiles=function(u,target,attack,s=this.stats(u)){
  if(!this.evolutionEnabled(u))return shot.call(this,u,target,attack,s);
  if(u.type==='rifle'){
   const first=this.evolutionBullet(u,target,{...attack,damage:attack.damage*.4},s,'burst');
   this.evolutionAttacks??=[];for(const [i,factor]of [[1,.4],[2,.6]])this.evolutionAttacks.push({kind:'rifle',source:u,target,at:this.time+i*.09,attack:{...attack,damage:attack.damage*factor},spec:{...s},style:i===2?'burstFinal':'burst'});return first;
  }
  if(u.type==='machinegun'){
   if(this.time>=(u.overheatUntil||0)){
    const gap=this.time-(u.evolutionLastShot??-Infinity);u.evolutionHeat=gap<=Math.max(.6,s.rate*2.5)?(u.evolutionHeat||0)+gap:0;
    if(u.evolutionHeat>=3-1e-8){u.overheatUntil=this.time+4;u.evolutionHeat=0;this.effects.push({kind:'evoOverheat',x:u.x,y:u.y,source:u,t:.8,max:.8,team:0});this.notify('toast','보급 기관총병 · 과열 관통 4초');}
   }
   u.evolutionLastShot=this.time;return this.evolutionBullet(u,target,attack,s,this.time<(u.overheatUntil||0)?'heatPierce':'heat');
  }
  return this.evolutionBullet(u,target,attack,s,({sniper:'pierce',rocket:'cluster',tank:'siege',guntruck:'ricochet'})[u.type]||'evolved');
 };
 p.launchMortar=function(u,target,attack){
  if(!this.evolutionEnabled(u)||u.type!=='mortar')return mortar.call(this,u,target,attack);
  const s=this.stats(u),point={x:target.x,y:target.y},payload={...attack,damage:attack.damage*.7};
  this.evolutionMortar(u,point,payload,s.splash,1);
  (this.evolutionAttacks??=[]).push({kind:'mortar',source:u,target:point,attack:payload,radius:s.splash,at:this.time+.25});
 };
 p.evolutionMortar=function(u,target,attack,radius,index){
  this.mortarShells.push({x:target.x,y:target.y,fromX:u.x,fromY:u.y,radius,landAt:this.time+1,delay:1,source:u,team:0,damage:attack.damage,critical:!!attack.critical,evoStyle:'mortarTwin',evoIndex:index});u.recoil=.25;
  this.evolutionMuzzle(u,target,'mortarTwin');this.notify('fire',{...u,type:'mortar'});
 };
 p.evolutionArea=function(group,point){
  for(const t of this.evolutionEnemies(group.source)){
   const d=distance(t,point);if(d>group.radius||group.hitIds?.includes(t.id))continue;
   if(group.hitIds)group.hitIds.push(t.id);
   this.damage(t,group.damage*point.factor*multiplier(group.source.type,kind(t))*(1-.35*d/group.radius),group.source);
  }
  this.effects.push({kind:'explosion',x:point.x,y:point.y,radius:group.radius,t:.6,max:.6,team:0});
  this.effects.push({kind:'evoBlast',x:point.x,y:point.y,radius:group.radius,style:group.style,index:group.index,t:.65,max:.65,team:0});
  this.notify('explosion',{x:point.x,y:point.y,team:0,kind:group.style==='siege'?'tank':'rocket'});
 };
 p.impact=function(b){
  if(b.kind==='bossKiller'){
   if(b.target?.hp>0&&b.target.boss&&this.canTarget(b.source,b.target)){
    // Hostile bosses receive no cover bonus. Reduce their remaining armor, then
    // compensate the input so damage() still owns immunity, defense and kill credit.
    const defense=this.defenseFactor(b.target,b.source),pierced=1/(1+(1/defense-1)*.56);
    const y=b.target.y-(b.guidedFlight?.targetHeight||0);
    this.damage(b.target,b.damage*pierced/defense,b.source);this.effects.push({kind:'explosion',x:b.target.x,y,radius:110,t:.9,max:.9,team:0,visualKind:'bossKiller'});this.effects.push({kind:'evoBossImpact',x:b.target.x,y,radius:110,t:1,max:1,team:0});this.notify('explosion',{x:b.target.x,y:b.target.y,team:0,kind:'bossKiller'});
   }return;
  }
  if(!b.evoStyle)return impact.call(this,b);
  const center={x:b.target.x,y:b.target.y},origin=b.evoOrigin||b.source,angle=Math.atan2(center.y-origin.y,center.x-origin.x),enemies=this.evolutionEnemies(b.source);
  const initialHits=b.evoStyle==='siege'?enemies.filter(t=>t===b.target||distance(t,center)<b.splash).map(t=>t.id):null;
  impact.call(this,b);
  if(['pierce','heatPierce'].includes(b.evoStyle)){
   const along=t=>(t.x-origin.x)*Math.cos(angle)+(t.y-origin.y)*Math.sin(angle),start=along(center);
   const extra=enemies.filter(t=>t!==b.target&&t.hp>0&&along(t)>start+3&&along(t)<=b.evoRange&&Math.abs((t.x-origin.x)*Math.sin(angle)-(t.y-origin.y)*Math.cos(angle))<Math.min(26,(TYPES[t.type]?.r||18)+7)).sort((a,c)=>along(a)-along(c)).slice(0,2);
   let from=origin;for(const [i,t]of [b.target,...extra].entries()){
    if(i)this.damage(t,b.damage*[1,.5,.25][i]*multiplier(b.source.type,kind(t)),b.source);
    this.effects.push({kind:'evoBeam',x:from.x,y:from.y,tx:t.x,ty:t.y,width:[6,3,1.5][i],style:b.evoStyle,t:.3,max:.3,team:0});from=t;
   }
  }else if(b.evoStyle==='ricochet'){
   const visited=[...(b.evoVisited||[]),b.target.id],index=(b.evoIndex||0)+1;
   this.effects.push({kind:'evoBeam',x:origin.x,y:origin.y,tx:center.x,ty:center.y,width:3-index*.45,style:'ricochet',t:.23,max:.23,team:0});
   if(index<4){const next=enemies.filter(t=>t.hp>0&&!visited.includes(t.id)&&distance(t,center)<=140&&this.lineClear(center,t,0,{fireTeam:0})).sort((a,c)=>distance(a,center)-distance(c,center))[0];if(next){
    const damage=(b.evoBaseDamage??b.damage)*[1,.7,.5,.35][index],n=shot.call(this,b.source,next,{damage,critical:b.critical},{splash:0})[0];Object.assign(n,{x:center.x,y:center.y,speed:1200,evoStyle:'ricochet',evoIndex:index,evoVisited:visited,evoBaseDamage:b.evoBaseDamage??b.damage,evoOrigin:center});
   }}
  }else if(b.evoStyle==='cluster'||b.evoStyle==='siege'){
   const siege=b.evoStyle==='siege',points=siege?[{x:center.x+Math.cos(angle)*95,y:center.y+Math.sin(angle)*95,at:this.time+.15,factor:.6},{x:center.x+Math.cos(angle)*190,y:center.y+Math.sin(angle)*190,at:this.time+.3,factor:.4}]:Array.from({length:5},(_,i)=>({x:center.x+Math.cos(angle+i*Math.PI*2/5)*70,y:center.y+Math.sin(angle+i*Math.PI*2/5)*70,at:this.time+.16+i*.045,factor:.22}));
   (this.evolutionBlasts??=[]).push({source:b.source,points,index:0,damage:b.damage,radius:siege?70:38,style:b.evoStyle,...(siege?{hitIds:initialHits}:{})});
   this.effects.push({kind:'evoBlast',...center,radius:b.splash,style:b.evoStyle,index:0,t:.7,max:.7,team:0});
  }
 };
 p.bossKillerTarget=function(u){return this.evolutionEnemies(u).filter(t=>t.boss&&distance(u,t)<=LUCKY.missileRange&&this.visible(t)&&this.lineClear(u,t,0,{fireTeam:0})).sort((a,b)=>distance(u,a)-distance(u,b))[0]||null;};
 p.evolutionLuckyOdds=function(u,base){
  if(!u||!this.evolutionEnabled(u)||!this.bossKillerTarget(u))return base;
  const chance=Math.min(.08,base.blank);return {...base,blank:base.blank-chance,bossKiller:chance};
 };
 p.luckyOdds=function(u){const base=this.coop&&u?.team===0?this.withOwner(u.coopOwner,()=>odds.call(this,u)):odds.call(this,u);return this.evolutionLuckyOdds(u,base);};
 p.castLucky=function(u,result){
  if(result!=='bossKiller')return cast.call(this,u,result);
  if(!this.evolutionEnabled(u))return;
  const target=this.bossKillerTarget(u);
  if(!target){const base=this.luckyOdds(u),fallback=this.luckyOutcome(this.random(),base);if(u.luckyRoll?.kind==='bossKiller'){u.luckyRoll.kind=fallback;u.luckyRoll.bossKillerAvailable=false;}return cast.call(this,u,fallback);}
  const scale=this.coop?this.withOwner(u.coopOwner,()=>this.luckyScale(u)):this.luckyScale(u);
  const duration=Math.max(.6,Math.min(1.1,distance(u,target)/440)),launchHeight=30,targetHeight=16+(target.visualFlightHeight??TYPES[target.type]?.flightHeight??0);
  const heading=Math.atan2(target.y-targetHeight-u.y+launchHeight,target.x-u.x);
  const guidedFlight={startedAt:this.time,duration,fromX:u.x,fromY:u.y,launchHeight,targetHeight,distance:distance(u,target),progress:0,heading,previousX:u.x,previousY:u.y-launchHeight};
  this.shots.push({x:u.x,y:u.y,target,source:u,damage:4444*scale,speed:440,kind:'bossKiller',team:0,life:3,splash:0,evoStyle:'bossKiller',guidedFlight});
  this.effects.push({kind:'evoBossLaunch',x:u.x,y:u.y,launchY:u.y-launchHeight,angle:heading,targetHeight,target,t:duration+.15,max:duration+.15,team:0});this.notify('fire',{...u,luckySound:'bossKiller'});this.notify('toast','보스킬러 당첨! 검은 미사일 발사');
 };
 p.updateBossKillerFlight=function(b,dt){
  const f=b.guidedFlight;if(!f||b.life<=0)return;
  const k=Math.max(0,Math.min(1,(this.time-f.startedAt)/f.duration)),q=.6*k+.4*k*k;
  b.x=f.fromX+(b.target.x-f.fromX)*q;b.y=f.fromY+(b.target.y-f.fromY)*q;
  f.targetHeight=16+(b.target.visualFlightHeight??TYPES[b.target.type]?.flightHeight??0);
  const height=f.launchHeight*(1-q)+f.targetHeight*q+Math.sin(Math.PI*k)*Math.min(18,f.distance*.055),screenY=b.y-height;
  const dx=b.x-f.previousX,dy=screenY-f.previousY;
  if(Math.hypot(dx,dy)>.001)f.heading=Math.atan2(dy,dx);
  f.previousX=b.x;f.previousY=screenY;f.progress=k;
  if(k>=1){b.life=0;this.impact(b);}
 };
 p.checkEvolutions=function(){const before={...this.evolved};check.call(this);for(const type of Object.keys(EVOLUTIONS))if(this.evolved[type]&&!before[type]){
  const owner=this.coopOwner,c=this.commander(0);for(const u of this.alive(0))if(u.type===type&&(!this.coop||u.coopOwner===owner)){u.cooldown=Math.min(u.cooldown,0);if(type==='lucky')u.nextLuckyAt=this.time;}this.effects.push({kind:'evoAwaken',x:c.x,y:c.y,unitType:type,name:EVOLUTIONS[type].name,detail:details[type],coopOwner:owner,t:2,max:2,team:0});this.notify('explosion',{x:c.x,y:c.y,team:0,kind:'evolution'});
 }};
 p.updateEvolutionCombat=function(){
  const pending=[];for(const a of this.evolutionAttacks||[]){if(a.at>this.time+1e-8){pending.push(a);continue;}if(a.source.hp<=0)continue;
   if(a.kind==='mortar')this.evolutionMortar(a.source,a.target,a.attack,a.radius,2);
   else if(a.target.hp>0&&this.canTarget(a.source,a.target)&&distance(a.source,a.target)<=a.spec.range){this.evolutionBullet(a.source,a.target,a.attack,a.spec,a.style);this.notify('fire',a.source);}
  }this.evolutionAttacks=pending;
  this.evolutionBlasts=(this.evolutionBlasts||[]).filter(g=>{while(g.index<g.points.length&&g.points[g.index].at<=this.time+1e-8)this.evolutionArea(g,g.points[g.index++]);return g.index<g.points.length;});
  for(const u of this.units){if(u.type!=='machinegun')continue;if(u.hp<=0){u.evolutionHeat=0;u.overheatUntil=0;continue;}if(u.overheatUntil&&this.time>=u.overheatUntil){u.overheatUntil=0;u.evolutionHeat=0;u.evolutionLastShot=undefined;}else if(!u.overheatUntil&&this.time-(u.evolutionLastShot??-Infinity)>.7)u.evolutionHeat=0;}
 };
 return {details};
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;
else root.FrontEvolutionRewards=install({FrontGame:root.FrontGame,TYPES:root.FrontTypes,LUCKY:root.FrontLucky,multiplier:root.FrontMultiplier,EVOLUTIONS:root.FrontEvolutions});
})(typeof window==='undefined'?globalThis:window);
