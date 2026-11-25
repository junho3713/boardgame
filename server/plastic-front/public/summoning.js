/* Shared realtime orders for the player and the authoritative co-op battle. */
(function(root){'use strict';
 const rules={slots:5,skipGold:30,boxCost:150,boxReserve:6,income:2.5,fall:.58,height:200,chuteFade:.3};
 const vehicles=['tank','lucky'];
 const isVehicle=type=>vehicles.includes(type);
 const choose=(pool,random)=>pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
 const infantry=['rifle','machinegun','sniper','guntruck','rocket','mortar','medic'];
 function rollBox(roster,random){
  const roll=random();
  const drop=(type,flags={})=>({type,...flags});
  if(roll<.60)return {name:'혼합 지원',units:[drop(choose(vehicles,random)),drop(choose(infantry,random))]};
  if(roll<.80)return {name:'보병 지원',units:Array.from({length:4},()=>drop('rifle'))};
  if(roll<.95)return {name:'대박 · 진화 병과',units:[drop(choose(roster,random),{summonEvolved:true})]};
  if(random()<.5)return {name:'잭팟 · 황금 전차',units:[drop('tank',{goldenSummon:true})]};
  return {name:'잭팟 · 대규모 지원',units:Array.from({length:5+(random()<.5?0:1)},()=>drop(choose(roster,random)))};
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
  p.initialSupportCount=function(type){return isVehicle(type)||type==='drone'?1:2;};
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
   const units=Array.from({length:this.initialSupportCount(type)},()=>({type}));
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
   this.rerollCount--;this.pendingChoice=null;
   this.notify('level',this.currentOptions);return true;
  };
  p.canSkipLevelUpgrade=function(){
   return this.usesSummoning()&&this.phase==='choice'&&this.choiceKind==='level'&&!this.turnChoice;
  };
  p.skipLevelUpgrade=function(){
   if(!this.canSkipLevelUpgrade())return false;
   this.cash[0]+=rules.skipGold;
   this.pendingChoice=null;this.currentOptions=[];this.phase='playing';
   this.notify('toast','강화 건너뛰기 · 전투 골드 +'+rules.skipGold+'G');
   this.notify('change');return true;
  };
  p.summonSlotsLocked=function(){
   return this.usesSummoning()&&this.summonSlots.length>=rules.slots;
  };
  p.reconcileSummonChoices=function(){
   if(this.phase!=='choice'||!['level','boss'].includes(this.choiceKind)||!this.summonSlotsLocked())return;
   const allowed=this.currentOptions.filter(type=>this.eligibleCard(type)&&
    (this.choiceKind!=='boss'||this.bossRewardEligible(type)));
   if(allowed.length!==this.currentOptions.length)this.currentOptions=[...new Set([...allowed,...this.options()])].slice(0,3);
   if(this.pendingChoice&&!this.currentOptions.includes(this.pendingChoice.type))this.pendingChoice=null;
  };
  p.nextSummonSlot=function(type){
   return this.usesSummoning()&&ROSTER.includes(type)&&!this.summonSlots.includes(type)&&!this.summonSlotsLocked()?this.summonSlots.length+1:null;
  };
  p.registerSummon=function(type){
   if(this.nextSummonSlot(type))this.summonSlots.push(type);
  };
  p.summonStatus=function(slot){
   const mystery=slot===rules.slots+1,type=Number.isInteger(slot)&&slot>=1&&slot<=rules.slots?this.summonSlots[slot-1]:null;
   const cost=mystery?rules.boxCost:TYPES[type]?.cost||0;
   if(!cost)return {cost,reason:'빈 슬롯'};
   if(!this.usesSummoning()||this.phase!=='playing'||this.bossIntro?.remaining>0||
      this.commander(0).hp<=0||this.coopChoosing?.[this.coopOwner])return {cost,reason:'전투 중에 소환할 수 있어요'};
   const owned=u=>!this.coop||u.coopOwner===this.coopOwner;
   const live=this.units.filter(u=>owned(u)&&u.team===0&&u.hp>0&&!u.patrol&&u.type!=='leader');
   const pending=this.dropPods.filter(owned);
   const remainingCap=()=>this.recruitmentRemaining(type);
   if(this.capacity()-live.length-pending.length<(mystery?rules.boxReserve:1))return {cost,reason:mystery?'미스터리 박스는 병력 자리가 6칸 필요해요':'병력 한도에 도달했어요'};
   if(!mystery&&(this.coop?this.scoped(remainingCap):remainingCap())<=pending.filter(u=>u.type===type).length)return {cost,reason:'이 병과의 충원 한도에 도달했어요'};
   if(this.cash[0]+1e-8<cost)return {cost,reason:'전투 골드가 부족해요'};
   return {cost,reason:''};
  };
  p.planSummonLandings=function(units){
   const leader=this.commander(0),bounds=this.bounds(),landings=[];
   for(const unit of units){
    const angle=this.random()*Math.PI*2,offset=this.random(),r=this.collisionRadius({...unit,team:0});
    let point;
    for(let i=0;i<32;i++){
     const direction=angle+i*2.3999632297,dist=60+40*((offset+i*.381966)%1);
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
   const order=mystery?rollBox(ROSTER,()=>this.random()):{name:TYPES[type].name,units:[{type}]};
   const landings=this.planSummonLandings(order.units);
   if(!landings)return false;
   this.cash[0]-=status.cost;
   this.dropPods.push(...landings.map(pod=>({...pod,mystery})));
   if(mystery)this.notify('toast',order.name+' · '+landings.length+'기 투하');
   this.notify('change');return true;
  };

  p.runSummonPlan=function(){
   if(!this.reinforcementPlan().enabled||this.commander(0).hp<=0)return;
   const cycle=Math.floor((this.time+1e-8)/30),state=this.supplyState();
   if(cycle<1||state.autoReinforcedCycle===cycle)return;
   state.autoReinforcedCycle=cycle;
   const slots=this.reinforcementCandidates().filter(type=>this.summonSlots.includes(type)).slice(0,2);
   const targets=this.reinforcementPlan().targets,live=this.reinforcementCounts();
   const placed={};let spent=0;
   for(const type of slots){
    const pending=this.dropPods.filter(p=>p.type===type&&(!this.coop||p.coopOwner===this.coopOwner)).length;
    const needed=targets[type]-live[type]-pending;
    for(let i=0;i<needed;i++){
     if(!this.summon(this.summonSlots.indexOf(type)+1))break;
     placed[type]=(placed[type]||0)+1;spent+=TYPES[type].cost;
    }
   }
   state.autoReinforcementResult={cycle,at:this.time,bought:placed,spent,reason:spent?'complete':'waiting'};
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

