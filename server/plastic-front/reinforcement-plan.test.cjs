'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,TYPES,ROSTER}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack,FrontAutoPilot}=require('./public/autoplay.js');
function scene(coop=false,map='livingroom-star'){const g=coop?new CoopGame():new FrontGame({},undefined,{map});g.start();g.units=g.units.filter(u=>u.type==='leader');g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];g.cash[0]=10000;g.xp=0;return g;}
function plan(g,targets,mode='priority',order=[]){const p=structuredClone(g.reinforcementPlan());p.enabled=true;p.mode=mode;p.targets=Object.fromEntries(ROSTER.map(t=>[t,targets[t]||0]));p.priority=[...new Set([...order,...ROSTER])];a.equal(g.setReinforcementPlan(p),true);return p;}
function due(g,time){g.time=time;g.phase='playing';g.levelCheck();}

test('balanced two-star batches complete one fusion per class before repeating a class',()=>{
 const g=scene();g.tech[0].medic=1;const p=plan(g,{rifle:9,medic:9},'balanced',['rifle','medic']);p.preferTwoStar=true;g.setReinforcementPlan(p);const order=[],buy=g.buy;g.buy=function(t){order.push(t);return buy.call(this,t);};due(g,30);a.deepEqual(order,['rifle','rifle','rifle','medic','medic','medic','rifle','rifle','rifle','medic','medic','medic','rifle','rifle','rifle','medic','medic','medic']);
});
test('an unfinished two-star batch persists across money shortages, thirty-second checks and saved games',()=>{
 const g=scene();g.tech[0].medic=1;const p=plan(g,{rifle:6,medic:6},'balanced',['rifle','medic']);p.preferTwoStar=true;g.setReinforcementPlan(p);g.cash[0]=TYPES.rifle.cost;due(g,30);a.equal(g.reinforcementCounts().rifle,1);a.equal(g.reinforcementCounts().medic,0);a.equal(g.supplyState().autoFusionFocus.type,'rifle');
 const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));copy.cash[0]=TYPES.rifle.cost;due(copy,60);a.equal(copy.reinforcementCounts().rifle,2);a.equal(copy.reinforcementCounts().medic,0);copy.cash[0]=TYPES.rifle.cost+TYPES.medic.cost;due(copy,90);a.equal(copy.reinforcementCounts().rifle,3);a.equal(copy.reinforcementCounts().medic,1);a.equal(copy.supplyState().autoFusionFocus.type,'medic');
});
test('priority mode fills the selected class goal continuously even with two-star preference checked',()=>{
 const g=scene();g.tech[0].medic=1;const p=plan(g,{rifle:6,medic:3},'priority',['rifle','medic']);p.preferTwoStar=true;g.setReinforcementPlan(p);const order=[],buy=g.buy;g.buy=function(t){order.push(t);return buy.call(this,t);};due(g,30);a.deepEqual(order,['rifle','rifle','rifle','rifle','rifle','rifle','medic','medic','medic']);
});
test('batch selection respects partial goals, normal modes, co-op owners and explicit plan changes',()=>{
 const g=scene(true);for(const owner of [0,1])g.withOwner(owner,()=>{g.tech[0].medic=1;const p=plan(g,{rifle:2,medic:3},'balanced',owner?['medic','rifle']:['rifle','medic']);p.preferTwoStar=true;g.setReinforcementPlan(p);g.cash[0]=owner?TYPES.medic.cost:TYPES.rifle.cost;});due(g,30);
 g.withOwner(0,()=>{a.equal(g.supplyState().autoFusionFocus.type,'rifle');a.equal(g.reinforcementCounts().rifle,1);const p=structuredClone(g.reinforcementPlan());p.targets.rifle=0;g.setReinforcementPlan(p);a.equal(g.supplyState().autoFusionFocus,null);a.equal(g.reinforcementCandidates()[0],'medic');});
 g.withOwner(1,()=>{a.equal(g.supplyState().autoFusionFocus.type,'medic');a.equal(g.reinforcementCounts().medic,1);});
 const normal=scene(false,'livingroom');normal.tech[0].medic=1;const p=plan(normal,{rifle:6,medic:3},'balanced');p.preferTwoStar=true;normal.setReinforcementPlan(p);normal.cash[0]=TYPES.rifle.cost+TYPES.medic.cost;due(normal,30);a.equal(normal.reinforcementCounts().rifle,1);a.equal(normal.reinforcementCounts().medic,1);
 const partial=scene();const q=plan(partial,{rifle:2},'balanced');q.preferTwoStar=true;partial.setReinforcementPlan(q);due(partial,30);a.equal(partial.reinforcementCounts().rifle,2);
});

