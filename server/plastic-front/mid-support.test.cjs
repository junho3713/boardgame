'use strict';

const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack,FrontAutoPilot}=require('./public/autoplay.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.structures=[];g.buildings=[];g.defenses=[];g.pickups=[];g.cash[0]=1000;g.xp=0;g.roomEntry=()=>({x:1500,y:6000});return g;}
function resume(g){g.phase='playing';g.turnChoice=null;g.pendingChoice=null;}
function fill(g){const types=['rifle','rocket','machinegun'];for(const t of types)g.tech[0][t]=1;for(let i=0;i<g.capacity();i++)g.addUnit(0,types[i%3],1500,6000);}
test('early room enemies have 25 percent less HP with a smooth spawn-time return from five to eight minutes; bosses and allies stay unchanged',()=>{
 const g=scene(),spawn=(at,team=2)=>{g.time=at;return g.addUnit(team,'ant',1500,6000);};
 const early=spawn(0),edge=spawn(300),middle=spawn(390),late=spawn(480),later=spawn(900),base=g.stats(late).hp/(1+.12*late.threat);
 const normalized=u=>g.stats(u).hp/(1+.12*u.threat);near(normalized(early),base*.75);near(normalized(edge),base*.75);near(normalized(middle),base*.875);near(normalized(later),base);
 const persisted=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));near(persisted.stats(persisted.units.find(u=>u.id===early.id)).hp,g.stats(early).hp);
 const ally=spawn(0,0),allyLate=spawn(300,0);near(g.stats(ally).hp,g.stats(allyLate).hp);
 const boss=spawn(0);boss.boss=true;boss.bossPattern='rhinoCharge';const before=g.stats(boss).hp;boss.spawnedAt=300;near(g.stats(boss).hp,before);
 for(const field of ['fixedGuard','roomGarrison','roadCaptain']){const guard=spawn(0);guard[field]=true;const hp=g.stats(guard).hp;guard.spawnedAt=300;near(g.stats(guard).hp,hp);}
 const other=new FrontGame({},undefined,{map:'backyard'});other.start();other.time=0;const a=other.addUnit(2,'ant',1500,1500);other.time=300;const b=other.addUnit(2,'ant',1500,1500);near(other.stats(a).hp/(1+.12*a.threat),other.stats(b).hp/(1+.12*b.threat));
});
test('old opening saves adopt the reduced HP at the saved time without healing wounded enemies',()=>{
 const g=scene();g.time=100;const u=g.addUnit(2,'ant',1500,6000);u.maxHp=g.stats(u).hp/.75;u.hp=u.maxHp*.4;delete u.spawnedAt;g.roomHealthVersion=136;
 const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g)))),v=copy.units.find(v=>v.id===u.id);near(v.maxHp,u.maxHp*.75);near(v.hp/v.maxHp,.4);a.equal(v.spawnedAt,100);
});
test('mid-boss migration keeps missing health proportion and saved identity while applying 30 percent once',()=>{
 const g=scene();g.time=180;g.updateRoomMiniBosses();const u=g.units.find(u=>u.miniBoss);delete u.midBossVersion;u.bossName='중간 보스 · 사슴벌레';const main=g.stats({...u,miniBoss:false});u.maxHp=main.hp*.5;u.hp=u.maxHp*.4;
 const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g)))),v=copy.units.find(v=>v.id===u.id);near(v.maxHp,main.hp*.3);near(v.hp/v.maxHp,.4);a.match(v.bossName,/^미드 보스/);copy.upgradeRoomCampaign();near(v.hp/main.hp,.12);a.equal(v.miniBossMinute,3);
});
test('snipers from both hostile teams, fixed guards and rare supply guards share a hard cap; allies remain unrestricted',()=>{
 for(const coop of [false,true]){const g=scene(coop);for(let i=0;i<8;i++){const u=g.addUnit(i%2+1,'sniper',1500,6000,true);u.rareSupplyGuard=i>3;u.fixedGuard=i<4;}a.equal(g.enemySniperCount(),2);a.equal(g.units.filter(u=>u.type==='rifle').length,6);a.equal(g.roomCanSpawn('sniper'),false);for(let i=0;i<4;i++)g.addUnit(0,'sniper',1500,6000);a.equal(g.units.filter(u=>u.team===0&&u.type==='sniper').length,4);g.units.find(u=>u.team!==0&&u.type==='sniper').hp=0;a.equal(g.addUnit(2,'sniper',1500,6000).type,'sniper');a.equal(g.enemySniperCount(),2);}
});
test('legacy excess snipers convert without healing or kill rewards, including on restore and unchanged growth ticks',()=>{
 const g=scene();for(let i=0;i<5;i++){const u=g.addUnit(i%2+1,'rifle',1500,6000);u.type='sniper';u.maxHp=g.stats(u).hp;u.hp=u.maxHp*.6;u.sniperAim={target:g.commander(0)};u.rareSupplyGuard=true;}const ids=g.units.filter(u=>u.type==='sniper').map(u=>u.id),kills=g.kills;
 const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));a.equal(copy.enemySniperCount(),2);for(const id of ids.slice(2)){const u=copy.units.find(u=>u.id===id);a.equal(u.type,'rifle');near(u.hp/u.maxHp,.6);a.equal(u.sniperAim,null);a.equal(u.rareSupplyGuard,true);}a.equal(copy.kills,kills);g.lastEnemyGrowth=g.pressure().tier;g.syncEnemyGrowth();a.equal(g.enemySniperCount(),2);
});
test('minute support starts at 1:00, only spends recruited resources and offers no upgrade or accumulated repeats',()=>{
 const g=scene();g.time=59.99;g.levelCheck();a.equal(g.phase,'playing');g.time=60;const xp=g.xp,level=g.level,cash=g.cash[0];g.levelCheck();a.equal(g.choiceKind,'periodic');a.deepEqual(g.currentOptions,[]);a.equal(g.cash[0],cash);a.equal(g.stageChoice('rifle'),false);a.equal(g.choose('fieldSupply'),false);a.equal(g.stageChoice('support',{rifle:1}),true);a.equal(g.confirmChoice(),true);a.equal(g.cash[0],cash-TYPES.rifle.cost);a.equal(g.xp,xp);a.equal(g.level,level);a.equal(g.nextRecoveryAt,0);
 resume(g);g.levelCheck();a.equal(g.phase,'playing');g.time=119.99;g.levelCheck();a.equal(g.phase,'playing');g.time=120;g.levelCheck();a.equal(g.choiceKind,'periodic');a.equal(g.cancelRecovery(),true);g.levelCheck();a.equal(g.phase,'playing');g.time=300;g.levelCheck();a.equal(g.choiceKind,'periodic');g.cancelRecovery();g.levelCheck();a.equal(g.phase,'playing');
});
test('a full roster skips that minute; a loss waits for the next minute and supply troops use separate slots',()=>{
 const g=scene();fill(g);g.time=600;g.levelCheck();a.equal(g.phase,'playing');g.units.find(u=>u.type==='rifle').hp=0;g.time=620;g.levelCheck();a.equal(g.phase,'playing');g.time=660;g.levelCheck();a.equal(g.choiceKind,'periodic');
 const h=scene();fill(h);h.addUnit(0,'commando',1500,6000);h.time=600;h.levelCheck();a.equal(h.phase,'playing');h.units.find(u=>u.type==='rifle').hp=0;h.time=660;h.levelCheck();a.equal(h.choiceKind,'periodic');
});
test('regular level and boss choices take priority; support survives them only while this minute still needs troops',()=>{
 const g=scene();g.time=600;g.xp=g.neededXP();g.bossState.rewards=1;g.levelCheck();a.equal(g.choiceKind,'boss');a.equal(g.bossState.rewards,1);a.equal(g.supplyState().pendingMinute,10);g.choose(g.currentOptions[0]);resume(g);g.levelCheck();a.equal(g.choiceKind,'level');a.equal(g.level,2);g.choose(g.currentOptions[0]);resume(g);g.levelCheck();a.equal(g.choiceKind,'periodic');g.cancelRecovery();g.levelCheck();a.equal(g.phase,'playing');
 const h=scene();h.time=600;h.xp=h.neededXP();h.levelCheck();fill(h);resume(h);h.levelCheck();a.equal(h.phase,'playing');a.equal(h.supplyState().pendingMinute,null);
});
test('saved open or dismissed minute windows do not reopen; missing legacy fields and clock rewinds never build a backlog',()=>{
 const g=scene();g.time=600;g.levelCheck();const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));a.equal(copy.phase,'choice');a.equal(copy.choiceKind,'periodic');copy.cancelRecovery();copy.levelCheck();a.equal(copy.phase,'playing');const dismissed=unpack(scene(),JSON.parse(JSON.stringify(pack(copy))));dismissed.levelCheck();a.equal(dismissed.phase,'playing');dismissed.time=780;dismissed.levelCheck();dismissed.cancelRecovery();dismissed.time=300;dismissed.levelCheck();dismissed.time=600;dismissed.levelCheck();a.equal(dismissed.choiceKind,'periodic');
 const old=pack(scene());old.fields.time=800;delete old.fields.fieldSupplyState.supportMinute;delete old.fields.fieldSupplyState.pendingMinute;const migrated=unpack(scene(),old);migrated.levelCheck();a.equal(migrated.choiceKind,'periodic');migrated.cancelRecovery();migrated.levelCheck();a.equal(migrated.phase,'playing');
});
test('cooperative minute support is personal, does not pause time and retains the five-second shield',()=>{
 const g=scene(true);g.withOwner(0,()=>fill(g));g.withOwner(1,()=>{g.cash[0]=1000;});g.time=600;g.levelCheck();a.deepEqual(g.coopChoosing,[false,true]);a.equal(g.phase,'playing');a.equal(g.coopInvulnerable[1],605);a.equal(g.withOwner(1,()=>g.choiceKind),'periodic');a.equal(g.withOwner(0,()=>g.choiceKind),'level');g.withOwner(1,()=>{g.phase='choice';a.equal(g.cancelRecovery(),true);g.coopChoosing[1]=false;});g.levelCheck();a.deepEqual(g.coopChoosing,[false,false]);g.time=660;g.levelCheck();a.deepEqual(g.coopChoosing,[false,true]);
});
test('support-only choices can be skipped without money, do not appear in duel, and AI handles them without upgrading',()=>{
 const g=scene();g.time=600;g.cash[0]=0;g.levelCheck();a.equal(g.phase,'playing');g.cash[0]=1000;g.levelCheck();a.equal(g.phase,'playing');g.time=660;g.levelCheck();a.equal(g.choiceKind,'periodic');g.cancelRecovery();const h=scene();h.mode='duel';h.time=600;h.levelCheck();a.equal(h.phase,'playing');const auto=scene();auto.time=600;auto.levelCheck();const level=auto.level,xp=auto.xp;const pilot=new FrontAutoPilot(auto,{},123);pilot.choice();a.equal(auto.phase,'playing');a.equal(auto.level,level);a.equal(auto.xp,xp);
});


