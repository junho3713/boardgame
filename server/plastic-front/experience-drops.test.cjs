'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame,ABILITIES,EVOLUTIONS,TYPES}=require('./public/engine.js');
const {pack,unpack,cleanPlan}=require('./public/autoplay.js');
const {CoopGame}=require('./public/coop-engine.js');

function game(){
 const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();return g;
}

test('defeats drop experience and the magnet attracts distant crystals before granting it',()=>{
 const g=game(),leader=g.commander(0);
 for(let i=0;i<20;i++)g.update(.05);
 assert.equal(g.xp,0);
 const foe=g.addUnit(2,'ant',leader.x+135,leader.y,true),cash=g.cash[0];
 g.damage(foe,1e9,leader);g.damage(foe,1e9,leader);
 assert.equal(g.xp,0);assert.ok(g.cash[0]>cash);
 assert.deepEqual(g.experienceDrops,[{x:foe.x,y:foe.y,amount:7,owner:0,pulling:false}]);
 g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops[0].pulling,false);
 g.abilities.magnet=5;g.abilities.xpGain=2;
 g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops[0].pulling,true);assert.equal(g.xp,0);
 const restored=unpack(game(),pack(g));
 for(let i=0;i<14;i++)restored.updateExperienceDrops(.05);
 assert.equal(restored.experienceDrops.length,0);
 assert.ok(Math.abs(restored.xp-8.12)<1e-8);
});

test('the room needs 55 + 12 XP per level, with 115px base pickup reach and +8% per XP rank',()=>{
 const g=game(),leader=g.commander(0);
 assert.equal(g.neededXP(),67);
 g.level=10;assert.equal(g.neededXP(),175);
 assert.equal(g.experienceRadius(),115);
 g.earnDefeatXP({x:leader.x+115,y:leader.y},25);
 g.earnDefeatXP({x:leader.x+170,y:leader.y},25);
 g.updateExperienceDrops(.05);
 assert.deepEqual(g.experienceDrops.map(drop=>drop.pulling),[true,false]);
 g.abilities.magnet=5;assert.equal(g.experienceRadius(),235);
 g.abilities.xpGain=5;assert.equal(g.abilityBonus('xpGain'),40);
 for(let i=0;i<40;i++)g.updateExperienceDrops(.05);
 assert.equal(g.xp,70);
});

test('ordinary ants spawn at half health through 3 minutes and new waves restore baseline by 4 minutes',()=>{
 const g=game();
 const healthAt=(time,expected)=>{
  g.time=time;
  const ant=g.addUnit(2,'ant',1800,6000,true);
  const baseline=TYPES.ant.hp*1.2*.75*(1+.12*Math.floor(time/60));
  assert.ok(Math.abs(ant.maxHp-baseline*expected)<1e-8,time+' seconds');
  return ant;
 };
 const early=healthAt(0,.5);assert.ok(Math.abs(early.maxHp-49.5)<1e-8);
 healthAt(179.99,.5);healthAt(180,.5);healthAt(210,.75);healthAt(240,1);
 assert.equal(g.stats(early).hp,early.maxHp,'old waves retain their spawn-time strength');
 assert.equal(g.enemyHealthScale({...early,roomGarrison:true}),1.2);
 assert.equal(g.enemyHealthScale({...early,type:'soldierAnt'}),.75*1.2);
 const outside=new FrontGame({},undefined,{map:'backyard'});
 assert.equal(outside.stats(outside.addUnit(2,'ant',800,1000,true)).hp,TYPES.ant.hp);
});

test('old operation saves migrate the early ant maximum while retaining damage taken',()=>{
 const g=game(),ant=g.addUnit(2,'ant',1800,6000,true);
 g.roomHealthVersion=142;ant.maxHp*=2;ant.hp=ant.maxHp*.4;
 const restored=unpack(game(),pack(g)),copy=restored.units.find(u=>u.id===ant.id);
 assert.ok(Math.abs(copy.maxHp-49.5)<1e-8);
 assert.ok(Math.abs(copy.hp/copy.maxHp-.4)<1e-8);
});

