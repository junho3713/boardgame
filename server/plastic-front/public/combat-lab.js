/* Isolated test fixtures; attacks, projectiles and support skills use the production engine. */
(function(root){'use strict';
 const api=typeof module!=='undefined'&&module.exports?require('./engine.js'):root;
 if(typeof module!=='undefined'&&module.exports)require('./two-star.js');
 const Game=api.FrontGame,TYPES=api.TYPES||root.FrontTypes,EVOS=api.EVOLUTIONS||root.FrontEvolutions;
 const TOYS=['toyStunner','toyTurtle','toyDecoyMaker','toyDrum'];
 const ENEMIES={bubbleOctopus:TYPES.bubbleOctopus.name,pirateCannon:TYPES.pirateCannon.name,ant:'개미',rifle:'소총병',tank:'일반 전차',rhinoBeetle:'장수풍뎅이 보스',hornet:'장수말벌 보스',bayonetCaptain:'인간형 보스',crimsonAce:'진홍전차 보스'};
 const BOSSES=new Set(['rhinoBeetle','hornet','bayonetCaptain','crimsonAce']);
 const MODES={lucky:'레토나',support:'서포토이',evolution:'진화 병과',ultimate:'대장 궁극기'};
 const OUTCOMES={missiles:'777 · 미사일 7발',bossKiller:'보스킬러',mine:'섬광탄',glue:'끈끈이',spray:'살충 스프레이',blank:'꽝'};
 const COMMANDERS={sarge:'대장',shino:'시노',blaze:'화염방사 대장',hwarin:'화린',shion:'시온'};
 const num=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.floor(Number(v)))):fallback;
 function clean(v={}){
  const mode=Object.hasOwn(MODES,v.mode)?v.mode:'lucky',outcome=Object.hasOwn(OUTCOMES,v.outcome)?v.outcome:'missiles';
  let enemy=Object.hasOwn(ENEMIES,v.enemy)?v.enemy:'ant';if(mode==='lucky'&&outcome==='bossKiller'&&!BOSSES.has(enemy))enemy='rhinoBeetle';
  return{mode,outcome,enemy,toy:TOYS.includes(v.toy)?v.toy:'toyStunner',troop:Object.hasOwn(EVOS,v.troop)?v.troop:'tank',commander:Object.hasOwn(COMMANDERS,v.commander)?v.commander:'sarge',stars:num(v.stars,1,3,1),level:num(v.level,1,30,10),count:num(v.count,1,60,24),tier:[0,1,2].includes(Number(v.tier))&&v.tier!==''?Number(v.tier):-1,layout:['cluster','line','ring'].includes(v.layout)?v.layout:'cluster',moving:!!v.moving,highHealth:v.highHealth!==false,evolved:mode==='lucky'&&outcome==='bossKiller'||v.evolved!==false};
 }
 class Lab extends Game{
  constructor(options={},events={}){
   const config=clean(options);super(events,undefined,{map:'livingroom-star',commander:config.commander==='hwarin'?'blaze':config.commander,flameSkin:config.commander==='hwarin'?'hwarin':'classic'});this.lab=config;this.labStats={damage:0,healing:0,hits:0,casts:0,affected:new Set()};
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
   if(config.mode==='evolution'&&config.troop==='drone'){
    for(const [type,dx,dy] of [['rifle',-78,36],['machinegun',80,54],['sniper',-62,-54]]){
     const ally=this.addUnit(0,type,leader.x+dx,leader.y+dy);
     ally.cooldown=1e6;
    }
   }
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
  updateSupportDrone(u,...args){if(this.labStats.casts>0)return super.updateSupportDrone(u,...args);}
  cast(){
   if(this.phase!=='playing')return false;const u=this.actor,c=this.lab;
   if(c.mode==='support'){u.toyNextAt=this.time;this.labCasting=true;try{if(!this.useSupportToy(u))return false;}finally{this.labCasting=false;}}
   else if(c.mode==='lucky'||c.mode==='evolution'&&c.troop==='lucky'){u.luckyChannels=[];for(let i=0;i<(c.stars>=2?3:1);i++){u.activeLuckyChannel=i;const kind=c.mode==='lucky'?c.outcome:'missiles',roll={kind,resolved:true,startedAt:this.time,endsAt:this.time,enhanced:!!this.evolved.lucky,bossKillerAvailable:kind==='bossKiller'};u.luckyRoll=roll;u.luckyChannels.push({roll});this.castLucky(u,kind);}delete u.activeLuckyChannel;}
   else if(c.mode==='ultimate'){this.ultimate={readyAt:this.time,activeUntil:0};if(!this.useUltimate())return false;}
   else if(c.troop==='medic'){this.labHealingUntil=this.time+12;u.cooldown=0;this.updateMedicHealing(u);}
   else if(c.troop==='drone'){u.nextDroneScanAt=u.nextDroneShieldAt=this.time;delete u.droneScan;}
   else{const target=this.labTargets.find(t=>t.hp>0);if(!target)return false;const attack=this.attackRoll(u);if(c.troop==='mortar')this.launchMortar(u,target,attack);else this.fireUnitProjectiles(u,target,attack,this.stats(u));u.cooldown=this.stats(u).rate;this.labFireUntil=this.time+8;}
   this.labStats.casts++;return true;
  }
  update(dt){
   if(this.phase!=='playing')return;
   // Permit only the selected manually-triggered attack. Enemy AI cannot injure the squad.
   for(const u of this.units)if(u!==this.actor||this.time>=Math.max(this.labFireUntil||0,this.labHealingUntil||0))u.cooldown=1e6;
   if(this.lab.moving)for(const t of this.labTargets){if(t.hp<=0||t.toyKnockback||this.time<(t.toyStunUntil||0))continue;const goal=this.supportBait()||this.actor,d=Math.hypot(goal.x-t.x,goal.y-t.y);if(d>45)this.move(t,goal.x-t.x,goal.y-t.y,dt,50);}
   super.update(dt);
   for(const t of this.labTargets)if(t.toyKnockback||this.time<(t.toyStunUntil||0)||this.time<(t.luckySlowUntil||0)||this.time<(t.luckyFlash?.until||0))this.labStats.affected.add(t.id);
  }
  result(){return{...this.labStats,affected:this.labStats.affected.size,alive:this.labTargets.filter(t=>t.hp>0).length,time:this.time};}
  duplicate(){if(!this.isSupportToy(this.actor))return false;return this.upgradeSupportToy(this.actor);}
  resolveSupportToyOffer(id){const phase=this.phase,old=this.actor;this.phase='playing';try{const ok=super.resolveSupportToyOffer(id);if(ok&&old.toyRetired){this.actor=this.supportToys().find(t=>t.toySlot===old.toySlot);Object.assign(this.actor,{x:1260,y:6000});this.lab.toy=this.actor.type;}return ok;}finally{this.phase=phase;}}
  offer(){if(!this.isSupportToy(this.actor)||this.supportToyOffer())return false;if(this.supportToys().length<2){const t=this.addSupportToy(this.actor.type==='toyTurtle'?'toyStunner':'toyTurtle');Object.assign(t,{x:1320,y:6160});}const type=TOYS.find(type=>!this.supportToys().some(t=>t.type===type));return this.collectSupportToy({active:true,x:1300,y:6000},type);}
 }
 class PlayLab extends Lab{
  constructor(options={},events={}){
   super({...options,count:options.count??8,highHealth:options.highHealth===true},events);
   this.lab.skillInterval=num(options.skillInterval,5,15,5);this.autoSkills=options.autoSkills!==false;
   this.units=this.units.filter(u=>u.team===0);this.labTargets=[];this.labStats.spawned=0;this.labStats.killed=0;this.labStats.waves=0;
   this.world={id:'livingroom',width:8000,height:8000,scale:1};const leader=this.commander(0),dx=4000-leader.x,dy=4000-leader.y;for(const u of this.units){u.x+=dx;u.y+=dy;u.cooldown=0;}
   this.camera={x:leader.x,y:leader.y};this.viewport={width:1080,height:720};this.nextSkillAt=.6;this.nextWaveAt=3;this.waveSides=[];this.spawnWave(true);
  }
  move(...args){return Game.prototype.move.apply(this,args);}
  navigate(...args){return Game.prototype.navigate.apply(this,args);}
  separateCrowd(...args){return Game.prototype.separateCrowd.apply(this,args);}
  damage(t,amount,source){if(t.team===0){if(amount>0){t.flash=.13;if(this.time>=(t.labHitAt||0)){t.labHitAt=this.time+.5;this.effects.push({kind:'hit',x:t.x,y:t.y-15,t:.13,max:.13,team:0});}}return;}const before=t.hp;super.damage(t,amount,source);if(before>0&&t.hp<=0)this.labStats.killed++;}
  spawnWave(initial=false){
   const leader=this.commander(0),boss=BOSSES.has(this.lab.enemy),room=80-this.units.filter(u=>u.team!==0&&u.hp>0).length,n=Math.min(room,boss?Math.min(4,this.lab.count):this.lab.count);if(n<=0)return;
   const hw=Math.max(300,(this.viewport?.width||1080)/2),hh=Math.max(240,(this.viewport?.height||720)/2),b=this.bounds();
   for(let i=0;i<n;i++){
    const side=(i+this.labStats.waves)%4,lane=(Math.floor(i/4)-(Math.ceil(n/4)-1)/2)*75,center=this.camera||leader;
    let x,y;if(initial){x=leader.x+([1,0,-1,0][side])*285+([0,1,0,1][side])*lane;y=leader.y+([0,1,0,-1][side])*285+([1,0,1,0][side])*lane;}
    else{x=center.x+([1,0,-1,0][side])*(hw+55)+([0,1,0,1][side])*lane;y=center.y+([0,1,0,-1][side])*(hh+55)+([1,0,1,0][side])*lane;}
    x=Math.max(80,Math.min(b.width-80,x));y=Math.max(80,Math.min(b.height-80,y));const t=this.addUnit(2,this.lab.enemy,x,y,true);t.boss=boss;t.assault=true;t.cooldown=.8;t.labEntrySide=side;t.hp=t.maxHp=this.lab.highHealth?1e6:this.stats(t).hp;this.labTargets.push(t);this.waveSides.push(side);this.labStats.spawned++;this.effects.push({kind:'drop',x,y,t:.5,max:.5,team:2});
   }this.labStats.waves++;
  }
  cast(){
   if(this.phase!=='playing')return false;const c=this.lab,u=this.actor;
   if(c.mode==='lucky'&&c.outcome==='bossKiller'&&!this.bossKillerTarget(u))return false;
   if(c.mode==='support'&&u.type==='toyDecoyMaker'&&this.supportBaits().length>=3){const oldest=this.supportBaits()[0];oldest.hp=0;oldest.toyExpires=this.time;}
   if(c.mode==='evolution'&&c.troop!=='lucky'&&c.troop!=='medic'){this.labFireUntil=Infinity;this.labStats.casts++;return true;}
   if(c.mode==='evolution'&&c.troop==='medic')for(const t of this.units)if(t.team===0&&t.type==='rifle'){t.hp=Math.min(t.hp,t.maxHp*.4);t.poisonUntil=this.time+12;}
   return super.cast();
  }
  update(dt){
   if(this.phase!=='playing')return;dt=Math.min(.05,Math.max(0,dt));
   if(this.time+1e-8>=this.nextWaveAt){this.spawnWave();this.nextWaveAt=this.time+3;}
   if(this.autoSkills&&this.time+1e-8>=this.nextSkillAt){const ok=this.cast();this.nextSkillAt=this.time+(ok?this.lab.skillInterval:.25);}
   const continuous=this.lab.mode==='evolution'&&!['lucky','medic'].includes(this.actor.type);
   for(const u of this.units)if(u.team===0){if(u===this.actor&&continuous)u.cooldown=Math.min(u.cooldown,this.stats(u).rate);else if(u.type!=='medic')u.cooldown=1e6;}
   Game.prototype.update.call(this,dt);
   for(const t of this.labTargets)if(t.toyKnockback||this.time<(t.toyStunUntil||0)||this.time<(t.luckySlowUntil||0)||this.time<(t.luckyFlash?.until||0))this.labStats.affected.add(t.id);
   this.labTargets=this.labTargets.filter(t=>t.hp>0);
   // Stragglers cannot consume the cap after the player crosses the arena.
   const leader=this.commander(0);for(const t of this.units)if(t.team!==0&&Math.hypot(t.x-leader.x,t.y-leader.y)>1600)t.hp=0;
  }
  resolveSupportToyOffer(id){const old=this.actor,point={x:old.x,y:old.y},ok=super.resolveSupportToyOffer(id);if(ok&&old!==this.actor)Object.assign(this.actor,point);return ok;}
  offer(){const leader=this.commander(0),ok=super.offer();for(const t of this.supportToys())if(t!==this.actor&&Math.hypot(t.x-leader.x,t.y-leader.y)>500)Object.assign(t,{x:leader.x+70,y:leader.y+80});return ok;}
  result(){return{...super.result(),nextSkill:Math.max(0,this.nextSkillAt-this.time),x:this.commander(0).x,y:this.commander(0).y};}
 }
 const result={Lab,PlayLab,clean,MODES,TOYS,ENEMIES,OUTCOMES,COMMANDERS};if(typeof module!=='undefined'&&module.exports)module.exports=result;else root.FrontCombatLab=result;
})(typeof window==='undefined'?globalThis:window);
