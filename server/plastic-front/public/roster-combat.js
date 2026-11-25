/* Allied shotgun, radio support and patrol drone. All timers use simulation seconds. */
(function(root){'use strict';
function install({FrontGame,TYPES,multiplier}){
 const p=FrontGame.prototype,fire=p.fireUnitProjectiles,impact=p.impact,advance=p.advanceCommandShot,update=p.updateEvolutionCombat,reset=p.reset,stats=p.stats;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const heading=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
 const effect=(g,kind,at,data,time)=>g.effects.push({kind,x:at.x,y:at.y,team:0,...data,t:time,max:time});
 const targetKind=t=>t.base?'base':t.structure?'structure':t.type;
 const foes=(g,u)=>g.combatCandidates().filter(t=>t.team!==u.team&&t.hp>0&&!t.hidden&&!(t.base&&g.baseShielded())&&g.canTarget(u,t));

 p.reset=function(...args){
  const result=reset.apply(this,args);this.radioStrikes=[];this.radioFireZones=[];this.radioTurrets=[];this.radioNextWhiteoutAt=0;this.rosterLasers=[];return result;
 };
 p.shotgunReloadTime=function(u,s=this.stats(u)){return 1.8*s.rate/TYPES.rifle.rate;};
 p.shotgunShotMultiplier=function(){return 1;};
 p.droneLaserDamage=function(u,t,amount){return amount;};
 p.droneLaserPeriod=function(){return 6;};
 p.droneLaserTarget=function(u,range,target){return target;};
 p.diceFace=function(){
  return Math.min(6,1+Math.floor(this.random()*6));
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
   const hp=t.hp;
   this.damage(t,damage*multiplier(u.type,targetKind(t)),u);
   if(t.hp>=hp)continue;
   hit.push(t);
   push(this,t,heading(point,t),strength);
   if(style==='shotgun')this.applyShotgunBurn(t,u,damage*.18);
  }
  effect(this,'rosterBlast',point,{source:u,radius,style,face:point.face},.47);
  return hit;
 };
 const SHOTGUN_CLOSE_DISTANCE=55, SHOTGUN_CLOSE_BONUS=.65;
 function shotgun(g,u,target,attack,s){
  if(u.shotgunReloadUntil>g.time+1e-8||u.shotgunPumpUntil>g.time+1e-8)return [];
  if(!u.shotgunRounds)u.shotgunRounds=4;
  const damage=attack.damage*g.shotgunShotMultiplier(u),hot=g.evolutionEnabled(u),finisher=hot&&u.shotgunRounds===1;
  const angle=target.commandShot?target.angle:heading(u,target),seq=u.shotgunSequence=(u.shotgunSequence||0)+1;
  u.shotgunPumpStartedAt=g.time;u.shotgunPumpUntil=g.time+s.rate;
  const bullets=[];
  for(let i=-2;i<=2;i++){
   const shot=forwardShot(g,u,u,angle+i*Math.PI/36,s.range,damage/5,attack.critical,'shotgunPellet',850);
   Object.assign(shot,{hot,finisher,muzzleAngle:angle,sequence:seq,shellDamage:damage,shotgunRange:s.range,exploding:finisher&&i===0});
   bullets.push(shot);
  }
  effect(g,'rosterShotgun',u,{source:u,angle,hot,finisher},.38);u.shotgunRounds--;
  if(!u.shotgunRounds){
   const reload=g.shotgunReloadTime(u,s);u.shotgunReloadUntil=g.time+reload;u.cooldown=reload;
   effect(g,'rosterReload',u,{source:u},reload);
   g.notify('shotgunReload',{id:u.id,team:u.team,x:u.x,y:u.y,duration:reload});
  }
  return bullets;
 }
 p.impact=function(b){
  if(b.rosterKind!=='shotgunPellet')return impact.call(this,b);
  const t=b.target,u=b.source,hp=t.hp;
  // Use the distance this pellet traveled, even if the shooter has moved since firing.
  const range=b.shotgunRange;
  const close=range>SHOTGUN_CLOSE_DISTANCE?Math.max(0,Math.min(1,b.travelLeft/(range-SHOTGUN_CLOSE_DISTANCE))):0;
  const result=impact.call(this,{...b,damage:b.damage*(1+SHOTGUN_CLOSE_BONUS*close)});
  if(t.hp<hp&&t.hp>0){
   if(b.hot)this.applyShotgunBurn(t,u,b.shellDamage*.18);
   if(t.lastShotgunPush?.source!==u.id||t.lastShotgunPush.seq!==b.sequence){
    t.lastShotgunPush={source:u.id,seq:b.sequence};
    push(this,t,b.commandAngle,b.finisher?20:9);
   }
  }
  if(b.exploding){b.exploding=false;this.rosterBlast(u,b,82,b.shellDamage*.8,48,'shotgun');}
  return result;
 };
 p.advanceCommandShot=function(b,dt,candidates){
  advance.call(this,b,dt,candidates);
  if(b.exploding&&b.life<=0){b.exploding=false;this.rosterBlast(b.source,b,82,b.shellDamage*.8,48,'shotgun');}
 };

 const RADIO = {
  incendiary: {radius:96, multiplier:2.2, delay:.65, knockback:0},
  missile: {radius:88, multiplier:1.7, delay:1.16, knockback:44},
  nuke: {radius:225, multiplier:7, delay:2.4, knockback:0}
 };
 const radioRadius={1:1,2:1.15,3:1.30};
 const radioRank=(g,u)=>g.starExperiment?(u.star||1):1;
 const missileSpread=[0,-21,21,0,-38,38];
 const turretRules={flight:.48,lifetime:6.5,range:285,splash:18,damage:.24,interval:1/6.5,limit:4,overclock:3,speedBoost:1.6};
 p.stats=function(u){
  const result=stats.call(this,u);
  if(u.team===0&&u.type==='guntruck'&&radioRank(this,u)===3)result.rate*=.65;
  return result;
 };
 function doubleStrike(face,golden){
  if(face<=2)return 'turret';
  if(face<=4)return 'incendiary';
  return golden&&face===6?'nuke':'missile';
 }
 p.radioContacts=function(u,candidates=this.combatCandidates()){
  return candidates.filter(t=>t.team!==u.team&&t.hp>0&&!t.hidden&&
   !(t.base&&this.baseShielded())&&!(t.structure&&this.mission.stage<(t.activeStage||2))&&this.canTarget(u,t)&&this.visible(t));
 };
 function clusterTarget(contacts,u,radius){
  let best=null,bestCount=0;
  for(const target of contacts){
   const count=contacts.reduce((n,t)=>n+Number(distance(t,target)<=radius),0);
   if(count>bestCount||count===bestCount&&distance(u,target)<distance(u,best)){
    best=target;bestCount=count;
   }
  }
  return best;
 }
 function radioTarget(g,u,contacts,aim,strike,radius){
  if(strike==='incendiary'){
   let inView;
   if(!g.coop&&g.viewport&&g.camera){
    const {width,height}=g.viewport;
    inView=contacts.filter(t=>Math.abs(t.x-g.camera.x)<=width/2&&Math.abs(t.y-g.camera.y)<=height/2);
   }else{
    const view=g.coop?g.withOwner(u.coopOwner,()=>g.spawnView(true)):g.spawnView(true);
    inView=contacts.filter(t=>t.x>=view.left&&t.x<=view.right&&t.y>=view.top&&t.y<=view.bottom);
   }
   const pool=inView.length?inView:contacts;
   return pool[Math.min(pool.length-1,Math.floor(g.random()*pool.length))];
  }
  if(g.hasEvolutionLink(u,'radioPrecision')){
   const marked=contacts.filter(t=>g.linkMarked(t,u,'snipe'));
   const rank=t=>t.boss?2:Number(!!(t.roadCaptain||t.miniBoss||t.type==='pirateCannon'||t.type==='bombBug'));
   marked.sort((a,b)=>rank(b)-rank(a)||distance(u,a)-distance(u,b));
   if(marked.length){g.linkCue(u,marked[0],'radioPrecision');return marked[0];}
  }
  if(!aim.commandShot)return clusterTarget(contacts,u,radius);
  const commander=g.commander(0),origin=commander?.type==='leader'?commander:u;
  let best=null,smallest=Infinity;
  for(const t of contacts){
   const angle=heading(origin,t)-aim.angle,offset=Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));
   if(offset<=Math.PI/7&&offset<smallest){best=t;smallest=offset;}
  }
  return best||g.commandFirePoint(origin,aim.range,aim.angle);
 }
 function rollRadio(g,u,golden){
  if(g.time<(g.linkState(u.coopOwner||0).radioHotlineUntil??0)){
   return {dice:[6,6],success:true,strike:'missile',missileCount:6};
  }
  const a=g.diceFace(u,golden,0);
  let b=u.radioMisses>=5?a:g.diceFace(u,golden,0);
  // Every rank uses the same 25% evolved chance and five-miss guarantee.
  if(golden&&a!==b&&g.random()<.10)b=a;
  const success=a===b;
  return {dice:[a,b],success,strike:success?doubleStrike(a,golden):null};
 }
 function queueRadioStrike(g,u,aim,roll,point,{golden,damage,radiusScale}){
  const {strike,dice}=roll,spec=RADIO[strike],radius=spec.radius*radiusScale;
  const count=strike==='missile'?(roll.missileCount??(golden?4:dice[0]-2)):1;
  const angle=aim.commandShot?aim.angle:heading(u,point);
  const precise=strike!=='incendiary'&&g.hasEvolutionLink(u,'radioPrecision');
  const bounds=g.bounds();
  for(let seq=0;seq<count;seq++){
   const spread=missileSpread[seq],delay=spec.delay+seq*.26;
   const x=Math.max(0,Math.min(bounds.width,point.x-Math.sin(angle)*spread));
   const y=Math.max(0,Math.min(bounds.height,point.y+Math.cos(angle)*spread));
   const shell={source:u,x,y,angle,seq,strike,radius,radiusScale,golden,precise,damage,landAt:g.time+delay};
   g.radioStrikes.push(shell);
   effect(g,'radioIncoming',shell,{source:u,strike,angle,seq,radius,landAt:shell.landAt,visualUntil:shell.landAt},delay);
   if(strike==='nuke')g.notify('radioWarning',{team:0,id:u.id,x,y});
  }
 }
 function deployRadioTurret(g,u,target,rank,damage,radiusScale){
  const owner=u.coopOwner||0,turrets=g.radioTurrets??=[];
  const own=turrets.filter(t=>t.owner===owner&&t.until>g.time);
  if(own.length>=turretRules.limit){
   const turret=own.reduce((first,t)=>t.until<first.until?t:first);
   const restart=Math.max(g.time,turret.landAt);
   turret.until=restart+turretRules.lifetime;
   turret.overclockUntil=restart+turretRules.overclock;
   turret.nextShot=Math.min(turret.nextShot,restart+turretRules.interval/turretRules.speedBoost);
   return turret;
  }
  const angle=heading(u,target),obstacles=g.solidObstacles();
  let point;
  for(const offset of [0,.78,-.78,1.56,-1.56,Math.PI]){
   const bearing=angle+offset;
   point={x:target.x-Math.cos(bearing)*76,y:target.y-Math.sin(bearing)*76};
   if(g.freePosition(point.x,point.y,26,obstacles)&&turrets.every(t=>distance(t,point)>48))break;
  }
  g.resolvePosition(point,26);
  const landAt=g.time+turretRules.flight;
  const turret={...point,source:u,owner,rank,scale:radiusScale,range:turretRules.range*radiusScale,splash:turretRules.splash*radiusScale,
   damage:damage*turretRules.damage,angle:heading(point,target),startedAt:g.time,landAt,until:landAt+turretRules.lifetime,
   nextShot:landAt,overclockUntil:0,landed:false,barrel:0};
  turrets.push(turret);
  return turret;
 }
 function launchRadio(g,u,aim,contacts,roll,damage,golden,rank){
  const radiusScale=radioRadius[rank];
  if(roll.strike==='turret'){
   const target=contacts.reduce((nearest,t)=>distance(u,t)<distance(u,nearest)?t:nearest);
   const turret=deployRadioTurret(g,u,target,rank,damage,radiusScale);
   roll.tx=turret.x;roll.ty=turret.y;
   return;
  }
  const radius=RADIO[roll.strike].radius*radiusScale;
  const point=radioTarget(g,u,contacts,aim,roll.strike,radius)??g.commandFirePoint(u,radius+48,u.face??-Math.PI/2);
  roll.tx=point.x;roll.ty=point.y;
  queueRadioStrike(g,u,aim,roll,point,{golden,damage,radiusScale});
 }
 p.launchRadioHotline=function(u,damage){
  const launch=()=>launchRadio(this,u,{},this.radioContacts(u),{strike:'nuke',dice:[6,6]},damage,true,radioRank(this,u));
  if(this.coop)this.withOwner(u.coopOwner,launch);else launch();
 };
 function callRadio(g,u,aim,attack){
  const contacts=g.radioContacts(u);
  if(!contacts.length)return [];
  const golden=g.evolutionEnabled(u),rank=radioRank(g,u);
  const roll=rollRadio(g,u,golden);
  u.radioRollAt=g.time;
  if(roll.success)u.radioDoubleAt=g.time;
  u.radioMisses=roll.success?0:(u.radioMisses||0)+1;
  g.notify('fire',u);
  if(roll.success)launchRadio(g,u,aim,contacts,roll,attack.damage,golden,rank);
  const [a,b]=roll.dice;
  effect(g,'radioRoll',u,{source:u,a,b,golden,rank,rolls:[roll],strike:roll.strike,tx:roll.tx,ty:roll.ty},.85);
  return [];
 }
 function inRadius(g,area,t){return distance(t,area)<=area.radius+Math.max(0,g.collisionRadius(t)-5);}
 function impactRadio(g,shell){
  const {source,x,y,angle,strike,seq,radius,radiusScale=1,golden,damage,landAt,precise}=shell;
  const spec=RADIO[strike];
  for(const t of foes(g,source)){
   if(!inRadius(g,shell,t))continue;
   const precision=precise&&g.linkMarked(t,source,'snipe')?1.2:1,hp=t.hp;
   g.damage(t,damage*spec.multiplier*precision,source);
   if(spec.knockback&&t.hp<hp)push(g,t,distance(t,shell)>.01?heading(shell,t):angle,spec.knockback);
  }
  const impactLife=strike==='nuke'?1.6:.65;
  const screenFlash=strike==='nuke'&&g.time+1e-8>=(g.radioNextWhiteoutAt??0);
  if(screenFlash)g.radioNextWhiteoutAt=g.time+3.5;
  effect(g,'radioImpact',shell,{source,strike,angle,seq,radius,screenFlash,landAt,at:g.time,visualUntil:g.time+impactLife},impactLife);
  if(strike==='nuke')effect(g,'radioCrater',shell,{radius,visualUntil:g.time+6},6);
  g.notify('radioImpact',{team:0,id:source.id,x,y,strike});
  if(strike==='incendiary'||golden&&strike==='nuke'){
   const duration=strike==='nuke'?3.5:(golden?7:5);
   const burnRadius=(strike==='nuke'?158:(golden?120:80))*radiusScale;
   g.radioFireZones.push({source,x,y,radius:burnRadius,damage:damage*.32,startedAt:landAt,nextAt:landAt+.5,until:landAt+duration});
  }
 }
 function updateRadio(g){
  g.radioStrikes=g.radioStrikes.filter(shell=>{
   if(shell.landAt>g.time)return true;
   impactRadio(g,shell);return false;
  });
  g.radioFireZones=g.radioFireZones.filter(zone=>{
   while(zone.nextAt<=g.time+1e-8&&zone.nextAt<=zone.until+1e-8){
    for(const t of foes(g,zone.source))if(inRadius(g,zone,t))g.damage(t,zone.damage,zone.source);
    zone.nextAt+=.5;
   }
   return zone.until>g.time;
  });
 }
 function updateRadioTurrets(g){
  if(!g.radioTurrets?.length)return;
  const now=g.time;
  g.radioTurrets=g.radioTurrets.filter(turret=>{
   const {source,scale}=turret;
   if(now>=turret.until){
    if(turret.landed)effect(g,'radioTurretEnd',turret,{scale,at:now,visualUntil:now+.43},.43);
    return false;
   }
   if(now<turret.landAt)return true;
   if(!turret.landed){
    turret.landed=true;
    effect(g,'radioTurretLand',turret,{scale,at:now,visualUntil:now+.33},.33);
   }
   if(now+1e-8<turret.nextShot)return true;
   const contacts=foes(g,source);
   let target,nearest=turret.range;
   for(const enemy of contacts){
    const d=distance(turret,enemy);
    if(d<=nearest&&g.lineClear(turret,enemy,0,{fireTeam:0})){target=enemy;nearest=d;}
   }
   if(!target){turret.nextShot=now;return true;}
   const boosted=now<turret.overclockUntil,step=turretRules.interval/(boosted?turretRules.speedBoost:1);
   turret.nextShot+=step;
   if(turret.nextShot<=now)turret.nextShot=now+step;
   turret.prevAngle=turret.angle;
   turret.angle=heading(turret,target);
   turret.turnedAt=now;
   const barrel=turret.barrel++%turret.rank;
   effect(g,'radioTurretShot',turret,{scale,rank:turret.rank,barrel,angle:turret.angle,tx:target.x,ty:target.y,
    boosted,at:now,visualUntil:now+.14},.14);
   const hit=()=>{
    g.damage(target,turret.damage,source);
    for(const enemy of contacts)if(enemy!==target&&distance(enemy,target)<=turret.splash&&g.lineClear(target,enemy,0,{fireTeam:0}))g.damage(enemy,turret.damage*.3,source);
   };
   if(g.coop)g.withOwner(turret.owner,hit);else hit();
   return true;
  });
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
   if(u.type==='guntruck')return callRadio(this,u,t,attack);
   if(u.type==='drone')return droneFire(this,u,t,attack,s);
  }
  return fire.call(this,u,t,attack,s);
 };
 p.updateEvolutionCombat=function(){
  update.call(this);
  updateRadio(this);updateRadioTurrets(this);updateLasers(this);
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