test('the room kill table rewards dangerous enemies with extra combat gold without changing profile gold',()=>{
 const g=game(),leader=g.commander(0);
 g.units=[leader];
 const rewards={ant:[7,5,2],rifle:[12,8,2],machinegun:[14,8,2],sniper:[14,8,2],mortar:[14,8,2],
  bombBug:[32,12,2],acidBeetle:[32,10,2],pirateCannon:[40,16,2],bubbleOctopus:[42,18,6],blizzardMage:[38,14,2],rhinoBeetle:[65,18,5]};
 for(const [type,[xp,battleGold,profileGold]] of Object.entries(rewards)){
  g.experienceDrops=[];
  const target=g.addUnit(2,type,leader.x+300,leader.y,true);
  const cash=g.cash[0],savedGold=g.profile.gold;
  g.damage(target,1e9,leader);
  assert.equal(g.experienceDrops.length,1,type);
  assert.equal(g.experienceDrops[0].amount,xp,type);
  assert.equal(g.experienceDrops[0].boss,undefined,type);
  assert.equal(g.cash[0]-cash,battleGold,type);
  assert.equal(g.profile.gold-savedGold,profileGold,type);
 }
 const outside=new FrontGame({},undefined,{map:'backyard'});
 outside.damage(outside.addUnit(2,'ant',800,1000,true),1e9,outside.commander(0));
 assert.equal(outside.experienceDrops[0].amount,13);
 assert.equal(outside.cash[0],141);
});

test('red boss crystals keep exact mini and full rewards separate from ordinary drops and Destiny Star',()=>{
 const g=game(),leader=g.commander(0);
 g.time=540;
 const mini=g.addUnit(2,'rhinoBeetle',1800,6000,true);
 Object.assign(mini,{boss:true,miniBoss:true,miniBossMinute:9});
 g.earnDefeatXP(mini,5);
 const cash=g.cash[0],gold=g.profile.gold;
 g.damage(mini,1e9,leader);
 assert.equal(g.cash[0],cash+52);
 assert.equal(g.profile.gold,gold+15);
 assert.ok(g.pickups.some(p=>p.destinyStar));
 assert.equal(g.bossState.rewards,0);
 assert.ok(g.experienceDrops.every(drop=>drop.pulling));
 const full=g.addUnit(2,'hornet',mini.x,mini.y,true);
 full.boss=true;
 g.damage(full,1e9,leader);
 assert.equal(g.cash[0],cash+52+110);
 assert.equal(g.profile.gold,gold+15+40);
 assert.equal(g.bossState.rewards,1);
 const road=g.addUnit(2,'bayonet',mini.x,mini.y,true);
 Object.assign(road,{boss:true,roadCaptain:true,roadStage:1});
 g.damage(road,1e9,leader);
 assert.equal(g.cash[0],cash+52+110+10);
 assert.equal(g.bossState.rewards,2);
 g.earnDefeatXP(full,5);
 assert.deepEqual(g.experienceDrops.map(d=>[d.amount,d.boss||false]),[[5,false],[162.5,true],[200,true],[25,false]]);
});

test('a saved cooperative boss crystal belongs only to the player credited with the kill',()=>{
 const g=new CoopGame();g.start();
 const green=g.commander(0),blue=g.withOwner(1,()=>g.commander(0));
 const boss=g.addUnit(2,'stagBeetle',green.x+300,green.y,true);boss.boss=true;
 const cash=g.cash[0],blueCash=g.withOwner(1,()=>g.cash[0]);
 g.damage(boss,1e9,blue);
 assert.equal(g.cash[0],cash);
 g.withOwner(1,()=>{assert.equal(g.cash[0],blueCash+80);assert.equal(g.profile.gold,40);});
 const restored=unpack(new CoopGame(),pack(g)),red=restored.experienceDrops[0];
 assert.deepEqual([red.amount,red.boss,red.owner],[152,true,1]);
 for(const commander of [restored.commander(0),restored.withOwner(1,()=>restored.commander(0))]){
  commander.x=red.x;commander.y=red.y;
 }
 restored.updateExperienceDrops(.05);
 assert.equal(restored.xp,0);assert.equal(restored.experienceDrops.length,1);
 restored.withOwner(1,()=>{restored.updateExperienceDrops(.05);assert.equal(restored.xp,152);});
 assert.equal(restored.experienceDrops.length,0);
});

test('a co-op mid boss attracts both players’ distant XP without transferring credit',()=>{
 const g=new CoopGame();g.start();g.time=540;
 const green=g.commander(0),blue=g.withOwner(1,()=>g.commander(0));
 const distant={x:green.x+500,y:green.y};
 g.earnDefeatXP(distant,10);
 g.withOwner(1,()=>g.earnDefeatXP(distant,20));
 const boss=g.addUnit(2,'rhinoBeetle',blue.x+500,blue.y,true);
 Object.assign(boss,{boss:true,miniBoss:true,miniBossMinute:9});
 g.damage(boss,1e9,blue);
 assert.equal(g.xp,0);assert.equal(g.withOwner(1,()=>g.xp),0);
 assert.deepEqual(g.experienceDrops.map(d=>[d.owner,d.amount,d.pulling]),[[0,10,true],[1,20,true],[1,162.5,true]]);
 for(let i=0;i<100;i++)for(const owner of [0,1])g.withOwner(owner,()=>g.updateExperienceDrops(.05));
 assert.equal(g.experienceDrops.length,0);
 assert.deepEqual([g.xp,g.withOwner(1,()=>g.xp)],[10,182.5]);
});

