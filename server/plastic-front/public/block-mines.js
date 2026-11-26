/* Ground mines. Planting, contact and chains use simulation time. */
(function(root){'use strict';
function install({FrontGame}){
 const p=FrontGame.prototype,reset=p.reset,fire=p.fireUnitProjectiles,impact=p.impact,select=p.selectCombatTarget;
 const limit=18,life=30,linkRange=148,linkDelay=.16,spacing=24;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const ground=(g,t)=>!!t.type&&!t.base&&!t.structure&&!t.built&&!g.isFlying(t);
 const valid=(g,u,t)=>t.team!==u.team&&t.hp>0&&!t.hidden&&!(t.base&&g.baseShielded())&&g.canTarget(u,t);
 function cue(g,kind,point,data,max){
  g.effects.push({kind,x:point.x,y:point.y,team:0,...data,t:max,max});
 }
 p.reset=function(...args){const result=reset.apply(this,args);this.blockMines=[];this.blockMineSerial=0;return result;};
 p.selectCombatTarget=function(u,candidates,threats,s){
  if(u.team===0&&u.type==='rocket'&&!u.built)candidates=(candidates||this.combatCandidates()).filter(t=>ground(this,t));
  return select.call(this,u,candidates,threats,s);
 };
 p.fireUnitProjectiles=function(u,target,attack,s=this.stats(u)){
  if(u.team!==0||u.type!=='rocket'||u.built)return fire.call(this,u,target,attack,s);
  const evolved=this.evolutionEnabled(u),owner=u.coopOwner||0;
  const damageScale=evolved?4.6:3.2;
  let mines=this.blockMines??=[];
  const own=mines.filter(m=>m.owner===owner&&!m.spent&&m.expiresAt>this.time);
  // Soldiers on the same footprint can try again after moving away from the first mine.
  if(own.some(m=>Math.hypot(m.toX-u.x,m.toY-u.y)<spacing)){
   u.cooldown=Math.min(u.cooldown,.4);
   return [];
  }
  const excess=own.length+1-limit;
  if(excess>0){
   const retire=new Set(own.slice(0,excess));
   mines=this.blockMines=mines.filter(m=>!retire.has(m));
  }
  const {x,y}=u,landAt=this.time+.16;
  const mine={id:this.blockMineSerial=(this.blockMineSerial||0)+1,source:u,owner,
   x,y,fromX:x,fromY:y,toX:x,toY:y,startedAt:this.time,landAt,armAt:landAt+.34,expiresAt:landAt+life,
   evolved,damage:attack.damage*damageScale,critical:!!attack.critical,radius:evolved?125:88,triggerRadius:evolved?23:18,chainAt:null};
  mines.push(mine);
  u.minePlantedAt=this.time;
  cue(this,'blockMinePlant',mine,{evolved},.32);
  return [mine];
 };
 // Evolution links modify the primary contact's damage/radius before this method
 // evaluates the blast. Each victim is charged once, centered on the mine.
 p.impact=function(b){
  if(b.kind!=='blockMineImpact')return impact.call(this,b);
  const m=b.mine,u=m.source;
  for(const t of new Set(this.combatCandidates())){
   if(!valid(this,u,t))continue;
   const d=dist(m,t),r=this.collisionRadius(t)-5;
   if(t!==b.target&&(d>r+b.splash||!this.lineClear(m,t,0,{fireTeam:u.team})))continue;
   const falloff=t===b.target?1:1-.45*Math.min(1,Math.max(0,d-r)/b.splash);
   this.damage(t,b.damage*falloff,u);
  }
  if(b.critical&&b.target)cue(this,'critical',{x:b.target.x,y:b.target.y-25},{},.7);
  cue(this,'blockMineBlast',m,{source:u,radius:b.splash,evolved:m.evolved,chain:m.chainAt!==null},.54);
  this.notify('explosion',{x:m.x,y:m.y,team:0,kind:'rocket'});
 };
 function crossed(g,m,t,previous,since,now){
  const r=m.triggerRadius+g.collisionRadius(t)-5;
  if(dist(m,t)<=r)return true;
  const old=previous?.get(t);if(!old||since>=now)return false;
  const dx=t.x-old.x,dy=t.y-old.y,length2=dx*dx+dy*dy;if(!length2)return false;
  const armed=Math.max(0,(m.armAt-since)/(now-since));
  const at=Math.max(armed,Math.min(1,((m.x-old.x)*dx+(m.y-old.y)*dy)/length2));
  return Math.hypot(old.x+dx*at-m.x,old.y+dy*at-m.y)<=r;
 }
 p.updateBlockMines=function(previous=null,since=this.time){
  const mines=this.blockMines;if(!mines?.length)return;
  const now=this.time,grounded=this.units.filter(t=>t.team!==0&&t.hp>0&&!t.hidden&&ground(this,t));
  for(const m of mines){
   const k=Math.min(1,Math.max(0,(now-m.startedAt)/(m.landAt-m.startedAt)));
   m.x=m.fromX+(m.toX-m.fromX)*k;m.y=m.fromY+(m.toY-m.fromY)*k;
   if(now<m.armAt||now>=m.expiresAt||m.spent)continue;
   const chained=m.chainAt!==null;
   if(chained&&now+1e-8<m.chainAt)continue;
   let trigger=null;
   for(const t of grounded){
    if(valid(this,m.source,t)&&crossed(this,m,t,previous,since,now)&&this.lineClear(m,t,0,{fireTeam:0})&&(!trigger||dist(m,t)<dist(m,trigger)))trigger=t;
   }
   if(!chained&&!trigger)continue;
   m.spent=true;
   if(!trigger){
    for(const t of this.combatCandidates())if(valid(this,m.source,t)&&dist(m,t)<=m.radius+this.collisionRadius(t)-5&&this.lineClear(m,t,0,{fireTeam:0})&&(!trigger||dist(m,t)<dist(m,trigger)))trigger=t;
   }
   const explode=()=>this.impact({kind:'blockMineImpact',mine:m,source:m.source,target:trigger,team:0,damage:m.damage,splash:m.radius,critical:m.critical});
   if(this.coop)this.withOwner(m.owner,explode);else explode();
   if(!m.evolved)continue;
   const neighbors=mines.filter(next=>{
    if(next.spent||next.owner!==m.owner||next.chainAt!==null||now>=next.expiresAt)return false;
    const end={x:next.toX,y:next.toY};
    return next.armAt<=now+linkDelay&&dist(m,end)<=linkRange&&this.lineClear(m,end,0,{fireTeam:0});
   }).sort((a,b)=>Math.hypot(a.toX-m.x,a.toY-m.y)-Math.hypot(b.toX-m.x,b.toY-m.y));
   for(const [i,next] of neighbors.entries()){
    next.chainAt=now+linkDelay+i*.08;
    cue(this,'blockMineChain',m,{source:m.source,tx:next.toX,ty:next.toY},next.chainAt-now);
   }
  }
  this.blockMines=mines.filter(m=>!m.spent&&m.expiresAt>now);
 };
 p.captureBlockMineTargets=function(){
  if(this.phase!=='playing'||!this.blockMines?.length)return null;
  return new Map(this.units.filter(t=>t.team!==0&&t.hp>0&&ground(this,t)).map(t=>[t,{x:t.x,y:t.y}]));
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;
else install({FrontGame:root.FrontGame});
})(typeof window==='undefined'?globalThis:window);
