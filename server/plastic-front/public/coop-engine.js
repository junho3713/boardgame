/* Two independently growing allied squads on the original living-room map. */
(function(root){'use strict';
const node=typeof module!=='undefined'&&module.exports,api=node?require('./engine.js'):root;if(node){require('./sword-boss.js');require('./two-star.js');}
const Game=api.FrontGame,Profile=api.FrontProfile;
const controls=['input','moveOrder','focusTarget','focusAutomatic','formationFacing','formationEnemy','ultimate','cash','tech','abilities','evolved','profile','level','xp','runGold','losses','salvaged','nextRecoveryAt','cardShownCounts','choiceKind','currentOptions','turnChoice','pendingChoice','retreated','lastCommanderLoss','stageSupplied','rallyUntil','rallyReady','constructionLine','mageShieldQuest','laserExposureQuest','medicSkinId','fieldSupplyState'];
class CoopGame extends Game{
 constructor(events={},settings={}){
  super(events,new Profile(),{map:'livingroom-star',medicSkin:settings.medicSkins?.[0]});
  this.coop=true;this.coopOwner=0;this.coopStates=[{},{}];this.coopChoosing=[false,false];this.coopRounds=[0,0];this.coopInvulnerable=[0,0];this.coopSpawnScale=1.8;this.coopSpawnRemainder=0;
  for(const key of controls){this.coopStates[0][key]=this[key];this.coopStates[1][key]=key==='profile'?new Profile():structuredClone(this[key]);}
  this.coopStates[1].medicSkinId=settings.medicSkins?.[1]==='rina'?'rina':'classic';
  for(const state of this.coopStates){state.bossRewards=0;state.bossClaimed=0;}
  for(const u of this.units)if(u.team===0)u.coopOwner=0;
  for(const owner of [0,1])if(settings.reinforcementPlans?.[owner])this.withOwner(owner,()=>this.setReinforcementPlan(settings.reinforcementPlans[owner]));
  const c=this.commander(0);
  this.withOwner(1,()=>{const blue=this.addUnit(0,'leader',c.x+160,c.y+20);for(const dx of [-40,40])this.addUnit(0,'rifle',blue.x+dx,blue.y+70);});
  for(const u of this.units)if(u.team===0&&u.type!=='leader')Object.assign(u,this.formationPoint(u,this.withOwner(u.coopOwner,()=>this.commander(0))));
  for(const u of this.units)if(u.team===0)this.resolvePosition(u);
 }
 coopSelectOwner(owner){
  if(!this.coop||owner===this.coopOwner)return;owner=owner===1?1:0;
  const previous=this.coopStates[this.coopOwner],next=this.coopStates[owner];
  for(const key of controls){previous[key]=this[key];this[key]=next[key];}
  previous.bossRewards=this.bossState.rewards;previous.bossClaimed=this.bossState.claimed;this.bossState.rewards=next.bossRewards;this.bossState.claimed=next.bossClaimed;
  this.coopOwner=owner;
 }
 withOwner(owner,fn){const before=this.coopOwner;this.coopSelectOwner(owner);try{return fn();}finally{this.coopSelectOwner(before);}}
 scoped(fn){const before=this.coopScoped;this.coopScoped=true;try{return fn();}finally{this.coopScoped=before;}}
 owned(owner=this.coopOwner){return this.units.filter(u=>u.team===0&&u.coopOwner===owner&&u.hp>0);}
 commander(team){if(!this.coop||team!==0)return super.commander(team);return this.units.find(u=>u.team===0&&u.type==='leader'&&u.coopOwner===this.coopOwner)||this.bases[0];}
 alive(team){const all=super.alive(team);return this.coop&&this.coopScoped&&team===0?all.filter(u=>u.coopOwner===this.coopOwner):all;}
 stats(u){return this.coop&&u.team===0&&Number.isInteger(u.coopOwner)?this.withOwner(u.coopOwner,()=>super.stats(u)):super.stats(u);}
 addUnit(team,...args){const u=super.addUnit(team,...args);if(this.coop&&team===0)u.coopOwner=this.coopOwner;return u;}
 formationPoint(u,anchor,facing){if(!this.coop||u.team!==0)return super.formationPoint(u,anchor,facing);return this.withOwner(u.coopOwner,()=>this.scoped(()=>super.formationPoint(u,anchor,facing)));}
 commanderMoveSpeed(...args){return this.scoped(()=>super.commanderMoveSpeed(...args));}
 damage(target,amount,source){
  if(this.coop&&target.team===0&&this.time<this.coopInvulnerable[target.coopOwner])return;
  const owner=source?.team===0?source.coopOwner:target.team===0?target.coopOwner:this.coopOwner;
  return this.coop&&Number.isInteger(owner)?this.withOwner(owner,()=>super.damage(target,amount,source)):super.damage(target,amount,source);
 }
 applyPoison(target,...args){if(this.coop&&target.team===0&&this.time<this.coopInvulnerable[target.coopOwner])return;return super.applyPoison(target,...args);}
 defenseFactor(target,source){return this.coop&&target.team===0&&Number.isInteger(target.coopOwner)?this.withOwner(target.coopOwner,()=>super.defenseFactor(target,source)):super.defenseFactor(target,source);}
 setMoveOrder(...args){return this.scoped(()=>super.setMoveOrder(...args));}
 followCommander(){return this.scoped(()=>super.followCommander());}
 buy(...args){return this.scoped(()=>super.buy(...args));}
 choose(...args){return this.scoped(()=>super.choose(...args));}
 unitCount(type,team=0){return this.coop&&team===0?this.owned().filter(u=>u.type===type).length:super.unitCount(type,team);}
 fusionCandidates(...args){return this.scoped(()=>super.fusionCandidates(...args));}
 starCount(...args){return this.scoped(()=>super.starCount(...args));}
 twoStarCount(...args){return this.scoped(()=>super.twoStarCount(...args));}
 autoFuseUnits(){if(!this.coop||this.coopScoped)return super.autoFuseUnits();for(const owner of [0,1])this.withOwner(owner,()=>this.scoped(()=>super.autoFuseUnits()));}
 updateFormationFacing(dt){if(!this.coop)return super.updateFormationFacing(dt);for(const owner of [0,1])this.withOwner(owner,()=>this.scoped(()=>{if(this.coopChoosing[owner]){this.input={x:0,y:0};this.moveOrder=null;}if(this.input.x||this.input.y)this.moveOrder=null;if(this.focusTarget?.hp<=0)this.focusTarget=null;super.updateFormationFacing(dt);}));}
 updateUltimate(){if(!this.coop)return super.updateUltimate();for(const owner of [0,1])this.withOwner(owner,()=>super.updateUltimate());}
 coopIncome(dt){for(const owner of [0,1])this.withOwner(owner,()=>{this.cash[0]+=this.income(0)*dt;super.gainXP(dt*1.3);});}
 coopCollectPickups(){for(const p of this.pickups){if(!p.active)continue;const leader=this.units.filter(u=>u.team===0&&u.type==='leader'&&u.hp>0&&Math.hypot(p.x-u.x,p.y-u.y)<60).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];if(leader)this.withOwner(leader.coopOwner,()=>{this.collectFieldSupply(p);});}}
 levelCheck(){
  if(!this.coop)return super.levelCheck();if(this.phase!=='playing')return;
  for(const owner of [0,1])this.withOwner(owner,()=>{if(this.coopChoosing[owner])return;super.levelCheck();if(this.phase==='choice'){this.coopChoosing[owner]=true;this.coopRounds[owner]++;this.coopInvulnerable[owner]=this.time+5;this.moveOrder=null;this.input={x:0,y:0};this.phase='playing';}});
 }
 recoveryReady(){return !this.coopChoosing?.[this.coopOwner]&&this.scoped(()=>super.recoveryReady());}
 beginRecovery(){const ok=super.beginRecovery();if(ok&&this.coop){this.coopChoosing[this.coopOwner]=true;this.coopRounds[this.coopOwner]++;this.phase='playing';}return ok;}
 build(kind){const n=this.buildings.length,ok=super.build(kind);if(ok&&this.coop&&this.buildings.length>n)this.buildings.at(-1).coopOwner=this.coopOwner;return ok;}
 buildingCount(kind){return this.coop?this.buildings.filter(b=>b.kind===kind&&b.hp>0&&b.coopOwner===this.coopOwner).length:super.buildingCount(kind);}
 refreshBuildingStats(){if(!this.coop)return super.refreshBuildingStats();for(const b of this.buildings||[])if(b.team===0&&['mgTower','missileBase','repairBot'].includes(b.kind))this.withOwner(b.coopOwner,()=>{const spec=this.buildingStats(b.kind,b.team),ratio=b.hp>0?b.hp/Math.max(1,b.maxHp):0;Object.assign(b,spec,{maxHp:spec.hp,hp:spec.hp*ratio});});}
 updateMageQuest(){if(!this.coop)return super.updateMageQuest();for(const owner of [0,1])this.withOwner(owner,()=>this.scoped(()=>super.updateMageQuest()));}
 updateLaserQuest(){if(!this.coop)return super.updateLaserQuest();for(const owner of [0,1])this.withOwner(owner,()=>this.scoped(()=>super.updateLaserQuest()));}
 recordLaserExposure(p,target,dt){return this.coop&&target?.team===0?this.withOwner(target.coopOwner,()=>super.recordLaserExposure(p,target,dt)):super.recordLaserExposure(p,target,dt);}
 mageShieldUsed(u){if(!this.coop)return super.mageShieldUsed(u);for(const owner of [0,1])this.withOwner(owner,()=>this.scoped(()=>{if(this.owned().some(a=>Math.hypot(a.x-u.x,a.y-u.y)<900))super.mageShieldUsed(u);}));}
 roomWaveCap(){return Math.ceil(super.roomWaveCap()*(this.coop?this.coopSpawnScale:1));}
 roomCanSpawn(type){if(type==='sniper'&&this.enemySniperCount()>=2)return false;if(!this.coop)return super.roomCanSpawn(type);const caps=(api.ROOM_CAMPAIGN||root.FrontRoomCampaign).config.caps;return this.roomEnemyCount()<this.roomWaveCap()&&this.roomEnemyCount(type)<Math.ceil((caps[type]??Infinity)*this.coopSpawnScale);}
 roomWavePlan(){const plan=super.roomWavePlan();if(this.coop){const exact=plan.count*this.coopSpawnScale+(this.coopSpawnRemainder||0);plan.count=Math.floor(exact+1e-8);}return plan;}
 updateRoomWaves(){const before=this.roomCampaign?.nextSpawnAt,base=super.roomWavePlan().count;super.updateRoomWaves();if(this.coop&&this.roomCampaign?.nextSpawnAt!==before&&this.time>=before)this.coopSpawnRemainder=(base*this.coopSpawnScale+(this.coopSpawnRemainder||0))%1;}
 finish(result,reason){if(this.coop&&result==='lose'&&reason==='commander'&&[0,1].some(owner=>this.withOwner(owner,()=>this.retreated)<3))return;return super.finish(result,reason);}
}
root.FrontCoopGame=CoopGame;if(node)module.exports={CoopGame};
})(typeof window==='undefined'?globalThis:window);
