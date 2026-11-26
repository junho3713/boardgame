/* Simulation for the allied airborne support unit. */
(function(root){'use strict';
const rules={
 search:{period:6,duration:3.5,radius:[76,112],vulnerability:[.25,.35]},
 shield:{period:8,duration:6,allies:[2,3,5],strength:[.22,.28,.34],knockbackRadius:70},
 collection:{range:[260,420],speed:[1,1.45],pulsePeriod:10,pulseRadius:160}
};
const special=new Set(['pirateCannon','bubbleOctopus','rhinoBeetle','stagBeetle','bruteBeetle','acidBeetle','blizzardMage','crimsonAce','bayonetCaptain','bombBug','hornet','butterfly','artillery','bikeRaider']);
const owner=u=>u.coopOwner??0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const threat=t=>t.boss||t.miniBoss||t.finalBoss?2:special.has(t.type)||t.roadCaptain||t.guardian?1:0;
const isDrone=u=>u.team===0&&u.type==='drone'&&u.hp>0;
function fieldEffect(game,kind,at,radius,duration){
 game.effects.push({kind,x:at.x,y:at.y,radius,t:duration,max:duration,team:0});
}
function lootTarget(drops,drone,leader,range){
 let xp=null,nearest=Infinity;
 for(const drop of drops){
  if(drop.owner!==owner(drone)||drop.pulling||distance(drop,leader)>range)continue;
  const d=distance(drop,drone);
  if(d<nearest){xp=drop;nearest=d;}
 }
 return xp;
}
function install({FrontGame}){
 const p=FrontGame.prototype;
 p.hasSupportDrone=function(id=this.coopOwner??0){return this.units.some(u=>isDrone(u)&&owner(u)===id);};
 p.supportScanAt=function(target,id=null){
  if(target.team===0||target.hidden||target.hp<=0)return null;
  let strongest=null;
  for(const drone of this.units){
   const scan=drone.droneScan;
   if(scan?.targetId==null||!isDrone(drone)||id!==null&&owner(drone)!==id||this.time<(drone.toyStunUntil||0)||this.time>=scan.until||distance(target,scan)>scan.radius)continue;
   if(!strongest||scan.vulnerability>strongest.vulnerability)strongest=scan;
  }
  return strongest;
 };
 p.absorbDroneShield=function(target,damage){
  const shield=target.droneShield;
  if(this.time>=shield.until){delete target.droneShield;return damage;}
  const remainder=this.absorbShieldDamage(shield,damage);
  if(shield.hp<=1e-8){
   delete target.droneShield;
   fieldEffect(this,'droneShieldBreak',target,shield.evolved?rules.shield.knockbackRadius:24,.38);
   if(shield.evolved){
    for(const enemy of this.combatCandidates()){
     if(enemy.team!==0&&enemy.hp>0&&distance(target,enemy)<=rules.shield.knockbackRadius)this.pushSupportTarget?.(target,enemy,.5,{duration:.18});
    }
   }
  }
  return remainder;
 };
 function shieldAllies(game,drone,leader,evolved,range){
  const rank=Math.min(2,Math.max(0,(drone.star||1)-1));
  const count=evolved?5:rules.shield.allies[rank];
  const allies=game.units.filter(u=>u.team===0&&u!==leader&&u.hp>0&&owner(u)===owner(drone)&&!game.isSupportEntity?.(u)&&distance(u,leader)<=range);
  allies.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||distance(a,leader)-distance(b,leader)||a.id-b.id);
  for(const ally of [leader,...allies.slice(0,count)]){
   const hp=ally.maxHp*rules.shield.strength[rank],previous=ally.droneShield;
   if(previous?.until>game.time&&previous.hp>hp)continue;
   ally.droneShield={hp,maxHp:hp,until:game.time+rules.shield.duration,evolved:evolved||!!(previous?.until>game.time&&previous.evolved)};
  }
 }
 function searchlight(game,drone,leader,evolved,contacts,range){
  const previous=drone.droneScan;
  const active=previous&&game.time<previous.until;
  if(!active&&game.time+1e-8<(drone.nextDroneScanAt??0)){delete drone.droneScan;return;}
  const reach=range+160;
  let target=null,priority=-1,nearest=Infinity;
  for(const enemy of contacts){
   if(enemy.team===0||enemy.hp<=0||enemy.hidden||enemy.base||enemy.structure)continue;
   const d=distance(enemy,leader);
   if(d>reach)continue;
   const order=threat(enemy);
   if((order>priority||order===priority&&d<nearest)&&game.visible(enemy)){target=enemy;priority=order;nearest=d;}
  }
  if(!target){if(active)previous.targetId=null;else delete drone.droneScan;return;}
  if(!active){
   drone.nextDroneScanAt=game.time+rules.search.period;
   drone.droneScan={startedAt:game.time,until:game.time+rules.search.duration};
  }
  Object.assign(drone.droneScan,{x:target.x,y:target.y,targetId:target.id,radius:rules.search.radius[+evolved],vulnerability:rules.search.vulnerability[+evolved]});
 }
 function pulseLoot(game,drone,dt){
  const drops=game.experienceDrops,{pulsePeriod,pulseRadius}=rules.collection;
  drone.nextDronePulseAt??=game.time+pulsePeriod;
  if(game.time+1e-8>=drone.nextDronePulseAt){
   drone.nextDronePulseAt=game.time+pulsePeriod;
   fieldEffect(game,'dronePickupPulse',drone,pulseRadius,.52);
   for(const drop of drops){
    if(drop.owner===owner(drone)&&!drop.pulling&&distance(drop,drone)<=pulseRadius){
     drop.dronePullId=drone.id;
     drop.dronePullUntil=game.time+.85;
    }
   }
  }
  for(let i=drops.length-1;i>=0;i--){
   const drop=drops[i];
   if(drop.owner!==owner(drone)||drop.dronePullId!==drone.id||game.time>=drop.dronePullUntil)continue;
   const d=distance(drop,drone),step=dt*(340+d*2);
   if(d<=18+step){game.collectExperienceDrop(drop);continue;}
   drop.x+=(drone.x-drop.x)*step/d;
   drop.y+=(drone.y-drop.y)*step/d;
  }
 }
 p.updateSupportDrone=function(drone,leader,dt,stats,contacts=this.combatCandidates()){
  if(leader?.type!=='leader'||leader.hp<=0){delete drone.droneScan;return;}
  const evolved=this.evolutionEnabled(drone),range=rules.collection.range[+evolved];
  searchlight(this,drone,leader,evolved,contacts,range);
  if(this.time+1e-8>=(drone.nextDroneShieldAt??0)){
   drone.nextDroneShieldAt=this.time+rules.shield.period;
   shieldAllies(this,drone,leader,evolved,range);
  }
  if(evolved)pulseLoot(this,drone,dt);
  const drop=lootTarget(this.experienceDrops,drone,leader,range);
  const phase=this.time*.85+drone.id*2.4;
  const orbit={x:leader.x+Math.cos(phase)*105,y:leader.y+Math.sin(phase)*72};
  const scan=drone.droneScan,spot=scan?.targetId!=null?scan:null;
  const goal=drop||spot||orbit;
  if(distance(drone,goal)>(drop?10:spot?58:8))this.move(drone,goal.x-drone.x,goal.y-drone.y,dt,stats.speed*rules.collection.speed[+evolved]);
  if(spot&&distance(drone,spot)>8)drone.aimFace=Math.atan2(spot.y-drone.y,spot.x-drone.x);
  else drone.aimFace=null;
  if(drop&&distance(drone,drop)<=20)this.collectExperienceDrop(drop);
 };
}
if(typeof module!=='undefined'&&module.exports){module.exports=install;module.exports.rules=rules;}
else install({FrontGame:root.FrontGame});
})(typeof window==='undefined'?globalThis:window);
