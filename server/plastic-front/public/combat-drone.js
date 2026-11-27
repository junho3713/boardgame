/* Flight, weapons and ownership-safe docking for the allied drones. */
(function(root){'use strict';
const support='drone',combat='combatDrone',multi='multiDrone';
const pair=[support,combat],discount=110,burstGap=.075,missilePeriod=5,rocketRadius=52;
const other=type=>type===support?combat:support;
const rank=u=>u.star||1;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const sameOwner=(game,u)=>!game.coop||u.coopOwner===game.coopOwner;
const guideText='소환 슬롯 6칸이 차도 드론 한 종류를 해금했다면 짝 드론 해금 카드가 나올 수 있습니다. 두 드론은 기존 드론 슬롯 하나를 함께 씁니다. 통합 슬롯에서 각각 110G로 교대 소환하며, 같은 성급의 짝은 자동 도킹합니다. 지원·전투 레벨은 따로 올리며, 두 병과와 경험치 획득량·공격속도가 모두 Lv.5면 완전 진화합니다.';
function install({FrontGame}){
 const p=FrontGame.prototype;
 p.droneDockingActive=function(){
  return this.usesSummoning?.()&&this.tech[0][support]>0&&this.tech[0][combat]>0;
 };
 p.dronePartnerSlot=function(type){
  if(!pair.includes(type)||this.tech[0][type]>0||!this.usesSummoning?.())return null;
  const index=this.summonSlots.indexOf(other(type));
  return index>=0?index+1:null;
 };
 p.syncDroneDocking=function(){
  if(!this.droneDockingActive())return;
  const tech=this.tech[0];
  tech[multi]=Math.min(tech[support],tech[combat]);
  if(tech[multi]<5||!(this.abilities.xpGain>=5&&this.abilities.haste>=5))this.evolved[multi]=false;
  const slots=this.summonSlots;
  const first=slots.findIndex(type=>type===multi||pair.includes(type));
  if(first<0)return;
  this.summonSlots=slots.flatMap((type,index)=>index===first?[multi]:pair.includes(type)||type===multi?[]:[type]);
 };
 p.droneSummonStatus=function(live,pending){
  const owned=live.filter(u=>pair.includes(u.type)&&rank(u)===1&&!u.summonEvolved);
  const total=type=>owned.filter(u=>u.type===type).length+pending.filter(u=>u.type===type&&rank(u)===1&&!u.summonEvolved).length;
  const supportCount=total(support),combatCount=total(combat),difference=supportCount-combatCount;
  const type=difference>0?combat:difference<0?support:this.droneNextType??support;
  const partner=difference?owned.filter(u=>u.type===other(type))[total(type)]:null;
  return {type,partner,waiting:difference!==0,needed:Math.min(supportCount,combatCount)+1};
 };
 p.dockDronePair=function(a,b){
  if(!this.droneDockingActive()||!a||!b||a.hp<=0||b.hp<=0||!sameOwner(this,a)||!sameOwner(this,b)||
   a.type!==support||b.type!==combat||rank(a)!==rank(b))return null;
  if(this.starExperiment&&this.recruitmentRemaining(multi)<(rank(a)===2?3:1))return null;
  const ratio=(a.hp+b.hp)/Math.max(1,a.maxHp+b.maxHp);
  const from=[{x:a.x,y:a.y},{x:b.x,y:b.y}];
  a.x=(a.x+b.x)/2;a.y=(a.y+b.y)/2;
  a.type=multi;delete a.mercenaryLevel;delete a.droneScan;a.maxHp=this.stats(a).hp;a.hp=Math.min(a.maxHp,a.maxHp*ratio);
  a.cooldown=Math.max(a.cooldown||0,b.cooldown||0);a.nextDroneMissileAt=b.nextDroneMissileAt;a.nextDroneLaserAt=b.nextDroneLaserAt;
  a.droneDockAt=this.time;
  b.hp=0;b.merged=true;
  this.effects.push({kind:'droneDock',from,face:b.aimFace??b.face??0,star:rank(a),x:a.x,y:a.y,t:.46,max:.46,team:0});
  this.notify('toast','전술 멀티드론 · '+'★'.repeat(rank(a))+' 도킹 합체');
  return a;
 };
 p.dockDrones=function(){
  if(!this.droneDockingActive())return;
  const drones=this.units.filter(u=>u.team===0&&u.hp>0&&!u.patrol&&sameOwner(this,u)&&pair.includes(u.type));
  for(const star of [1,2]){
   const candidates=drones.filter(u=>rank(u)===star&&!u.summonEvolved);
   const a=candidates.filter(u=>u.type===support),b=candidates.filter(u=>u.type===combat);
   for(let i=0;i<Math.min(a.length,b.length);i++)this.dockDronePair(a[i],b[i]);
  }
 };
 p.updateCombatDrone=function(u,leader,dt,s,contacts){
  if(leader?.hp<=0||leader?.type!=='leader'||this.isDroneStealthed(u)){
   u.droneBurst=null;return;
  }
  const integrated=u.type===multi,evolved=this.evolutionEnabled(u),targets=contacts.filter(t=>
   t.team!==0&&t.hp>0&&!t.hidden&&distance(u,t)<=s.range&&this.canTarget(u,t)&&this.visible(t)&&
   this.lineClear(u,t,0,{fireTeam:u.team}));
  const marked=new Set(integrated?targets.filter(t=>this.supportScanAt(t,u.coopOwner??0)):[]);
  targets.sort((a,b)=>(Number(marked.has(b))-Number(marked.has(a)))||distance(u,a)-distance(u,b)||a.id-b.id);
  const target=targets[0],now=this.time;
  if(!integrated){
   const angle=this.formationFacing+Math.sin(now*1.25+u.id)*.85;
   const goal={x:leader.x+Math.cos(angle)*88,y:leader.y+Math.sin(angle)*88};
   if(distance(u,goal)>10)this.move(u,goal.x-u.x,goal.y-u.y,dt,s.speed);
  }
  if(!target){u.droneBurst=null;u.droneLockId=null;return;}
  u.aimFace=Math.atan2(target.y-u.y,target.x-u.x);
  const fire=(victim,kind,spread=0,splash=0)=>{
   const angle=Math.atan2(victim.y-u.y,victim.x-u.x),attack=this.attackRoll(u);
   const muzzle=integrated?16:12;
   this.shots.push({x:u.x+Math.cos(angle)*muzzle-Math.sin(angle)*spread,
    y:u.y+Math.sin(angle)*muzzle+Math.cos(angle)*spread,target:victim,source:u,team:0,kind,
    damage:attack.damage*(kind==='droneMissile'?2.6:1),critical:attack.critical,speed:kind==='droneMissile'?540:1050,life:2,splash});
   u.droneFlashAt=now;
  };
  if(!u.droneBurst&&u.cooldown<=0){
   u.droneBurst={remaining:evolved?3:2,nextAt:now,targetId:target.id};
   u.cooldown=s.rate;
  }
  if(u.droneBurst&&now+1e-8>=u.droneBurst.nextAt){
   const burst=u.droneBurst;
   fire(targets.find(t=>t.id===burst.targetId)||target,'dronePulse',burst.remaining%2?2:-2);
   if(--burst.remaining===0)u.droneBurst=null;
   else burst.nextAt+=burstGap;
  }
  u.nextDroneMissileAt??=(u.spawnedAt??now)+missilePeriod;
  if(now+1e-8>=u.nextDroneMissileAt){
   const radius=rocketRadius*(s.range/360)*(evolved?(integrated?1.25:1.20):1);
   // Dense packs win. Equal groups retain the pulse gun's scan/distance priority.
   const clusters=targets.map(t=>({t,count:targets.filter(v=>distance(t,v)<=radius).length}));
   clusters.sort((a,b)=>b.count-a.count);
   const group=clusters.filter(entry=>entry.count===clusters[0].count);
   for(let i=0;i<(evolved?4:2);i++){
    fire(group[i%group.length].t,'droneMissile',(i%2?1:-1)*(3+i),radius);
   }
   u.nextDroneMissileAt=now+missilePeriod;
  }
  const period=evolved?(integrated?4.5:5):7;
  u.nextDroneLaserAt??=(u.spawnedAt??now)+period;
  if(now+.24>=u.nextDroneLaserAt){
   const priority=t=>this.droneThreatRank(t);
   const lock=targets.reduce((best,t)=>priority(t)>priority(best)||
    priority(t)===priority(best)&&(t.maxHp||t.hp)>(best.maxHp||best.hp)?t:best,target);
   if(u.droneLockId!==lock.id){
    u.droneLockId=lock.id;
    const duration=Math.max(.04,u.nextDroneLaserAt-now);
    this.effects.push({kind:'droneLock',x:u.x,y:u.y,tx:lock.x,ty:lock.y-(lock.visualFlightHeight||0)-10,t:duration,max:duration,team:0});
   }
   if(now+1e-8<u.nextDroneLaserAt)return;
   u.droneLockId=null;
   const angle=Math.atan2(lock.y-u.y,lock.x-u.x),dx=Math.cos(angle),dy=Math.sin(angle);
   const reach=s.range,damage=this.attackRoll(u).damage*6.5;
   u.aimFace=angle;
   this.effects.push({kind:'droneLaser',x:u.x,y:u.y,tx:u.x+dx*reach,ty:u.y+dy*reach,
    lockX:lock.x,lockY:lock.y,lockHeight:lock.visualFlightHeight||0,t:.32,max:.32,team:0});
   for(const t of targets){
    const x=t.x-u.x,y=t.y-u.y,along=x*dx+y*dy;
    if(t.hp<=0||along<0||along>reach||Math.abs(x*dy-y*dx)>Math.max(6,this.collisionRadius(t)))continue;
    const bonus=evolved&&priority(t)>0?(integrated?1.35:1.25):1;
    this.damage(t,damage*bonus/this.defenseFactor(t,u),u);
   }
   u.nextDroneLaserAt=now+period;
  }
 };
}
const api={support,combat,multi,pair,discount,guideText};
if(typeof module!=='undefined'&&module.exports)module.exports=Object.assign(install,api);
else{install({FrontGame:root.FrontGame});root.FrontCombatDrone=api;}
})(typeof window==='undefined'?globalThis:window);
