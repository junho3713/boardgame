/* Allied evolution links: shared per-squad cooldowns, simulation clocks, no recursive attacks. */
(function(root){'use strict';
const links=[
 {id:'precision',types:['sniper','mortar'],name:'정밀 폭격',detail:'저격 표식 4초 · 박격포 우선 조준 / 비행 0.65초'},
 {id:'hunter',types:['sniper','lucky'],name:'표적 사냥',detail:'저격 표식 우선 미사일 조준 · 레토나 피해 +10%'},
 {id:'barrage',types:['mortar','tank'],name:'집중 포화',detail:'포격에 맞은 적에게 전차 강화탄 +15% · 분대 재사용 6초'},
 {id:'breach',types:['tank','rocket'],name:'장갑 분쇄',detail:'전차가 낸 균열에 블록 지뢰 피해 +20% · 분대 재사용 6초'},
 {id:'suppress',types:['rocket','machinegun'],name:'제압 포화',detail:'과열 기관총에 맞은 일반 적 2초간 15% 둔화 · 블록 지뢰 폭발 범위 +20% / 분대 재사용 6초'},
 {id:'crossfire',types:['rifle','machinegun'],name:'교차 탄막',detail:'기관총병 과열 중 산탄총병 재장전 시간 −25%'},
 {id:'pursuit',types:['rifle','sniper'],name:'표적 추격',detail:'저격 표식이 남은 적을 산탄총병이 맞히면 피해 +15%'},
 {id:'breakthrough',types:['rifle','medic'],name:'전선 돌파',detail:'의무병에게 치료받은 산탄총병의 다음 탄창 4발 피해 +15%'},
 {id:'medicalFire',types:['machinegun','medic'],name:'전선 유지',detail:'진화 의무병에게 치료받은 기관총병은 2초간 받는 피해 12% 감소'},
 {id:'volatile',types:['rocket','lucky'],name:'연쇄 폭약',detail:'레토나가 맞힌 적이 블록 지뢰에 걸리면 0.2초 뒤 20% 추가 폭발 · 반경 65 / 분대 재사용 6초'},
 {id:'fieldRepair',types:['tank','medic'],name:'야전 수리',detail:'진화 의무병의 전차 치료량 +15% · 치료 간격 유지'},
 {id:'gamblers',types:['guntruck','lucky'],name:'행운의 핫라인',detail:'777 또는 보스킬러 당첨 후 5초간 같은 분대 통신병의 첫 주사위 세트는 6-6 확정'},
 {id:'chainBombard',types:['guntruck','mortar'],name:'초토화 포격',detail:'같은 분대의 통신병 화염 지대에 착탄한 박격포는 폭발 반경·피해 +15%'},
 {id:'radioPrecision',types:['guntruck','sniper'],name:'정밀 좌표 수신',detail:'미사일·핵은 저격 표식 적을 우선 조준하고 해당 적에게 피해 +20%'},
 {id:'airObserver',types:['drone','sniper'],name:'공중 관측',detail:'드론 레이저는 저격 표식 대상을 우선 조준하며 해당 대상 피해 +20%'},
 {id:'tacticalSupply',types:['drone','machinegun'],name:'전술 보급',detail:'기관총병 과열 중 드론 레이저 발사 주기 −20%'},
 {id:'airSupport',types:['drone','lucky'],name:'공중 지원',detail:'진화 드론이 살아 있으면 럭키 레토나 룰렛 주기 4초 → 3.5초'}
];
const byId=Object.fromEntries(links.map(l=>[l.id,l]));
function install({FrontGame:Game}){
 const p=Game.prototype;if(p.evolutionLinksVersion)return;p.evolutionLinksVersion=1;
 const reset=p.reset,damage=p.damage,impact=p.impact,select=p.selectCombatTarget,mortar=p.launchMortar,twin=p.evolutionMortar,missile=p.luckyMissileTarget,boss=p.bossKillerTarget,stats=p.stats,update=p.updateEvolutionCombat,heal=p.heal;
 const owner=u=>u?.coopOwner||0,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const {shotgunReloadTime,diceFace,droneLaserPeriod,droneLaserTarget,droneLaserDamage,castLucky}=p;
 const overheated=(game,u,id)=>game.hasEvolutionLink(u,id)&&game.units.some(gunner=>
  gunner.type==='machinegun'&&gunner.team===0&&gunner.hp>0&&owner(gunner)===owner(u)&&gunner.overheatUntil>game.time
 );
 p.reset=function(){reset.call(this);this.evolutionLinkState={owners:[{ready:{},announced:{}},{ready:{},announced:{}}],bursts:[]};};
 p.linkState=function(id=0){const state=this.evolutionLinkState??={owners:[]};return state.owners[id]??={ready:{},announced:{}};};
 p.evolutionLinks=function(id=this.coopOwner||0){
  const state=this.coop?this.coopStates?.[id]:this,evolved=this.coop&&id===this.coopOwner?this.evolved:state?.evolved||{},live=new Set(this.units.filter(u=>u.team===0&&u.hp>0&&(!this.coop||owner(u)===id)).map(u=>u.type));
  return links.map(link=>({...link,active:link.types.every(t=>evolved[t]&&live.has(t)),progress:link.types.filter(t=>evolved[t]&&live.has(t)).length}));
 };
 p.hasEvolutionLink=function(u,id){
  const l=byId[id];if(!l||u?.team!==0||u.hp<=0||!l.types.includes(u.type))return false;
  const idOwner=owner(u),evolved=this.coop&&idOwner!==this.coopOwner?this.coopStates?.[idOwner]?.evolved:this.evolved;
  return l.types.every(type=>evolved?.[type]&&this.units.some(v=>v.team===0&&v.type===type&&v.hp>0&&(!this.coop||owner(v)===idOwner)));
 };
 p.linkMark=function(target,u,key,duration=4){const marks=target.evolutionLinkMarks??={};(marks[owner(u)]??={})[key]=this.time+duration;};
 p.linkMarked=function(target,u,key){return this.time<(target?.evolutionLinkMarks?.[owner(u)]?.[key]||0);};
 p.linkCue=function(u,t,id){const visual=this.linkState(owner(u)).visual??={};if(this.time<(visual[id]||0))return;visual[id]=this.time+.3;this.effects.push({kind:'evolutionLink',link:id,x:u.x,y:u.y,tx:t.x,ty:t.y,t:.65,max:.65,team:0});};
 p.damage=function(target,amount,source){
  let bonus=0;
  if(source?.type==='lucky'&&this.hasEvolutionLink(source,'hunter')&&this.linkMarked(target,source,'snipe'))bonus=.1;
  const pursuit=source?.type==='rifle'&&this.hasEvolutionLink(source,'pursuit')&&this.linkMarked(target,source,'snipe');
  if(pursuit)bonus=.15;
  amount*=1+bonus;
  if(target?.type==='machinegun'&&this.time<(target.linkBracedUntil||0)&&this.hasEvolutionLink(target,'medicalFire'))amount*=.88;
  const hp=target.hp,result=damage.call(this,target,amount,source);
  if(target.hp>=hp||source?.team!==0||!this.evolutionEnabled(source))return result;
  if(pursuit)this.linkCue(source,target,'pursuit');
  if(source.type==='sniper'&&['precision','hunter','pursuit','airObserver','radioPrecision'].some(id=>this.hasEvolutionLink(source,id))){this.linkMark(target,source,'snipe');if(this.time>=(source.nextLinkCue||0)){this.linkCue(source,target,'mark');source.nextLinkCue=this.time+.5;}}
  if(source.type==='mortar'&&this.hasEvolutionLink(source,'barrage'))this.linkMark(target,source,'bombard',3);
  if(source.type==='tank'&&this.hasEvolutionLink(source,'breach'))this.linkMark(target,source,'armor');
  if(source.type==='machinegun'&&this.time<(source.overheatUntil||0)&&!target.boss&&this.hasEvolutionLink(source,'suppress'))this.linkMark(target,source,'suppress',2);
  if(source.type==='lucky'&&this.hasEvolutionLink(source,'volatile'))this.linkMark(target,source,'volatile',3);
  return result;
 };
 p.stats=function(u){
  const s=stats.call(this,u);if(u.team!==0&&!u.boss&&Object.values(u.evolutionLinkMarks||{}).some(m=>this.time<(m.suppress||0)))s.speed*=.85;
  return s;
 };
 p.heal=function(target,amount,source=null){
  const ownMedic=source?.team===0&&source.type==='medic'&&source.hp>0&&(!this.coop||owner(source)===owner(target));
  const repair=ownMedic&&target?.type==='tank'&&this.hasEvolutionLink(target,'fieldRepair');
  const result=heal.call(this,target,amount*(repair?1.15:1),source);
  if(result>0&&ownMedic){
   if(repair)this.linkCue(source,target,'fieldRepair');
   if(target.type==='machinegun'&&this.hasEvolutionLink(target,'medicalFire')){
    target.linkBracedUntil=this.time+2;this.linkCue(source,target,'medicalFire');
   }
   if(target.type==='rifle'&&this.hasEvolutionLink(target,'breakthrough')){
    target.shotgunBoostPending=true;this.linkCue(source,target,'breakthrough');
   }
  }
  return result;
 };
 p.selectCombatTarget=function(u,candidates,threats,s=this.stats(u)){
  const normal=select.call(this,u,candidates,threats,s),linked=u.type==='mortar'&&this.hasEvolutionLink(u,'precision');if(!linked||normal?.defenseKind==='laserTower'||normal===this.focusTarget)return normal;
  return (candidates||this.combatCandidates()).filter(t=>this.linkMarked(t,u,'snipe')&&this.canTarget(u,t)&&this.visible(t)&&dist(u,t)<s.range&&dist(u,t)>=(s.minRange||0)&&this.lineClear(u,t,0,{fireTeam:0})).sort((a,b)=>Number(b.boss)-Number(a.boss)||dist(u,a)-dist(u,b))[0]||normal;
 };
 p.launchMortar=function(u,target,attack){const precise=this.hasEvolutionLink(u,'precision')&&this.linkMarked(target,u,'snipe');if(precise)this.linkCue(u,target,'precision');return mortar.call(this,u,target,precise?{...attack,linkPrecision:true}:attack);};
 p.evolutionMortar=function(u,target,attack,radius,index){twin.call(this,u,target,attack,radius,index);if(attack.linkPrecision&&this.hasEvolutionLink(u,'precision')){const shell=this.mortarShells.at(-1);shell.landAt=this.time+.65;shell.delay=.65;shell.link='precision';}};
 p.luckyMissileTarget=function(u,salvo,range){
  if(this.hasEvolutionLink(u,'hunter')){const marked=this.units.filter(t=>this.linkMarked(t,u,'snipe')&&this.canTarget(u,t)&&dist(u,t)<=(range||480)&&this.visible(t)&&this.lineClear(u,t,0,{fireTeam:0})).sort((a,b)=>(salvo?.missileAssignments?.[a.id]||0)-(salvo?.missileAssignments?.[b.id]||0)||Number(b.boss)-Number(a.boss)||dist(u,a)-dist(u,b));if(marked.length)return{x:marked[0].x,y:marked[0].y,target:marked[0]};}
  return missile.call(this,u,salvo,range);
 };
 p.bossKillerTarget=function(u){const normal=boss.call(this,u);if(!this.hasEvolutionLink(u,'hunter'))return normal;return this.evolutionEnemies(u).filter(t=>t.boss&&this.linkMarked(t,u,'snipe')&&dist(u,t)<=480&&this.visible(t)&&this.lineClear(u,t,0,{fireTeam:0})).sort((a,b)=>dist(u,a)-dist(u,b))[0]||normal;};
 p.shotgunReloadTime=function(u,s){
  return shotgunReloadTime.call(this,u,s)*(overheated(this,u,'crossfire')?.75:1);
 };
 p.shotgunShotMultiplier=function(u){
  const linked=this.hasEvolutionLink(u,'breakthrough');
  if(u.shotgunRounds===4){
   if(linked&&u.shotgunBoostPending)u.shotgunBoostMagazine=true;
   else delete u.shotgunBoostMagazine;
   delete u.shotgunBoostPending;
  }
  return linked&&u.shotgunBoostMagazine?1.15:1;
 };
 p.diceFace=function(u,evolved,set=0){
  if(set===0&&this.hasEvolutionLink(u,'gamblers')&&this.time<(this.linkState(owner(u)).diceSixUntil||0))return 6;
  return diceFace.call(this,u,evolved,set);
 };
 p.mortarFireZoneScale=function(shell){
  const source=shell.source;
  if(source?.type!=='mortar'||!this.hasEvolutionLink(source,'chainBombard'))return 1;
  const overlaps=this.radioFireZones.some(zone=>owner(zone.source)===owner(source)&&this.time<zone.until&&dist(shell,zone)<=zone.radius);
  if(!overlaps)return 1;
  this.linkCue(source,shell,'chainBombard');return 1.15;
 };
 p.droneLaserTarget=function(u,range,target){
  if(this.hasEvolutionLink(u,'airObserver')){
   const tagged=this.droneTargetCandidates(u,range).filter(target=>this.linkMarked(target,u,'snipe'));
   tagged.sort((a,b)=>dist(u,a)-dist(u,b));
   if(tagged.length)return tagged[0];
  }
  return droneLaserTarget.call(this,u,range,target);
 };
 p.droneLaserDamage=function(u,target,amount){
  const damage=droneLaserDamage.call(this,u,target,amount);
  if(!this.hasEvolutionLink(u,'airObserver')||!this.linkMarked(target,u,'snipe'))return damage;
  this.linkCue(u,target,'airObserver');return damage*1.2;
 };
 p.droneLaserPeriod=function(u){
  return droneLaserPeriod.call(this,u)*(overheated(this,u,'tacticalSupply')?.8:1);
 };
 p.luckyRouletteInterval=function(u){
  return this.hasEvolutionLink(u,'airSupport')?3.5:4;
 };
 p.castLucky=function(u,result){
  if((result!=='missiles'&&result!=='bossKiller')||!this.hasEvolutionLink(u,'gamblers'))return castLucky.call(this,u,result);
  const salvos=this.luckySalvos.length,shots=this.shots.length;
  const outcome=castLucky.call(this,u,result);
  if(this.luckySalvos.length>salvos||this.shots.slice(shots).some(shot=>shot.kind==='bossKiller'&&shot.source===u)){
   this.linkState(owner(u)).diceSixUntil=this.time+5;
   const partner=this.units.find(v=>v.type==='guntruck'&&v.team===0&&v.hp>0&&owner(v)===owner(u));
   if(partner)this.linkCue(u,partner,'gamblers');
  }
  return outcome;
 };
 p.impact=function(b){
  const u=b.source,t=b.target,ready=this.linkState(owner(u)).ready;let link=null;
  if(b.team===0&&u?.hp>0&&t?.hp>0&&this.canTarget(u,t)&&!b.linkApplied){
   if(u.type==='tank'&&this.hasEvolutionLink(u,'barrage')&&this.linkMarked(t,u,'bombard')&&this.time>=(ready.barrage||0)){b.damage*=1.15;link='barrage';}
   else if(u.type==='rocket'&&this.hasEvolutionLink(u,'breach')&&this.linkMarked(t,u,'armor')&&this.time>=(ready.breach||0)){b.damage*=1.2;link='breach';}
   else if(u.type==='rocket'&&this.hasEvolutionLink(u,'suppress')&&this.linkMarked(t,u,'suppress')&&this.time>=(ready.suppress||0)){b.splash*=1.2;link='suppress';}
   else if(u.type==='rocket'&&this.hasEvolutionLink(u,'volatile')&&this.linkMarked(t,u,'volatile')&&this.time>=(ready.volatile||0)){
    (this.evolutionLinkState.bursts??=[]).push({source:u,owner:owner(u),x:t.x,y:t.y,at:this.time+.2,damage:b.damage*.2,radius:65});link='volatile';
   }
   if(link){ready[link]=this.time+6;b.linkApplied=link;this.linkCue(u,t,link);}
  }
  return impact.call(this,b);
 };
 p.updateEvolutionCombat=function(){
  update.call(this);const pending=[];for(const burst of this.evolutionLinkState?.bursts||[]){if(burst.at>this.time+1e-8){pending.push(burst);continue;}const hit=()=>this.evolutionArea({...burst,style:'linkVolatile',index:0},{x:burst.x,y:burst.y,factor:1});if(this.coop)this.withOwner(burst.owner,hit);else hit();}if(this.evolutionLinkState)this.evolutionLinkState.bursts=pending;
  for(const id of this.coop?[0,1]:[0]){const state=this.linkState(id);for(const l of this.evolutionLinks(id))if(l.active&&!state.announced[l.id]){state.announced[l.id]=true;this.notify('toast','진화 연계 활성화 · '+l.name);}}
 };
 root.FrontEvolutionLinks={links};return {links};
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install({FrontGame:root.FrontGame});
})(typeof window==='undefined'?globalThis:window);
