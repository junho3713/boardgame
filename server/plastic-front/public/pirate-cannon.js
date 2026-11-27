/* The wind-up parrot lights a toy cannon. Ground warnings always use the fixed impact point. */
(function(root){'use strict';
function install({FrontGame}){
 const p=FrontGame.prototype,reset=p.reset,stationary=p.isStationary,damage=p.damage,mortars=p.updateMortars,hazards=p.bossHazards;
 const windup=2,flight=.32,radius=170,healthDamage=.30,stackImpactDelay=2;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function targets(g,u){
  const bodies=[...g.alive(0),...g.buildings,g.bases[0]];
  return bodies.filter(t=>t&&!t.hidden&&!g.isFlying(t)&&g.canTarget(u,t));
 }
 function canSeeCannon(g,u,t){
  const viewForCommander=()=>{
   const view=g.spawnView(true),r=g.collisionRadius(u);
   return u.x+r>=view.left&&u.x-r<=view.right&&u.y+r>=view.top&&u.y-r<=view.bottom;
  };
  return g.coop?g.withOwner(t.coopOwner||0,viewForCommander):viewForCommander();
 }
 function cancel(u){
  if(!u.pirateFuse)return;
  u.pirateFuse=null;u.cooldown=Math.max(.45,u.cooldown||0);
 }
 p.reset=function(...args){const result=reset.apply(this,args);this.pirateShells=[];return result;};
 p.isStationary=function(u){return !!u?.pirateFuse||stationary.call(this,u);};
 p.damage=function(t,amount,source){
  const alliedIntercept=t.pirateFuse&&t.hp>0&&source?.team===0&&t.team!==0&&this.time>=(t.toyStunUntil||0)&&!this.luckyFlashActive?.(t);
  const result=damage.call(this,t,amount,source);
  if(t.hp<=0&&t.pirateFuse){
   const fuse=t.pirateFuse;cancel(t);
   if(alliedIntercept){
    this.effects.push({kind:'pirateIntercept',team:0,x:fuse.x,y:fuse.y,radius:fuse.radius,gunX:t.x,gunY:t.y,t:.85,max:.85});
   }
  }
  return result;
 };
 p.updatePirateCannon=function(u,dt,s=this.stats(u)){
  if(u.hp<=0||this.luckyFlashActive?.(u)||this.time<(u.toyStunUntil||0)){cancel(u);return;}
  if(u.pirateFuse){
   const fuse=u.pirateFuse;
   u.face=u.aimFace=fuse.angle;
   if(this.time+1e-8<fuse.fireAt)return;
   (this.pirateShells??=[]).push({source:u,x:fuse.x,y:fuse.y,fromX:u.x,fromY:u.y,radius:fuse.radius,angle:fuse.angle,
    team:u.team,startedAt:this.time,landAt:fuse.landAt??this.time+flight,damage:s.damage,...(fuse.landAt==null?{}:{warningAt:fuse.startedAt})});
   u.pirateFuse=null;u.pirateFiredAt=this.time;u.cooldown=s.rate;u.recoil=.32;
   this.effects.push({kind:'pirateMuzzle',source:u,x:u.x,y:u.y,angle:fuse.angle,team:u.team,t:.36,max:.36});
   this.notify('fire',u);return;
  }
  const candidates=targets(this,u).sort((a,b)=>this.targetDistance(u,a)-this.targetDistance(u,b));
  const bait=this.supportDecoyTarget?.(u);
  if(bait&&candidates.includes(bait)){candidates.splice(candidates.indexOf(bait),1);candidates.unshift(bait);}
  // No offscreen opening salvos. Approach until players can see the fuse and its target is in range.
  const target=this.visible(u)&&candidates.find(t=>this.targetDistance(u,t)<=s.range&&canSeeCannon(this,u,t)&&this.lineClear(u,t,0,{fireTeam:u.team}));
  if(!target){
   const goal=candidates[0]||this.pursuitTarget(u);
   if(goal&&distance(u,goal)>8){const point=this.pursuitPoint(u,goal);this.navigate(u,point.x,point.y,dt,s.speed);}
   return;
  }
  const angle=Math.atan2(target.y-u.y,target.x-u.x);
  u.face=u.aimFace=angle;
  if(u.cooldown>0)return;
  u.route=u.routeGoal=null;
  const landAt=this.captainStackHpMode?this.time+stackImpactDelay:undefined;
  u.pirateFuse={x:target.x,y:target.y,angle,radius,startedAt:this.time,fireAt:landAt==null?this.time+windup:landAt-flight,...(landAt==null?{}:{landAt})};
 };
 p.updatePirateShells=function(){
  for(const u of this.units)if(u.pirateFuse&&(u.hp<=0||this.luckyFlashActive?.(u)||this.time<(u.toyStunUntil||0)))cancel(u);
  const waiting=[];
  for(const shell of this.pirateShells||[]){
   if(this.time+1e-8<shell.landAt){waiting.push(shell);continue;}
   const victims=targets(this,shell.source).concat(this.radioTurretTargets());
   for(const t of victims){
    const d=distance(t,shell);
    if(d>shell.radius)continue;
    const personnel=!t.base&&!t.built&&!t.structure;
    const bonus=personnel?t.maxHp*healthDamage:0;
    this.damage(t,shell.damage*(1-.45*d/shell.radius)+bonus,shell.source);
   }
   this.effects.push({kind:'pirateImpact',source:shell.source,x:shell.x,y:shell.y,radius:shell.radius,team:shell.team,t:.8,max:.8});
   this.notify('explosion',{x:shell.x,y:shell.y,team:shell.team,kind:'pirateCannon'});
  }
  this.pirateShells=waiting;
 };
 p.updateMortars=function(){const result=mortars.call(this);this.updatePirateShells();return result;};
 p.bossHazards=function(){
  const active=hazards.call(this);
  for(const u of this.units)if(u.hp>0&&u.pirateFuse){
   const f=u.pirateFuse;active.push({x:f.x,y:f.y,radius:f.radius,landAt:f.landAt??f.fireAt+flight});
  }
  return active.concat(this.pirateShells||[]);
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;
else install({FrontGame:root.FrontGame});
})(typeof window==='undefined'?globalThis:window);
