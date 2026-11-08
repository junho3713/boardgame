/* Field rewards, personal consumables and timed support. All clocks use simulation time. */
(function(root){'use strict';
function install({FrontGame:Game,TYPES}){
 const p=Game.prototype;if(p.fieldSupplyVersion)return;p.fieldSupplyVersion=1;
 const config={odds:{support:.25,medkit:.20,boost:.15,artillery:.15,special:.10,spectre:.10,titan:.05},cash:400,boostDuration:60,damage:1.3,haste:1.2,strikeRange:900,strikeDamage:320,strikeRadius:120};
 const specialTypes=['commando','spectre','titan'],specialRewards={special:'commando',spectre:'spectre',titan:'titan'},armor={commando:24,spectre:12,titan:44};
 const fresh=()=>({medkits:0,artillery:0,boostUntil:0,pendingSupport:0,collected:0});
 const reset=p.reset,stats=p.stats,capacity=p.capacity,levelCheck=p.levelCheck,cancel=p.cancelRecovery,shot=p.fireUnitProjectiles,update=p.update,refresh=p.refreshCommanderHealth,defense=p.defenseFactor,select=p.selectCombatTarget;
 TYPES.commando={...TYPES.machinegun,name:'블랙베어 특전병',icon:'✦',hp:480,damage:22,rate:.13,range:360,speed:138,r:14,cost:0,role:'희귀 보급 전용 · 중장갑 조끼 · 미니건 3명 관통 · 별도 병력 슬롯'};
 TYPES.spectre={...TYPES.sniper,name:'고스트 특임저격수',icon:'⌖',hp:320,damage:200,rate:1,range:620,speed:128,r:13,cost:0,role:'특수 저격 · 방어력 35% 무시 · 보스·정예 우선 · 3명 관통'};
 TYPES.titan={...TYPES.rocket,name:'타이탄 중장갑 강습병',icon:'⬢',hp:1000,damage:105,rate:.38,range:390,splash:100,speed:100,r:17,cost:0,role:'최상위 특수부대 · 중장갑 · 고속 범위 포탄 · 별도 병력 슬롯'};
 p.isSupplyTroop=function(u){return specialTypes.includes(typeof u==='string'?u:u?.type);};
 p.reset=function(){reset.call(this);this.fieldSupplyState=fresh();this.supplyStrikes=[];this.nextRareSupply=120;};
 p.supplyState=function(){return this.fieldSupplyState??=fresh();};
 p.supplySquad=function(){return this.units.filter(u=>u.team===0&&u.hp>0&&(!this.coop||u.coopOwner===this.coopOwner));};
 p.stats=function(u){const s=stats.call(this,u);if(u.team===0&&this.isSupplyTroop(u)){
  const grow=1+.18*(this.commanderLevel(this.commander(0))-1);s.hp*=grow;s.damage*=grow;s.defense+=armor[u.type];
 }
 if(u.team===0&&this.time<(this.fieldSupplyState?.boostUntil||0)){s.damage*=config.damage;if(u.type!=='medic')s.rate/=config.haste;}return s;};
 p.capacity=function(team=0){return capacity.call(this,team)+(team===0?this.supplySquad().filter(u=>this.isSupplyTroop(u)).length:0);};
 p.refreshCommanderHealth=function(){refresh.call(this);for(const u of this.supplySquad())if(this.isSupplyTroop(u)){const hp=this.stats(u).hp;u.hp=Math.min(hp,Math.max(0,u.hp+hp-u.maxHp));u.maxHp=hp;}};
 p.defenseFactor=function(target,source){const factor=defense.call(this,target,source);return source?.team===0&&source.type==='spectre'?1/(1+(1/factor-1)*.65):factor;};
 p.selectCombatTarget=function(u,candidates,threats,s=this.stats(u)){if(u.team===0&&u.type==='spectre'){const targets=(candidates||this.combatCandidates()).filter(t=>this.canTarget(u,t)&&this.visible(t)&&this.targetDistance(u,t)<s.range&&this.lineClear(u,t,0,{fireTeam:0}));const rank=t=>t.boss?0:t.type==='blizzardMage'?1:t.type==='mortar'?2:(TYPES[t.type]?this.stats(t).defense:18)>=15?3:4;return targets.sort((a,b)=>rank(a)-rank(b)||this.targetDistance(u,a)-this.targetDistance(u,b))[0]||null;}return select.call(this,u,candidates,threats,s);};
 p.rollSupply=function(){const value=this.random();let sum=0;for(const [kind,chance]of Object.entries(config.odds)){sum+=chance;if(value<sum)return kind;}return'titan';};
 p.collectFieldSupply=function(pickup){
  if(!pickup?.active)return false;if(pickup.rareSupply&&this.time>=(pickup.expires||Infinity)){pickup.active=false;return false;}const c=this.commander(0);if(c.hp<=0||Math.hypot(c.x-pickup.x,c.y-pickup.y)>=60)return false;
  this.updateRareSupplySecurity();
  const guards=pickup.rareSupply?this.rareSupplyGuards(pickup):[];if(guards.length){if(this.time>=(pickup.nextHintAt||0)){pickup.nextHintAt=this.time+2;this.notify('toast','희귀 보급 잠김 · 호위 '+guards.length+'기를 먼저 처치하세요');}return false;}
  if(!pickup.rareSupply){pickup.active=false;this.gainXP(18);this.cash[0]+=25;this.awardGold(5);this.notify('toast','보급품 확보 · +25 자원 / +18 XP');this.effects.push({kind:'drop',x:pickup.x,y:pickup.y,t:.6,max:.6,team:0});return true;}
  const state=this.supplyState(),kind=config.odds[pickup.supplyKind]===undefined?this.rollSupply():pickup.supplyKind;
  pickup.active=false;pickup.supplyKind=kind;state.collected++;this.gainXP(18);this.awardGold(5);
  if(kind==='support'){this.cash[0]+=config.cash;state.pendingSupport++;this.notify('toast','희귀 지원 보급 · 전투자원 +400 · 지원창에서 즉시 충원');}
  else if(kind==='medkit'){state.medkits++;this.notify('toast','힐팩 확보 · 전체 회복·상태이상 제거 1회 저장');}
  else if(kind==='boost'){state.boostUntil=this.time+config.boostDuration;this.notify('toast','전투 강화 60초 · 공격력 +30% / 공격속도 +20%');}
  else if(kind==='artillery'){state.artillery++;this.notify('toast','포격 지원권 확보 · 버튼을 누른 뒤 전장에 목표 지정');}
  else{const unit=this.addUnit(0,specialRewards[kind],c.x+45,c.y+50);unit.hp=unit.maxHp=this.stats(unit).hp;unit.cooldown=0;this.notify('toast',(kind==='titan'?'최상위 특수부대! ':'특수부대 합류! ')+TYPES[unit.type].name+' · '+TYPES[unit.type].role);}
  const duration=specialRewards[kind]?2:1.2;this.effects.push({kind:'fieldSupply',x:pickup.x,y:pickup.y,reward:kind,t:duration,max:duration,team:0});this.notify('change');return true;
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
 p.artilleryTarget=function(){const c=this.commander(0),targets=this.combatCandidates().filter(t=>t.hp>0&&!t.hidden&&this.canTarget(c,t)&&this.visible(t)&&Math.hypot(t.x-c.x,t.y-c.y)<=config.strikeRange&&t.x>=45&&t.x<=this.bounds().width-45&&t.y>=70&&t.y<=this.bounds().height-70),density=t=>targets.filter(n=>Math.hypot(t.x-n.x,t.y-n.y)<=180).length;return targets.sort((a,b)=>density(b)-density(a)||Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y)||(a.id||0)-(b.id||0))[0]||null;};
 p.useArtilleryTicket=function(x,y){
  if(x===undefined&&y===undefined){const target=this.artilleryTarget();if(!target)return false;x=target.x;y=target.y;}
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
  if(!this.isSupplyTroop(u))return shot.call(this,u,target,attack,s);
  const shots=this.evolutionBullet(u,target,attack,s,({commando:'heatPierce',spectre:'pierce',titan:'titan'})[u.type]);for(const b of shots)if(u.type!=='commando'){b.kind=u.type==='spectre'?'sniper':'rocket';b.speed=u.type==='spectre'?1800:800;}return shots;
 };
 p.rareSupplyGuards=function(pickup){return this.units.filter(u=>u.hp>0&&pickup.guardIds?.includes(u.id));};
 p.expireRareSupplies=function(){for(const pickup of this.pickups)if(pickup.rareSupply&&this.time>=(pickup.expires||Infinity)){pickup.active=false;for(const u of this.rareSupplyGuards(pickup)){u.hp=0;u.diedAt=this.time;u.rareSupplyWithdrawn=true;}}};
 p.supplyGuardPositions=function(pickup,count){
  const b=this.bounds(),taken=this.rareSupplyGuards(pickup),points=[];
  for(let i=0;i<120&&points.length<count;i++){const a=i*2.39996,r=110+i%3*35,q={x:pickup.x+Math.cos(a)*r,y:pickup.y+Math.sin(a)*r};if(q.x>55&&q.x<b.width-55&&q.y>75&&q.y<b.height-75&&this.freePosition(q.x,q.y,26)&&![...taken,...points].some(p=>Math.hypot(p.x-q.x,p.y-q.y)<57))points.push(q);}return points;
 };
 p.addSupplyGuards=function(pickup,types,positions){for(const [i,q]of positions.entries()){const u=this.addUnit(2,types[i%types.length],q.x,q.y,true);Object.assign(u,{rareSupplyGuard:true,supplyAnchorX:pickup.x,supplyAnchorY:pickup.y,homeX:u.x,homeY:u.y});this.stampEvolutionWave?.(u);pickup.guardIds.push(u.id);}};
 p.upgradeRareSupplyGuards=function(){for(const pickup of this.pickups){if(!pickup.active||!pickup.rareSupply||pickup.guardVersion===2||!Array.isArray(pickup.guardIds)||!pickup.guardIds.length)continue;
  const count=Math.max(0,8-pickup.guardIds.length),points=this.supplyGuardPositions(pickup,count);if(points.length<count)continue;this.addSupplyGuards(pickup,this.time<360?['bayonet','rifle','machinegun']:['bladeGuard','machinegun','mortar','sniper'],points);for(const u of this.rareSupplyGuards(pickup)){u.supplyAnchorX=pickup.x;u.supplyAnchorY=pickup.y;}pickup.guardVersion=2;
 }};
 p.updateRareSupplySecurity=function(){
  if(this.phase!=='playing')return;this.upgradeRareSupplyGuards();
  for(const pickup of this.pickups){if(!pickup.active||!pickup.rareSupply||!pickup.ambushPending)continue;
   const c=this.units.find(u=>u.team===0&&u.type==='leader'&&u.hp>0&&Math.hypot(u.x-pickup.x,u.y-pickup.y)<360);if(!c)continue;
   const bounds=this.bounds(),positions=[];
   for(let i=0;i<48&&positions.length<4;i++){const a=Math.atan2(c.y-pickup.y,c.x-pickup.x)+Math.PI/2+(i%4)*Math.PI/2+Math.floor(i/4)*.17,r=205+Math.floor(i/16)*30,q={x:pickup.x+Math.cos(a)*r,y:pickup.y+Math.sin(a)*r};if(q.x>50&&q.y>70&&q.x<bounds.width-50&&q.y<bounds.height-70&&this.freePosition(q.x,q.y,26)&&!positions.some(p=>Math.hypot(p.x-q.x,p.y-q.y)<100))positions.push(q);}
   if(positions.length<4)continue;pickup.ambushPending=false;
   for(const [i,q]of positions.entries()){const type=(this.time<360?['bayonet','rifle','bayonet','machinegun']:['bladeGuard','machinegun','bayonet','rifle'])[i],u=this.addUnit(2,type,q.x,q.y,true);u.rareSupplyGuard=true;u.supplyAnchorX=pickup.x;u.supplyAnchorY=pickup.y;u.cooldown=Math.max(.8,u.cooldown);u.homeX=u.x;u.homeY=u.y;this.stampEvolutionWave?.(u);pickup.guardIds.push(u.id);this.effects.push({kind:'drop',x:u.x,y:u.y,t:.8,max:.8,team:2});}
   this.notify('toast','희귀 보급 경계 발동 · 주변 경계병 4기 합류');
  }
 };
 p.updateRareSupplies=function(){
  if(this.phase!=='playing'||this.mode!=='pve')return;if(!Number.isFinite(this.nextRareSupply))this.nextRareSupply=(Math.floor(this.time/120)+1)*120;
  if(this.time+1e-8<this.nextRareSupply)return;this.nextRareSupply=(Math.floor((this.time+1e-8)/120)+1)*120;
  this.expireRareSupplies();
  this.pickups=this.pickups.filter(p=>!p.rareSupply||p.active&&this.time<(p.expires||Infinity));
  const leaders=this.units.filter(u=>u.team===0&&u.type==='leader'&&u.hp>0);if(!leaders.length)return;
  const c=leaders[Math.floor(this.time/120-1)%leaders.length],bounds=this.bounds();let point=null;
  for(let i=0;i<36;i++){const a=-Math.PI/2+((i%12)-5.5)*.22,r=700+(i%3)*75,candidate={x:Math.max(65,Math.min(bounds.width-65,c.x+Math.cos(a)*r)),y:Math.max(this.frontline()+100,Math.min(bounds.height-100,c.y+Math.sin(a)*r))};if(Math.hypot(candidate.x-c.x,candidate.y-c.y)>=550&&this.freePosition(candidate.x,candidate.y,26)&&!this.pickups.some(p=>p.active&&Math.hypot(p.x-candidate.x,p.y-candidate.y)<90)){point=candidate;break;}}
  if(!point){this.nextRareSupply=this.time+5;return;}
  const guardTypes=this.time<360?['bayonet','bayonet','bayonet','bayonet','bayonet','rifle','rifle','machinegun']:this.time<720?['bladeGuard','bladeGuard','bayonet','bayonet','machinegun','machinegun','mortar','sniper']:['stagBeetle','bladeGuard','bladeGuard','machinegun','machinegun','mortar','mortar','sniper'];
  const pickup={...point,active:true,rareSupply:true,spawnedAt:this.time,expires:this.time+120,ambushPending:true,guardVersion:2,guardIds:[]},positions=this.supplyGuardPositions(pickup,8);
  if(positions.length<8){this.nextRareSupply=this.time+5;return;}
  this.addSupplyGuards(pickup,guardTypes,positions);
  this.pickups.push(pickup);this.notify('toast','희귀 보급 도착 · 보급 옆 호위 8기 · 접근 시 4기 추가 출동 · 보라색 신호를 확인하세요');this.effects.push({kind:'fieldSupply',...point,reward:'airdrop',t:1.2,max:1.2,team:0});
 };
 p.update=function(dt){if(this.phase==='playing'){this.updateSupplyStrikes();this.expireRareSupplies();this.updateRareSupplySecurity();}const result=update.call(this,dt);this.updateRareSupplies();return result;};
 root.FrontFieldSupplies={config,specialTypes};return {config,specialTypes};
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install({FrontGame:root.FrontGame,TYPES:root.FrontTypes});
})(typeof window==='undefined'?globalThis:window);
