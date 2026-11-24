'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{pack,unpack}=require('./public/autoplay.js');
function field(){
 const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();
 g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];g.units=[g.commander(0)];
 const c=g.commander(0);Object.assign(c,{x:1500,y:6000,cooldown:99});
 g.camera={x:1500,y:6000};g.viewport={width:850,height:600};
 for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','levelCheck'])g[key]=()=>{};
 const u=g.addUnit(1,'pirateCannon',1200,6000,true);u.cooldown=0;u.assault=true;
 return {g,c,u};
}
function tick(g,seconds){for(let i=0;i<Math.round(seconds/.025);i++)g.update(.025);}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} versus ${b}`);
test('live cannon locks its aim, stays still throughout a three-second warning, then launches a dodgeable .8-second arc',()=>{
 const {g,c,u}=field(),hp=c.hp;g.update(.025);const f=u.pirateFuse;
 assert.ok(f);near(f.fireAt-f.startedAt,3);near(f.x,c.x);near(f.y,c.y);assert.equal(f.radius,150);
 assert.ok(g.isStationary(u));assert.ok(g.bossHazards().some(h=>h.x===f.x&&h.landAt===f.fireAt+.8));
 const origX=u.x,origY=u.y;c.y+=225;
 tick(g,2.975);assert.equal(g.pirateShells.length,0);near(u.x,origX);near(u.y,origY);
 g.update(.025);assert.equal(u.pirateFuse,null);const shell=g.pirateShells[0];assert.ok(shell);near(shell.landAt-shell.startedAt,.8);near(shell.x,f.x);near(shell.y,f.y);
 tick(g,.775);assert.equal(g.pirateShells.length,1);assert.equal(c.hp,hp);
 g.update(.025);assert.equal(g.pirateShells.length,0);assert.equal(c.hp,hp);assert.equal(g.effects.filter(e=>e.kind==='pirateImpact').length,1);
});
test('destroying the cannon or blinding the fuse cancels the warning and cannot leave a delayed launch',()=>{
 for(const interrupt of ['kill','flash','stun']){
  const {g,c,u}=field();g.update(.025);tick(g,1.5);
  if(interrupt==='kill')g.damage(u,99999,c);
  else if(interrupt==='flash')g.applyLuckyFlash(u,{evolved:false,source:c});
  else{u.toyStunUntil=g.time+2;g.update(.025);}
  assert.equal(u.pirateFuse,null,interrupt);
  if(interrupt==='kill')g.damage(u,99999,c); // A repeated hit on a corpse cannot replay the reward.
  const notices=g.effects.filter(e=>e.kind==='pirateIntercept');
  assert.equal(notices.length,interrupt==='kill'?1:0);
  if(notices.length)assert.deepEqual([notices[0].x,notices[0].y,notices[0].gunX,notices[0].gunY,notices[0].radius],[c.x,c.y,u.x,u.y,150]);
  tick(g,1.6);assert.equal(g.pirateShells.length,0);assert.equal(u.pirateFiredAt,undefined);
  assert.ok(!g.bossHazards().some(h=>h.radius===150),interrupt);
 }
});
test('once launched the shell survives its gunner and damages ground allies inside the marked radius only once',()=>{
 const {g,c,u}=field();g.update(.025);tick(g,3);
 const shot=g.pirateShells[0],damage=shot.damage;assert.ok(damage>0);
 const center=g.addUnit(0,'machinegun',shot.x,shot.y),edge=g.addUnit(0,'machinegun',shot.x+149,shot.y),outside=g.addUnit(0,'rifle',shot.x+151,shot.y);
 const friendly=g.addUnit(1,'rifle',shot.x,shot.y),drone=g.addUnit(0,'drone',shot.x,shot.y);
 g.damage(u,99999,c);assert.ok(!g.effects.some(e=>e.kind==='pirateIntercept'));g.units=g.units.filter(t=>t!==u);g.time=shot.landAt;
 const before=[center,edge,outside,friendly,drone].map(t=>t.hp);
 g.updatePirateShells();near(before[0]-center.hp,damage*g.defenseFactor(center,u));
 near(before[1]-edge.hp,damage*(1-.45*149/150)*g.defenseFactor(edge,u));
 assert.deepEqual([outside.hp,friendly.hp,drone.hp],before.slice(2));assert.equal(g.pirateShells.length,0);
 const after=center.hp;g.updatePirateShells();assert.equal(center.hp,after);
});
test('a confused pirate still turns toward its allies, then starts a fresh fuse without firing an ordinary bullet',()=>{
 const {g,c,u}=field();g.update(.025);const other=g.addUnit(1,'rifle',u.x-40,u.y-15);
 other.cooldown=99;g.applyLuckyFlash(u,{source:c,evolved:true});assert.equal(u.pirateFuse,null);
 tick(g,1);assert.ok(g.luckyFlashConfused(u));assert.ok(Math.cos(u.aimFace)<0);
 assert.ok(!g.shots.some(s=>s.kind==='pirateCannon'));assert.equal(other.hp,other.maxHp);
 tick(g,1.1);assert.ok(u.pirateFuse);near(u.pirateFuse.fireAt-u.pirateFuse.startedAt,3);
 assert.equal(g.pirateShells.length,0);
});
test('the cannon approaches instead of lighting its fuse from offscreen or behind cover',()=>{
 const {g,c,u}=field();g.viewport={width:250,height:250};
 const start=u.x;g.update(.025);assert.ok(!u.pirateFuse);assert.ok(u.x>start);
 u.x=c.x-90;g.obstacles=[{x:c.x-50,y:c.y-30,w:12,h:60}];g.update(.025);assert.ok(!u.pirateFuse);
});
test('both a partially burned fuse and a launched projectile resume with their original fixed timestamps',()=>{
 const {g,u}=field();g.update(.025);tick(g,1);
 const restore=game=>unpack(field().g,JSON.parse(JSON.stringify(pack(game))));
 const first=restore(g),gun=first.units.find(t=>t.id===u.id);
 assert.deepEqual(gun.pirateFuse,u.pirateFuse);first.time=gun.pirateFuse.fireAt;first.updatePirateCannon(gun,.025);
 const second=restore(first),shot=second.pirateShells[0],rebound=second.units.find(t=>t.id===u.id);
 assert.equal(shot.source,rebound);assert.equal(shot.landAt,first.pirateShells[0].landAt);second.phase='paused';second.update(.05);assert.equal(second.pirateShells.length,1);
 second.phase='playing';second.time=shot.landAt;second.updatePirateShells();assert.equal(second.pirateShells.length,0);
});

test('an enemy-caused kill, a nonlethal hit and a status already interrupting the fuse grant no interception cue',()=>{
 for(const cause of ['enemy','nonlethal','stunned','blinded']){
  const {g,c,u}=field();g.update(.025);assert.ok(u.pirateFuse);
  if(cause==='stunned')u.toyStunUntil=g.time+1;
  if(cause==='blinded')u.luckyFlash={until:g.time+1};
  g.damage(u,cause==='nonlethal'?1:99999,cause==='enemy'?u:c);
  assert.ok(!g.effects.some(e=>e.kind==='pirateIntercept'),cause);
 }
});
