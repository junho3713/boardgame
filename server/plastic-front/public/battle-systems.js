/* Shared battle tick for the page, cooperative server, and background worker. */
(function(root){'use strict';
class BattleSystem{
 step(game,frame){
  return this.update(game,frame)!==false;
 }
}

class BattlePreparation extends BattleSystem{
 update(game,frame){
  if(game.phase==='playing'){
   game.refreshTwoStarHealth?.();
   game.autoFuseUnits?.();
   game.updateSupplyStrikes?.();
   game.expireRareSupplies?.();
   game.updateRareSupplySecurity?.();
  }
  frame.since=game.time;
  frame.previousMineTargets=game.captureBlockMineTargets?.();
 }
}

class BattleClock extends BattleSystem{
 update(game,{dt}){
  if(game.phase!=='playing')return false;
  if(game.bossIntro?.remaining>0){
   game.bossIntro.remaining=Math.max(0,game.bossIntro.remaining-dt);
   return false;
  }
  game.time+=dt;
 }
}

class CampaignSystem extends BattleSystem{
 update(game,{dt}){
  game.updateLuckyFlashes?.();
  game.syncEnemyGrowth();
  game.updateGuardianRespawns();
  game.updateMageQuest();
  game.updateLaserQuest();

  if(game.coop)game.coopIncome(dt);
  else for(let team=0;team<2;team++)game.cash[team]+=game.income(team)*dt;
  if(!game.coop&&game.mode==='duel')game.gainXP(dt*3.1);
  if(game.mode==='duel')game.enemyAct();
  else if(game.mode==='pve')game.updateMission(dt);
  if(game.phase!=='playing')return false;

  game.updateSwarm();
  game.updateBosses();
  if(game.bossIntro?.remaining>0)return false;
  game.spawnAssassinGroup?.();
  game.updateArtillery();
  if(game.mode==='pve')game.updateDefenses(dt);
  game.updateBuildings(dt);
  game.coopSelectOwner?.(0);
  return game.phase==='playing';
 }
}

class CommandSystem extends BattleSystem{
 update(game,frame){
  if(game.focusTarget&&(game.focusTarget.hp<=0||!game.visible(game.focusTarget)))game.focusTarget=null;
  if(game.input.x||game.input.y)game.moveOrder=null;
  frame.player=game.commander(0);
  frame.enemy=game.commander(1);
  game.updateFormationFacing(frame.dt);
  game.updateUltimate();
  if(game.phase!=='playing')return false;

  const pressure=game.pressure().tier;
  if(pressure>game.lastPressure){
   game.lastPressure=pressure;
   game.notify('toast','위협 Lv.'+(pressure+1)+' · 증원 증가 / 강한 적 출현 / 새 적의 체력·공격력 상승');
  }
 }
}

class UnitSystem extends BattleSystem{
 update(game,frame){
  game.updateEvolutionCombat();
  game.updateSupportToys?.(frame.dt);
  frame.combatCandidates=game.updateBattleUnits(frame.dt,frame.enemy);
  game.coopSelectOwner?.(0);
  const player=frame.player;
  if(player.ultimatePose?.active)player.face=player.aimFace=player.ultimatePose.angle;
 }
}

class SupportSystem extends BattleSystem{
 update(game,{dt,player}){
  game.updateDropPods?.();
  const live=game.units.filter(unit=>unit.hp>0);
  game.updateLuckyObjects(dt);
  game.separateCrowd(live);
  for(const unit of live)game.resolvePosition(unit);

  // Healing uses the final positions after every squad has moved.
  for(const unit of live){
   if(unit.team!==0||unit.type!=='medic')continue;
   if(game.coop)game.withOwner(unit.coopOwner,()=>game.updateMedicHealing(unit));
   else game.updateMedicHealing(unit);
  }
  if(game.coop){
   game.coopCollectPickups();
   if(game.experienceDrops.length)for(const owner of [0,1])game.withOwner(owner,()=>game.updateExperienceDrops(dt));
  }else{
   for(const pickup of game.pickups){
    if(pickup.active&&player.hp>0&&Math.hypot(pickup.x-player.x,pickup.y-player.y)<60)game.collectFieldSupply(pickup);
   }
   game.updateExperienceDrops(dt);
  }
 }
}

class ProjectileSystem extends BattleSystem{
 update(game,{dt,combatCandidates}){
  game.updateBattleProjectiles(dt,combatCandidates);
  game.updateFoamShots?.(dt);
  game.updateAssassinStars?.(dt);
  game.updateRotationHazards?.(dt);
  game.updateMortars();
  game.updateButterflyGusts();
  game.updateMedicCleanses();
  game.updatePoisons();
 }
}

class BattleResolution extends BattleSystem{
 update(game,{dt}){
  game.units=game.units.filter(unit=>game.isSupportToy?.(unit)&&!unit.toyRetired||unit.type==='leader'||unit.guardianRespawn||unit.hp>0||unit.diedAt===undefined||game.time-unit.diedAt<(unit.type==='medic'&&unit.team===0&&unit.appearance==='rina'?1.2:.8));
  game.shots=game.shots.filter(shot=>shot.life>0);
  for(const effect of game.effects)effect.t=Number.isFinite(effect.visualUntil)?effect.visualUntil-game.time:effect.t-dt;
  game.effects=game.effects.filter(effect=>effect.t>0);
  if(game.mode==='duel'&&game.time>=180&&game.phase==='playing'){
   const difference=game.bases[0].hp-game.bases[1].hp;
   game.finish(difference>0?'win':difference<0?'lose':'draw','time');
   return;
  }
  game.levelCheck();
 }
}

class BattleCompletion extends BattleSystem{
 update(game,{since,previousMineTargets}){
  // An upgrade choice can open after the clock advanced. Complete that movement first.
  if(game.time>since)game.updateBlockMines?.(previousMineTargets,since);
  game.updateRareSupplies?.();
 }
}

class BattleSystems{
 #preparation=new BattlePreparation();
 #simulation=[
  new BattleClock(),new CampaignSystem(),new CommandSystem(),new UnitSystem(),
  new SupportSystem(),new ProjectileSystem(),new BattleResolution()
 ];
 #completion=new BattleCompletion();

 update(game,dt){
  const frame={dt:Math.min(dt,.05)};
  this.#preparation.step(game,frame);
  for(const system of this.#simulation){
   if(!system.step(game,frame))break;
  }
  this.#completion.step(game,frame);
 }
}

const systems=new BattleSystems();
if(typeof module!=='undefined'&&module.exports)module.exports=systems;
else root.FrontBattleSystems=systems;
})(typeof window==='undefined'?globalThis:window);
