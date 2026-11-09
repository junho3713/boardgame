'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js');
const combat=require('./public/room-campaign.js').config.combat;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];g.random=()=>.99;for(const c of g.units)Object.assign(c,{x:1500,y:6000,cooldown:1e6});return g;}
function previous(g,u){const scale=combat.meleeDamageScale;combat.meleeDamageScale=1;try{return g.stats(u);}finally{combat.meleeDamageScale=scale;}}

test('ordinary contact and charging enemies gain exactly ten percent damage in solo and cooperative rooms',()=>{
 for(const coop of [false,true]){const g=scene(coop);g.time=700;for(const type of ['ant','soldierAnt','beetle','bruteBeetle','stagBeetle','rhinoBeetle','honeybee','hornet','bayonet','bladeGuard','bikeRaider'])for(const team of [1,2]){
  const u=g.addUnit(team,type,1600,6000,true);u.roomWave=true;const old=previous(g,u),now=g.stats(u);near(now.damage,old.damage*1.1);for(const key of ['hp','rate','range','speed','defense'])near(now[key],old[key]);
 }}
});

test('ranged enemies, allies, buildings and boss patterns retain their existing damage',()=>{
 const g=scene();g.time=900;
 for(const type of ['rifle','machinegun','sniper','rocket','mortar','tank','crimsonAce','acidBeetle']){const u=g.addUnit(1,type,1700,6000,true);u.roomWave=true;near(g.stats(u).damage,previous(g,u).damage);}
 for(const type of ['bayonet','hornet','rhinoBeetle','bikeRaider']){const ally=g.addUnit(0,type,1500,6000);near(g.stats(ally).damage,previous(g,ally).damage);const boss=g.addUnit(2,type,1800,6000);boss.boss=true;near(g.stats(boss).damage,previous(g,boss).damage);boss.miniBoss=true;near(g.stats(boss).damage,previous(g,boss).damage);}
 const wall={team:1,defenseKind:'bunker',x:1000,y:6000,hp:1000};const value=g.defenseStats(wall).damage,scale=combat.meleeDamageScale;combat.meleeDamageScale=1;try{near(g.defenseStats(wall).damage,value);}finally{combat.meleeDamageScale=scale;}
});

test('an actual ant strike deals the increased damage once, including each cooperative owner',()=>{
 for(const coop of [false,true])for(const owner of coop?[0,1]:[0]){const g=scene(coop);if(coop)g.coopInvulnerable=[0,0];const c=coop?g.withOwner(owner,()=>g.commander(0)):g.commander(0);for(const other of g.units)if(other!==c)other.x=2400;c.hp=c.maxHp=1e6;
  const u=g.addUnit(2,'ant',c.x+20,c.y,true);u.cooldown=0;const old=previous(g,u).damage,expected=old*1.1*g.defenseFactor(c,u),hp=c.hp;
  for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck','updateMageQuest','updateLaserQuest'])g[key]=()=>{};
  g.update(.05);near(hp-c.hp,expected);
 }
});
