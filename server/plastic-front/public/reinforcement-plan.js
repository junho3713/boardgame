/* Player-defined recruitment goals. Uses the existing paid buy/fusion rules. */
(function(root){'use strict';
function install({FrontGame:Game,TYPES,ROSTER}){
 const p=Game.prototype;if(p.reinforcementPlanVersion)return;p.reinforcementPlanVersion=1;
 const roster=[...ROSTER],defaults={enabled:false,preferTwoStar:false,mode:'priority',targets:Object.fromEntries(roster.map(t=>[t,t==='rifle'||t==='medic'?3:0])),priority:[...roster],evolutionGoals:[]};
 function clean(value={}){return{enabled:value.enabled===true,preferTwoStar:value.preferTwoStar===true,mode:value.mode==='balanced'?'balanced':'priority',targets:Object.fromEntries(roster.map(t=>[t,Math.max(0,Math.min(9,Math.floor(Number(value.targets?.[t])||0)))])),priority:[...new Set([...(Array.isArray(value.priority)?value.priority:[]).filter(t=>roster.includes(t)),...roster])],evolutionGoals:[...new Set((Array.isArray(value.evolutionGoals)?value.evolutionGoals:[]).filter(t=>roster.includes(t)))]};}
 const reset=p.reset,schedule=p.scheduleMinuteSupport,begin=p.beginMinuteSupport;
 p.reset=function(){const plan=this.fieldSupplyState?.reinforcementPlan;reset.call(this);this.supplyState().reinforcementPlan=clean(plan||defaults);};
 p.reinforcementPlan=function(){const state=this.supplyState();return state.reinforcementPlan??=clean(defaults);};
 function valid(value){return !!value&&typeof value==='object'&&typeof value.enabled==='boolean'&&(value.preferTwoStar===undefined||typeof value.preferTwoStar==='boolean')&&['priority','balanced'].includes(value.mode)&&!!value.targets&&typeof value.targets==='object'&&Array.isArray(value.priority)&&value.priority.length===roster.length&&new Set(value.priority).size===roster.length&&value.priority.every(t=>roster.includes(t))&&roster.every(t=>Number.isInteger(value.targets[t])&&value.targets[t]>=0&&value.targets[t]<=9)&&Array.isArray(value.evolutionGoals)&&value.evolutionGoals.length<=roster.length&&value.evolutionGoals.every(t=>roster.includes(t));}
 p.setReinforcementPlan=function(value){
  if(!valid(value))return false;
  const plan=clean(value);for(const t of roster)if(this.evolved[t]&&!plan.evolutionGoals.includes(t))plan.evolutionGoals.push(t);
  const state=this.supplyState();state.reinforcementPlan=plan;state.autoFusionFocus=null;state.autoFusionServed=[];state.autoSupportCycle=Math.floor((this.time+1e-8)/30);state.pendingAutoCycle=null;if(plan.enabled)state.pendingMinute=null;this.notify('change');return true;
 };
 p.reinforcementCounts=function(){const counts=Object.fromEntries(roster.map(t=>[t,0]));for(const u of this.supplySquad())if(!u.patrol&&roster.includes(u.type))counts[u.type]+=this.starExperiment?3**Math.max(0,Math.min(2,(u.star||1)-1)):1;return counts;};
 p.reinforcementCandidates=function(){
  const plan=this.reinforcementPlan(),counts=this.reinforcementCounts(),available=()=>plan.priority.filter(t=>plan.targets[t]>counts[t]&&this.tech[0][t]>0&&this.recruitmentRemaining(t)>0);
  const types=this.coop?this.scoped(available):available();if(plan.mode==='balanced')types.sort((a,b)=>(plan.targets[b]-counts[b])/plan.targets[b]-(plan.targets[a]-counts[a])/plan.targets[a]||plan.priority.indexOf(a)-plan.priority.indexOf(b));
  if(plan.preferTwoStar&&plan.mode==='balanced'&&this.starExperiment)types.sort((a,b)=>Math.floor(counts[a]/3)-Math.floor(counts[b]/3)||(counts[b]%3)-(counts[a]%3)||TYPES[b].cost-TYPES[a].cost||plan.priority.indexOf(a)-plan.priority.indexOf(b));
  return types;
 };
 p.runAutomaticReinforcement=function(){
  const plan=this.reinforcementPlan();if(!plan.enabled||this.mode!=='pve'||this.phase!=='playing'||this.commander(0).hp<=0)return false;
  const cycle=Math.floor((this.time+1e-8)/30),state=this.supplyState();if(cycle<1||state.autoReinforcedCycle===cycle)return false;
  state.autoReinforcedCycle=cycle;const result={cycle,at:this.time,bought:{},spent:0,reason:'complete',waitingType:null},cash=this.cash[0],events=this.events;
  this.events={...events,toast:undefined,change:undefined};try{
   this.autoFuseUnits?.();
   for(let i=0;i<81;i++){
    const types=this.reinforcementCandidates(),t=plan.mode==='balanced'?(types.find(t=>this.cash[0]>=TYPES[t].cost)||types[0]):types[0];if(!t){if(roster.some(t=>plan.targets[t]>this.reinforcementCounts()[t]))result.reason='locked';break;}
    if(this.cash[0]<TYPES[t].cost){result.reason='funds';result.waitingType=t;break;}
    if(!this.buy(t)){result.reason='capacity';result.waitingType=t;break;}
    result.bought[t]=(result.bought[t]||0)+1;
   }
  }finally{this.events=events;}
  result.spent=cash-this.cash[0];state.autoReinforcementResult=result;
  const total=Object.values(result.bought).reduce((a,b)=>a+b,0);if(total)this.notify('toast','자동 충원 · '+Object.entries(result.bought).map(([t,n])=>TYPES[t].name+' '+n+'기').join(' · ')+' / −'+result.spent+' 자원');
  else if(result.reason==='funds')this.notify('toast','자동 충원 대기 · '+TYPES[result.waitingType].name+' 자원을 모아 다음 30초 확인 때 재시도');
  this.notify('change');return true;
 };
 p.scheduleMinuteSupport=function(){
  if(!this.reinforcementPlan().enabled)return schedule.call(this);
  const state=this.supplyState(),cycle=Math.floor((this.time+1e-8)/30);state.pendingMinute=null;state.supportMinute=Math.floor((this.time+1e-8)/60);if(this.mode!=='pve'||cycle<1){state.pendingAutoCycle=null;return;}
  if(state.autoSupportCycle!==cycle){state.autoSupportCycle=cycle;state.pendingAutoCycle=cycle;}
  if(state.pendingAutoCycle!==cycle)state.pendingAutoCycle=null;
 };
 p.beginMinuteSupport=function(){
  if(!this.reinforcementPlan().enabled)return begin.call(this);
  const state=this.supplyState();if(this.phase!=='playing'||state.pendingAutoCycle==null||this.commander(0).hp<=0)return false;
  state.pendingAutoCycle=null;this.runAutomaticReinforcement();return false;
 };
 const api={defaults,clean,valid,roster};root.FrontReinforcementPlan=api;return api;
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install({FrontGame:root.FrontGame,TYPES:root.FrontTypes,ROSTER:root.FrontRoster});
})(typeof window==='undefined'?globalThis:window);