test('room growth takes three times the XP while old saves keep earned levels, XP and evolution',()=>{
 for(const map of ['livingroom','livingroom-star','livingroom-star3']){
  const g=new FrontGame({},undefined,{map});g.start();a.equal(g.neededXP(),69);
  g.level=10;g.xp=42;g.tech[0].rifle=5;g.abilities.damage=5;g.evolved.rifle=true;
  const copy=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
  a.equal(copy.level,10);a.equal(copy.xp,42);a.equal(copy.neededXP(),204);a.equal(copy.evolved.rifle,true);
 }
 const other=new FrontGame({},undefined,{map:'backyard'});other.start();a.equal(other.neededXP(),23);
 const coop=scene(true);for(const owner of [0,1])coop.withOwner(owner,()=>a.equal(coop.neededXP(),69));
});

test('level upgrades cannot spend their opportunity on troops and the AI completes an upgrade',()=>{
 const g=scene();g.xp=g.neededXP();g.levelCheck();a.equal(g.choiceKind,'level');
 a.equal(g.stageChoice('support',{rifle:1}),false);a.equal(g.request({rifle:1}),false);
 const before=g.cash[0],pilot=new FrontAutoPilot(g,{},123);pilot.choice();
 a.equal(g.phase,'playing');a.equal(g.cash[0],before);a.equal(g.level,2);
});

test('an already staged reinforcement from an old level-up save can still be confirmed once',()=>{
 const g=scene();g.phase='choice';g.choiceKind='level';g.pendingChoice={type:'support',queue:{rifle:1}};
 const cash=g.cash[0],copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));
 a.equal(copy.confirmChoice(),true);a.equal(copy.cash[0],cash-TYPES.rifle.cost);
 a.equal(copy.confirmChoice(),false);
});
