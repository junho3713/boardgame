'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

function renderer(coop=false){
 let now=0;
 class Atlas{
  set src(url){
   this.complete=true;
   [this.naturalWidth,this.naturalHeight]=url.includes('volume')?[1152,3072]:[432,864];
  }
 }
 const window={Image:Atlas,matchMedia:()=>({matches:true}),performance:{now:()=>now},
  FrontCoopClient:{active:coop},FrontRadioAirspace:{syncOrigins(){},scorch(){},aircraft(){},marker(){},shadow(){}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./public/radio-art.js'),'utf8'),{window});
 const cells=[],faces=[],labels=[],scales=[],paints=[],gradient={addColorStop(){}},c=new Proxy({
  globalAlpha:1,createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,
  canvas:{width:800,height:600,clientWidth:800},getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),
  fill(){paints.push(this.fillStyle);if(['#434543','#9e611e'].includes(this.fillStyle))faces.push(0);if(['#0e0e0e','#3f230d'].includes(this.fillStyle))faces[faces.length-1]++;},
  measureText:label=>({width:label.length*6}),fillText(label){labels.push(label);},scale(x){scales.push(x);},stroke(){paints.push(this.strokeStyle);},
  drawImage(img,sx,sy,sw,sh){if(sw===192)cells.push((sy/192%4)*6+sx/192);}
 },{get:(o,k)=>o[k]??(()=>{})});
 const game={time:0,phase:'playing',coop,effects:[],radioFireZones:[]};
 return {game,paint(t,ms){now=ms;game.time=t;window.FrontRadioArt.ground(c,game);},cells,labels,scales,paints,
  dice(e,age){
   faces.length=0;labels.length=0;scales.length=0;paints.length=0;
   game.effects=[e].flat().map(roll=>({kind:'radioRoll',x:0,y:0,max:.85,t:.85-age,...roll}));
   window.FrontRadioArt.rolls(c,game,()=>true);return [...faces];},
  impact(at=0){window.FrontRadioArt.event(c,{kind:'radioImpact',strike:'nuke',at,x:0,y:0,radius:225,t:1,max:1});}};
}
test('rolling dice only show pips for the settled outcome, including misses that previously flashed a low double',()=>{
 const r=renderer();
 for(const reducedMotion of [false,true]){
  r.game.reducedMotion=reducedMotion;
  for(const [a,b] of [[1,3],[3,5],[1,1],[2,2],[6,6]]){
   const e={a,b,strike:a!==b?null:a===6?'nuke':'incendiary'};
   for(const age of [0,.06,.11,.16,.22])assert.deepEqual(r.dice(e,age),[0,0]);
   for(const age of [.24,.4,.8])assert.deepEqual(r.dice(e,age),[a,b]);
  }
 }
});
test('fused radio rolls keep three separate pairs and only the successful pairs pop',()=>{
 const r=renderer();r.game.reducedMotion=false;
 const rolls=[{dice:[1,1],success:true,strike:'incendiary'},{dice:[2,4],success:false},{dice:[5,5],success:true,strike:'missile'}];
 assert.deepEqual(r.dice({rank:2,bonus:2,rolls},.19),[0,0,0,0,0,0]);
 assert.deepEqual(r.labels,[]);
 assert.deepEqual(r.dice({rank:2,bonus:2,rolls},.31),[1,1,2,4,5,5]);
 assert.deepEqual(r.scales.filter(x=>x===1.5),[1.5,1.5]);
 assert.deepEqual(r.labels,['SYNC x2!']);
 assert.equal(r.paints.filter(x=>x==='#ffcf58').length,2);
});
test('rank three dice finish rolling sooner, paint gold, and show the triple jackpot once',()=>{
 const r=renderer();r.game.reducedMotion=true;
 const rolls=[1,3,6].map(n=>({dice:[n,n],success:true}));
 const e={rank:3,bonus:3,rolls,source:{id:12,x:100,y:300}};
 const superseded={...e,rolls:[{dice:[1,2],success:false}],rank:1,bonus:0,t:.1};
 assert.deepEqual(r.dice([superseded,e],.19),[1,1,3,3,6,6]);
 assert.deepEqual(r.labels,['TRIPLE JACKPOT!']);
 assert.equal(r.paints.filter(x=>x==='#f7d072').length,6);
 assert.ok(r.scales.every(scale=>scale<=1.09));
});
test('reduced motion advances the impact and the same burning pocket, and a paused battle holds the frame',()=>{
 const r=renderer();
 r.game.radioFireZones=[{x:50,y:32,radius:80,startedAt:0,until:5}];
 const fire=new Set(),cloud=new Set();
 for(const t of [.25,.45,.65,.85]){
  r.cells.length=0;r.paint(t,t*1000);fire.add(r.cells[0]);r.impact();cloud.add(r.cells.at(-1));
 }
 assert.equal(fire.size,4);assert.equal(cloud.size,4);
 r.game.phase='paused';r.cells.length=0;r.paint(.85,1500);r.impact();const frozen=[...r.cells];
 r.cells.length=0;r.paint(.85,3000);r.impact();assert.deepEqual(r.cells,frozen);
});
test('cooperative display advances between snapshots, bounds prediction and leaves the simulation clock intact',()=>{
 const r=renderer(true);r.paint(4,1000);r.impact(4);const initial=r.cells.at(-1);
 r.paint(4,1100);r.impact(4);assert.ok(r.cells.at(-1)>initial);assert.equal(r.game.time,4);
 r.paint(4,1500);r.impact(4);const limit=r.cells.at(-1);
 r.paint(4,2300);r.impact(4);assert.equal(r.cells.at(-1),limit);
 r.paint(4.15,2350);r.impact(4);assert.ok(r.cells.at(-1)>=limit);
 r.paint(1,2400);r.impact(1);assert.equal(r.cells.at(-1),initial);
});