test('manual support remains the default and automatic support starts at thirty seconds without pausing or consuming a level',()=>{
 const manual=scene();a.equal(manual.reinforcementPlan().enabled,false);due(manual,60);a.equal(manual.choiceKind,'periodic');a.equal(manual.phase,'choice');
 const g=scene();plan(g,{rifle:3});const level=g.level,xp=g.xp;due(g,29.99);a.equal(g.reinforcementCounts().rifle,0);due(g,30);a.equal(g.reinforcementCounts().rifle,3);a.equal(g.alive(0).filter(u=>u.type==='rifle').length,1);a.equal(g.phase,'playing');a.equal(g.level,level);a.equal(g.xp,xp);
});
test('priority reserves resources for the highest missing unlocked class instead of buying a cheaper lower class',()=>{
 const g=scene();g.tech[0].tank=1;plan(g,{tank:1,rifle:3},'priority',['tank','rifle']);g.cash[0]=TYPES.tank.cost-1;const cash=g.cash[0];due(g,60);a.equal(g.cash[0],cash);a.equal(g.reinforcementCounts().rifle,0);a.equal(g.supplyState().autoReinforcementResult.waitingType,'tank');g.cash[0]=TYPES.tank.cost;due(g,61);a.equal(g.reinforcementCounts().tank,0);due(g,120);a.equal(g.reinforcementCounts().tank,1);a.equal(g.cash[0],0);
});
test('balanced recruitment starts with the largest relative shortage and breaks ties using the configured priority',()=>{
 const g=scene();g.tech[0].medic=1;g.addUnit(0,'rifle',1500,6000);g.addUnit(0,'rifle',1530,6000);plan(g,{rifle:6,medic:3},'balanced',['rifle','medic']);a.equal(g.reinforcementCandidates()[0],'medic');const order=[],buy=g.buy;g.buy=function(t){order.push(t);return buy.call(this,t);};due(g,60);a.equal(order[0],'medic');a.equal(g.reinforcementCounts().rifle,6);a.equal(g.reinforcementCounts().medic,3);
 const tie=scene();tie.tech[0].medic=1;tie.addUnit(0,'rifle',1500,6000);tie.addUnit(0,'medic',1530,6000);plan(tie,{rifle:2,medic:2},'balanced',['medic','rifle']);a.equal(tie.reinforcementCandidates()[0],'medic');
});
test('star equivalents prevent overbuying after fusion, including three-star armies and returning one-star survivors',()=>{
 for(const [map,star,target]of [['livingroom-star',2,3],['livingroom-star3',3,9]]){const g=scene(false,map),u=g.addUnit(0,'rifle',1500,6000);u.star=star;plan(g,{rifle:target});const cash=g.cash[0];due(g,60);a.equal(g.cash[0],cash);a.equal(g.reinforcementCounts().rifle,target);}
 const g=scene(),u=g.addUnit(0,'rifle',1500,6000);u.star=2;plan(g,{rifle:3});due(g,60);const enemy=g.addUnit(2,'ant',1600,6000);g.damage(u,1e9,enemy);a.equal(g.reinforcementCounts().rifle,1);due(g,61);a.equal(g.reinforcementCounts().rifle,1);due(g,120);a.equal(g.reinforcementCounts().rifle,3);a.equal(g.supplyState().autoReinforcementResult.bought.rifle,2);
});
test('configuration changes apply at the next check, preserve existing troops and allow reallocating to an evolved class',()=>{
 const g=scene();g.tech[0].sniper=5;g.evolved.sniper=true;plan(g,{rifle:3});due(g,60);const before=g.cash[0],p=plan(g,{rifle:0,sniper:3},'balanced',['sniper']);p.evolutionGoals=['sniper'];a.equal(g.setReinforcementPlan(p),true);due(g,75);a.equal(g.cash[0],before);due(g,120);a.equal(g.reinforcementCounts().rifle,3);a.equal(g.reinforcementCounts().sniper,3);a.equal(g.evolved.sniper,true);a.ok(g.reinforcementPlan().evolutionGoals.includes('sniper'));
});
test('locked classes are skipped without unlocking, overspending or acquiring special/support entities',()=>{
 const g=scene();plan(g,{tank:3,rifle:3},'priority',['tank']);const before=g.cash[0];due(g,60);a.equal(g.tech[0].tank,0);a.equal(g.reinforcementCounts().tank,0);a.equal(g.cash[0],before-3*TYPES.rifle.cost);a.equal(g.supportToys().length,0);a.ok(g.units.every(u=>u.team!==0||u.type==='leader'||u.type==='rifle'));
});
test('unit and total capacity bounds remain enforced with unachievable goals and no cost on failed purchases',()=>{
 const g=scene(false,'livingroom');plan(g,{rifle:9});const before=g.cash[0];due(g,60);a.equal(g.reinforcementCounts().rifle,8);a.equal(g.cash[0],before-8*TYPES.rifle.cost);
 const full=scene(false,'livingroom');full.tech[0].machinegun=full.tech[0].medic=1;for(const t of ['rifle','machinegun','medic'])for(let i=0;i<(t==='medic'?4:8);i++)full.addUnit(0,t,1500,6000);plan(full,{medic:8});const cash=full.cash[0];due(full,60);a.equal(full.cash[0],cash);a.equal(full.supplyState().autoReinforcementResult.reason,'capacity');
});
test('save/restore keeps goals, mode, order, evolution choices and the consumed check without replaying old opportunities',()=>{
 const g=scene();plan(g,{rifle:3},'balanced',['rifle']);due(g,60);const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));a.deepEqual(copy.reinforcementPlan(),g.reinforcementPlan());const cash=copy.cash[0];due(copy,61);a.equal(copy.cash[0],cash);plan(copy,{rifle:6});due(copy,300);a.equal(copy.supplyState().autoReinforcementResult.cycle,10);a.equal(copy.reinforcementCounts().rifle,6);a.equal(copy.supplyState().autoReinforcementResult.bought.rifle,3);
});
test('co-op keeps counts, goals, money and purchases independent even when both squads use the same class',()=>{
 const g=scene(true);g.withOwner(0,()=>{plan(g,{rifle:3});g.cash[0]=3*TYPES.rifle.cost;});g.withOwner(1,()=>{plan(g,{rifle:6},'balanced');g.cash[0]=6*TYPES.rifle.cost;});due(g,60);for(const owner of [0,1])g.withOwner(owner,()=>{a.equal(g.reinforcementCounts().rifle,owner?6:3);a.equal(g.cash[0],0);a.equal(g.coopChoosing[owner],false);});a.equal(g.phase,'playing');
});
test('a commander down at a check waits for revival within that interval; pause and non-PVE modes never recruit',()=>{
 const g=scene();plan(g,{rifle:3});g.commander(0).hp=0;due(g,60);a.equal(g.reinforcementCounts().rifle,0);g.commander(0).hp=400;due(g,65);a.equal(g.reinforcementCounts().rifle,3);const cash=g.cash[0];g.phase='paused';g.update(1);a.equal(g.time,65);a.equal(g.cash[0],cash);const duel=scene();duel.mode='duel';plan(duel,{rifle:3});due(duel,60);a.equal(duel.reinforcementCounts().rifle,0);
});
test('malformed or hostile plans cannot inject classes, duplicate priorities or invalid troop quantities',()=>{
 const g=scene(),p=structuredClone(g.reinforcementPlan());for(const patch of [{enabled:'true'},{mode:'random'},{targets:{...p.targets,rifle:Infinity}},{targets:{...p.targets,rifle:-1}},{targets:{...p.targets,rifle:1.5}},{targets:{...p.targets,rifle:10}},{priority:['tank','tank']},{evolutionGoals:['commando']}]){a.equal(g.setReinforcementPlan({...p,...patch}),false);a.deepEqual(g.reinforcementPlan(),p);}
});
test('AI uses the same goals while its manual recruitment queue stays empty so it cannot override automatic purchases',()=>{
 const g=scene(),pilot=new FrontAutoPilot(g);plan(g,{rifle:3,medic:3},'balanced',['medic']);a.equal(pilot.desired().rifle,3);a.equal(pilot.desired().tank,0);a.ok(Object.values(pilot.queue()).every(n=>n===0));due(g,60);a.equal(g.reinforcementCounts().rifle,3);a.ok(Object.values(pilot.queue()).every(n=>n===0));
});
test('automatic recruitment checks at 30-second boundaries; toggling on or gaining cash between checks does not recruit immediately',()=>{
 const g=scene();g.time=35;plan(g,{rifle:3});g.cash[0]=0;due(g,36);a.equal(g.reinforcementCounts().rifle,0);due(g,59.99);a.equal(g.supplyState().autoReinforcementResult,undefined);due(g,60);a.equal(g.supplyState().autoReinforcementResult.reason,'funds');g.cash[0]=1000;due(g,61);a.equal(g.reinforcementCounts().rifle,0);due(g,89.99);a.equal(g.reinforcementCounts().rifle,0);due(g,90);a.equal(g.reinforcementCounts().rifle,3);a.equal(g.supplyState().autoReinforcementResult.cycle,3);
});
