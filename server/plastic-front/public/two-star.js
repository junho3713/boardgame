/* Isolated room experiments. The regular room keeps the original unit rules. */
(function(root){'use strict';
const api=typeof module!=='undefined'&&module.exports?require('./engine.js'):root,Game=api.FrontGame,roster=api.ROSTER||root.FrontRoster;
const RULES={copies:3,maxTwoStars:3,capacityGains:[1,1,2,2,3],roulettes:3,
 three:{sniperShots:2,lucky:{normal:{glue:.44,mine:.20,spray:.24,missiles:.06,blank:.06},evolved:{glue:.29,mine:.13,spray:.41,missiles:.14,blank:.03}}}};
const p=Game.prototype,stats=p.stats,upgrade=p.upgradeBalance,buy=p.buy,bonus=p.abilityBonus,remaining=p.recruitmentRemaining,lucky=p.updateLuckyUnit,scale=p.luckyScale,odds=p.luckyOdds,projectiles=p.fireUnitProjectiles;
p.isThreeStarExperiment=function(){return false;}; // Legacy callers checking for the retired battlefield.
p.battlefieldId=function(){return this.bedroomStar?'bedroom-star':this.pixelRoom?'livingroom-pixel':this.starExperiment?'livingroom-star':this.bounds().id;};
p.starCount=function(type,star){return this.alive(0).filter(u=>u.type===type&&!u.summonEvolved&&!u.goldenSummon&&(u.star||1)===star).length;};
p.threeStarCount=function(type){return this.starCount(type,3);};
p.starRosterLabel=function(type){const three=this.threeStarCount(type);return three?`★★★ ${three}기`:`1성 ${this.fusionCandidates(type).length} · ★★ ${this.twoStarCount(type)}/3`;};
p.abilityBonus=function(key,level=this.abilities[key]||0){if(this.starExperiment&&this.mode==='pve'&&key==='capacity')return RULES.capacityGains.slice(0,Math.max(0,Math.min(5,Math.floor(level)))).reduce((sum,gain)=>sum+gain,0);return bonus.call(this,key,level);};
p.stats=function(u){
 const s=stats.call(this,u),rank=this.rankCombat(u);
 if(rank.hp===1)return s;
 return {...s,hp:s.hp*rank.hp,damage:s.damage*rank.damage,rate:u.type==='medic'?s.rate:s.rate/rank.attackSpeed,
  range:s.range*rank.range,splash:s.splash*rank.range,heal:s.heal*rank.heal};
};
p.refreshTwoStarHealth=function(){
 if(!this.starExperiment||this.mode!=='pve')return false;let changed=false;
 for(const u of this.units){if(u.team!==0||!(u.star>=2)||!roster.includes(u.type))continue;const hp=this.stats(u).hp;if(Math.abs(hp-u.maxHp)<1e-6)continue;const ratio=Math.max(0,Math.min(1,u.hp/Math.max(1,u.maxHp)));u.maxHp=hp;u.hp=hp*ratio;changed=true;}return changed;
};
p.upgradeBalance=function(){const changed=upgrade.call(this);return this.refreshTwoStarHealth()||changed;};
p.fusionCandidates=function(type,star=1){return this.starExperiment&&this.mode==='pve'&&roster.includes(type)?this.alive(0).filter(u=>u.type===type&&!u.summonEvolved&&!u.goldenSummon&&(u.star||1)===star):[];};
p.twoStarCount=function(type){return this.alive(0).filter(u=>u.type===type&&u.star===2).length;};
p.recoverTwoStarLoss=function(u){
 if(!this.starExperiment||this.mode!=='pve'||u.team!==0||u.star!==2||u.hp>0||u.merged||u.recoveredAs||!roster.includes(u.type))return null;
 const recover=()=>{const survivor=this.addUnit(0,u.type,u.x,u.y);survivor.star=1;u.recoveredAs=survivor.id;this.effects.push({kind:'drop',x:survivor.x,y:survivor.y,t:1,max:1,team:0});return survivor;};
 return this.coop?this.withOwner(u.coopOwner,recover):recover();
};
p.recruitmentRemaining=function(type,team=0){
 if(!this.starExperiment||this.mode!=='pve'||team!==0||!roster.includes(type))return remaining.call(this,type,team);
 if(this.threeStarCount(type))return 0;
 return Math.max(0,(RULES.maxTwoStars-this.twoStarCount(type))*RULES.copies-this.fusionCandidates(type).length);
};
function mergeCopies(type,fromStar){
 if(!this.starExperiment||this.mode!=='pve'||!['playing','paused','choice','resupply'].includes(this.phase))return null;
 if(this.threeStarCount(type)||fromStar===1&&this.twoStarCount(type)>=RULES.maxTwoStars)return null;
 const copies=this.fusionCandidates(type,fromStar).slice(0,RULES.copies);if(copies.length<RULES.copies)return null;
 const survivor=copies[0],ratio=copies.reduce((n,u)=>n+u.hp,0)/copies.reduce((n,u)=>n+u.maxHp,0);survivor.star=fromStar+1;survivor.maxHp=this.stats(survivor).hp;survivor.hp=survivor.maxHp*ratio;survivor.cooldown=Math.max(...copies.map(u=>u.cooldown||0));survivor.trialDodge=null;survivor.route=null;survivor.routeGoal=null;survivor.regroup=null;survivor.navCheck=null;survivor.tankCatchup=false;
 // Keep already-earned reserves and live effects when their vehicle is compressed.
 if(type==='rocket')for(const mine of this.blockMines||[])if(copies.includes(mine.source))mine.source=survivor;
 if(type==='lucky')for(const list of [this.luckySalvos,this.luckySprays,this.luckyMines,this.luckyGlues,this.luckyFlashes])for(const effect of list||[])if(copies.includes(effect.source)){const index=copies.indexOf(effect.source);effect.source=survivor;if(effect.ownerId!==undefined)effect.ownerId=survivor.id;effect.rouletteChannel=fromStar===1?index:(effect.rouletteChannel??0);}
 for(const u of copies.slice(1)){u.hp=0;u.merged=true;u.trialDodge=null;}
 const r=this.rankCombat(survivor);this.notify('toast',this.stats(survivor).name+' '+'★'.repeat(survivor.star)+` 합성 · 공격 ×${r.damage} / 체력 ×${r.hp}`+(type==='medic'?` / 치료 ×${r.heal}`:''));this.notify('change');return survivor;
}
p.fuseUnit=function(type,fromStar=1){return fromStar===1?mergeCopies.call(this,type,1):null;};
p.dropDestinyStar=function(boss){
 if(!this.starExperiment||this.mode!=='pve'||boss.team===0||boss.hp>0||boss.roadCaptain||boss.bossRushPair||boss.finalBoss)return;
 let destinySource;
 if(this.isRoomCampaign()){
  const {destinyStarMini,destinyStarBoss,miniBoss,bosses}=root.FrontRoomCampaign.config;
  const source=boss.miniBoss?destinyStarMini:destinyStarBoss;
  const scheduledAt=boss.miniBoss?boss.miniBossMinute*miniBoss.interval:bosses[boss.bossScheduleIndex]?.at;
  if(boss.type!==source.type||scheduledAt!==source.at)return;
  destinySource=source.at;
  if(this.pickups.some(p=>p.destinyStar&&(p.destinySource??destinyStarMini.at)===destinySource))return;
 }else if(this.isDesktopDefense()){
  const {firstAt,interval}=this.waveRules().boss,scheduledAt=firstAt+(boss.bossNumber-1)*interval;
  if(boss.miniBoss||!Number.isFinite(scheduledAt)||scheduledAt<12*60||this.pickups.some(p=>p.destinyStar))return;
 }else return;
 const pickup={destinyStar:true,destinySource,active:true,x:boss.x,y:boss.y};
 this.resolvePosition(pickup,24);this.pickups.push(pickup);
 this.notify('toast','운명의 별이 떨어졌습니다 · 같은 병과 2성 3기를 모아 대장으로 획득');
};
p.destinyStarTypes=function(){
 const counts=new Map(),promoted=new Set();
 for(const u of this.units){
  if(u.team!==0||u.hp<=0||this.coop&&u.coopOwner!==this.coopOwner)continue;
  if(u.star===2)counts.set(u.type,(counts.get(u.type)||0)+1);
  if(u.star===3)promoted.add(u.type);
 }
 return roster.filter(type=>counts.get(type)>=RULES.copies&&!promoted.has(type));
};
const collectSupply=p.collectFieldSupply;
p.collectFieldSupply=function(pickup){
 if(!pickup?.destinyStar)return collectSupply.call(this,pickup);
 const commander=this.commander(0);
 if(!pickup.active||commander.hp<=0||Math.hypot(commander.x-pickup.x,commander.y-pickup.y)>=60)return false;
 const promoted=this.destinyStarTypes().map(type=>mergeCopies.call(this,type,2)).filter(Boolean);
 if(!promoted.length)return false;
 pickup.active=false;
 for(const u of promoted)this.effects.push({kind:'drop',x:u.x,y:u.y,t:1,max:1,team:0});
 this.notify('toast','운명의 별 · '+promoted.map(u=>this.stats(u).name).join(', ')+' ★★★ 합성');
 this.notify('change');return true;
};
p.autoFuseUnits=function(){
 if(!this.starExperiment||this.mode!=='pve'||!['playing','paused','choice','resupply'].includes(this.phase))return;
 const counts=new Map();for(const u of this.alive(0))if(roster.includes(u.type)&&(u.star||1)===1)counts.set(u.type,(counts.get(u.type)||0)+1);
 for(const [type,count] of counts)for(let i=0;i<Math.floor(count/RULES.copies);i++)if(!this.fuseUnit(type))break;
};
// The third recruit merges immediately, including while support is being confirmed.
p.buy=function(type,team=0){const ok=buy.call(this,type,team);if(ok&&team===0)this.autoFuseUnits();return ok;};
p.updateLuckyUnit=function(u){
 if(this.rankCombat(u).damage===1)return lucky.call(this,u);
 this.updateLuckyInterval(u);
 u.luckyChannels??=Array.from({length:RULES.roulettes},(_,i)=>({roll:i===0?u.luckyRoll:null,next:u.nextLuckyAt}));
 for(const [i,ch] of u.luckyChannels.entries()){u.activeLuckyChannel=i;u.luckyRoll=ch.roll;u.nextLuckyAt=ch.next;lucky.call(this,u);ch.roll=u.luckyRoll;ch.next=u.nextLuckyAt;}
 delete u.activeLuckyChannel;
 u.luckyRoll=u.luckyChannels[0].roll;u.nextLuckyAt=u.luckyChannels[0].next;
};
// Share the rank's attack budget across the three roulette draws.
p.luckyOdds=function(u){return this.starExperiment&&u?.team===0&&u.star===3?this.evolutionLuckyOdds(u,RULES.three.lucky[this.evolutionEnabled(u)?'evolved':'normal']):odds.call(this,u);};
p.luckyScale=function(u){return scale.call(this,u)/(this.rankCombat(u).damage>1?RULES.roulettes:1);};
// Split one damage budget across the two highest-health eligible enemies.
p.fireUnitProjectiles=function(u,target,attack,s=this.stats(u)){
 if(!(this.starExperiment&&u.team===0&&u.star===3&&u.type==='sniper'))return projectiles.call(this,u,target,attack,s);
 const other=this.selectCombatTarget(u,this.combatCandidates().filter(t=>t!==target),null,s)||target,targets=[target,other],shots=[];
 for(const [i,t] of targets.entries()){const bullet=projectiles.call(this,u,t,{...attack,damage:attack.damage/RULES.three.sniperShots},s)[0],angle=Math.atan2(t.y-u.y,t.x-u.x),side=i?3:-3;bullet.x-=Math.sin(angle)*side;bullet.y+=Math.cos(angle)*side;shots.push(bullet);}
 this.effects.push({kind:'tracer',x:shots[1].x,y:shots[1].y,tx:other.x,ty:other.y,t:.12,max:.12,team:u.team});return shots;
};
root.FrontTwoStar={RULES};if(typeof module!=='undefined'&&module.exports)module.exports=root.FrontTwoStar;
})(typeof window==='undefined'?globalThis:window);
