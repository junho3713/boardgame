'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,LUCKY,multiplier}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame();g.start();for(const k of ['units','structures','defenses','buildings','bases','obstacles'])g[k]=[];return g;}
function hits(g,source,damage=700){
 const result=[];g.damage=(u,amount)=>result.push({u,amount});g.launchMissile(source,{x:1000,y:1000},{damage});
 const shell=g.mortarShells.at(-1),r=shell.radius;
 g.units=[];for(const type of ['rifle','tank'])for(const fraction of [0,.5,1,1.01])g.units.push({id:g.units.length+1,type,team:source.team===0?2:0,x:1000+r*fraction,y:1000,hp:1e6,maxHp:1e6,fraction});
 g.time=shell.landAt;g.updateMortars();a.equal(result.length,6);return result;
}
test('allied 777 retains 75% light damage and 75% radial edge damage in solo and both co-op squads',()=>{
 for(const coop of [false,true])for(const owner of coop?[0,1]:[0]){
  const g=scene(coop),source={type:'lucky',team:0,coopOwner:owner,x:800,y:1000,face:0,hp:100};
  for(const {u,amount}of hits(g,source)){const affinity=u.type==='tank'?1:.75;a.ok(Math.abs(amount-700*affinity*(1-.25*u.fraction))<1e-8);}
 }
});
test('777 upgrades and seven-shot reserve survive the buff without a duplicate star payload bonus',()=>{
 const g=scene(true);g.withOwner(1,()=>{g.tech[0].lucky=5;g.abilities.damage=3;});
 const u=g.withOwner(1,()=>g.addUnit(0,'lucky',1000,1000));u.star=2;
 g.withOwner(1,()=>g.castLucky(u,'missiles'));const v=g.luckySalvos[0];a.equal(v.remaining,7);a.equal(v.total,7);a.equal(v.waiting,true);
 const expected=g.withOwner(1,()=>700*g.luckyScale(u));a.equal(v.damage,expected);
 for(const {u:target,amount}of hits(g,u,v.damage)){a.ok(Math.abs(amount-expected*(target.type==='tank'?1:.75)*(1-.25*target.fraction))<1e-8);}
});
test('enemy 777, ordinary missile towers and generic rocket matchups retain their original penalties',()=>{
 const enemy=hits(scene(),{type:'lucky',team:2,x:800,y:1000,face:0,hp:100});
 for(const {u,amount}of enemy)a.ok(Math.abs(amount-700*(u.type==='tank'?1:.5)*(1-.7*u.fraction))<1e-8);
 const tower=hits(scene(),{type:'rocket',team:0,x:800,y:1000,face:0,hp:100});
 for(const {u,amount}of tower)a.ok(Math.abs(amount-700*(u.type==='tank'?1:.5)*(1-.55*u.fraction))<1e-8);
 a.equal(multiplier('rocket','rifle'),.5);a.equal(LUCKY.missileDamage,700);a.equal(LUCKY.missiles,7);
});
test('enemy jackpot still caps all seven missiles together at half the allied target maximum HP',()=>{
 const g=scene(),t=g.addUnit(0,'tank',1000,1000),source=g.addUnit(2,'lucky',800,1000),hp=t.hp;
 const salvo={spent:{}};for(let i=0;i<7;i++){g.launchMissile(source,t,{damage:700});g.mortarShells.at(-1).enemyJackpot=salvo;}
 g.time=g.mortarShells.at(-1).landAt;g.updateMortars();a.ok(Math.abs(t.hp-hp*.5)<1e-8);
});
