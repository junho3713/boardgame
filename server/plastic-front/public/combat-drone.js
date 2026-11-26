/* Flight, weapons and ownership-safe docking for the allied drones. */
(function(root){'use strict';
const support='drone',combat='combatDrone',multi='multiDrone';
const pair=[support,combat],discount=110,burstGap=.075,missilePeriod=3.5;
const other=type=>type===support?combat:support;
const rank=u=>u.star||1;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const sameOwner=(game,u)=>!game.coop||u.coopOwner===game.coopOwner;
const guideText='두 드론을 해금하면 슬롯 1칸을 돌려받습니다. 통합 슬롯에서 각각 110G로 교대 소환하며, 같은 성급의 짝은 자동 도킹합니다.';
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
  const tech=this.tech[0],level=Math.max(tech[support],tech[combat],tech[multi]||0);
  tech[support]=tech[combat]=tech[multi]=level;
  const slots=this.summonSlots;
  const first=slots.findIndex(type=>type===multi||pair.includes(type));
  if(first<0)return;
  this.summonSlots=slots.flatMap((type,index)=>index===first?[multi]:pair.includes(type)||type===multi?[]:[type]);
 };
 p.droneSummonStatus=function(live,pending){
  const owned=live.filter(u=>pair.includes(u.type)&&rank(u)===1);
  const total=type=>owned.filter(u=>u.type===type).length+pending.filter(u=>u.type===type&&rank(u)===1).length;
  const difference=total(support)-total(combat);
  const type=difference>0?combat:difference<0?support:this.droneNextType??support;
  const partner=difference?owned.filter(u=>u.type===other(type))[total(type)]:null;
  return {type,partner,waiting:difference!==0};
 };
 p.dockDronePair=function(a,b){
  if(!this.droneDockingActive()||!a||!b||a.hp<=0||b.hp<=0||!sameOwner(this,a)||!sameOwner(this,b)||
   a.type!==support||b.type!==combat||rank(a)!==rank(b))return null;
  const ratio=(a.hp+b.hp)/Math.max(1,a.maxHp+b.maxHp);
  const from=[{x:a.x,y:a.y},{x:b.x,y:b.y}];
  a.x=(a.x+b.x)/2;a.y=(a.y+b.y)/2;
  a.type=multi;a.maxHp=this.stats(a).hp;a.hp=Math.min(a.maxHp,a.maxHp*ratio);
  a.cooldown=Math.max(a.cooldown||0,b.cooldown||0);a.nextDroneMissileAt=b.nextDroneMissileAt;
  a.droneDockAt=this.time;
  b.hp=0;b.merged=true;
  this.effects.push({kind:'droneDock',from,x:a.x,y:a.y,t:.46,max:.46,team:0});
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
  targets.sort((a,b)=>(integrated?Number(!!this.supportScanAt(b,u.coopOwner??0))-Number(!!this.supportScanAt(a,u.coopOwner??0)):0)||distance(u,a)-distance(u,b)||a.id-b.id);
  const target=targets[0],now=this.time;
  if(!integrated){
   const angle=this.formationFacing+Math.sin(now*1.25+u.id)*.85;
   const goal={x:leader.x+Math.cos(angle)*88,y:leader.y+Math.sin(angle)*88};
   if(distance(u,goal)>10)this.move(u,goal.x-u.x,goal.y-u.y,dt,s.speed);
  }
  if(!target){u.droneBurst=null;return;}
  u.aimFace=Math.atan2(target.y-u.y,target.x-u.x);
  const fire=(victim,kind,spread=0)=>{
   const angle=Math.atan2(victim.y-u.y,victim.x-u.x),attack=this.attackRoll(u);
   this.shots.push({x:u.x+Math.cos(angle)*19-Math.sin(angle)*spread,
    y:u.y+Math.sin(angle)*19+Math.cos(angle)*spread,target:victim,source:u,team:0,kind,
    damage:attack.damage,critical:attack.critical,speed:kind==='droneMissile'?540:1050,life:2,splash:0});
   u.droneFlashAt=now;
  };
  if(!u.droneBurst&&u.cooldown<=0){
   u.droneBurst={remaining:evolved?3:2,nextAt:now,targetId:target.id};
   u.cooldown=s.rate;
  }
  if(u.droneBurst&&now+1e-8>=u.droneBurst.nextAt){
   const burst=u.droneBurst;
   fire(targets.find(t=>t.id===burst.targetId)||target,'dronePulse');
   if(--burst.remaining===0)u.droneBurst=null;
   else burst.nextAt+=burstGap;
  }
  if(evolved){
   u.nextDroneMissileAt??=now+missilePeriod;
   if(now+1e-8>=u.nextDroneMissileAt){
    u.nextDroneMissileAt=now+missilePeriod;
    fire(target,'droneMissile',-3.4);fire(targets[1]||target,'droneMissile',3.4);
   }
  }
 };
}
const api={support,combat,multi,pair,discount,guideText};
if(typeof module!=='undefined'&&module.exports)module.exports=Object.assign(install,api);
else{install({FrontGame:root.FrontGame});root.FrontCombatDrone=api;}
})(typeof window==='undefined'?globalThis:window);
