/* Shared by the room simulation, the co-op authority and the worker.
   Hazards and clone timers are plain checkpoint data in simulation seconds. */
(function(root){
'use strict';
const TAU=Math.PI*2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const bearing=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const WATER={period:310,wet:216,width:28,speed:850,bombRadius:52};
const hazards=g=>g.roomCampaign.rotation.hazards??=[];
function fx(g,kind,p,life,extra={}){
 g.effects.push({kind,x:p.x,y:p.y,seed:p.id||0,t:life,max:life,...extra});
}
function validVictims(g,u){
 return (g.captainStackHpMode?g.stackCaptains():g.alive(0)).filter(t=>
  g.canTarget(u,t)&&!g.commanderReviveProtected(t)&&!g.isDroneStealthed?.(t)&&
  !(g.coop&&g.time<(g.coopInvulnerable?.[t.coopOwner]||0))&&g.time>=(t.stackGuardUntil||0));
}
function strike(g,u,t,power,control){
 if(u.assassinClone){fx(g,'assassinPuff',t,.24);return;}
 g.damage(t,power,u);
 if(!control||t.hp<=0||g.isStationary(t))return;
 const {angle=0,travel=0,duration,height}=control;
 g.pushWithFoam(t,angle,travel,duration,height);
}
function lineDistance(t,a,b){
 const x=b.x-a.x,y=b.y-a.y,q=Math.max(0,Math.min(1,((t.x-a.x)*x+(t.y-a.y)*y)/(x*x+y*y||1)));
 return Math.hypot(t.x-a.x-q*x,t.y-a.y-q*y);
}
function cut(g,u,from,to,width,damage,hit){
 for(const t of validVictims(g,u)){
  if(hit.includes(t.id)||lineDistance(t,from,to)>width+g.collisionRadius(t))continue;
  hit.push(t.id);strike(g,u,t,damage);
 }
}
function place(g,center,angle,radius,bodyRadius=24){
 for(const turn of [0,.28,-.28,.65,-.65,1.1,-1.1,Math.PI]){
  const p={x:center.x+Math.cos(angle+turn)*radius,y:center.y+Math.sin(angle+turn)*radius};
  if(g.freePosition(p.x,p.y,bodyRadius))return p;
 }
 return g.resolvePosition({x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius},bodyRadius);
}
function waterLane(cross,offset){return ((cross-offset)%WATER.period+WATER.period)%WATER.period<WATER.wet;}
function startWave(g,u,again,previousDirection){
 // Open from the north. Change axis every cast (including the enraged follow-up)
 // and use the opposite edge the next time that axis is visited.
 const clock=u.krakenClock,last=previousDirection??clock.lastTide;
 let direction;
 if(last==null)direction=1;
 else if(last%2===0)direction=clock.lastVertical===1?3:1;
 else direction=clock.lastHorizontal==null?(g.random()<.5?0:2):(clock.lastHorizontal+2)%4;
 clock.lastTide=direction;
 if(direction%2===0)clock.lastHorizontal=direction;else clock.lastVertical=direction;
 const b=g.bounds(),horizontal=direction%2===0,sign=direction<2?1:-1,length=horizontal?b.width:b.height;
 hazards(g).push({kind:'tide',source:u,direction,horizontal,sign,length,offset:g.random()*WATER.period,
  start:g.time+1.2,front:sign===1?0:length,again,hit:[]});
}
function bombs(g,u,c){
 const count=u.hp<=u.maxHp*.5?5:4,angle=g.random()*TAU;
 const points=[{x:c.x,y:c.y}];
 for(let i=1;i<count;i++)points.push(place(g,c,angle+TAU*(i-1)/(count-1),112+g.random()*60,8));
 hazards(g).push({kind:'geyser',source:u,points,start:g.time,at:g.time+1});
}
function star(g,u,angle,returning){
 hazards(g).push({kind:returning?'windmill':'star',source:u,x:u.x,y:u.y,angle,stage:'out',left:returning?420:345,hit:[]});
}
function flyStar(g,h,dt){
 const u=h.source,returning=h.kind==='windmill';
 if(h.stage==='hold'){
  if(g.time<h.until)return true;
  h.stage='back';h.hit=[];
 }
 const back=h.stage==='back',angle=back?bearing(h,u):h.angle;
 const remaining=back?dist(h,u):h.left,step=Math.min(remaining,dt*(returning?475:245));
 const to={x:h.x+Math.cos(angle)*step,y:h.y+Math.sin(angle)*step};
 cut(g,u,h,to,returning?17:6,u.slotDamage*(returning?.92:.64),h.hit);
 if(u.assassinClone&&h.hit.length)return false;
 Object.assign(h,to);h.angle=angle;
 if(!back)h.left-=step;
 if(step<remaining-.001)return true;
 if(returning&&!back){h.stage='hold';h.until=g.time+1.3;return true;}
 return false;
}
function ninjaFamily(g,body){
 return g.units.filter(u=>u.type==='ninjaAssassin'&&u.ninjaOwner===body.id&&u.hp>0);
}
function dismiss(g,u){fx(g,'assassinSmoke',u,.55);u.hp=0;u.diedAt=g.time;u.assassinAction=null;}
function smokeHide(g,u,delay){fx(g,'assassinSmoke',u,.55);u.assassinHiddenUntil=g.time+delay;}
function makeClone(g,body,index){
 const c=g.nearestStackCaptain(body)||body,point=place(g,c,(body.ninjaAxis??0)+index*Math.PI/2,260);
 const clone=g.addUnit(2,'ninjaAssassin',point.x,point.y,true);
 Object.assign(clone,{ninjaOwner:body.id,ninjaIndex:index,assassinClone:true,assault:true,
  slotHp:body.slotHp,slotDamage:0,hp:body.slotHp,maxHp:body.slotHp,ninjaTurn:body.ninjaTurn,
  ninjaNext:Math.max(g.time+.45,body.ninjaNext+index*body.ninjaStagger)});
 fx(g,'assassinSmoke',clone,.55);return clone;
}
function install({FrontGame}){
 const p=FrontGame.prototype;
 p.initNinjaBoss=function(u){
  u.slotHp/=4;u.hp=u.maxHp=u.slotHp;
  Object.assign(u,{ninjaOwner:u.id,ninjaIndex:0,ninjaRespawn:{},ninjaNext:this.time+1,ninjaTurn:0,ninjaAxis:this.random()*TAU,ninjaStagger:.9+.3*this.random()});
  const c=this.nearestStackCaptain(u);
  if(c)Object.assign(u,place(this,c,u.ninjaAxis,265));
  fx(this,'assassinSmoke',u,.55);
  for(let i=1;i<4;i++)makeClone(this,u,i);
 };
 p.ninjaBossWounded=function(u,dealt){
  if(u.assassinClone){
   if(dealt>0){u.cloneFlashUntil=this.time+.2;fx(this,'assassinPuff',u,.24,{damage:dealt});}
   if(u.hp===0){
    dismiss(this,u);
    const body=this.units.find(b=>b.id===u.ninjaOwner&&b.hp>0);
    if(body)body.ninjaRespawn[u.ninjaIndex]=this.time+2.5+.5*this.random();
   }
   return true;
  }
  if(u.hp>0)return false;
  const members=ninjaFamily(this,u);
  const plan=this.roomCampaign.rotation;
  plan.hazards=(plan.hazards||[]).filter(h=>h.source.ninjaOwner!==u.id);
  if(u.ninjaLives<=1){for(const v of members)dismiss(this,v);return false;}
  fx(this,'substitutionLog',u,2,{angle:this.random()*TAU});
  u.ninjaLives--;u.hp=u.maxHp;
  const excess=members.sort((a,b)=>b.ninjaIndex-a.ninjaIndex)[0];
  if(excess)dismiss(this,excess);
  const survivors=members.filter(v=>v.hp>0).sort((a,b)=>a.ninjaIndex-b.ninjaIndex);
  const slots=[u,...survivors],positions=slots.map(v=>({x:v.x,y:v.y}));
  const c=this.nearestStackCaptain(u)||u,shift=1+Math.floor(this.random()*Math.max(1,slots.length-1));
  u.ninjaAxis=this.random()*TAU;u.ninjaRespawn={};
  slots.forEach((v,i)=>{
   v.ninjaIndex=i;v.assassinAction=null;
   v.ninjaDestination=slots.length>1?positions[(i+shift)%slots.length]:place(this,c,u.ninjaAxis,235);
   smokeHide(this,v,.35);v.ninjaNext=this.time+.95+i*u.ninjaStagger;
   v.ninjaTurn=u.ninjaTurn;
  });
  for(let i=slots.length;i<u.ninjaLives;i++)u.ninjaRespawn[i]=this.time+2.5+.5*this.random();
  return true;
 };
 p.updateNinjaBoss=function(u,dt,s){
  const body=u.assassinClone?this.units.find(v=>v.id===u.ninjaOwner):u;
  if(!body?.hp){dismiss(this,u);return;}
  if(!u.assassinClone)for(const [slot,at] of Object.entries(u.ninjaRespawn)){
   if(this.time>=at){delete u.ninjaRespawn[slot];makeClone(this,u,Number(slot));}
  }
  if(this.time<u.assassinHiddenUntil)return;
  if(u.ninjaDestination){Object.assign(u,u.ninjaDestination);delete u.ninjaDestination;fx(this,'assassinSmoke',u,.45);}
  const c=this.nearestStackCaptain(u);
  if(!c)return;
  const a=u.assassinAction,now=this.time;
  if(a){
   if(now<a.until)return;
   if(a.phase==='throw'){star(this,u,a.angle,true);u.assassinReleasedAt=now;}
   else if(a.phase==='warn'){
    a.phase='dash';a.left=a.length;a.hit=[];a.until=now;return;
   }else if(a.phase==='dash'){
    const from={x:u.x,y:u.y},step=Math.min(a.left,1020*dt),dx=Math.cos(a.angle),dy=Math.sin(a.angle);
    this.move(u,dx*step,dy*step,dt,1020);const moved=dist(from,u);a.left-=step;
    cut(this,u,from,u,14,s.damage*1.12,a.hit);
    if(moved>=step*.65&&a.left>.01)return;
    const count=body.ninjaLives===1?8:6;
    for(let i=0;i<count;i++)star(this,u,a.angle+i*TAU/count,false);
   }else if(a.phase==='hide'){
    const point=place(this,c,(c.moveFace??c.face??0)+Math.PI+(u.ninjaIndex%2?.45:-.25),38);
    Object.assign(a,{phase:'cross',point,until:now+.55});u.assassinHiddenUntil=a.until;return;
   }else if(a.phase==='cross'){
    Object.assign(u,a.point);fx(this,'ninjaCut',u,.32,{clone:!!u.assassinClone,angle:a.angle});
    for(const t of validVictims(this,u))if(dist(u,t)<=58+this.collisionRadius(t))strike(this,u,t,s.damage*1.65);
   }
   u.assassinAction=null;return;
  }
  const angle=bearing(u,c);
  if(now>=u.ninjaNext){
   const turn=u.ninjaTurn++%3;
   u.ninjaNext+=body.ninjaLives===1?3.75:4.95;
   if(u.ninjaNext<=now)u.ninjaNext=now+4.95;
   u.face=angle;
   if(turn===0)u.assassinAction={phase:'throw',angle,aimX:c.x,aimY:c.y,until:now+.45};
   if(turn===1)u.assassinAction={phase:'warn',angle,length:Math.min(440,dist(u,c)+40),until:now+.7};
   if(turn===2){u.assassinAction={phase:'hide',angle,until:now+.8};smokeHide(this,u,.8);}
   return;
  }
  const goal=place(this,c,body.ninjaAxis+u.ninjaIndex*Math.PI/2+.26*Math.sin(now*.55),225);
  if(dist(u,goal)>12){this.navigate(u,goal.x,goal.y,dt,s.speed);u.assassinStepAt=now;}
  u.face=angle;
 };
 p.updateKraken=function(u,dt,s){
  const c=this.nearestStackCaptain(u);if(!c)return;
  const now=this.time,enraged=u.hp<=u.maxHp*.5,rate=enraged?.8:1;
  if(!u.krakenClock)u.krakenClock={shield:now+1.5,foam:now+2.2,water:now+1,move:0};
  const k=u.krakenClock;
  if(enraged&&!k.enraged){k.enraged=true;for(const key of ['shield','foam'])k[key]=now+Math.max(0,k[key]-now)*.8;}
  if(now>=k.shield){
   const hp=Math.round(u.maxHp*.12);this.grantBubbleShield(u,u,hp);
   u.bubbleInflatedAt=now;k.shield=now+10*rate;
  }
  if(now>=k.foam&&dist(u,c)<180){
   k.foam=now+5*rate;hazards(this).push({kind:'foam',source:u,x:u.x,y:u.y,start:now,at:now+.4});
  }
  const tideBusy=k.move%2===1&&this.roomCampaign.rotation.hazards?.some(h=>h.kind==='tide'&&h.source===u);
  if(now>=k.water&&!tideBusy){
   if(k.move++%2===0)bombs(this,u,c);else startWave(this,u,enraged);
   k.water=now+(k.move%2?4:10);
  }
  if(dist(u,c)>125)this.navigate(u,c.x,c.y,dt,s.speed);
  u.face=u.aimFace=bearing(u,c);
 };
 p.updateRotationHazards=function(dt){
  const plan=this.roomCampaign?.rotation;if(!plan?.hazards?.length)return;
  const current=plan.hazards;plan.hazards=[];
  for(const h of current){
   const u=h.source;if(!u||u.hp<=0)continue;
   let keep=true;
   if(h.kind==='windmill'||h.kind==='star')keep=flyStar(this,h,dt);
   else if(h.kind==='tide'&&this.time>=h.start){
    const old=h.front;
    h.front+=WATER.speed*h.sign*Math.min(dt,this.time-h.start);
    for(const t of validVictims(this,u)){
     const along=h.horizontal?t.x:t.y,cross=h.horizontal?t.y:t.x;
     if(h.hit.includes(t.id)||!waterLane(cross,h.offset)||along<Math.min(old,h.front)-WATER.width||along>Math.max(old,h.front)+WATER.width)continue;
     h.hit.push(t.id);strike(this,u,t,u.slotDamage*1.5,{angle:h.direction*Math.PI/2,travel:148,duration:.34,height:10});
    }
    if(h.sign>0?h.front>h.length+WATER.width:h.front<-WATER.width){
     keep=false;if(h.again)startWave(this,u,false,h.direction);
    }
   }else if((h.kind==='foam'||h.kind==='geyser')&&this.time>=h.at){
    const foam=h.kind==='foam',points=foam?[h]:h.points,radius=foam?180:WATER.bombRadius;
    for(const t of validVictims(this,u)){
     const point=points.find(v=>dist(t,v)<=radius+this.collisionRadius(t));if(!point)continue;
     strike(this,u,t,u.slotDamage*(foam?.7:1.3),foam?{angle:bearing(h,t),travel:132,duration:.3,height:8}:{duration:1.2,height:48});
    }
    for(const point of points)fx(this,foam?'bubbleFoamImpact':'waterColumn',point,foam?.45:.65,{radius,angle:0});
    keep=false;
   }
   if(keep)plan.hazards.push(h);
  }
 };
}
root.FrontTideRules=WATER;
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install({FrontGame:root.FrontGame});
})(typeof window==='undefined'?globalThis:window);
