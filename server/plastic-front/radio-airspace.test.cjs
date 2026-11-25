'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const air=require('./public/radio-airspace.js');
const feedback=require('./public/hit-feedback.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('parallel missile approaches accelerate along the sprite axis and land at the origin',()=>{
 for(const kind of ['missile','nuke']){
  const duration=air.flightSeconds[kind];
  for(const height of [190,540,1100]){
   let previous=air.flightPose(kind,duration,height),lastStep=0;
   for(let i=1;i<=10;i++){
    const next=air.flightPose(kind,duration*(1-i/10),height);
    const dx=next.x-previous.x,dy=next.y-previous.y,step=Math.hypot(dx,dy);
    assert.ok(step>lastStep);close(dx/step,-Math.sin(next.angle));close(dy/step,Math.cos(next.angle));
    close(Math.atan2(dy,Math.abs(dx))*180/Math.PI,kind==='missile'?65:90);
    previous=next;lastStep=step;
   }
   close(previous.x,0);close(previous.y,0);
  }
 }
});
test('offscreen release position survives camera movement and a fresh network snapshot',()=>{
 let m={d:.8,f:120};const c={getTransform:()=>m};
 const e={kind:'radioIncoming',strike:'missile',seq:0,landAt:12,x:50,y:260};
 air.syncOrigins(c,{time:11.5,effects:[e]});
 const start=air.pose(c,e,air.flightSeconds.missile);
 assert.ok(m.f+m.d*(e.y+start.y)<0);
 m={d:1.4,f:370};
 air.syncOrigins(c,{time:11.7,effects:[{...e}]});
 assert.deepEqual(air.pose(c,{...e},air.flightSeconds.missile),start);
});
test('aircraft passes cross at the impact or release cue and last for the specified duration',()=>{
 for(const [kind,cross,duration] of [['incendiary',0,.4],['missile',.35,.45],['nuke',air.flightSeconds.nuke,.7]]){
  close(air.passPhase(kind,cross+duration/2),0);close(air.passPhase(kind,cross),.5);close(air.passPhase(kind,cross-duration/2),1);
 }
});
test('nuclear flash uses the entire viewport for 50ms and shake ends at 300ms',()=>{
 let count=0;const ctx={canvas:{width:900,height:670},save(){},restore(){},setTransform(){},fillRect(...r){assert.deepEqual(r,[0,0,900,670]);count++;}};
 const g={phase:'playing',time:0,effects:[{kind:'radioImpact',strike:'nuke',at:0}]};
 feedback.screenFlash(ctx,g);assert.equal(count,1);assert.notDeepEqual(feedback.nuclearShake(g),{x:0,y:0});
 g.time=.05;feedback.screenFlash(ctx,g);assert.equal(count,1);
 g.time=.3;assert.deepEqual(feedback.nuclearShake(g),{x:0,y:0});
 g.time=.01;g.reducedMotion=true;feedback.screenFlash(ctx,g);assert.equal(count,1);assert.deepEqual(feedback.nuclearShake(g),{x:0,y:0});
});
test('aircraft sweeps both horizontal edges with centered, edge, and offscreen impacts',()=>{
 for(const [width,height] of [[1280,720],[2560,1080],[780,1688]]){
  for(const [kind,lead,duration] of [['incendiary',0,.4],['missile',.35,.45],['nuke',.81,.7]]){
   for(const [targetX,targetY] of [[width*.6,height*.6],[0,0],[width,height],[-900,height+100]]){
    const pose=p=>air.aircraftPass(kind,lead+(.5-p)*duration,width,height,1,targetX,targetY);
    const frames=[.001,.2,.5,.8,.999].map(pose);
    assert.ok(frames[0].x-frames[0].size/2>width);
    assert.ok(frames.at(-1).x+frames.at(-1).size/2<0);
    for(let i=1;i<frames.length;i++)assert.ok(frames[i].x<frames[i-1].x);
    for(const {x,y} of frames)if(x>=0&&x<=width)assert.ok(y>0&&y<height);
    if(targetX===width*.6){close(frames[2].x,targetX);close(frames[2].y,targetY);}
    for(const boundary of [width*.15,width*.85]){
     const y=frames[2].y+(frames[2].x-boundary)*Math.tan(frames[2].angle-Math.PI/2)*-1;
     assert.ok(y>0&&y<height);
    }
   }
  }
 }
});
