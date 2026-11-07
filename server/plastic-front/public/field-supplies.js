/* Field rewards, personal consumables and timed support. All clocks use simulation time. */
(function(root){'use strict';
function install({FrontGame:Game,TYPES}){
 const p=Game.prototype;if(p.fieldSupplyVersion)return;p.fieldSupplyVersion=1;
 const config={odds:{support:.30,medkit:.25,boost:.25,artillery:.15,special:.05},cash:600,boostDuration:60,damage:1.3,haste:1.2,strikeRange:900,strikeDamage:320,strikeRadius:120};
 const fresh=()=>({medkits:0,artillery:0,boostUntil:0,pendingSupport:0,collected:0});
 const reset=p.reset,stats=p.stats,capacity=p.capacity,levelCheck=p.levelCheck,cancel=p.cancelRecovery,shot=p.fireUnitProjectiles,update=p.update,refresh=p.refreshCommanderHealth;
 TYPES.commando={...TYPES.machinegun,name:'블랙베어 특전병',icon:'✦',hp:480,damage:22,rate:.13,range:360,speed:138,r:14,cost:0,role:'희귀 보급 전용 · 중장갑 조끼 · 미니건 3명 관통 · 별도 병력 슬롯'};
 p.reset=function(){reset.call(this);this.fieldSupplyState=fresh();this.supplyStrikes=[];};
 p.supplyState=function(){return this.fieldSupplyState??=fresh();};
 p.supplySquad=function(){return this.units.filter(u=>u.team===0&&u.hp>0&&(!this.coop||u.coopOwner===this.coopOwner));};
 p.stats=function(u){const s=stats.call(this,u);if(u.type==='commando'){
  const grow=1+.18*(this.commanderLevel(this.commander(0))-1);s.hp*=grow;s.damage*=grow;s.defense+=24;
 }
 if(u.team===0&&this.time<(this.fieldSupplyState?.boostUntil||0)){s.damage*=config.damage;if(u.type!=='medic')s.rate/=config.haste;}return s;};
 p.capacity=function(team=0){return capacity.call(this,team)+(team===0?this.supplySquad().filter(u=>u.type==='commando').length:0);};
 p.refreshCommanderHealth=function(){refresh.call(this);for(const u of this.supplySquad())if(u.type==='commando'){const hp=this.stats(u).hp;u.hp=Math.min(hp,Math.max(0,u.hp+hp-u.maxHp));u.maxHp=hp;}};
 p.rollSupply=function(){const value=this.random();let sum=0;for(const [kind,chance]of Object.entries(config.odds)){sum+=chance;if(value<sum)return kind;}return'special';};
 p.collectFieldSupply=function(pickup){
  if(!pickup?.active)return false;const c=this.commander(0);if(c.hp<=0||Math.hypot(c.x-pickup.x,c.y-pickup.y)>=60)return false;
  const state=this.supplyState(),kind=config.odds[pickup.supplyKind]===undefined?this.rollSupply():pickup.supplyKind;
  pickup.active=false;pickup.supplyKind=kind;state.collected++;this.gainXP(18);this.awardGold(5);
  if(kind==='support'){this.cash[0]+=config.cash;state.pendingSupport++;this.notify('toast','지원 보급 · 전투자원 +600 · 지원창에서 즉시 충원');}
  else if(kind==='medkit'){state.medkits++;this.notify('toast','힐팩 확보 · 전체 회복·상태이상 제거 1회 저장');}
  else if(kind==='boost'){state.boostUntil=this.time+config.boostDuration;this.notify('toast','전투 강화 60초 · 공격력 +30% / 공격속도 +20%');}
  else if(kind==='artillery'){state.artillery++;this.notify('toast','포격 지원권 확보 · 버튼을 누른 뒤 전장에 목표 지정');}
  else{const unit=this.addUnit(0,'commando',c.x+45,c.y+50);unit.hp=unit.maxHp=this.stats(unit).hp;unit.cooldown=0;this.notify('toast','희귀 보급! 블랙베어 특전병 합류 · 미니건 3명 관통');}
  this.effects.push({kind:'fieldSupply',x:pickup.x,y:pickup.y,reward:kind,t:kind==='special'?2:1.2,max:kind==='special'?2:1.2,team:0});this.notify('change');return true;
 };
 p.beginSupplySupport=function(){
  const state=this.supplyState();if(this.phase!=='playing'||!state.pendingSupport||this.commander(0).hp<=0)return false;
  state.pendingSupport--;this.choiceKind='supply';this.currentOptions=[];this.phase='choice';this.turnChoice=null;this.pendingChoice=null;this.input={x:0,y:0};this.notify('level',[]);return true;
 };
 p.levelCheck=function(){if(this.beginSupplySupport())return;return levelCheck.call(this);};
 p.cancelRecovery=function(){if(this.phase==='choice'&&this.choiceKind==='supply'){this.phase='playing';this.choiceKind='level';this.pendingChoice=null;this.turnChoice=null;this.notify('change');return true;}return cancel.call(this);};
 p.useMedkit=function(){
  const state=this.supplyState();if(this.phase!=='playing'||state.medkits<1||this.commander(0).hp<=0)return false;
  const squad=this.supplySquad();if(!squad.some(u=>u.hp<u.maxHp||this.hasCleansableStatus(u)))return false;
  state.medkits--;for(const u of squad){for(const key of ['poisonUntil','poisonDps','poisonNextAt','rootedUntil','slowUntil','luckyRootUntil','luckySlowUntil','healingReductionUntil'])u[key]=0;u.poisonSource=null;this.heal(u,u.maxHp);this.effects.push({kind:'cleanse',x:u.x,y:u.y,target:u,t:.85,max:.85,team:0});}
  this.notify('toast','힐팩 사용 · 생존 분대 전체 회복 / 상태이상 제거');this.notify('change');return true;
 };
 p.useArtilleryTicket=function(x,y){
  const state=this.supplyState(),c=this.commander(0);if(this.phase!=='playing'||state.artillery<1||c.hp<=0||!Number.isFinite(x)||!Number.isFinite(y)||x<45||y<70||x>this.bounds().width-45||y>this.bounds().height-70||Math.hypot(c.x-x,c.y-y)>config.strikeRange)return false;
  state.artillery--;const damage=config.strikeDamage*(1+.18*(this.commanderLevel(c)-1));
  const points=[[0,0],[-65,-38],[65,38],[-55,55],[55,-55]].map(([dx,dy],i)=>({x:x+dx,y:y+dy,at:this.time+1+i*.14}));
  (this.supplyStrikes??=[]).push({source:c,coopOwner:this.coopOwner||0,damage,points,index:0});this.effects.push({kind:'supplyStrikeWarning',x,y,radius:180,t:1,max:1,team:0});this.notify('toast','지원 포격 요청 · 1초 뒤 5발 착탄');this.notify('change');return true;
 };
 p.updateSupplyStrikes=function(){
  for(const group of this.supplyStrikes||[])while(group.index<group.points.length&&this.time+1e-8>=group.points[group.index].at){
   const point=group.points[group.index++],strike=()=>{
    for(const target of this.combatCandidates()){if(target.hp<=0||!this.canTarget(group.source,target))continue;const d=Math.hypot(target.x-point.x,target.y-point.y);if(d<=config.strikeRadius)this.damage(target,group.damage*(1-.45*d/config.strikeRadius),group.source);}
    this.effects.push({kind:'explosion',...point,radius:config.strikeRadius,t:.65,max:.65,team:0,visualKind:'supportArtillery'});this.notify('explosion',{...point,kind:'artillery',team:0});
   };if(this.coop)this.withOwner(group.coopOwner,strike);else strike();
  }
  this.supplyStrikes=(this.supplyStrikes||[]).filter(g=>g.index<g.points.length);
 };
 p.fireUnitProjectiles=function(u,target,attack,s=this.stats(u)){
  if(u.type!=='commando')return shot.call(this,u,target,attack,s);
  return this.evolutionBullet(u,target,attack,s,'heatPierce');
 };
 p.update=function(dt){if(this.phase==='playing')this.updateSupplyStrikes();return update.call(this,dt);};
 root.FrontFieldSupplies={config};return {config};
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install({FrontGame:root.FrontGame,TYPES:root.FrontTypes});
})(typeof window==='undefined'?globalThis:window);