test('both realtime co-op wallets accrue 1.5 battle gold per second independently from profile gold',()=>{
 const g=new CoopGame({}, {realtimeSummons:true});
 const wallet=owner=>g.withOwner(owner,()=>[g.cash[0],g.profile.gold]);
 assert.deepEqual([wallet(0),wallet(1)],[[120,0],[120,0]]);
 g.coopIncome(4);
 assert.deepEqual([wallet(0),wallet(1)],[[126,0],[126,0]]);
 const blue=g.withOwner(1,()=>g.commander(0));
 const enemy=g.addUnit(2,'pirateCannon',blue.x+350,blue.y,true);
 g.damage(enemy,1e9,blue);
 assert.deepEqual([wallet(0),wallet(1)],[[126,0],[142,2]]);
});

test('old gold ranks and offered cards migrate to magnet without adding a gold multiplier',()=>{
 const old=game(),state=pack(old);
 delete state.fields.abilities.magnet;
 delete state.fields.experienceDrops;
 state.fields.abilities.gold=4;
 state.fields.currentOptions=['ability_gold','medic'];
 state.fields.pendingChoice={type:'ability_gold'};
 const restored=unpack(game(),state);
 assert.deepEqual(restored.experienceDrops,[]);
 assert.equal(restored.abilities.magnet,4);
 assert.equal(restored.currentOptions[0],'ability_magnet');
 assert.equal(restored.pendingChoice.type,'ability_magnet');
 assert.equal(restored.awardGold(10),10);
 assert.equal(cleanPlan({growth:{gold:4}}).growth.magnet,4);
 assert.equal(ABILITIES.gold,undefined);
 assert.equal(EVOLUTIONS.machinegun.ability,'magnet');
 restored.tech[0].machinegun=5;restored.abilities.magnet=5;restored.checkEvolutions();
 assert.equal(restored.evolved.machinegun,true);
});

test('rare rolls create a map magnet or a healing pack at the enemy position',()=>{
 const g=game(),leader=g.commander(0);
 const defeat=(roll,offset)=>{
  g.random=()=>roll;
  const foe=g.addUnit(2,'ant',leader.x+offset,leader.y,true);
  g.damage(foe,1e9,leader);
  return g.pickups.find(p=>p.combatDrop&&p.x===foe.x&&p.y===foe.y);
 };
 const magnet=defeat(.0099,50),heal=defeat(.010,95);
 assert.equal(magnet?.combatDrop,'magnet');
 assert.equal(heal?.combatDrop,'heal');
 assert.equal(defeat(.025,145),undefined);
 g.earnDefeatXP({x:100,y:100},80);
 assert.ok(g.collectFieldSupply(magnet));
 assert.ok(g.experienceDrops.every(drop=>drop.pulling));
 assert.equal(g.xp,0);
 for(let i=0;i<100;i++)g.updateExperienceDrops(.05);
 assert.equal(g.experienceDrops.length,0);assert.equal(g.xp,101);
 Object.assign(leader,{x:heal.x,y:heal.y});
 assert.equal(g.collectFieldSupply(heal),false);
 assert.equal(heal.active,true);
 const ally=g.addUnit(0,'rifle',leader.x,leader.y);
 ally.hp=ally.maxHp*.5;
 assert.equal(g.canCollectCombatDrop(heal,leader),true);
 leader.hp=leader.maxHp*.5;
 assert.ok(g.collectFieldSupply(heal));
 assert.equal(leader.hp,leader.maxHp*.75);
 assert.equal(ally.hp,ally.maxHp*.75);
 assert.equal(g.collectFieldSupply(heal),false);
});

test('a saved cooperative magnet attracts the owner’s crystals from anywhere on the map',()=>{
 const g=new CoopGame();g.start();
 const green=g.commander(0),blue=g.withOwner(1,()=>g.commander(0));
 g.earnDefeatXP({x:100,y:100},20);
 g.withOwner(1,()=>{
  g.earnDefeatXP({x:110,y:100},24);
  g.random=()=>.001;g.rollCombatDrop(green);
 });
 blue.x=green.x+16;blue.y=green.y;
 const restored=unpack(new CoopGame(),pack(g));
 restored.coopCollectPickups();
 assert.deepEqual(restored.experienceDrops.map(p=>[p.owner,p.pulling]),[[0,false],[1,true]]);
 assert.equal(restored.pickups.find(p=>p.combatDrop==='magnet').active,false);
});
