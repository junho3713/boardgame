'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {FrontGame,TYPES}=require('./public/engine.js');

function renderer({images=false,budget=240}={}){
 const requested=[],window={FrontTypes:TYPES};
 class TestImage{
  constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}
  set src(value){this.url=value;requested.push(this);}
  get src(){return this.url;}
  finish(ok){this.complete=true;this.naturalWidth=ok?768:0;this.naturalHeight=ok?288:0;(ok?this.onload:this.onerror)?.();}
 }
 const sandbox={window,Math,Map,WeakMap,WeakSet,Promise};if(images){window.Image=TestImage;sandbox.Image=TestImage;}
 const context=vm.createContext(sandbox);
 for(const file of ['effects.js','impact-materials.js','projectile-materials.js','evolution-effects.js'])vm.runInContext(fs.readFileSync(__dirname+'/public/'+file,'utf8'),context,{filename:file});
 const textures=Object.fromEntries(['glow','fire','smoke','whiteSmoke','dust','scorch','exhaust'].map(k=>[k,{name:k}]));
 return {fx:new window.FrontEffects({budget,textures}),requested};
}
function canvas(){
 const draws=[],ctx={draws,fills:0,globalAlpha:1,globalCompositeOperation:'source-over'};
 for(const name of ['save','restore','translate','rotate','scale','beginPath','closePath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','ellipse','arc','fill','stroke','fillRect','roundRect','fillText','strokeText','setLineDash'])ctx[name]=()=>{};
 ctx.fill=()=>ctx.fills++;ctx.drawImage=(...args)=>draws.push(args);ctx.createLinearGradient=ctx.createRadialGradient=()=>({addColorStop(){}});return ctx;
}
function flight(){
 const source={type:'lucky',team:0,x:100,y:300,hp:100},target={type:'tank',team:2,x:400,y:300,hp:10000};
 const shell={kind:'missile',source,team:0,fromX:100,fromY:276,x:400,y:300,delay:1,landAt:1,luckyLane:50};
 const shot={kind:'bossKiller',source,target,team:0,x:180,y:300,life:3};
 return {shell,shot,game:{time:.2,phase:'playing',effects:[],mortarShells:[shell],shots:[shot]}};
}
function state(fx){return JSON.stringify({particles:fx.particles,scorches:fx.scorches,seed:fx.seed,serial:fx.serial});}

test('777 and boss-killer trails freeze across repeated renders and a paused simulation clock',()=>{
 const {fx}=renderer(),{game,shell,shot}=flight(),c=canvas();fx.update(game);
 a.ok(fx.particles.some(p=>p.kind==='exhaust'));a.ok(fx.particles.some(p=>p.kind==='whiteSmoke'));
 const first=state(fx),combat=JSON.stringify(game);
 for(let i=0;i<30;i++){fx.drawMortar(c,shell,game.time);fx.drawShot(c,shot,true);fx.drawParticles(c);fx.update(game);}
 a.equal(state(fx),first);a.equal(JSON.stringify(game),combat);
 game.phase='paused';for(let i=0;i<30;i++)fx.update(game);a.equal(state(fx),first);
 game.phase='playing';game.time+=.05;shot.x+=22;fx.update(game);a.notEqual(state(fx),first);
 a.ok(fx.particles.some(p=>p.age>0));
});

test('rewinding simulation time clears old smoke, scorch and trail history even for reused projectile objects',()=>{
 const {fx}=renderer(),{game,shell,shot}=flight();game.effects.push({kind:'explosion',x:400,y:300,radius:90,t:.7,max:.7,team:0});fx.update(game);
 a.ok(fx.scorches.length);a.ok(fx.trails.has(shell)&&fx.trails.has(shot));
 fx.update({time:0,phase:'ready',effects:[],mortarShells:[],shots:[]});
 a.equal(fx.particles.length,0);a.equal(fx.scorches.length,0);a.equal(fx.trails.has(shell),false);a.equal(fx.trails.has(shot),false);
 game.time=0;game.effects=[];fx.update(game);
 a.equal(fx.particles.length,2);a.ok(fx.particles.every(p=>p.age===0));
});

