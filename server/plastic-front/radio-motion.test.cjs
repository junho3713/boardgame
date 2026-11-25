'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

function renderer(coop=false){
 let now=0;const planes=[],markers=[];
 class Atlas{
  set src(url){
   this.complete=true;
   [this.naturalWidth,this.naturalHeight]=url.includes('volume')?[1152,3072]:[432,864];
  }
 }
 const window={Image:Atlas,matchMedia:()=>({matches:true}),performance:{now:()=>now},
  FrontCoopClient:{active:coop},FrontRadioAirspace:{syncOrigins(){},scorch(){},aircraft(_ctx,e){planes.push(e.strike);},marker(_ctx,e){markers.push(e.strike);},shadow(){}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./public/radio-art.js'),'utf8'),{window});
 const cells=[],faces=[],labels=[],scales=[],paints=[],layers=[],stack=[];
 function addColorStop(offset,color){this.stops.push([offset,color]);}
 const makeGradient=radius=>({radius,stops:[],addColorStop});
 const c=new Proxy({
  globalAlpha:1,globalCompositeOperation:'source-over',position:[0,0],stretch:[1,1],
  createRadialGradient:(_x,_y,_inner,_cx,_cy,radius)=>makeGradient(radius),
  createLinearGradient:()=>makeGradient(),
  save(){stack.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation,position:this.position,stretch:this.stretch});},
  restore(){Object.assign(this,stack.pop());},
  translate(x,y){this.position=[this.position[0]+x,this.position[1]+y];},
  canvas:{width:800,height:600,clientWidth:800},getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),
  fill(){
   paints.push(this.fillStyle);
   if(this.fillStyle?.stops)layers.push({gradient:this.fillStyle,alpha:this.globalAlpha,blend:this.globalCompositeOperation,position:this.position,stretch:this.stretch});
   if(['#434543','#9e611e'].includes(this.fillStyle))faces.push(0);
   if(['#0e0e0e','#3f230d'].includes(this.fillStyle))faces[faces.length-1]++;
  },
  measureText:label=>({width:label.length*6}),fillText(label){labels.push(label);},scale(x,y){scales.push(x);this.stretch=[x,y];},stroke(){paints.push(this.strokeStyle);},
  drawImage(img,sx,sy,sw,sh){if(sw===192)cells.push((sy/192%4)*6+sx/192);}
 },{get:(o,k)=>o[k]??(()=>{})});
 const game={time:0,phase:'playing',coop,effects:[],radioFireZones:[]};
 return {game,planes,markers,paint(t,ms,visible){layers.length=0;now=ms;game.time=t;window.FrontRadioArt.ground(c,game,visible);return [...layers];},cells,labels,scales,paints,
  dice(e,age){
   faces.length=0;labels.length=0;scales.length=0;paints.length=0;
   game.effects=[e].flat().map(roll=>({kind:'radioRoll',x:0,y:0,max:.85,t:.85-age,...roll}));
   window.FrontRadioArt.rolls(c,game,()=>true);return [...faces];},
  impact(at=0,strike='nuke'){return window.FrontRadioArt.event(c,{kind:'radioImpact',strike,at,x:0,y:0,radius:225,t:1,max:1});}};
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
test('each rank displays a single pair and the dice still pop on success',()=>{
 const r=renderer();r.game.reducedMotion=false;
 for(const rank of [1,2,3]){
  const e={rank,rolls:[{dice:[4,4],success:true,strike:'missile'}]};
  assert.deepEqual(r.dice(e,.10),[0,0]);
  assert.deepEqual(r.dice(e,rank===3?.217:.287),[4,4]);
  assert.ok(r.scales.some(x=>x>1.45));
  assert.deepEqual(r.labels,['미사일 2발']);
  assert.equal(r.paints.filter(x=>x==='#f7d072').length,rank===3?2:0);
 }
});
test('nuclear and hotline sixes have distinct labels over the same two dice',()=>{
 const r=renderer();
 for(const [strike,label,missileCount] of [['nuke','전술 핵'],['missile','강화 미사일 6발',6]]){
  const e={rank:3,golden:true,rolls:[{dice:[6,6],success:true,strike,missileCount}]};
  assert.deepEqual(r.dice(e,.23),[6,6]);
  assert.deepEqual(r.labels,[label]);
  assert.ok(r.scales.every(scale=>scale<=1.09));
 }
});
const flames=layers=>layers.filter(({gradient})=>gradient.stops[0][1]==='#FFF3B0');
test('the fire zone draws a soft floor and fourteen flames, then fades and settles in the final second',()=>{
 const r=renderer();
 r.game.radioFireZones=[{x:50,y:32,radius:80,startedAt:0,until:5}];
 const first=r.paint(0,0),steady=r.paint(.15,150);
 const reflection=layers=>layers.find(({blend})=>blend==='lighter');
 assert.equal(steady[0].gradient.stops.at(-1)[1],'rgba(48,27,22,0)');
 assert.deepEqual(steady[0].stretch,[1,.62]);
 assert.ok(Math.abs(reflection(steady).gradient.radius/80-1.25)<.025);
 assert.ok(reflection(first).gradient.radius<reflection(steady).gradient.radius/2);
 const reflectionAlpha=layers=>Number(reflection(layers).gradient.stops[0][1].split(',').at(-1).replace(')',''));
 assert.ok(reflectionAlpha(first)>reflectionAlpha(steady)+.35);
 assert.equal(flames(steady).length,14);
 assert.ok(flames(steady).every(({blend})=>blend==='source-over'));
 const late=r.paint(4.75,4750);
 assert.equal(late[0].alpha,.25);
 assert.ok(Math.max(...flames(late).map(({stretch})=>stretch[1]))<Math.max(...flames(steady).map(({stretch})=>stretch[1]))*.5);
 assert.deepEqual(r.paint(5,5000),[]);
 assert.equal(r.impact(0,'incendiary'),true);
 assert.deepEqual(r.cells,[]);
});
test('reduced motion advances the nuclear impact and stylized flames, and a paused battle holds the frame',()=>{
 const r=renderer();
 r.game.radioFireZones=[{x:50,y:32,radius:80,startedAt:0,until:5}];
 const fire=new Set(),cloud=new Set();
 for(const t of [.25,.45,.65,.85]){
  r.cells.length=0;fire.add(JSON.stringify(flames(r.paint(t,t*1000))));r.impact();cloud.add(r.cells.at(-1));
 }
 assert.equal(fire.size,4);assert.equal(cloud.size,4);
 r.game.phase='paused';r.cells.length=0;const settled=flames(r.paint(.85,1500));r.impact();const frozen=[...r.cells];
 r.cells.length=0;assert.deepEqual(flames(r.paint(.85,3000)),settled);r.impact();assert.deepEqual(r.cells,frozen);
});
test('cooperative display advances between snapshots, bounds prediction and leaves the simulation clock intact',()=>{
 const r=renderer(true);r.paint(4,1000);r.impact(4);const initial=r.cells.at(-1);
 r.paint(4,1100);r.impact(4);assert.ok(r.cells.at(-1)>initial);assert.equal(r.game.time,4);
 r.paint(4,1500);r.impact(4);const limit=r.cells.at(-1);
 r.paint(4,2300);r.impact(4);assert.equal(r.cells.at(-1),limit);
 r.paint(4.15,2350);r.impact(4);assert.ok(r.cells.at(-1)>=limit);
 r.paint(1,2400);r.impact(1);assert.equal(r.cells.at(-1),initial);
});
test('a radio flyover draws separately from its impact visibility and continues after incendiary impact',()=>{
 const r=renderer();
 r.game.effects=[
  {kind:'radioIncoming',strike:'missile',x:100,y:100,landAt:.58},
  {kind:'radioImpact',strike:'incendiary',x:-100,y:100,landAt:0}
 ];
 r.paint(.05,50,()=>false);
 assert.deepEqual(r.planes,['missile','incendiary']);
 assert.deepEqual(r.markers,[]);
});
