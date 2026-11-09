/* Isolated room experiments. The regular room keeps the original unit rules. */
(function(root){'use strict';
const api=typeof module!=='undefined'&&module.exports?require('./engine.js'):root,Game=api.FrontGame,roster=api.ROSTER||root.FrontRoster;
const RULES={copies:3,maxTwoStars:3,capacityGains:[1,1,2,2,3],damage:3,hp:2.5,heal:2.5,roulettes:3,
 three:{damage:7.2,hp:7.8,heal:7.2,roulettes:3,sniperShots:2,lucky:{normal:{glue:.44,mine:.20,spray:.24,missiles:.06,blank:.06},evolved:{glue:.29,mine:.13,spray:.41,missiles:.14,blank:.03}}}};
const p=Game.prototype,stats=p.stats,update=p.update,upgrade=p.upgradeBalance,buy=p.buy,bonus=p.abilityBonus,remaining=p.recruitmentRemaining,lucky=p.updateLuckyUnit,scale=p.luckyScale,odds=p.luckyOdds,projectiles=p.fireUnitProjectiles;
p.isThreeStarExperiment=function(){return this.starExperiment&&this.starMax===3&&this.mode==='pve';};
p.battlefieldId=function(){return this.starExperiment?(this.starMax===3?'livingroom-star3':'livingroom-star'):this.bounds().id;};
p.starCount=function(type,star){return this.alive(0).filter(u=>u.type===type&&(u.star||1)===star).length;};
p.threeStarCount=function(type){return this.starCount(type,3);};
p.starRosterLabel=function(type){return this.isThreeStarExperiment()?`1성 ${this.fusionCandidates(type).length} · ★★ ${this.twoStarCount(type)} · ★★★ ${this.threeStarCount(type)}/1`:`1성 ${this.fusionCandidates(type).length} · ★★ ${this.twoStarCount(type)}/3`;};
p.abilityBonus=function(key,level=this.abilities[key]||0){if(this.starExperiment&&this.mode==='pve'&&key==='capacity')return RULES.capacityGains.slice(0,Math.max(0,Math.min(5,Math.floor(level)))).reduce((sum,gain)=>sum+gain,0);return bonus.call(this,key,level);};
p.stats=function(u){const s=stats.call(this,u),r=u.star===3&&this.isThreeStarExperiment()?RULES.three:RULES;return this.starExperiment&&u.team===0&&u.star>=2?{...s,hp:s.hp*r.hp,damage:s.damage*r.damage,heal:s.heal*r.heal}:s;};
p.refreshTwoStarHealth=function(){
 if(!this.starExperiment||this.mode!=='pve')return false;let changed=false;
 for(const u of this.units){if(u.team!==0||u.star!==2||!roster.includes(u.type))continue;const hp=this.stats(u).hp;if(Math.abs(hp-u.maxHp)<1e-6)continue;const ratio=Math.max(0,Math.min(1,u.hp/Math.max(1,u.maxHp)));u.maxHp=hp;u.hp=hp*ratio;changed=true;}return changed;
};
p.upgradeBalance=function(){const changed=upgrade.call(this);return this.refreshTwoStarHealth()||changed;};
p.fusionCandidates=function(type,star=1){return this.starExperiment&&this.mode==='pve'&&roster.includes(type)?this.alive(0).filter(u=>u.type===type&&(u.star||1)===star):[];};
p.twoStarCount=function(type){return this.alive(0).filter(u=>u.type===type&&u.star===2).length;};
p.recoverTwoStarLoss=function(u){
 if(!this.starExperiment||this.mode!=='pve'||u.team!==0||u.star!==2||u.hp>0||u.merged||u.recoveredAs||!roster.includes(u.type))return null;
 const recover=()=>{const survivor=this.addUnit(0,u.type,u.x,u.y);survivor.star=1;u.recoveredAs=survivor.id;this.effects.push({kind:'drop',x:survivor.x,y:survivor.y,t:1,max:1,team:0});return survivor;};
 return this.coop?this.withOwner(u.coopOwner,recover):recover();
};
p.recruitmentRemaining=function(type,team=0){
 if(!this.starExperiment||this.mode!=='pve'||team!==0||!roster.includes(type))return remaining.call(this,type,team);
 if(this.isThreeStarExperiment()&&this.threeStarCount(type))return 0;
 return Math.max(0,(RULES.maxTwoStars-this.twoStarCount(type))*RULES.copies-this.fusionCandidates(type).length);
};
p.fuseUnit=function(type,fromStar=1){
 if(!this.starExperiment||this.mode!=='pve'||!['playing','paused','choice','resupply'].includes(this.phase))return null;
 if(fromStar===2?(!this.isThreeStarExperiment()||this.threeStarCount(type)):(fromStar!==1||this.twoStarCount(type)>=RULES.maxTwoStars||this.isThreeStarExperiment()&&this.threeStarCount(type)))return null;
 const copies=this.fusionCandidates(type,fromStar).slice(0,RULES.copies);if(copies.length<RULES.copies)return null;
 const survivor=copies[0],ratio=copies.reduce((n,u)=>n+u.hp,0)/copies.reduce((n,u)=>n+u.maxHp,0);survivor.star=fromStar+1;survivor.maxHp=this.stats(survivor).hp;survivor.hp=survivor.maxHp*ratio;survivor.cooldown=Math.max(...copies.map(u=>u.cooldown||0));survivor.trialDodge=null;survivor.route=null;survivor.routeGoal=null;survivor.regroup=null;survivor.navCheck=null;survivor.tankCatchup=false;
 // Keep already-earned reserves and live effects when their vehicle is compressed.
 if(type==='lucky'&&this.isThreeStarExperiment())for(const list of [this.luckySalvos,this.luckySprays,this.luckyMines,this.luckyGlues])for(const effect of list||[])if(copies.includes(effect.source)){const index=copies.indexOf(effect.source);effect.source=survivor;if(effect.ownerId!==undefined)effect.ownerId=survivor.id;effect.rouletteChannel=fromStar===1?index:(effect.rouletteChannel??0);}
 for(const u of copies.slice(1)){u.hp=0;u.merged=true;u.trialDodge=null;}
 const r=survivor.star===3?RULES.three:RULES;this.notify('toast',this.stats(survivor).name+' '+'★'.repeat(survivor.star)+` 합성 · 공격 ×${r.damage} / 체력 ×${r.hp}`+(type==='medic'?` / 치료 ×${r.heal}`:''));this.notify('change');return survivor;
};
p.autoFuseUnits=function(){
 if(!this.starExperiment||this.mode!=='pve'||!['playing','paused','choice','resupply'].includes(this.phase))return;
 const counts=new Map();for(const u of this.alive(0))if(roster.includes(u.type)&&(u.star||1)===1)counts.set(u.type,(counts.get(u.type)||0)+1);
 for(const [type,count] of counts)for(let i=0;i<Math.floor(count/RULES.copies);i++)if(!this.fuseUnit(type))break;
 if(this.isThreeStarExperiment())for(const type of roster)this.fuseUnit(type,2);
};
// The third recruit merges immediately, including while support is being confirmed.
p.buy=function(type,team=0){const ok=buy.call(this,type,team);if(ok&&team===0)this.autoFuseUnits();return ok;};
p.updateLuckyUnit=function(u){
 if(!(this.starExperiment&&u.star>=2&&u.team===0))return lucky.call(this,u);
 u.luckyChannels??=Array.from({length:3},(_,i)=>({roll:i===0?u.luckyRoll:null,next:u.nextLuckyAt}));
 for(const [i,ch] of u.luckyChannels.entries()){u.activeLuckyChannel=i;u.luckyRoll=ch.roll;u.nextLuckyAt=ch.next;lucky.call(this,u);ch.roll=u.luckyRoll;ch.next=u.nextLuckyAt;}
 delete u.activeLuckyChannel;
 u.luckyRoll=u.luckyChannels[0].roll;u.nextLuckyAt=u.luckyChannels[0].next;
};
// Three full roulette draws are the lucky jeep's star bonus; do not multiply payloads again.
p.luckyOdds=function(u){return this.isThreeStarExperiment()&&u?.team===0&&u.star===3?this.evolutionLuckyOdds(u,RULES.three.lucky[this.evolutionEnabled(u)?'evolved':'normal']):odds.call(this,u);};
p.luckyScale=function(u){return scale.call(this,u)/(this.starExperiment&&u.team===0&&u.star>=2?(u.star===3&&this.isThreeStarExperiment()?RULES.three.damage:RULES.damage):1);};
// One attack budget split into two bullets. Direct focus orders still concentrate fire.
p.fireUnitProjectiles=function(u,target,attack,s=this.stats(u)){
 if(!(this.isThreeStarExperiment()&&u.team===0&&u.star===3&&u.type==='sniper'))return projectiles.call(this,u,target,attack,s);
 const other=this.focusTarget&&!this.focusAutomatic?target:this.selectCombatTarget(u,this.combatCandidates().filter(t=>t!==target),this.attackingEnemies(),s)||target,targets=[target,other],shots=[];
 for(const [i,t] of targets.entries()){const bullet=projectiles.call(this,u,t,{...attack,damage:attack.damage/RULES.three.sniperShots},s)[0],angle=Math.atan2(t.y-u.y,t.x-u.x),side=i?3:-3;bullet.x-=Math.sin(angle)*side;bullet.y+=Math.cos(angle)*side;shots.push(bullet);}
 this.effects.push({kind:'tracer',x:shots[1].x,y:shots[1].y,tx:other.x,ty:other.y,t:.12,max:.12,team:u.team});return shots;
};
p.update=function(dt){if(this.phase==='playing'){this.refreshTwoStarHealth();this.autoFuseUnits();}return update.call(this,dt);};
root.FrontTwoStar={RULES};if(typeof module!=='undefined'&&module.exports)module.exports=root.FrontTwoStar;
})(typeof window==='undefined'?globalThis:window);