test('an actual seven-missile jackpot keeps the mobile particle budget throughout launch and impact',()=>{
 const {fx}=renderer({budget:240}),g=new FrontGame({},undefined,{map:'livingroom-star3'});g.start();
 for(const key of ['units','obstacles','buildings','defenses','structures'])g[key]=[];g.mission.stage=3;
 const source=g.addUnit(0,'lucky',1000,6000),target=g.addUnit(2,'tank',1300,6000);target.hp=target.maxHp=1e6;g.evolved.lucky=true;
 g.castLucky(source,'missiles');const launched=new Set();let highWater=0;
 for(let tick=0;tick<=160;tick++){
  g.time=tick*.02;g.updateLuckyObjects(.02);for(const shell of g.mortarShells)launched.add(shell);g.updateMortars();fx.update(g);
  highWater=Math.max(highWater,fx.particles.length);a.ok(fx.particles.length<=240,'mobile budget exceeded at '+g.time);
 }
 a.equal(launched.size,7);a.equal(g.effects.filter(e=>e.kind==='explosion').length,7);a.equal(g.luckySalvos.length,0);a.equal(g.mortarShells.length,0);a.ok(target.hp<target.maxHp);a.ok(highWater>100,'test must exercise overlapping impacts');
 // A resume/frame stall can present all seven unseen impact events at once.
 const resumed=renderer({budget:240}).fx;resumed.update(g);a.equal(resumed.particles.length,240);
});

test('hidden 777, rocket and boss-killer projectiles emit no trails while invisible',()=>{
 const {fx}=renderer(),{game,shot}=flight();game.shots.push({...shot,kind:'rocket'});
 for(let i=0;i<20;i++){game.time+=.05;shot.x+=3;fx.update(game,()=>false);}
 a.equal(fx.particles.length,0);a.equal(fx.scorches.length,0);
 game.time+=.05;fx.update(game,()=>true);a.ok(fx.particles.length>0);a.ok(fx.particles.length<=9,'visibility change must not replay the entire hidden path');
});

test('material loading settles on success, failure or partial failure and each missile selects its own image',async()=>{
 for(const failed of [new Set(),new Set(['boss','lucky','fire']),new Set(['boss'])]){
  const {fx,requested}=renderer({images:true}),c=canvas();let settled=false;
  const ready=fx.prepareCombatMaterials().then(()=>{settled=true;});
  const materials=requested.filter(im=>/boss-killer|jackpot-missile|impact-fire/.test(im.src));a.equal(materials.length,3);
  a.equal(fx.drawMaterialMissile(c,10,20,.4,1,'boss'),false);a.equal(c.draws.length,0);
  await Promise.resolve();a.equal(settled,false);
  for(let i=0;i<materials.length;i++){
   const im=materials[i],kind=im.src.includes('boss-killer')?'boss':im.src.includes('jackpot')?'lucky':'fire';im.finish(!failed.has(kind));
   if(i<materials.length-1){await Promise.resolve();a.equal(settled,false,'play readiness settled before all image outcomes');}
  }
  await ready;a.equal(settled,true);
  for(const kind of ['boss','lucky']){
   c.draws.length=0;const ok=fx.drawMaterialMissile(c,10,20,.4,1,kind,1,{exhaust:false});a.equal(ok,!failed.has(kind));
   if(ok){a.equal(c.draws.length,1);a.equal(c.draws[0][0],fx.combatAssets[kind]);a.ok(c.draws[0].slice(1).every(Number.isFinite));}
   else a.equal(c.draws.length,0);
  }
  a.equal(!!fx.impactFireImage,!failed.has('fire'));
  // The ordinary renderer remains usable after an image fails; no blank missile.
  if(failed.has('lucky')){let fallback=0;fx.drawMaterialMissile=()=>{fallback++;return false;};const before=c.fills;a.doesNotThrow(()=>fx.drawLuckyMissile(c,10,20,.4,1));a.equal(fallback,1);a.ok(c.fills>before,'legacy missile must still paint');}
 }
});

test('headless or unavailable image APIs do not prevent material preparation from settling',async()=>{
 const {fx}=renderer();await fx.prepareCombatMaterials();a.equal(fx.drawMaterialMissile(canvas(),0,0,0,0,'boss'),false);a.equal(fx.drawImpactMaterial(canvas(),{x:0,y:0,t:.5,max:1,radius:90}),false);
});
