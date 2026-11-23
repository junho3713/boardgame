import {walkable,where} from './school-state.js';

const lane=-6.08,north=-25.6,south=6.65;
export const LOCKERS=[-22.2,-21.45,-12.05,-11.30,-.9,1.5,2.25,3].map((z,i)=>({
  id:'locker'+(i+1),z,insideX:-7.39,exitX:-6.53
}));

export function newPatrol(z=-15){
  return {x:lane,z,yaw:0,mode:'off',destination:south,lastZ:z,notice:0,
    wait:0,grace:1.6,speed:0,stride:0,step:false};
}

function turn(g,yaw,dt){
  const diff=Math.atan2(Math.sin(yaw-g.yaw),Math.cos(yaw-g.yaw));
  g.yaw+=Math.sign(diff)*Math.min(Math.abs(diff),dt*4.2);
}

// Halls and lockers form straight sightlines. Doorways delimit the guard's beat.
function canSee(g,p){
  const x=p.x-g.x,z=p.z-g.z,d=Math.hypot(x,z);
  if(d>=10.8||(d>=1.55&&x*Math.sin(g.yaw)+z*Math.cos(g.yaw)<=.40*d))return false;
  if(p.x>=-6.92&&g.x>=-6.92)return true;
  const steps=Math.ceil(d/.12);
  for(let i=1;i<steps;i++){
    const fraction=i/steps;
    if(Math.abs(g.x+x*fraction+7.24)<.32&&LOCKERS.some(l=>Math.abs(g.z+z*fraction-l.z)<.36))return false;
  }
  return true;
}
function travel(g,x,z,speed,dt,s,blocks){
  const dx=x-g.x,dz=z-g.z,d=Math.hypot(dx,dz);
  if(d<.035)return;
  const k=Math.min(1,speed*dt/d),ox=g.x,oz=g.z;
  if(walkable(s,g.x+dx*k,g.z,blocks))g.x+=dx*k;
  if(walkable(s,g.x,g.z+dz*k,blocks))g.z+=dz*k;
  const moved=Math.hypot(g.x-ox,g.z-oz);
  g.speed=moved/dt;g.stride+=moved;
  if(g.stride>.69){g.stride%=.69;g.step=true;}
  turn(g,Math.atan2(dx,dz),dt);
}
export function advancePatrol(g,dt,p,concealed,s,blocks){
  g.step=false;g.speed=0;
  if(s.free||s.escaped||dt<=0)return;
  const exposed=!concealed&&where(p.x,p.z)==='hall';
  if(g.mode==='off'){
    if(!exposed)return;
    g.mode='patrol';
  }
  g.grace=Math.max(0,g.grace-dt);
  const sight=exposed&&canSee(g,p);
  let event;
  if(g.mode!=='chase'){
    g.notice=Math.max(0,Math.min(1,g.notice+(sight&&!g.grace?1.6:-2)*dt));
    if(g.notice>=1){g.mode='chase';event='spotted';}
  }
  if(g.mode==='chase'){
    if(!exposed){g.mode='search';g.wait=3.3;g.notice=0;}
    else {
      g.lastZ=p.z;
      if(Math.hypot(g.x-p.x,g.z-p.z)<.62)return 'caught';
      // Run along the clear aisle first, then close the lateral gap.
      travel(g,Math.abs(p.z-g.z)>1.05?lane:p.x,p.z,2.60,dt,s,blocks);
      return event;
    }
  }
  if(g.mode==='search'){
    if(Math.abs(g.z-g.lastZ)>.10)travel(g,lane,g.lastZ,1.9,dt,s,blocks);
    else{
      g.wait-=dt;
      turn(g,-Math.PI/2+.52*Math.sin(g.wait*1.8),dt);
      if(g.wait<=0){
        g.mode='patrol';g.grace=6;g.destination=g.z<(north+south)/2?south:north;
        return 'leaving';
      }
    }
  }else{
    if(Math.abs(g.z-g.destination)<.09)g.destination=g.destination===north?south:north;
    travel(g,lane,g.destination,1.08,dt,s,blocks);
  }
  return event;
}
