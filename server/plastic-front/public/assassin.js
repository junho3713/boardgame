/* Room encounter shared by the client, co-op authority and background simulation. */
(function(root){'use strict';
const rules={from:270,interval:28,portalDelay:1.4,secondBodyAt:600,throwPeriod:2.2,throwWindup:.45,
 dashPeriod:4.5,dashWindup:.75,dashSpeed:920,dashDamage:3,retreat:.5,starSpeed:510,starRange:390,hide:.35};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const CLONE_SPACING=116,STAR_SPREAD=.092;
function throwVector(u,a){
 const x=u.x+(Math.cos(a.angle)<0?-35:35),y=u.y;
 return {x,y,angle:Math.atan2(a.aimY-y,a.aimX-x)};
}
function spreadClones(g,u,dt,speed){
 if(!u.assassinClone)return false;
 let nearest,closest=CLONE_SPACING;
 for(const v of g.units){
  if(v===u||v.type!=='assassin'||!v.assassinClone||v.hp<=0||v.assassinHiddenUntil>g.time)continue;
  const d=distance(u,v);
  if(d<closest){nearest=v;closest=d;}
 }
 if(!nearest)return false;
 const angle=closest?Math.atan2(u.y-nearest.y,u.x-nearest.x):u.id<nearest.id?0:Math.PI;
 const radius=g.collisionRadius(u),reach=Math.min(32,CLONE_SPACING-closest),step=speed*dt;
 for(const bend of [0,.63,-.63,1.25,-1.25]){
  const dx=Math.cos(angle+bend)*Math.max(step,reach),dy=Math.sin(angle+bend)*Math.max(step,reach);
  if(!g.freePosition(u.x+dx,u.y+dy,radius))continue;
  g.move(u,dx,dy,dt,speed);return true;
 }
 return false;
}
const living=(game,id)=>game.units.filter(u=>u.type==='assassin'&&u.groupId===id&&u.hp>0);
function smoke(g,u,kind='assassinSmoke',damage=0){
 const t=kind==='assassinPuff'?.24:.6;
 g.effects.push({kind,x:u.x,y:u.y,seed:u.id||0,t,max:t,damage});
}
function clearPose(u){u.assassinAction=null;u.route=null;u.routeGoal=null;}
function ringPoints(g,c){
 const base=g.random()*Math.PI/2,solids=g.solidObstacles();
 // Rotate the formation near furniture. Keep all four appearances on valid ground.
 for(let turn=0;turn<6;turn++){
  const points=[];
  for(let i=0;i<4;i++){
   const axis=base+(i+turn/6)*Math.PI/2,radius=260+g.random()*60;
   let point;
   for(const offset of [0,.13,-.13,.29,-.29,.48,-.48]){
    for(const r of [radius,260,320]){
     const angle=axis+offset,x=c.x+Math.cos(angle)*r,y=c.y+Math.sin(angle)*r;
     if(g.freePosition(x,y,20,solids)){point={x,y};break;}
    }
    if(point)break;
   }
   if(!point)break;
   points.push(point);
  }
  if(points.length===4)return points;
 }
 return null;
}
function hitAlong(g,u,from,to,width){
 const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
 if(!length)return null;
 let closest=null,first=Infinity;
 for(const t of g.units){
  if(t.team!==0||!g.canTarget(u,t))continue;
  const along=((t.x-from.x)*dx+(t.y-from.y)*dy)/length;
  const radius=g.collisionRadius(t)+width,side=Math.abs((t.x-from.x)*dy-(t.y-from.y)*dx)/length;
  if(side>radius)continue;
  const half=Math.sqrt(radius*radius-side*side),entry=Math.max(0,along-half);
  if(along+half>=0&&entry<=length&&entry<first){closest=t;first=entry;}
 }
 return closest;
}
function impact(g,u,target,damage){
 if(u.assassinClone){smoke(g,target,'assassinPuff');return;}
 g.damage(target,damage,u);
}
function install({FrontGame}){
 const p=FrontGame.prototype;
 p.spawnAssassinGroup=function(){
  const state=this.roomCampaign;
  if(!this.isRoomCampaign()||!state||this.time<rules.from||this.time<(state.recoveryUntil||0)||this.time<(state.assassinRetryAt||0))return;
  const gap=rules.interval*(this.roomPortalAlive()?1:rules.portalDelay);
  if(this.time+1e-8<(state.lastAssassinAt??-Infinity)+gap)return;
  const bodies=this.units.filter(u=>u.type==='assassin'&&!u.assassinClone&&u.hp>0);
  if(bodies.length>=1+Number(this.coop===true)+Number(this.time>=rules.secondBodyAt))return;
  const captains=this.stackCaptains();if(!captains.length)return;
  const start=Math.floor(this.random()*captains.length);
  for(let i=0;i<captains.length;i++){
   const captain=captains[(start+i)%captains.length],points=ringPoints(this,captain);
   if(!points)continue;
   const real=Math.floor(this.random()*4),id=this.serial+1;
   for(const [slot,pos] of points.entries()){
    const u=this.addUnit(2,'assassin',pos.x,pos.y,true);
    Object.assign(u,{groupId:id,assassinClone:slot!==real,assassinCaptain:captain.id,roomWave:true,assault:true,
     nextStarAt:this.time+.75,nextSlashAt:this.time+rules.dashPeriod,orbitSign:slot%2?1:-1});
    u.face=Math.atan2(captain.y-u.y,captain.x-u.x);smoke(this,u);
   }
   state.lastAssassinAt=this.time;return;
  }
  state.assassinRetryAt=this.time+1;
 };
 p.assassinWounded=function(u,damage){
  if(u.assassinClone){
   if(damage>0){u.cloneFlashUntil=this.time+.2;smoke(this,u,'assassinPuff',damage);}
   if(u.hp<=0){u.diedAt=this.time;clearPose(u);smoke(this,u,'assassinDecoy');}
   return;
  }
  if(u.hp<=0){
   smoke(this,u);
   for(const v of living(this,u.groupId)){v.hp=0;v.diedAt=this.time;clearPose(v);smoke(this,v);}
   return;
  }
  if(u.assassinShuffled||u.hp>u.maxHp*.5)return;
  const members=living(this,u.groupId);
  if(members.length<2)return;
  u.assassinShuffled=true;
  const places=members.map(v=>({x:v.x,y:v.y})),step=1+Math.floor(this.random()*(members.length-1));
  members.forEach((v,i)=>{
   smoke(this,v);clearPose(v);v.assassinDestination=places[(i+step)%members.length];
   v.assassinHiddenUntil=this.time+rules.hide;
   v.nextStarAt=Math.max(v.nextStarAt,v.assassinHiddenUntil+.35);
   v.nextSlashAt=Math.max(v.nextSlashAt,v.assassinHiddenUntil+.75);
  });
 };
 p.updateAssassin=function(u,dt,s){
  if(u.assassinHiddenUntil){
   if(this.time<u.assassinHiddenUntil)return;
   Object.assign(u,u.assassinDestination);delete u.assassinDestination;
   delete u.assassinHiddenUntil;smoke(this,u);
  }
  const captains=this.stackCaptains(),c=captains.find(v=>v.id===u.assassinCaptain)||this.nearestStackCaptain(u);
  if(!c){clearPose(u);return;}
  u.assassinCaptain=c.id;
  const dx=c.x-u.x,dy=c.y-u.y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),a=u.assassinAction;
  if(a){
   if(a.phase==='throw'){
    if(this.time<a.until)return;
    const fan=this.random()<.5?[-.064,.064]:[-STAR_SPREAD,0,STAR_SPREAD];
    const stars=this.roomCampaign.assassinStars??=[],origin=throwVector(u,a);
    // A short stagger leaves each four-point silhouette readable in the narrow fan.
    fan.forEach((offset,i)=>stars.push({source:u,...origin,angle:origin.angle+offset,left:rules.starRange,damage:s.damage,launchAt:this.time+.09*i}));
    u.assassinAction=null;u.assassinReleasedAt=this.time;return;
   }
   if(a.phase==='warn'){
    if(this.time<a.until)return;
    a.phase='dash';a.left=a.length;a.hit=false;
   }
   if(a.phase==='dash'){
    const from={x:u.x,y:u.y},step=Math.min(a.left,rules.dashSpeed*dt),to={x:u.x+Math.cos(a.angle)*step,y:u.y+Math.sin(a.angle)*step};
    const clear=this.lineClear(from,to,this.collisionRadius(u))&&this.freePosition(to.x,to.y,this.collisionRadius(u));
    if(clear){this.move(u,to.x-u.x,to.y-u.y,dt,rules.dashSpeed);a.left-=step;
     const victim=!a.hit&&hitAlong(this,u,from,u,8);
     if(victim){impact(this,u,victim,s.damage*rules.dashDamage);a.hit=true;}
    }
    if(!clear||a.left<=.01){a.phase='retreat';a.until=this.time+rules.retreat;}
    return;
   }
   if(this.time<a.until){if(!spreadClones(this,u,dt,s.speed*2.4))this.move(u,-dx,-dy,dt,s.speed*2.4);u.face=angle;return;}
   clearPose(u);
  }
  if(this.time<(u.assassinReleasedAt??-Infinity)+.2)return;
  if(d<=330&&this.lineClear(u,c,0)){
   if(this.time>=u.nextSlashAt){
    const length=Math.min(355,d+38);u.assassinAction={phase:'warn',angle,length,until:this.time+rules.dashWindup};
    u.face=angle;u.nextSlashAt=this.time+rules.dashPeriod;return;
   }
   if(this.time>=u.nextStarAt){
    u.assassinAction={phase:'throw',angle,aimX:c.x,aimY:c.y,until:this.time+rules.throwWindup};u.nextStarAt=this.time+rules.throwPeriod;u.face=angle;return;
   }
  }
  const stepBefore=u.walk;
  if(!spreadClones(this,u,dt,s.speed)){
   if(d>320||!this.lineClear(u,c,0))this.navigate(u,c.x,c.y,dt,s.speed);
   else if(d<200)this.move(u,-dx,-dy,dt,s.speed);
   else this.move(u,-dy*u.orbitSign,dx*u.orbitSign,dt,s.speed*.55);
  }
  if(u.walk!==stepBefore)u.assassinStepAt=this.time;
  u.face=angle;
 };
 p.updateAssassinStars=function(dt){
  const state=this.roomCampaign,stars=state?.assassinStars;if(!stars?.length)return;
  state.assassinStars=stars.filter(star=>{
   const u=star.source;if(!u||u.hp<=0)return false;
   if(this.time<star.launchAt)return true;
   const step=Math.min(star.left,rules.starSpeed*dt),to={x:star.x+Math.cos(star.angle)*step,y:star.y+Math.sin(star.angle)*step};
   if(!this.lineClear(star,to,2))return false;
   const target=hitAlong(this,u,star,to,3);
   if(target){impact(this,u,target,star.damage);return false;}
   Object.assign(star,to);star.left-=step;return star.left>.01;
  });
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else{
 install({FrontGame:root.FrontGame});
 root.FrontAssassin={throwVector,windup:rules.throwWindup,starRange:rules.starRange,starSpread:STAR_SPREAD};
}
})(typeof window==='undefined'?globalThis:window);
