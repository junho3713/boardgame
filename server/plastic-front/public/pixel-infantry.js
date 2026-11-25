/* Native-grid infantry cels and matching promotion emblems for the pixel room. */
(() => {
 'use strict';
 const roles=['shotgun','machinegun','sniper','engineer','mortar','medic','radio','leader'];
 const abilities=['damage','speed','haste','critChance','critDamage','gold','capacity','defense','health','xpGain','fieldSupply','fieldGold','fieldRepair'];
 const units=['rifle','machinegun','sniper','rocket','mortar','medic','guntruck','drone','tank','lucky'];
 const iconKeys=[...abilities,...units];
 const body=new Image(),walks=new WeakMap();
 let ready;
 function load(){
  if(!ready){
   body.src='assets/pixel-room/infantry-v1.png';
   ready=body.decode().catch(err=>{ready=null;throw err;});
  }
  return ready;
 }
 function roleFor(u){
  // The hand-drawn atlas represents the player's green squad only.
  if(u.team!==0||u.boss||u.defenseKind||u.ultimatePose?.active)return null;
  if(u.type==='leader'&&u.appearance&&u.appearance!=='sarge')return null;
  if((u.type==='medic'&&u.appearance==='rina')||(u.type==='sniper'&&['kayla','hayeon'].includes(u.appearance)))return null;
  if(u.type==='rifle')return 'shotgun';
  if(u.type==='rocket')return 'engineer';
  if(u.type==='guntruck')return 'radio';
  if(['leader','machinegun','sniper','mortar','medic'].includes(u.type))return u.type;
  return null;
 }
 function poseFor(u,role,time){
  let step=walks.get(u);
  if(!step||time<step.time){step={x:u.x,y:u.y,time,distance:0,pose:0};walks.set(u,step);}
  if(time>step.time){
   const delta=Math.hypot(u.x-step.x,u.y-step.y);
   step.distance=(step.distance+delta)%46;
   step.pose=delta>.04?[1,2,3,0][Math.floor(step.distance/11.5)]:0;
   step.x=u.x;step.y=u.y;step.time=time;
  }
  if(role==='shotgun'&&time>=u.shotgunPumpStartedAt&&time<u.shotgunPumpUntil){
   const cycle=(time-u.shotgunPumpStartedAt)/(u.shotgunPumpUntil-u.shotgunPumpStartedAt);
   if(cycle<.17)return 4;
   if(cycle<.56)return 5;
  }
  if(role==='radio'){
   if(time-u.radioDoubleAt>=.5&&time-u.radioDoubleAt<1.05)return 4;
   if(time-u.radioRollAt>=0&&time-u.radioRollAt<.5)return 5;
  }
  if(role==='engineer'&&u.cooldown>=0&&u.cooldown<.13)return 5;
  if(u.recoil>.04||time-u.blockMineThrownAt>=0&&time-u.blockMineThrownAt<.18)return 4;
  return step.pose;
 }
 function draw(ctx,u,time,evolved){
  if(!body.complete||!body.naturalWidth)return false;
  const role=roleFor(u);if(!role)return false;
  const facing=u.aimFace??u.face??u.moveFace??0;
  const dir=(Math.round(facing*4/Math.PI)%8+8)%8;
  const column=(evolved?8:0)+dir;
  const row=roles.indexOf(role)*6+poseFor(u,role,time);
  const cell=40, unitSize=2;
  ctx.drawImage(body,column*cell,row*cell,cell,cell,-20*unitSize,-32*unitSize,cell*unitSize,cell*unitSize);
  return true;
 }
 function icon(key,evolved=false){
  const base=iconKeys.indexOf(({turretHp:'health',turretDamage:'damage',turretDefense:'defense'})[key]||key);
  if(base<0)return '';
  const slot=base+(evolved&&units.includes(key)?units.length:0);
  return '<span class="pixel-emblem" aria-hidden="true" style="background-position:'+slot/(iconKeys.length+units.length-1)*100+'% 0"></span>';
 }
 window.FrontPixelInfantry={load,draw,icon};
})();

