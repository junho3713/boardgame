'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.time=180;g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.structures=[];g.defenses=[];g.buildings=[];g.pickups=[];
 for(const u of g.units){u.x=1000;u.y=7000;u.cooldown=1e6;u.hp=u.maxHp=10000;}
 g.visible=g.lineClear=()=>true;for(const method of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','syncEnemyGrowth','move','separateCrowd'])g[method]=()=>{};
 return g;
}
function bug(g,type='bombBug',x=1500,y=7000){const u=g.addUnit(2,type,x,y,true);u.assault=true;u.cooldown=0;return u;}
test('bomb bugs walk slowly, stop to show a 0.9 second fuse and can be escaped',()=>{
 const g=scene(),c=g.commander(0),u=bug(g);a.ok(TYPES.bombBug.speed<TYPES.ant.speed*.5);c.x=u.x+50;
 g.updateBombBug(u,.05);a.equal(u.bombFuse.explodeAt,180.9);a.ok(g.bossHazards().some(h=>h.radius===125));
 const hp=c.hp;c.x+=400;g.time=180.89;g.updateBombBug(u,.05);a.ok(u.hp>0);g.time=180.9;g.updateBombBug(u,.05);a.equal(u.hp,0);a.equal(c.hp,hp);
});
test('killing a bomb immediately hits both hostile teams and nearby allies once',()=>{
 const g=scene(),c=g.commander(0),u=bug(g),enemy=bug(g,'ant',u.x+30),red=g.addUnit(1,'rifle',u.x-30,u.y,true),ally=g.addUnit(0,'rifle',u.x,u.y+90),far=bug(g,'ant',u.x+126);
 for(const v of [enemy,red,ally,far])v.hp=v.maxHp=10000;const hp=enemy.hp;
 g.damage(u,1e6,c);a.ok(enemy.hp<hp&&red.hp<hp&&ally.hp<hp);a.equal(far.hp,hp);a.equal(g.effects.filter(e=>e.visualKind==='bombBug').length,1);
 const after=enemy.hp;g.damage(u,1e6,c);g.detonateBombBug(u,c);a.equal(enemy.hp,after);
});
test('a dense chain uses one explosion per bug and credits the initiating player',()=>{
 const g=scene(),c=g.commander(0),bugs=Array.from({length:30},(_,i)=>bug(g,'bombBug',1500+i*3));for(const u of bugs)u.hp=1;
 const kills=g.kills;g.damage(bugs[0],100,c);a.ok(bugs.every(u=>u.hp===0&&u.bombDetonated));a.equal(g.kills-kills,30);a.equal(g.effects.filter(e=>e.visualKind==='bombBug').length,30);a.equal(g.bombBlastQueue.length,0);a.equal(g.processingBombBlasts,false);
});
test('bomb damage respects armor, commander protection and both cooperative choice shields',()=>{
 const g=scene(true),u=bug(g),leaders=g.units.filter(u=>u.type==='leader');for(const c of leaders){c.x=u.x+20;c.hp=c.maxHp=10000;g.coopInvulnerable[c.coopOwner]=g.time+5;}
 g.detonateBombBug(u);a.ok(leaders.every(c=>c.hp===10000));
 const h=scene(),b=bug(h),tank=h.addUnit(0,'tank',b.x+20,b.y),rifle=h.addUnit(0,'rifle',b.x-20,b.y);tank.hp=rifle.hp=10000;h.detonateBombBug(b);a.ok(10000-tank.hp<10000-rifle.hp);
 const c=h.commander(0),b2=bug(h);c.x=b2.x;c.reviveProtectionUntil=h.time+3;const hp=c.hp;h.detonateBombBug(b2);a.equal(c.hp,hp);
});
test('a blue player owns chain rewards while green and blue casualty counters stay separate',()=>{
 const g=scene(true),blue=g.withOwner(1,()=>g.commander(0)),u=bug(g),v=bug(g,'bombBug',u.x+40);v.hp=1;
 const ally=g.withOwner(0,()=>g.addUnit(0,'rifle',u.x+20,u.y));ally.hp=1;const before=g.withOwner(0,()=>g.losses[0]),blueLoss=g.withOwner(1,()=>g.losses[0]),gold=g.withOwner(1,()=>g.profile.gold),greenGold=g.withOwner(0,()=>g.profile.gold);
 g.damage(u,1e6,blue);a.equal(g.withOwner(0,()=>g.losses[0]),before+1);a.equal(g.withOwner(1,()=>g.losses[0]),blueLoss);a.ok(g.withOwner(1,()=>g.profile.gold)>gold);a.equal(g.withOwner(0,()=>g.profile.gold),greenGold);
});
test('a saved armed bomb preserves its remaining fuse and paused updates cannot detonate it',()=>{
 const g=scene(),u=bug(g),c=g.commander(0);c.x=u.x+50;g.updateBombBug(u,.05);g.time+=.4;const restored=unpack(new FrontGame(),pack(g)),b=restored.units.find(v=>v.id===u.id);
 a.equal(b.bombFuse.explodeAt,u.bombFuse.explodeAt);restored.phase='paused';restored.update(.05);a.equal(b.bombDetonated,undefined);restored.time=b.bombFuse.explodeAt;restored.updateBombBug(b,.05);a.equal(b.bombDetonated,true);
});
test('midrange toy beetles lift a wooden ball, face forward and leave a dodgeable throw',()=>{
 const g=scene(),u=bug(g,'acidBeetle'),c=g.commander(0);c.x=u.x+190;g.updateAcidBeetle(u,.05);a.ok(u.acidWindup);a.ok(TYPES.acidBeetle.range<TYPES.rifle.range);a.ok(TYPES.acidBeetle.range>TYPES.bayonet.range*3);
 g.time+=.3;g.updateAcidBeetle(u,.05);a.equal(g.mortarShells.length,1);const p=g.mortarShells[0];a.equal(p.kind,'toyBall');a.equal(p.x,c.x);a.ok(Math.abs(p.landAt-g.time-.4)<1e-7);
 const hp=c.hp;c.x+=100;g.time=p.landAt;g.updateMortars();a.equal(c.hp,hp);a.equal(g.mortarShells.length,0);
});
test('a launched wooden ball still lands after its thrower dies and obeys normal armor damage',()=>{
 const g=scene(),u=bug(g,'acidBeetle'),c=g.commander(0);c.x=u.x+180;g.updateAcidBeetle(u,.05);g.time+=.3;g.updateAcidBeetle(u,.05);const hp=c.hp,p=g.mortarShells[0];g.damage(u,1e6,c);g.time=p.landAt;g.updateMortars();a.ok(c.hp<hp);a.ok(g.effects.some(e=>e.visualKind==='toyBall'));
});
test('killing a beetle during preparation cancels its unthrown ball',()=>{
 const g=scene(),u=bug(g,'acidBeetle'),c=g.commander(0);c.x=u.x+180;g.updateAcidBeetle(u,.05);a.ok(u.acidWindup);g.damage(u,1e6,c);g.time+=1;g.updateAcidBeetle(u,.05);a.equal(g.mortarShells.length,0);a.equal(u.acidWindup,null);
});
test('both original toy atlases render finite frames in all sixteen directions for either hostile team',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),w={};
 class Image{set src(url){this.url=url;queueMicrotask(()=>this.onload());}}
 vm.runInNewContext(fs.readFileSync(__dirname+'/public/models.js','utf8'),{window:w,Image,fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(__dirname+'/public/assets/models/manifest.json','utf8'))}),Math,Map,WeakMap,Promise});
 const m=new w.FrontModels();await m.ready;const draws=[],ctx={globalAlpha:1,save(){},restore(){},translate(){},scale(){},rotate(){},drawImage(...args){draws.push(args);a.ok(args.slice(1).every(Number.isFinite));}};
 for(const type of ['bombBug','acidBeetle']){
  const item=m.ensure(type,2);await item.loading;a.ok(item.ready);a.equal(m.ensure(type,1),item);a.equal(item.layers.body.directions,16);a.deepEqual([...item.layers.body.walkFrames],[1,2]);a.ok(fs.existsSync(path.join(__dirname,'public/assets/models',item.layers.body.file)));
  for(let dir=0;dir<16;dir++){const u={id:dir,type,team:2,hp:100,maxHp:100,x:100,y:100,face:dir*Math.PI/8,walk:0};a.equal(m.draw(ctx,u,1),true);const before=JSON.stringify(m.motion.get(u));m.draw(ctx,u,1);a.equal(JSON.stringify(m.motion.get(u)),before);}
 }
 a.equal(draws.length,64);
});
test('the actual fixed-step loop arms and explodes a nearby bomb',()=>{
 const g=scene(),u=bug(g),c=g.commander(0);c.x=u.x+50;g.levelCheck=()=>{};g.gainXP=()=>{};g.navigate=()=>{};for(let i=0;i<21;i++)g.update(.05);a.equal(u.bombDetonated,true);
});
test('room waves introduce both bugs after three minutes with bounded simultaneous counts',()=>{
 const g=scene();g.time=179.99;a.equal(g.roomCanSpawn('bombBug'),false);a.equal(g.roomCanSpawn('acidBeetle'),false);g.time=180;
 a.ok(g.roomPhase().mix.bombBug>0&&g.roomPhase().mix.acidBeetle>0);for(let i=0;i<5;i++)a.ok(g.spawnRoomEnemy('bombBug'));a.ok(g.spawnRoomEnemy('acidBeetle'));a.equal(g.spawnRoomEnemy('acidBeetle'),null);g.time+=14;a.ok(g.spawnRoomEnemy('acidBeetle'));g.time+=14;a.equal(g.spawnRoomEnemy('acidBeetle'),null);
});
test('wave testing can rewind the new spawn intervals without blocking early encounters',()=>{
 const g=scene(),wave=require('./public/wave-test.js');g.waveTest=true;g.time=780;g.spawnRoomEnemy('bombBug');g.spawnRoomEnemy('acidBeetle');a.ok(g.roomCampaign.insectNext.acidBeetle>780);wave.seek(g,180);a.ok(g.roomCanSpawn('bombBug'));a.ok(g.roomCanSpawn('acidBeetle'));a.equal(Object.keys(g.roomCampaign.insectNext).length,0);
 g.time=120;a.equal(g.roomPhase().mix.bombBug,undefined);a.equal(g.roomPhase().mix.ant,7);
});
