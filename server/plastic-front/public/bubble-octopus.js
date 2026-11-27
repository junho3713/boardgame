/* Rear-line bath toy. A bubble has one owner and the same armour-adjusted HP units as its host. */
(function(root){
'use strict';

const rules=Object.freeze({
 shieldPeriod:7, shieldRadius:180, shieldLimit:6, shieldFraction:.35,
 foamPeriod:4.5, windup:.4, speed:240, travel:445, shotRadius:11, splashRadius:69, push:106,
 near:220, far:300, station:264, guardLeash:240
});
const specials=new Set(['pirateCannon','rhinoBeetle','stagBeetle','bruteBeetle','blizzardMage','acidBeetle','bombBug','butterfly','crimsonAce','swordEmpress','bayonetCaptain']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const heading=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const special=u=>u.boss||u.roadCaptain||u.finalBoss||specials.has(u.type);

function activeEnemy(game,u){
 return u.team!==0&&u.hp>0&&!u.hidden&&(!u.fixedGuard||game.mission.stage>=(u.activeStage||2))&&
  (!u.roadCaptain||game.mission.stage>=u.roadStage)&&!game.bossInvulnerable(u);
}
function pop(game,u){
 delete u.bubbleShield;
 game.effects.push({kind:'bubbleShieldPop',x:u.x,y:u.y,team:u.team,at:game.time,
  radius:game.collisionRadius(u)+6,t:.42,max:.42});
}
function castShield(game,u){
 const targets=game.units.filter(t=>t!==u&&activeEnemy(game,t)&&distance(u,t)<=rules.shieldRadius&&
  (!t.bubbleShield||t.bubbleShield.sourceId===u.id&&t.bubbleShield.hp<t.maxHp*rules.shieldFraction));
 targets.sort((a,b)=>Number(!!special(b))-Number(!!special(a))||distance(u,a)-distance(u,b)||a.id-b.id);
 for(const t of targets.slice(0,rules.shieldLimit)){
  const hp=t.maxHp*rules.shieldFraction;
  t.bubbleShield={sourceId:u.id,hp,maxHp:hp,at:game.time};
 }
 if(targets.length)u.bubbleInflatedAt=game.time;
 u.nextBubbleShieldAt=game.time+(targets.length?rules.shieldPeriod:.5);
}
function stationGoal(game,u,leader,range){
 const outward=heading(leader,u);
 let angle=outward;
 if(range>=rules.near&&range<=rules.far){
  // Patrol the same flank as a nearby front-liner and stay behind it.
  let cover=null,nearest=rules.shieldRadius;
  for(const other of game.units){
   if(other===u||other.type==='bubbleOctopus'||!activeEnemy(game,other)||distance(leader,other)>=rules.station-24)continue;
   const gap=distance(u,other);
   if(gap<nearest){nearest=gap;cover=other;}
  }
  angle=cover?heading(leader,cover)+.12*Math.sin(game.time*.85+u.id):outward+(u.id%2?1:-1)*.27;
 }
 const goal={x:leader.x+Math.cos(angle)*rules.station,y:leader.y+Math.sin(angle)*rules.station};
 if(u.rareSupplyGuard){
  const anchor={x:u.supplyAnchorX??u.homeX,y:u.supplyAnchorY??u.homeY},d=distance(anchor,goal);
  if(d>rules.guardLeash){
   goal.x=anchor.x+(goal.x-anchor.x)*rules.guardLeash/d;
   goal.y=anchor.y+(goal.y-anchor.y)*rules.guardLeash/d;
  }
 }
 return goal;
}
function vulnerable(game,t){
 return t.team===0&&t.hp>0&&!t.hidden&&t.type!=='toyDecoy'&&!game.isFlying(t)&&
  !game.commanderReviveProtected(t)&&!(game.coop&&game.time<game.coopInvulnerable[t.coopOwner]);
}
function impact(game,shot,allies){
 for(const t of allies){
  if(!vulnerable(game,t)||distance(t,shot)>rules.splashRadius+game.collisionRadius(t)-5||
    !game.lineClear(shot,t,0,{fireTeam:shot.team}))continue;
  game.damage(t,shot.damage,shot.source);
  if(t.hp<=0||game.isStationary(t))continue;
  const duration=.29,travel=rules.push;
  // Existing knockback steps the movement against solid cover and arena edges.
  t.toyKnockback={dx:Math.cos(shot.angle)*travel,dy:Math.sin(shot.angle)*travel,applied:0,
   startedAt:game.time,until:game.time+duration,recoverUntil:game.time+duration,popHeight:8,popPeak:.45};
  t.route=t.routeGoal=null;
 }
 game.effects.push({kind:'bubbleFoamImpact',x:shot.x,y:shot.y,angle:shot.angle,
  radius:rules.splashRadius,team:shot.team,at:game.time,t:.45,max:.45});
}
function advanceShot(game,shot,dt,allies){
 const dx=Math.cos(shot.angle),dy=Math.sin(shot.angle);
 let travel=Math.min(shot.remaining,rules.speed*dt),hit=false;
 for(const t of allies){
  if(!vulnerable(game,t))continue;
  const x=t.x-shot.x,y=t.y-shot.y,along=x*dx+y*dy,side=x*dy-y*dx;
  const radius=rules.shotRadius+game.collisionRadius(t)-5;
  if(Math.abs(side)>radius||along+radius<0||along-radius>travel)continue;
  const half=Math.sqrt(Math.max(0,radius*radius-side*side)),entry=Math.max(0,along-half);
  if(along+half>=0&&entry<=travel){travel=entry;hit=true;}
 }
 const end={x:shot.x+dx*travel,y:shot.y+dy*travel};
 if(!game.lineClear(shot,end,0,{fireTeam:shot.team}))return false;
 shot.x=end.x;shot.y=end.y;shot.remaining-=travel;
 if(hit)impact(game,shot,allies);
 return !hit&&shot.remaining>.01;
}

function install({FrontGame}){
 const p=FrontGame.prototype;
 p.releaseOctopusShields=function(source){
  for(const t of this.units)if(t.bubbleShield?.sourceId===source.id)pop(this,t);
  source.foamWindup=null;
 };
 p.absorbShieldDamage=function(shield,damage,scale=1){
  const absorbed=Math.min(shield.hp,damage*scale);
  shield.hp-=absorbed;
  return Math.max(0,damage-absorbed/scale);
 };
 p.absorbBubbleDamage=function(t,damage,scale=1){
  const shield=t.bubbleShield,remainder=this.absorbShieldDamage(shield,damage,scale);
  if(shield.hp<=1e-8)pop(this,t);
  return remainder;
 };
 p.updateBubbleOctopus=function(u,dt,s){
  if(this.time+1e-8>=(u.nextBubbleShieldAt??0))castShield(this,u);
  if(u.foamWindup){
   const fuse=u.foamWindup;
   u.face=u.aimFace=fuse.angle;
   if(this.time+1e-8<fuse.fireAt)return;
   u.foamWindup=null;
   const mouth={x:u.x+Math.cos(fuse.angle)*23,y:u.y+Math.sin(fuse.angle)*12.2};
   this.foamShots.push({...mouth,
    angle:fuse.angle,source:u,team:u.team,damage:s.damage,remaining:rules.travel,startedAt:this.time});
   return;
  }
  let leader=null,range=Infinity;
  for(const t of this.units){
   if(t.team!==0||t.type!=='leader'||t.hp<=0)continue;
   const d=distance(u,t);
   if(d<range){range=d;leader=t;}
  }
  if(!leader)return;
  if(u.rareSupplyGuard&&distance(leader,{x:u.supplyAnchorX??u.homeX,y:u.supplyAnchorY??u.homeY})>380){
   if(distance(u,{x:u.homeX,y:u.homeY})>8)this.navigate(u,u.homeX,u.homeY,dt,s.speed);
   return;
  }
  u.nextFoamAt??=(u.spawnedAt??this.time)+.85;
  if(this.time+1e-8>=u.nextFoamAt&&range<=s.range&&this.lineClear(u,leader,0,{fireTeam:u.team})){
   const angle=heading(u,leader);
   u.face=u.aimFace=angle;
   u.foamWindup={startedAt:this.time,fireAt:this.time+rules.windup,angle};
   u.nextFoamAt=this.time+rules.foamPeriod;
   return;
  }
  const goal=stationGoal(this,u,leader,range);
  this.navigate(u,goal.x,goal.y,dt,range<rules.near||range>rules.far?s.speed:s.speed*.58);
  u.face=u.aimFace=heading(u,leader);
 };
 p.updateFoamShots=function(dt){
  if(!this.foamShots?.length)return;
  const allies=this.captainStackHpMode?this.stackCaptains():this.alive(0);
  this.foamShots=this.foamShots.filter(shot=>advanceShot(this,shot,Math.min(dt,this.time-shot.startedAt),allies));
 };
}
root.FrontBubbleOctopusRules=rules;
if(typeof module!=='undefined'&&module.exports)module.exports=install;
else install({FrontGame:root.FrontGame});
})(typeof window==='undefined'?globalThis:window);
