/* Shared realtime orders for the player and the authoritative co-op battle. */
(function(root){'use strict';
 const rules={slots:6,skipGold:30,boxCost:220,feverCost:180,boxReserve:1,boxEvolvedAt:360,fall:.58,height:200,chuteFade:.3};
 const vehicles=['tank','lucky'];
 const isVehicle=type=>vehicles.includes(type);
 const choose=(pool,random)=>pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
 const infantry=['rifle','machinegun','sniper','guntruck','rocket','mortar','medic'];
 function rollBox(roster,random,time=0){
  const roll=random();
  if(roll<.30)return {name:'소소한 꽝',units:[{type:choose(infantry,random)}],refund:50};
  const draw=(flags={})=>({type:choose(roster,random),...flags});
  if(roll<.74)return {name:'일반 분대',units:[draw(),draw()]};
  if(roll<.91||roll<.97&&time<rules.boxEvolvedAt)return {name:'희귀 직구 · 2성',units:[draw({star:2})]};
  if(roll<.97)return {name:'대박 용병 · 진화 2성',units:[draw({star:2,summonEvolved:true})]};
  if(random()<.5)return {name:'잭팟 · 황금 전차',units:[{type:'tank',goldenSummon:true}]};
  return {name:'잭팟 · 황금 레토나',units:[{type:'lucky',goldenSummon:true,summonEvolved:true}]};
 }
 function install({FrontGame,TYPES,ROSTER}){
  const p=FrontGame.prototype;
  p.usesSummoning=function(){return this.realtimeSummons===true&&this.mode==='pve';};
  p.restoreSummoning=function(previous=false){
   this.realtimeSummons=true;
   if(!this.usesSummoning())return;
   if(previous)this.summonSlots=['rifle',...ROSTER.filter(t=>t!=='rifle'&&this.tech[0][t]>0)].slice(0,rules.slots);
   if(this.phase==='choice'&&['periodic','supply','recovery'].includes(this.choiceKind))this.cancelRecovery();
   this.supplyState().pendingSupport=0;
  };

  const initialPool=ROSTER.filter(type=>type!=='medic');
  const shuffle=(items,random)=>{
   const shuffled=[...items];
   for(let i=shuffled.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
   }
   return shuffled;
  };
  p.initialSupportCount=function(){return 1;};
  p.initialOptions=function(avoid=[]){
   const cards=shuffle(initialPool,()=>this.random());
   return [...cards.filter(t=>!avoid.includes(t)),...cards.filter(t=>avoid.includes(t))].slice(0,3);
  };
  p.beginInitialSupport=function(){
   this.choiceKind='initial';this.phase='choice';this.turnChoice=null;this.pendingChoice=null;
   this.currentOptions=this.initialOptions();this.notify('level',this.currentOptions);
  };
  p.chooseInitialSupport=function(type){
   if(!this.usesSummoning()||this.phase!=='choice'||this.choiceKind!=='initial'||this.turnChoice||
      !initialPool.includes(type)||!this.currentOptions.includes(type)||this.summonSlots.length)return false;
   const units=Array.from({length:this.initialSupportCount()},()=>({type}));
   const landings=this.planSummonLandings(units);
   if(!landings)return false;
   this.tech[0][type]=1;this.registerSummon(type);this.dropPods.push(...landings);
   this.currentOptions=[];this.pendingChoice=null;this.choiceKind='level';this.turnChoice=null;this.phase='playing';
   this.notify('change');return true;
  };
  p.canRerollUpgrade=function(){
   return this.phase==='choice'&&!this.turnChoice&&this.rerollCount>0&&
    (this.choiceKind==='initial'||this.choiceKind==='level'&&this.currentOptions.length>0);
  };
  p.rerollUpgrade=function(){
   if(!this.canRerollUpgrade())return false;
   const previous=this.currentOptions;
   this.currentOptions=this.choiceKind==='initial'?this.initialOptions(previous):this.options(previous);
   if(this.skipEmptyLevelUpgrade())return true;
   this.rerollCount--;this.pendingChoice=null;
   this.notify('level',this.currentOptions);return true;
  };
  p.canSkipLevelUpgrade=function(){
   return this.usesSummoning()&&this.phase==='choice'&&this.choiceKind==='level'&&!this.turnChoice;
  };
  p.skipLevelUpgrade=function(){
   if(!this.canSkipLevelUpgrade())return false;
   const label=this.currentOptions.length?'강화 건너뛰기':'강화 완료';
   this.cash[0]+=rules.skipGold;
   this.pendingChoice=null;this.currentOptions=[];this.phase='playing';
   this.notify('toast',label+' · 전투 골드 +'+rules.skipGold+'G');
   this.notify('change');return true;
  };
  p.skipEmptyLevelUpgrade=function(){
   return !this.currentOptions.length&&this.skipLevelUpgrade();
  };
  p.summonSlotsLocked=function(){
   return this.usesSummoning()&&this.summonSlots.length>=rules.slots;
  };
  p.reconcileSummonChoices=function(){
   if(this.phase!=='choice'||!['level','boss'].includes(this.choiceKind)||!this.summonSlotsLocked())return;
   const allowed=this.currentOptions.filter(type=>this.eligibleCard(type)&&
    (this.choiceKind!=='boss'||this.bossRewardEligible(type)));
   if(!allowed.length||allowed.length!==this.currentOptions.length)this.currentOptions=[...new Set([...allowed,...this.options()])].slice(0,3);
   if(this.pendingChoice&&!this.currentOptions.includes(this.pendingChoice.type))this.pendingChoice=null;
   this.skipEmptyLevelUpgrade();
  };
  p.nextSummonSlot=function(type){
   return this.usesSummoning()&&ROSTER.includes(type)&&!this.summonSlots.includes(type)&&!this.summonSlotsLocked()?this.summonSlots.length+1:null;
  };
  p.registerSummon=function(type){
   if(this.nextSummonSlot(type))this.summonSlots.push(type);
  };
  p.mercenaryLevel=function(){
   if(!this.summonSlots.length)return 1;
   const total=this.summonSlots.reduce((sum,type)=>sum+Math.max(1,this.tech[0][type]||1),0);
   return Math.max(1,Math.round(total/this.summonSlots.length));
  };
  p.summonStatus=function(slot){
   const mystery=slot===rules.slots+1,type=Number.isInteger(slot)&&slot>=1&&slot<=rules.slots?this.summonSlots[slot-1]:null;
   if(!mystery&&!type)return {cost:0,reason:'빈 슬롯'};
   const owned=u=>!this.coop||u.coopOwner===this.coopOwner;
   const live=this.units.filter(u=>owned(u)&&u.team===0&&u.hp>0&&!u.patrol&&u.type!=='leader');
   const pending=this.dropPods.filter(owned);
   const openSquadSlots=Math.max(0,this.capacity()-live.length-pending.length);
   const fever=mystery&&openSquadSlots<rules.boxReserve;
   const cost=fever?rules.feverCost:mystery?rules.boxCost:TYPES[type].cost;
   const cooldown=fever?Math.ceil(this.tacticalFeverCooldown()):0;
   const status={cost,openSquadSlots,fever,cooldown};
   if(!this.usesSummoning()||this.phase!=='playing'||this.bossIntro?.remaining>0||
      this.commander(0).hp<=0||this.coopChoosing?.[this.coopOwner])return {...status,reason:'전투 중에 소환할 수 있어요'};
   if(cooldown)return {...status,reason:`전술 피버 재사용까지 ${cooldown}초`};
   const remainingCap=()=>this.recruitmentRemaining(type);
   if(!mystery&&!openSquadSlots)return {...status,reason:'병력 한도에 도달했어요'};
   if(!mystery&&(this.coop?this.scoped(remainingCap):remainingCap())<=pending.filter(u=>u.type===type).length)return {...status,reason:'이 병과의 충원 한도에 도달했어요'};
   if(this.cash[0]+1e-8<cost)return {...status,reason:'전투 골드가 부족해요'};
   return {...status,reason:''};
  };
  p.planSummonLandings=function(units){
   const leader=this.commander(0),bounds=this.bounds(),landings=[];
   for(const unit of units){
    const angle=this.random()*Math.PI*2,offset=this.random(),r=this.collisionRadius({...unit,team:0});
    const radio=unit.type==='guntruck';
    let point;
    for(let i=0;i<(radio?64:32);i++){
     let direction=angle+i*2.3999632297;
     if(radio&&i<32&&Math.cos(direction-this.formationFacing)>0)direction+=Math.PI;
     const dist=60+40*((offset+i*.381966)%1);
     const x=leader.x+Math.cos(direction)*dist,y=leader.y+Math.sin(direction)*dist;
     if(x<45||y<70||x>bounds.width-45||y>bounds.height-70||!this.freePosition(x,y,r)||
        [...this.dropPods,...landings].some(q=>Math.hypot(x-q.x,y-q.y)<24))continue;
     point={x,y};break;
    }
    if(!point)return null;
    const appearance=unit.type==='medic'?this.medicSkinId:unit.type==='sniper'?this.sniperSkinId:undefined;
    landings.push({...unit,...point,team:0,hp:1,appearance,coopOwner:this.coop?this.coopOwner:undefined,face:leader.face,moveFace:leader.face,startedAt:this.time,landAt:this.time+rules.fall});
   }

   return landings.sort((a,b)=>Number(isVehicle(b.type))-Number(isVehicle(a.type)));
  };
  p.summon=function(slot){
   const status=this.summonStatus(slot);
   if(status.reason)return false;
   const type=this.summonSlots[slot-1],mystery=slot===rules.slots+1;
   if(status.fever){
    if(!this.activateTacticalFever())return false;
    this.cash[0]-=status.cost;
    this.notify('toast','전술 피버 · 10초간 공격속도 +40%');
    this.notify('change');return true;
   }
   const order=mystery?rollBox(ROSTER,()=>this.random(),this.time):{name:TYPES[type].name,units:[{type}]};
   // Reserve only available squad space, including orders that are still airborne.
   const units=order.units.slice(0,status.openSquadSlots).map(unit=>
    mystery&&!this.summonSlots.includes(unit.type)?{...unit,mercenaryLevel:this.mercenaryLevel()}:unit);
   const landings=this.planSummonLandings(units);
   if(!landings)return false;
   this.cash[0]-=status.cost-(order.refund||0);
   this.dropPods.push(...landings.map(pod=>({...pod,mystery})));
   if(mystery)this.notify('toast',order.name+' · '+landings.length+'기 투하'+(order.refund?' · '+order.refund+'G 환급':''));
   this.notify('change');return true;
  };

  p.updateDropPods=function(){
   if(!this.dropPods.length)return;
   const remaining=[];
   for(const pod of this.dropPods){
    if(this.time+1e-8<pod.landAt){remaining.push(pod);continue;}
    const deploy=()=>{
     const unit=this.addUnit(0,pod.type,pod.x,pod.y);
     unit.face=unit.moveFace=pod.face;
     if(unit.turretFace!==undefined)unit.turretFace=pod.face;
     unit.summonEvolved=!!pod.summonEvolved;
     unit.goldenSummon=!!pod.goldenSummon;
     if(pod.mercenaryLevel!==undefined)unit.mercenaryLevel=pod.mercenaryLevel;
     if(pod.star===2){unit.star=2;unit.summonedTwoStar=true;}
     if(unit.goldenSummon){this.resolvePosition(unit);unit.homeX=unit.x;unit.homeY=unit.y;}
     unit.hp=unit.maxHp=this.stats(unit).hp;
     unit.summonLandedAt=this.time;
     const heavy=isVehicle(unit.type),radius=heavy?120:60;
     for(const target of this.units){
      if(target.team===0||target.hp<=0||Math.hypot(target.x-unit.x,target.y-unit.y)>radius)continue;
      this.pushSupportTarget(unit,target,heavy?.9:.32,{duration:heavy?.18:.10,pop:heavy?16:6});
     }
     const duration=heavy?.34:.20;
     this.effects.push({kind:'summonChute',x:unit.x,y:unit.y,heavy,mystery:pod.mystery===true,drone:pod.type==='drone',t:rules.chuteFade,max:rules.chuteFade,visualUntil:this.time+rules.chuteFade,team:0});
     this.effects.push({kind:'summonLanding',x:unit.x,y:unit.y,heavy,radius,t:duration,max:duration,at:this.time,team:0});
     if(unit.goldenSummon)this.completeGoldenSummon(unit);
    };
    if(this.coop)this.withOwner(pod.coopOwner,deploy);else deploy();
   }
   this.dropPods=remaining;
  };
 }
 const api={rules,rollBox,isVehicle};
 if(typeof module!=='undefined'&&module.exports)module.exports=Object.assign(install,api);
 else{install({FrontGame:root.FrontGame,TYPES:root.FrontTypes,ROSTER:root.FrontRoster});root.FrontSummoning=api;}
})(typeof window==='undefined'?globalThis:window);

