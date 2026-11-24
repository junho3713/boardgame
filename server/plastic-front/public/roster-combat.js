/* Allied shotgun, rolling dice and patrol drone. All timers use simulation seconds. */
(function(root){'use strict';
function install({FrontGame,TYPES,multiplier}){
 const p=FrontGame.prototype,fire=p.fireUnitProjectiles,impact=p.impact,advance=p.advanceCommandShot,update=p.updateEvolutionCombat,reset=p.reset;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const heading=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
 const effect=(g,kind,at,data,time)=>g.effects.push({kind,x:at.x,y:at.y,team:0,...data,t:time,max:time});
 const targetKind=t=>t.base?'base':t.structure?'structure':t.type;
 const foes=(g,u)=>g.combatCandidates().filter(t=>t.team!==u.team&&t.hp>0&&!t.hidden&&!(t.base&&g.baseShielded())&&g.canTarget(u,t));

 p.reset=function(...args){
  const result=reset.apply(this,args);this.rosterDice=[];this.rosterLasers=[];this.rosterThrowSerial=0;return result;
 };
 p.shotgunReloadTime=function(u,s=this.stats(u)){return 1.8*s.rate/.54;};
 p.shotgunShotMultiplier=function(){return 1;};
 p.markShotgunKnockback=function(){};
 p.rosterBlastDamage=function(u,t,amount){return amount;};
 p.droneLaserDamage=function(u,t,amount){return amount;};
 p.droneLaserPeriod=function(){return 6;};
 p.droneLaserTarget=function(u,range,target){return target;};
 p.diceFace=function(u,evolved=this.evolutionEnabled(u)){
  const low=evolved?3:1;return Math.min(6,low+Math.floor(this.random()*(7-low)));
 };
 p.dronePatrolPoint=function(u,c){
  const phase=this.time*.85+u.id*2.4;
  return {x:c.x+Math.cos(phase)*85,y:c.y+Math.sin(phase)*54};
 };
 p.droneTargetCandidates=function(u,range){
  return foes(this,u).filter(t=>distance(u,t)<=range&&this.visible(t)&&this.lineClear(u,t,0,{fireTeam:u.team}));
 };
 p.droneTarget=function(u,range){
  return this.droneTargetCandidates(u,range).sort((a,b)=>distance(u,a)-distance(u,b))[0]||null;
 };
 function push(g,t,angle,strength){
  if(!strength||t.hp<=0||t.base||t.structure||g.isStationary(t))return false;
  const max=strength*((t.boss||t.roadCaptain) ? .35 : 1),r=g.collisionRadius(t),bounds=g.bounds(),old={x:t.x,y:t.y};
  for(let step=0;step<max;){
   step=Math.min(step+5,max);
   const x=old.x+Math.cos(angle)*step,y=old.y+Math.sin(angle)*step;
   if(x<45||y<70||x>bounds.width-45||y>bounds.height-70||!g.isFlying(t)&&!g.freePosition(x,y,r))break;
   t.x=x;t.y=y;
  }
  if(distance(old,t)<.1)return false;
  t.route=t.routeGoal=null;
  if(t.bikeAttack?.origin){t.bikeAttack.origin.x+=t.x-old.x;t.bikeAttack.origin.y+=t.y-old.y;}
  return true;
 }
 function forwardShot(g,u,origin,angle,range,damage,critical,rosterKind,speed){
  const target=g.commandFirePoint(origin,range,angle);
  const bullet={x:origin.x,y:origin.y,target,source:u,damage,critical,splash:0,speed,kind:u.type,team:u.team,
   commandAngle:angle,travelLeft:range,life:range/speed+.1,rosterKind};
  g.shots.push(bullet);return bullet;
 }
 p.applyShotgunBurn=function(t,u,damage){
  if(t.hp<=0)return;
  const burns=t.shotgunBurns??=[];
  const prior=burns.find(b=>b.source===u);
  if(prior){prior.until=this.time+2;prior.damage=damage;}
  else burns.push({source:u,until:this.time+2,next:this.time+.5,damage});
 };
 p.rosterBlast=function(u,point,radius,damage,strength,style){
  const hit=[];
  for(const t of foes(this,u)){
   if(distance(point,t)>radius+this.collisionRadius(t)-5||!this.lineClear(point,t,0,{fireTeam:u.team}))continue;
   const hp=t.hp,amount=this.rosterBlastDamage(u,t,damage,style);
   this.damage(t,amount*multiplier(u.type,targetKind(t)),u);
   if(t.hp>=hp)continue;
   hit.push(t);
   if(push(this,t,heading(point,t),strength)&&style==='shotgun')this.markShotgunKnockback(u,t);
   if(style==='shotgun')this.applyShotgunBurn(t,u,damage*.18);
  }
  effect(this,'rosterBlast',point,{source:u,radius,style,face:point.face},.47);
  return hit;
 };
 function shotgun(g,u,target,attack,s){
  if(u.shotgunReloadUntil>g.time+1e-8)return [];
  if(!u.shotgunRounds)u.shotgunRounds=4;
  const damage=attack.damage*g.shotgunShotMultiplier(u),hot=g.evolutionEnabled(u),finisher=hot&&u.shotgunRounds===1;
  const angle=target.commandShot?target.angle:heading(u,target),seq=u.shotgunSequence=(u.shotgunSequence||0)+1;
  const bullets=[];
  for(let i=-2;i<=2;i++){
   const shot=forwardShot(g,u,u,angle+i*Math.PI/36,s.range,damage/5,attack.critical,'shotgunPellet',850);
   Object.assign(shot,{hot,finisher,sequence:seq,shellDamage:damage,exploding:finisher&&i===0});
   bullets.push(shot);
  }
  effect(g,'rosterShotgun',u,{source:u,angle,hot,finisher},.2);u.shotgunRounds--;
  if(!u.shotgunRounds){
   const reload=g.shotgunReloadTime(u,s);u.shotgunReloadUntil=g.time+reload;u.cooldown=reload;
   effect(g,'rosterReload',u,{source:u},reload);
  }
  return bullets;
 }
 p.impact=function(b){
  if(b.rosterKind!=='shotgunPellet')return impact.call(this,b);
  const t=b.target,u=b.source,hp=t.hp,result=impact.call(this,b);
  if(t.hp<hp&&t.hp>0){
   if(b.hot)this.applyShotgunBurn(t,u,b.shellDamage*.18);
   if(t.lastShotgunPush?.source!==u.id||t.lastShotgunPush.seq!==b.sequence){
    t.lastShotgunPush={source:u.id,seq:b.sequence};
    if(push(this,t,b.commandAngle,b.finisher?20:9)&&b.finisher)this.markShotgunKnockback(u,t);
   }
  }
  if(b.exploding){b.exploding=false;this.rosterBlast(u,b,82,b.shellDamage*.8,48,'shotgun');}
  return result;
 };
 p.advanceCommandShot=function(b,dt,candidates){
  advance.call(this,b,dt,candidates);
  if(b.exploding&&b.life<=0){b.exploding=false;this.rosterBlast(b.source,b,82,b.shellDamage*.8,48,'shotgun');}
 };

 function roll(g,u,from,angle,range,damage,face,golden,child,throwId){
  const duration=range/(child?285:420);
  const die={source:u,x:from.x,y:from.y,fromX:from.x,fromY:from.y,toX:from.x+Math.cos(angle)*range,toY:from.y+Math.sin(angle)*range,
   angle,range,damage,face,golden,child,throwId,startedAt:g.time,landAt:g.time+duration};
  (g.rosterDice??=[]).push(die);return die;
 }
 function throwDice(g,u,target,attack,s){
  const golden=g.evolutionEnabled(u),angle=target.commandShot?target.angle:heading(u,target);
  const id=g.rosterThrowSerial=(g.rosterThrowSerial||0)+1;
  for(const offset of golden?[-.15,.15]:[0])roll(g,u,u,angle+offset,s.range,attack.damage,g.diceFace(u,golden),golden,false,id);
  return [];
 }
 function settle(g,d){
  d.settled=true;
  if(d.face===6&&!d.child){
   for(const side of [-1,1])roll(g,d.source,d,d.angle+side*.72,78,d.damage*.72,1+Math.min(2,Math.floor(g.random()*3)),d.golden,true,d.throwId);
   effect(g,'rosterBlast',d,{source:d.source,style:'diceSplit',radius:38,face:6},.35);
   return;
  }
  const radius=(45+d.face*8)*(d.child ? .8 : 1);
  g.rosterBlast(d.source,d,radius,d.damage*(.6+d.face*.2),0,d.child?'diceChild':'dice');
  if(d.face===4||d.face===5){
   const count=d.face===4?6:8,angles=Array.from({length:count},(_,i)=>d.angle+i*Math.PI*2/count);
   for(const angle of angles)forwardShot(g,d.source,d,angle,95,d.damage*.22,false,'diceFragment',580);
   effect(g,'rosterFragments',d,{source:d.source,angles,range:95},.23);
  }
 }
 p.diceShockwave=function(a,b){
  const width=54,len=distance(a,b),dx=b.x-a.x,dy=b.y-a.y;
  for(const t of foes(this,a.source)){
   const q=len?Math.max(0,Math.min(1,((t.x-a.x)*dx+(t.y-a.y)*dy)/(len*len))):0;
   const closest={x:a.x+q*dx,y:a.y+q*dy};
   if(distance(t,closest)>width+this.collisionRadius(t)-5||!this.lineClear(closest,t,0,{fireTeam:0}))continue;
   const damage=this.rosterBlastDamage(a.source,t,a.damage*1.8,'diceWave');this.damage(t,damage*multiplier(a.source.type,targetKind(t)),a.source);
  }
  effect(this,'rosterDiceWave',a,{source:a.source,tx:b.x,ty:b.y,width,face:a.face},.55);
 };
 function updateDice(g){
  const dice=g.rosterDice||[];
  for(const d of dice){
   if(d.settled)continue;
   const k=Math.min(1,(g.time-d.startedAt)/(d.landAt-d.startedAt)),progress=1-(1-k)*(1-k);
   const next={x:d.fromX+(d.toX-d.fromX)*progress,y:d.fromY+(d.toY-d.fromY)*progress};
   const blocked=!g.lineClear(d,next,0,{fireTeam:d.source.team});
   if(!blocked){d.x=next.x;d.y=next.y;}
   const touched=!d.child&&foes(g,d.source).some(t=>distance(t,d)<=12+g.collisionRadius(t)-5);
   if(k>=1||blocked||touched)settle(g,d);
  }
  for(const d of dice){
   if(!d.settled||!d.golden||d.child||d.pairDone)continue;
   const mate=dice.find(m=>m!==d&&!m.child&&m.throwId===d.throwId);
   if(mate?.settled){d.pairDone=mate.pairDone=true;if(mate.face===d.face)g.diceShockwave(d,mate);}
  }
  g.rosterDice=dice.filter(d=>!d.settled||d.golden&&!d.child&&!d.pairDone);
 }

 function droneFire(g,u,t,attack,s){
  const bullet={x:u.x,y:u.y,target:t,source:u,damage:attack.damage,critical:attack.critical,splash:0,speed:850,kind:u.type,team:u.team,life:1.5,rosterKind:'droneBullet'};
  g.shots.push(bullet);
  if(g.evolutionEnabled(u)&&g.time>=(u.nextDroneLaserAt||0)){
   const laserTarget=g.droneLaserTarget(u,s.range,t),arc=Math.PI/3,angle=heading(u,laserTarget)-arc/2;
   (g.rosterLasers??=[]).push({source:u,x:u.x,y:u.y,angle,startAngle:angle,arc,range:s.range,damage:attack.damage*3.2,startedAt:g.time,until:g.time+.72,hits:[]});
   u.nextDroneLaserAt=g.time+g.droneLaserPeriod(u);
  }
  return [bullet];
 }
 function updateLasers(g){
  g.rosterLasers=(g.rosterLasers||[]).filter(l=>{
   if(l.source.hp<=0)return false;
   const next=l.startAngle+l.arc*Math.min(1,(g.time-l.startedAt)/(l.until-l.startedAt));
   const middle=(next+l.angle)/2,half=(next-l.angle)/2;
   l.x=l.source.x;l.y=l.source.y;
   for(const t of foes(g,l.source)){
    if(l.hits.includes(t.id??t)||!g.lineClear(l,t,0,{fireTeam:0}))continue;
    const d=distance(l,t),r=g.collisionRadius(t)-5;if(d>l.range+r)continue;
    const a=heading(l,t)-middle;
    if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))>half+Math.asin(Math.min(1,r/Math.max(1,d))))continue;
    l.hits.push(t.id??t);
    g.damage(t,g.droneLaserDamage(l.source,t,l.damage)*multiplier('drone',targetKind(t)),l.source);
   }
   l.angle=next;return g.time<l.until;
  });
 }
 p.fireUnitProjectiles=function(u,t,attack,s=this.stats(u)){
  if(u.team===0){
   if(u.type==='rifle')return shotgun(this,u,t,attack,s);
   if(u.type==='guntruck')return throwDice(this,u,t,attack,s);
   if(u.type==='drone')return droneFire(this,u,t,attack,s);
  }
  return fire.call(this,u,t,attack,s);
 };
 p.updateEvolutionCombat=function(){
  update.call(this);
  updateDice(this);updateLasers(this);
  for(const t of this.combatCandidates())if(t.shotgunBurns?.length){
   t.shotgunBurns=t.shotgunBurns.filter(b=>{
    while(t.hp>0&&b.next<=this.time+1e-8&&b.next<=b.until+1e-8){
     b.next+=.5;this.damage(t,b.damage*.5,b.source);
    }
    return t.hp>0&&this.time<b.until;
   });
  }
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;
else install({FrontGame:root.FrontGame,TYPES:root.FrontTypes,multiplier:root.FrontMultiplier});
})(typeof window==='undefined'?globalThis:window);
