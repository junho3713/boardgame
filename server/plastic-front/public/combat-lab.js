/* Isolated test fixtures; attacks, projectiles and support skills use the production engine. */
(function(root){'use strict';
 const api=typeof module!=='undefined'&&module.exports?require('./engine.js'):root;
 if(typeof module!=='undefined'&&module.exports)require('./two-star.js');
 const Game=api.FrontGame,TYPES=api.TYPES||root.FrontTypes,EVOS=api.EVOLUTIONS||root.FrontEvolutions;
 const TOYS=['toyStunner','toyTurtle','toyDecoyMaker','toyDrum'];
 const ENEMIES={ant:'개미',rifle:'소총병',tank:'일반 전차',rhinoBeetle:'장수풍뎅이 보스',hornet:'장수말벌 보스',bayonetCaptain:'인간형 보스',crimsonAce:'진홍전차 보스'};
 const BOSSES=new Set(['rhinoBeetle','hornet','bayonetCaptain','crimsonAce']);
 const MODES={lucky:'레토나',support:'서포토이',evolution:'진화 병과',ultimate:'대장 궁극기'};
 const OUTCOMES={missiles:'777 · 미사일 7발',bossKiller:'보스킬러',mine:'지뢰',glue:'끈끈이',spray:'살충 스프레이',blank:'꽝'};
 const COMMANDERS={sarge:'대장',shino:'시노',blaze:'화염방사 대장',hwarin:'화린',shion:'시온'};
 const num=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.floor(Number(v)))):fallback;
 function clean(v={}){
  const mode=Object.hasOwn(MODES,v.mode)?v.mode:'lucky',outcome=Object.hasOwn(OUTCOMES,v.outcome)?v.outcome:'missiles';
  let enemy=Object.hasOwn(ENEMIES,v.enemy)?v.enemy:'ant';if(mode==='lucky'&&outcome==='bossKiller'&&!BOSSES.has(enemy))enemy='rhinoBeetle';
  return{mode,outcome,enemy,toy:TOYS.includes(v.toy)?v.toy:'toyStunner',troop:Object.hasOwn(EVOS,v.troop)?v.troop:'tank',commander:Object.hasOwn(COMMANDERS,v.commander)?v.commander:'sarge',stars:num(v.stars,1,3,1),level:num(v.level,1,30,10),count:num(v.count,1,60,24),tier:[0,1,2].includes(Number(v.tier))&&v.tier!==''?Number(v.tier):-1,layout:['cluster','line','ring'].includes(v.layout)?v.layout:'cluster',moving:!!v.moving,highHealth:v.highHealth!==false,evolved:mode==='lucky'&&outcome==='bossKiller'||v.evolved!==false};
 }
 class Lab extends Game{
  constructor(options={},events={}){
   const config=clean(options);super(events,undefined,{map:'livingroom-star3',commander:config.commander==='hwarin'?'blaze':config.commander,flameSkin:config.commander==='hwarin'?'hwarin':'classic'});this.lab=config;this.labStats={damage:0,healing:0,hits:0,casts:0,affected:new Set()};
   this.start();this.units=this.units.filter(u=>u.type==='leader'&&u.team===0);for(const k of ['obstacles','defenses','structures','buildings','pickups','effects'])this[k]=[];
   this.bases.forEach(b=>{b.hp=0;b.hidden=true;});this.bossIntro=null;this.level=config.mode==='ultimate'?Math.max(10,config.level):config.level;this.world={id:'livingroom',width:3000,height:8000,scale:1};this.camera={x:1500,y:6000};this.input={x:0,y:0};
   const leader=this.commander(0);Object.assign(leader,{x:1200,y:6000,face:0,cooldown:1e6});leader.hp=leader.maxHp=this.stats(leader).hp;
   if(config.mode==='support'){this.actor=this.addSupportToy(config.toy);Object.assign(this.actor,{x:1260,y:6000,toyUpgradeLevel:config.stars-1});this.refreshSupportToyCooldown(this.actor);}
   else if(config.mode==='ultimate'){this.actor=leader;Object.assign(leader,{x:1260,y:6000});}
   else{const type=config.mode==='lucky'?'lucky':config.troop;this.tech[0][type]=5;this.evolved[type]=config.mode==='evolution'||config.evolved;if(this.evolved[type])this.abilities[EVOS[type].ability]=5;this.actor=this.addUnit(0,type,1260,6000);this.actor.star=config.stars;this.actor.hp=this.actor.maxHp=this.stats(this.actor).hp;}
   Object.assign(this.actor,{face:0,aimFace:0,moveFace:0,turretFace:0,cooldown:1e6});
   this.labTargets=[];for(let i=0;i<config.count;i++){
    let x,y;if(config.layout==='ring'){const a=i*Math.PI*2/config.count;x=this.actor.x+Math.cos(a)*210;y=this.actor.y+Math.sin(a)*210;}
    else if(config.layout==='line'){x=this.actor.x+100+i*280/Math.max(1,config.count-1);y=this.actor.y;}
    else{const cols=Math.ceil(Math.sqrt(config.count)),row=Math.floor(i/cols);x=this.actor.x+115+row*50;y=this.actor.y+(i%cols-(cols-1)/2)*50;}
    const t=this.addUnit(2,config.enemy,x,y,true);t.boss=BOSSES.has(config.enemy);t.cooldown=1e6;t.face=Math.PI;t.hp=t.maxHp=config.highHealth?1e6:this.stats(t).hp;this.labTargets.push(t);
   }
   if(config.mode==='evolution'&&config.troop==='medic')for(let i=0;i<3;i++){const t=this.addUnit(0,'rifle',this.actor.x+55+i*35,this.actor.y+90);t.hp=t.maxHp*.25;t.cooldown=1e6;t.poisonUntil=30;t.poisonDps=3;t.poisonNextAt=1;}
  }
  // Training contains no waves, economy, recruitment, campaign completion or profile persistence.
  updateMission(){} updateSwarm(){} updateBosses(){} updateArtillery(){} updateDefenses(){} updateBuildings(){} updateGuardianRespawns(){} updateMageQuest(){} updateLaserQuest(){} syncEnemyGrowth(){} gainXP(){} levelCheck(){} awardGold(){} updateLuckyUnit(){} updateEnemyLucky(){} separateCrowd(){} navigate(){} autoFuseUnits(){} income(){return 0;}
  updateRareSupplies(){} updateRareSupplySecurity(){}
  visible(){return true;}
  move(u,...args){if(u.team!==0&&!this.lab?.moving)return;return super.move(u,...args);}
  damage(t,amount,source){if(t.team===0)return;const before=t.hp;super.damage(t,amount,source);if(this.labStats&&t.hp<before){this.labStats.damage+=before-t.hp;this.labStats.hits++;this.labStats.affected.add(t.id);}}
  heal(t,amount,source){const before=t.hp;const result=super.heal(t,amount,source);if(this.labStats)this.labStats.healing+=Math.max(0,t.hp-before);return result;}
  useSupportToy(u){return this.labCasting?super.useSupportToy(u):false;}
  rollSupportToyTier(u){if(this.lab.tier<0)return super.rollSupportToyTier(u);const tier=this.lab.tier;u.toyProcTier=tier;u.toyHighlightUntil=this.time+(tier?1.6:0);return tier;}
  updateMedicHealing(u,...args){if(this.lab&&this.time>=(this.labHealingUntil||0))return;return super.updateMedicHealing(u,...args);}
  cast(){
   if(this.phase!=='playing')return false;const u=this.actor,c=this.lab;
   if(c.mode==='support'){u.toyNextAt=this.time;this.labCasting=true;try{if(!this.useSupportToy(u))return false;}finally{this.labCasting=false;}}
   else if(c.mode==='lucky'||c.mode==='evolution'&&c.troop==='lucky'){u.luckyChannels=[];for(let i=0;i<(c.stars>=2?3:1);i++){u.activeLuckyChannel=i;const kind=c.mode==='lucky'?c.outcome:'missiles',roll={kind,resolved:true,startedAt:this.time,endsAt:this.time,enhanced:!!this.evolved.lucky,bossKillerAvailable:kind==='bossKiller'};u.luckyRoll=roll;u.luckyChannels.push({roll});this.castLucky(u,kind);}delete u.activeLuckyChannel;}
   else if(c.mode==='ultimate'){this.ultimate={readyAt:this.time,activeUntil:0};if(!this.useUltimate())return false;}
   else if(c.troop==='medic'){this.labHealingUntil=this.time+12;u.cooldown=0;this.updateMedicHealing(u);}
   else{const target=this.labTargets.find(t=>t.hp>0);if(!target)return false;const attack=this.attackRoll(u);if(c.troop==='mortar')this.launchMortar(u,target,attack);else this.fireUnitProjectiles(u,target,attack,this.stats(u));u.cooldown=this.stats(u).rate;this.labFireUntil=this.time+8;}
   this.labStats.casts++;return true;
  }
  update(dt){
   if(this.phase!=='playing')return;
   // Permit only the selected manually-triggered attack. Enemy AI cannot injure the squad.
   for(const u of this.units)if(u!==this.actor||this.time>=Math.max(this.labFireUntil||0,this.labHealingUntil||0))u.cooldown=1e6;
   if(this.lab.moving)for(const t of this.labTargets){if(t.hp<=0||t.toyKnockback||this.time<(t.toyStunUntil||0))continue;const goal=this.supportBait()||this.actor,d=Math.hypot(goal.x-t.x,goal.y-t.y);if(d>45)this.move(t,goal.x-t.x,goal.y-t.y,dt,50);}
   super.update(dt);
   for(const t of this.labTargets)if(t.toyKnockback||this.time<(t.toyStunUntil||0)||this.time<(t.luckySlowUntil||0))this.labStats.affected.add(t.id);
  }
  result(){return{...this.labStats,affected:this.labStats.affected.size,alive:this.labTargets.filter(t=>t.hp>0).length,time:this.time};}
  duplicate(){if(!this.isSupportToy(this.actor))return false;return this.upgradeSupportToy(this.actor);}
  resolveSupportToyOffer(id){const phase=this.phase,old=this.actor;this.phase='playing';try{const ok=super.resolveSupportToyOffer(id);if(ok&&old.toyRetired){this.actor=this.supportToys().find(t=>t.toySlot===old.toySlot);Object.assign(this.actor,{x:1260,y:6000});this.lab.toy=this.actor.type;}return ok;}finally{this.phase=phase;}}
  offer(){if(!this.isSupportToy(this.actor)||this.supportToyOffer())return false;if(this.supportToys().length<2){const t=this.addSupportToy(this.actor.type==='toyTurtle'?'toyStunner':'toyTurtle');Object.assign(t,{x:1320,y:6160});}const type=TOYS.find(type=>!this.supportToys().some(t=>t.type===type));return this.collectSupportToy({active:true,x:1300,y:6000},type);}
 }
 const result={Lab,clean,MODES,TOYS,ENEMIES,OUTCOMES,COMMANDERS};if(typeof module!=='undefined'&&module.exports)module.exports=result;else root.FrontCombatLab=result;
})(typeof window==='undefined'?globalThis:window);
