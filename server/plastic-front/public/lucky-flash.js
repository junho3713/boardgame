/* Retona's flash roulette replaces new allied mine throws. Placed mines retain their old behavior. */
(function(root){
'use strict';

const rules={range:350,radius:125,flight:.45,duration:2,search:520,bombTrigger:65,bombWindup:.9};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const windups=[
 'sniperAim','bombFuse','acidWindup','bayonetAttack','bikeAttack','bossAction','bossBarrage',
 'blizzardCast','butterflyCast','laserAttack','swordAttack','swordPose','tankReadyAimAt','tankAimTargetId'
];
const warnings=new Set(['bossSlashWarn','bossDiveWarn','bossBarrageWarn','butterflyWarn','bayonetWarn']);

function install({FrontGame,TYPES}){
 const p=FrontGame.prototype,reset=p.reset;
 p.reset=function(...args){
  const result=reset.apply(this,args);
  this.luckyFlashes=[];
  return result;
 };
 p.luckyFlashActive=function(u){return u.hp>0&&this.time<(u.luckyFlash?.until||0);};
 p.luckyFlashConfused=function(u){return this.time<(u.luckyFlash?.confusedUntil||0);};

 function eligible(game,u){
  return u.team!==0&&u.hp>0&&!u.hidden&&(!u.fixedGuard||game.mission.stage>=(u.activeStage||2))&&
   (!u.roadCaptain||game.mission.stage>=u.roadStage)&&!game.bossInvulnerable(u);
 }
 p.castLuckyFlash=function(u){
  const point=this.luckyCluster(u,rules.range,rules.radius)||this.luckyGlueTarget(u);
  if(!point)return null;
  const evolved=this.evolutionEnabled(u);
  const flight={
   x:point.x,y:point.y,fromX:u.x,fromY:u.y,startedAt:this.time,landAt:this.time+rules.flight,
   source:u,rouletteChannel:u.activeLuckyChannel??0,radius:rules.radius,evolved
  };
  (this.luckyFlashes??=[]).push(flight);
  if(u.x!==point.x||u.y!==point.y)u.face=Math.atan2(point.y-u.y,point.x-u.x);
  return flight;
 };

 function interrupt(game,u){
  const diving=u.bossPattern==='venomDive'&&u.bossAction;
  for(const key of windups)u[key]=null;
  if(diving)u.visualFlightHeight=game.bossFlightHeight(u)??TYPES[u.type].flightHeight;
  u.flightStrikeUntil=u.castUntil=0;
  u.route=u.routeGoal=null;
  for(const e of game.effects){
   if(warnings.has(e.kind)&&(e.source===u||!e.source&&e.team===u.team&&distance(e,u)<1))e.t=0;
  }
  if(u.swords?.blades){
   for(const blade of u.swords.blades)blade.action=null;
   u.swords.nextAttackAt=Math.max(u.swords.nextAttackAt||0,game.time+rules.duration+.4);
  }
  if(u.type==='artillery'){
   const before=game.barrages.length;
   game.barrages=game.barrages.filter(b=>b.source!==u);
   game.crisis.canceled=(game.crisis.canceled||0)+before-game.barrages.length;
  }
 }
 p.applyLuckyFlash=function(u,flash){
  if(!eligible(this,u))return false;
  const prior=u.luckyFlash,stillConfused=this.luckyFlashConfused(u);
  const until=this.time+rules.duration,confusedUntil=flash.evolved?until:stillConfused?prior.confusedUntil:0;
  interrupt(this,u);
  u.luckyFlash={until,confusedUntil,confused:confusedUntil>this.time,source:flash.evolved||!stillConfused?flash.source:prior.source};
  if(flash.evolved)u.cooldown=Math.min(u.cooldown||0,.2);
  return true;
 };
 p.updateLuckyFlashes=function(){
  const waiting=[];
  for(const flash of this.luckyFlashes||[]){
   if(flash.landAt>this.time+1e-8){waiting.push(flash);continue;}
   this.effects.push({kind:'luckyFlashBurst',x:flash.x,y:flash.y,radius:flash.radius,evolved:flash.evolved,t:.7,max:.7,team:0});
   for(const u of this.units){
    if(distance(u,flash)>flash.radius||!eligible(this,u)||!this.lineClear(flash,u,0,{fireTeam:0}))continue;
    this.applyLuckyFlash(u,flash);
   }
  }
  this.luckyFlashes=waiting;
 };

 function creditedSource(u){
  const owner=u.luckyFlash.source?.coopOwner;
  // Use the borrowed unit's attack type and the Retona squad's damage credit.
  return {type:u.type==='swordEmpress'?'luckyFlash':u.type,hp:0,team:0,x:u.x,y:u.y,flashRedirect:true,...(Number.isInteger(owner)?{coopOwner:owner}:{})};
 }
 function targetFor(game,u,range,minRange){
  let close=null,closeDistance=Infinity,reachable=null,reachableDistance=Infinity;
  for(const enemy of game.units){
   if(enemy===u||!eligible(game,enemy))continue;
   const gap=game.targetDistance(u,enemy);
   if(gap<closeDistance&&gap<=Math.max(rules.search,range)){
    close=enemy;closeDistance=gap;
   }
   if(gap>=minRange&&gap<=range&&gap<reachableDistance&&game.lineClear(u,enemy,0,{fireTeam:u.team})){
    reachable=enemy;reachableDistance=gap;
   }
  }
  return {close,reachable};
 }
 function redirectedShell(game,u,target,s){
  const artillery=u.type==='artillery';
  const delay=artillery ? .55 : 2;
  game.mortarShells.push({
   x:target.x,y:target.y,fromX:u.x,fromY:u.y,radius:artillery?100:s.splash||76,
   landAt:game.time+delay,delay,source:creditedSource(u),team:0,damage:artillery?75:s.damage,
   kind:'flashMortar',damageType:'mortar',critical:false
  });
 }
 function redirectedAttack(game,u,target,s){
  u.cooldown=u.type==='artillery'?8.5:s.rate;
  u.recoil=.2;
  game.notify('fire',u);
  if(u.type==='mortar'||u.type==='artillery'){redirectedShell(game,u,target,s);return;}
  if(s.range<=95||TYPES[u.type]?.stab||TYPES[u.type]?.charge){
   game.damage(target,s.damage,creditedSource(u));
   return;
  }
  const shots=game.fireUnitProjectiles(u,target,{damage:s.damage,critical:false},s);
  for(const shot of shots){shot.source=creditedSource(u);shot.team=0;}
  game.effects.push({kind:'muzzle',x:u.x,y:u.y,origin:true,t:.12,max:.12,team:u.team,weapon:u.type,angle:u.face});
 }
 p.updateLuckyFlashEnemy=function(u,dt){
  if(!u.luckyFlash)return false;
  if(!this.luckyFlashActive(u)){
   if(u.bombFuse?.redirected)u.bombFuse=null;
   u.luckyFlash=null;return false;
  }

  u.flash=Math.max(0,(u.flash||0)-dt);
  u.recoil=Math.max(0,(u.recoil||0)-dt);
  u.cooldown=(u.cooldown||0)-dt;
  u.luckyFlash.confused=this.luckyFlashConfused(u);
  if(!u.luckyFlash.confused){
   if(u.bombFuse?.redirected)u.bombFuse=null;
   return true;
  }
  if(this.time<(u.toyStunUntil||0)||this.time<(u.groggyUntil||0))return true;
  if(u.type==='bombBug'&&u.bombFuse?.redirected){
   if(this.time+1e-8>=u.bombFuse.explodeAt){
    const source=creditedSource(u);
    this.damage(u,u.hp/this.defenseFactor(u,source)+1,source);
   }
   return true;
  }

  const s=this.stats(u);
  const range=u.type==='bombBug'?rules.bombTrigger:u.type==='artillery'?rules.search:s.range;
  const {close,reachable}=targetFor(this,u,range,s.minRange||0);
  if(reachable){
   u.face=u.aimFace=Math.atan2(reachable.y-u.y,reachable.x-u.x);
   if(u.type==='tank'||u.type==='crimsonAce'||u.type==='guntruck')u.turretFace=u.face;
   if(u.type==='bombBug'){
    u.bombFuse={startedAt:this.time,explodeAt:this.time+rules.bombWindup,redirected:true};
    u.route=u.routeGoal=null;
   }else if(u.cooldown<=0&&(u.type==='artillery'||s.damage>0))redirectedAttack(this,u,reachable,s);
  }else if(close&&s.speed>0)this.navigate(u,close.x,close.y,dt,s.speed);
  return true;
 };

 root.FrontLuckyFlash={rules};return root.FrontLuckyFlash;
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;
else install({FrontGame:root.FrontGame,TYPES:root.FrontTypes});
})(typeof window==='undefined'?globalThis:window);
