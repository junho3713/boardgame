/* Lit 3-D miniature sprites, baked offline; the combat simulation stays in world coordinates. */
(()=>{'use strict';
const TAU=Math.PI*2,angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
class FrontModels{
 constructor(){this.manifest=null;this.assets=new Map();this.motion=new WeakMap();this.loaded=0;this.failures=0;this.ready=fetch('assets/models/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('models');return r.json();}).then(async m=>{this.manifest=m;await Promise.all(Object.keys(m.models).map(key=>{const i=key.lastIndexOf('-');return this.ensure(key.slice(0,i),Number(key.slice(i+1))).loading;}));}).catch(()=>{this.failures++;});if(window.FrontMedicSkin){this.rina=new window.FrontMedicSkin();this.ready=Promise.all([this.ready,this.rina.ready]);}}
 ensure(type,team){
  // Enemy-only art is shared by both hostile simulation teams, including garrisons.
  const sharedEnemy=team!==0&&['bladeGuard','bikeRaider','crimsonAce','lucky','ant','soldierAnt','beetle','bruteBeetle','stagBeetle','rhinoBeetle','honeybee','hornet','butterfly'].includes(type);
  // Roaming mages and their escorts share the hostile support atlases across both enemy teams.
  const key=type+'-'+(['mortar','blizzardMage'].includes(type)&&team!==0?1:sharedEnemy?2:team);if(this.assets.has(key))return this.assets.get(key);
  const data=this.manifest?.models[key];if(!data)return null;
  const layers=type==='blizzardMage'?{...data,walk:{...data.body,file:'blizzardMage-walk-v20261106.webp',frames:8,anchors:undefined,mirrorFrames:undefined,walkFrames:[0,1,2,3,4,5,6,7],walkStride:72}}:data;
  let complete;const item={layers:{},ready:false,loading:new Promise(resolve=>{complete=resolve;})};this.assets.set(key,item);let count=0,failed=false;const settled=()=>{count++;if(count===Object.keys(layers).length){item.ready=!failed;if(item.ready)this.loaded++;complete();}};
  for(const [layer,spec]of Object.entries(layers)){
   const image=new Image();item.layers[layer]={...spec,image,ready:false};image.onload=()=>{const display=type==='blizzardMage'&&layer==='body'?this.mageAtlas(image,spec):image;item.layers[layer].image=display;item.layers[layer].ready=true;if(spec.hairFlaps)item.layers[layer].hairLayers=this.hairAtlases(display,spec);if(spec.secondaryHair)item.layers[layer].secondaryLayers=this.swordHairAtlases(display,spec);if(spec.wingFlaps)item.layers[layer].flightLayers=this.flightAtlases(display,spec);if(spec.groundShadow)item.layers[layer].shadow=this.groundAtlas(display);settled();};image.onerror=()=>{if(layer!=='walk')failed=true;this.failures++;settled();};image.src='assets/models/'+spec.file+'?v='+(layer==='walk'?'20261106':this.manifest.version);
  }
  return item;
 }
 swordHairAtlases(image,spec){
  if(typeof document==='undefined')return null;const base=document.createElement('canvas'),hair=document.createElement('canvas');base.width=hair.width=image.naturalWidth;base.height=hair.height=image.naturalHeight;const b=base.getContext('2d'),h=hair.getContext('2d');if(!b?.getImageData||!h)return null;b.drawImage(image,0,0);const body=b.getImageData(0,0,base.width,base.height),tails=h.createImageData(base.width,base.height),c=spec.cell;
  // Overlay exposed lower locks; keep the original sprite intact underneath.
  for(let f=0;f<spec.frames;f++)for(let d=0;d<spec.directions;d++){const ox=d*c,oy=f*c,ax=spec.anchors[f][d][0],floor=spec.anchors[f][d][1];for(let y=Math.floor(floor-c*.41);y<floor-18;y++)for(let x=0;x<c;x++){if(Math.abs(x-ax)<c*.12)continue;const i=((oy+y)*base.width+ox+x)*4,R=body.data[i],G=body.data[i+1],B=body.data[i+2];if(body.data[i+3]>10&&R>105&&R>G*1.06&&B>G*1.025){tails.data.set(body.data.subarray(i,i+4),i);}}}
  h.putImageData(tails,0,0);base.width=base.height=1;return[image,hair];
 }
 drawSword(ctx,u,time,item){
  const spec=item.layers.body,old=this.motion.get(u),fresh=!old,state=old||{x:u.x,y:u.y,time,walk:u.walk||0,walkPhase:0},elapsed=Math.max(0,time-state.time),dx=u.x-state.x,dy=u.y-state.y,travel=Math.hypot(dx,dy),moved=travel>.12&&Math.abs((u.walk||0)-state.walk)>.01,walking=elapsed===0?!!state.walking:moved;
  if(!Number.isFinite(state.walkPhase))state.walkPhase=0;
  if(elapsed>0&&walking)state.walkPhase=(state.walkPhase+(travel||Math.abs((u.walk||0)-state.walk)/.12)/(spec.walkStride||70))%1;
  const spin=u.ultimatePose?.active,swing=u.swordPose&&time<u.swordPose.endsAt,poseFace=spin?u.ultimatePose.angle:swing?u.swordPose.angle:walking?(elapsed===0?state.face:Math.atan2(dy,dx)):(u.aimFace??u.face),face=Number.isFinite(poseFace)?poseFace:Number.isFinite(u.face)?u.face:0,step=TAU/8,wanted=face+Math.PI/2;
  let aim=spin?wanted:state.bodyAngle;if(!Number.isFinite(aim)||(!spin&&Math.abs(angleDelta(wanted,aim))>step/2+.10))aim=Math.round(wanted/step)*step;
  let frame=walking?spec.walkFrames[Math.floor(state.walkPhase*spec.walkFrames.length)]:0;
  if(spin){const phase=(Math.max(0,time-(u.ultimatePose.startedAt??time))%.5)/.5;frame=spec.attackFrames[Math.min(3,Math.floor(phase*4))];}
  else if(swing){const a=u.swordPose,phase=(time-a.startedAt)/Math.max(.01,a.endsAt-a.startedAt);frame=time<a.hitAt?5:phase<.55?6:phase<.76?7:8;}
  if(!Number.isInteger(frame)||frame<0||frame>=spec.frames)frame=0;
  const hurt=Math.max(0,Math.min(1,((u.hurtUntil||0)-time)/.18)),phase=state.walkPhase*Math.PI*2,bob=walking?-Math.abs(Math.sin(phase))*.4:Math.sin(time*2.4+(u.id||0))*.18;
  ctx.save();this.ground(ctx,spec,aim,frame);if(hurt)ctx.translate(Math.cos(u.hurtAngle||0)*hurt*2,Math.sin(u.hurtAngle||0)*hurt*2);ctx.rotate(spin?Math.sin(time*19)*.025:swing?Math.sin((time-u.swordPose.startedAt)*14)*.035:0);this.sprite(ctx,spec,aim,frame,0,bob,time*2.1+phase*.65);ctx.restore();
  if(elapsed>0||fresh){Object.assign(state,{x:u.x,y:u.y,time,walk:u.walk||0,frame,walking,face,bodyAngle:aim});this.motion.set(u,state);}return true;
 }
 drawHwarin(ctx,u,time,item){
  const spec=item.layers.body,old=this.motion.get(u),fresh=!old,state=old||{x:u.x,y:u.y,time,walk:u.walk||0,walkPhase:0},elapsed=Math.max(0,time-state.time),dx=u.x-state.x,dy=u.y-state.y,travel=Math.hypot(dx,dy),moved=travel>.12&&Math.abs((u.walk||0)-state.walk)>.01,walking=elapsed===0?!!state.walking:moved;
  // A generic fallback can have created this motion state before the skin loaded.
  if(!Number.isFinite(state.walkPhase))state.walkPhase=0;
  if(elapsed>0&&walking)state.walkPhase=(state.walkPhase+(travel||Math.abs((u.walk||0)-state.walk)/.12)/(spec.walkStride||70))%1;
  const firing=!!(time<(u.flameUntil||0)||u.ultimatePose?.active),poseFace=firing?(u.ultimatePose?.active?u.ultimatePose.angle:(u.flameAngle??u.aimFace??u.face)):walking?(elapsed===0?state.face:Math.atan2(dy,dx)):(u.aimFace??u.face),face=Number.isFinite(poseFace)?poseFace:Number.isFinite(u.face)?u.face:0,step=TAU/8,wanted=face+Math.PI/2;
  // Retain the current sector near a boundary instead of flipping two views.
  let aim=state.bodyAngle;if(!Number.isFinite(aim)||Math.abs(angleDelta(wanted,aim))>step/2+.10)aim=Math.round(wanted/step)*step;
  const validFrame=f=>Number.isInteger(f)&&f>=0&&f<spec.frames?f:0;
  const direction=((Math.round(aim/step)%8)+8)%8,phase=state.walkPhase*TAU,legFrame=validFrame(walking?spec.walkFrames[Math.floor(state.walkPhase*spec.walkFrames.length)]:0),upperFrame=validFrame(spec.stableFireFrame??6);
  const hurt=Math.max(0,Math.min(1,((u.hurtUntil||0)-time)/.18)),recoil=firing?Math.sin(time*24)*.15:0,bob=walking?-Math.abs(Math.sin(phase))*.2:Math.sin(time*2.2+(u.id||0))*.12;
  ctx.save();this.ground(ctx,spec,aim,firing?upperFrame:walking?legFrame:0,false);if(hurt)ctx.translate(Math.cos(u.hurtAngle||0)*hurt*2,Math.sin(u.hurtAngle||0)*hurt*2);ctx.translate(-Math.cos(face)*recoil,-Math.sin(face)*recoil);
  const sway=time*2+phase*.65;
  if(walking&&spec.aimFrame!==undefined){
   const cut=spec.legSplit??-18,offset=spec.gaitOffsets?.[legFrame]?.[direction]||[0,0];
   ctx.save();ctx.beginPath();ctx.rect(-150,cut,300,180);ctx.clip();this.sprite(ctx,spec,aim,legFrame,offset[0],offset[1]+bob,sway);ctx.restore();
   ctx.save();ctx.beginPath();ctx.rect(-150,-180,300,180+cut+.5);const overhang=spec.aimOverhang?.[direction];if(overhang)ctx.rect(...overhang);ctx.clip();this.sprite(ctx,spec,aim,upperFrame,0,bob,sway);ctx.restore();
  }else this.sprite(ctx,spec,aim,walking?legFrame:upperFrame,0,bob,sway);
  ctx.restore();
  if(elapsed>0||fresh){Object.assign(state,{x:u.x,y:u.y,time,walk:u.walk||0,frame:walking?legFrame:upperFrame,upperFrame,walking,face,bodyAngle:aim,direction});this.motion.set(u,state);}return true;
 }
 drawMage(ctx,u,time,item){
  const state=this.motion.get(u)||{x:u.x,y:u.y,time,walkPhase:0},fresh=!this.motion.has(u),dt=Math.max(0,time-state.time),dx=u.x-state.x,dy=u.y-state.y,travel=Math.hypot(dx,dy),casting=!!(u.blizzardCast||time<(u.castUntil||0)),moved=dt>0&&travel>.035&&travel/dt>3;
  const walking=!casting&&!!item.layers.walk?.ready&&(dt===0?!!state.walking:moved);
  if(dt>0&&walking)state.walkPhase=(state.walkPhase+Math.min(travel,35)/item.layers.walk.walkStride)%1;
  const face=walking?(dt===0?state.face:Math.atan2(dy,dx)):(u.aimFace??u.face??-Math.PI/2),step=TAU/8,wanted=face+Math.PI/2;
  let aim=state.bodyAngle;if(!Number.isFinite(aim)||Math.abs(angleDelta(wanted,aim))>step/2+.10)aim=Math.round(wanted/step)*step;
  const spec=walking?item.layers.walk:item.layers.body,frame=casting?1:walking?spec.walkFrames[Math.floor(state.walkPhase*8)%8]:0;
  ctx.save();if(Number.isFinite(u.guardianReturnedAt)){const enter=Math.max(0,Math.min(1,(time-u.guardianReturnedAt)/1.2));ctx.globalAlpha*=.25+.75*enter;ctx.translate(0,-18*(1-enter));ctx.scale(.78+.22*enter,.78+.22*enter);}
  this.ground(ctx,spec,aim,frame);this.sprite(ctx,spec,aim,frame,0,walking?0:Math.sin(time*2.1+(u.id||0))*.65);ctx.restore();
  if(dt>0||fresh){Object.assign(state,{x:u.x,y:u.y,time,walking,casting,frame,face,bodyAngle:aim});this.motion.set(u,state);}return true;
 }
 mageAtlas(image,spec){
  if(typeof document==='undefined')return image;
  // Remove disconnected source-sheet scraps once per frame, keeping the original body and its soft edge.
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');if(!ctx?.getImageData)return image;ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),c=spec.cell,n=c*c,labels=new Int32Array(n),queue=new Int32Array(n),data=pixels.data;
  for(let oy=0;oy<canvas.height;oy+=c)for(let ox=0;ox<canvas.width;ox+=c){
   labels.fill(0);let serial=0,best=0,bestSize=0;
   for(let i=0;i<n;i++){
    const alpha=(((oy+Math.floor(i/c))*canvas.width+ox+i%c)*4)+3;if(labels[i]||data[alpha]<32)continue;
    const label=++serial;let head=0,tail=1;queue[0]=i;labels[i]=label;
    while(head<tail){const at=queue[head++],x=at%c,y=Math.floor(at/c);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=c||ny>=c)continue;const next=ny*c+nx;if(labels[next]||data[(((oy+ny)*canvas.width+ox+nx)*4)+3]<32)continue;labels[next]=label;queue[tail++]=next;}}
    if(tail>bestSize){bestSize=tail;best=label;}
   }
   for(let i=0;i<n;i++){if(labels[i]===best)continue;const x=i%c,y=Math.floor(i/c),alpha=(((oy+y)*canvas.width+ox+x)*4)+3;let edge=false;if(data[alpha]>0&&data[alpha]<32)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<c&&ny<c&&labels[ny*c+nx]===best)edge=true;}if(!edge)data[alpha]=0;}
  }
  ctx.putImageData(pixels,0,0);return canvas;
 }
 groundAtlas(image){
  // Cache an alpha silhouette once, rather than read / recolor pixels every frame.
  if(typeof document==='undefined')return null;
  const atlas=document.createElement('canvas');atlas.width=image.naturalWidth||image.width;atlas.height=image.naturalHeight||image.height;const c=atlas.getContext('2d');if(!c)return null;
  c.drawImage(image,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#182523';c.fillRect(0,0,atlas.width,atlas.height);return atlas;
 }
 ground(ctx,spec,angle,frame,contact=true){
  if(!spec.shadow)return;
  ctx.save();ctx.globalAlpha*=spec.shadowOpacity??.24;ctx.transform(1,0,-.46,-.29,1,1.5);ctx.filter='blur(1.6px)';this.sprite(ctx,{...spec,image:spec.shadow,secondaryLayers:null},angle,frame);ctx.restore();
  if(!contact)return;
  // A tight, dark contact patch stays on the floor while the body takes a step.
  ctx.save();const g=ctx.createRadialGradient(0,0,1,0,0,13);g.addColorStop(0,'#17231ab0');g.addColorStop(.5,'#17231a62');g.addColorStop(1,'#17231a00');ctx.fillStyle=g;ctx.scale(1,.4);ctx.beginPath();ctx.ellipse(0,0,13,13,0,0,TAU);ctx.fill();ctx.restore();
 }
 flightAtlases(image,spec){
  if(typeof document==='undefined')return null;
  const layers=[0,1,2].map(()=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;return canvas;});
  for(let frame=0;frame<spec.frames;frame++)for(let layer=0;layer<3;layer++){
   const c=layers[layer].getContext('2d'),top=frame*spec.cell;if(!c)return null;c.save();c.beginPath();
   if(layer===0){c.restore();continue;}
   const parts=layer===0?spec.wingFlaps[frame]:[spec.wingFlaps[frame][layer-1]];
   for(const part of parts){part.polygon.forEach(([x,y],i)=>i?c.lineTo(x,y+top):c.moveTo(x,y+top));c.closePath();}
   c.clip(layer===0?'evenodd':'nonzero');c.drawImage(image,0,0);c.restore();
  }
  if(spec.fullWingCutout){const body=layers[0].getContext('2d');body.drawImage(image,0,0);body.globalCompositeOperation='destination-out';for(const wing of layers.slice(1))body.drawImage(wing,0,0);body.globalCompositeOperation='source-over';return layers;}
  // Keep dark/yellow body pixels rigid where translucent wings overlap the abdomen.
  // Pixel separation happens once at load, never during animation.
  const body=layers[0].getContext('2d');body.drawImage(image,0,0);const bodyPixels=body.getImageData(0,0,image.naturalWidth,image.naturalHeight);
  for(const wing of layers.slice(1)){const c=wing.getContext('2d'),pixels=c.getImageData(0,0,wing.width,wing.height),d=pixels.data;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],blue=b>r+5&&b>=g&&g>r+2,shine=b>160&&g>160&&r>145&&b>=r-7&&g>=r-10;if(d[i+3]&&(blue||shine))bodyPixels.data[i+3]=0;else d[i+3]=0;}c.putImageData(pixels,0,0);}
  body.putImageData(bodyPixels,0,0);
  return layers;
 }
 hairAtlases(image,spec){
  if(typeof document==='undefined')return null;
  const layers=[0,1].map(()=>{const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;return c;}),base=layers[0].getContext('2d'),hair=layers[1].getContext('2d');
  base.drawImage(image,0,0);
  for(let i=0;i<spec.directions;i++){const ox=(i%spec.columns)*spec.cell,oy=Math.floor(i/spec.columns)*spec.cell,poly=spec.hairFlaps[i].polygon;
   for(const [c,cut]of [[base,true],[hair,false]]){c.save();c.beginPath();poly.forEach(([x,y],j)=>j?c.lineTo(ox+x,oy+y):c.moveTo(ox+x,oy+y));c.closePath();if(cut){c.globalCompositeOperation='destination-out';c.fill();}else{c.clip();c.drawImage(image,0,0);}c.restore();}
  }return layers;
 }
 sprite(ctx,spec,angle,frame,dx=0,dy=0,wingPhase=0){
  const n=spec.directions||this.manifest.directions,col=spec.columns||this.manifest.columns,index=((Math.round(angle/TAU*n)%n)+n)%n,c=spec.cell;
  const row=frame*Math.ceil(n/col)+Math.floor(index/col),scale=spec.scale||1,anchor=spec.anchors?.[frame]?.[index]||[spec.anchorX,spec.anchorY];ctx.save();if((spec.faceLeft&&Math.cos(angle-Math.PI/2)>0)||spec.mirrorDirections?.includes(index)||spec.mirrorFrames?.[frame]?.includes(index))ctx.scale(-1,1);
  const draw=image=>ctx.drawImage(image,(index%col)*c,row*c,c,c,-anchor[0]*scale+dx,-anchor[1]*scale+dy,c*scale,c*scale);
  if(spec.secondaryLayers){draw(spec.secondaryLayers[0]);ctx.save();ctx.translate(Math.sin(wingPhase)*.45,Math.sin(wingPhase*.7)*.2);ctx.transform(1,0,Math.sin(wingPhase*.8)*.003,1,0,0);draw(spec.secondaryLayers[1]);ctx.restore();
  }else if(spec.flightLayers){
   // Cached wing cutouts hinge at their roots; the head and abdomen remain rigid.
   for(let i=0;i<2;i++){const p=spec.wingFlaps[frame][i].pivot,px=(p[0]-anchor[0])*scale+dx,py=(p[1]-anchor[1])*scale+dy,beat=Math.sin(wingPhase+i*.32);ctx.save();ctx.translate(px,py);ctx.rotate((i?1:-1)*beat*.14);ctx.scale(1,.42+(beat+1)*.29);ctx.translate(-px,-py);draw(spec.flightLayers[i+1]);ctx.restore();}
   draw(spec.flightLayers[0]);
  }else if(spec.hairLayers){
   draw(spec.hairLayers[0]);const pivot=spec.hairFlaps[index].pivot,px=(pivot[0]-anchor[0])*scale+dx,py=(pivot[1]-anchor[1])*scale+dy;
   ctx.save();ctx.translate(px,py);ctx.rotate(Math.sin(wingPhase)*.018);ctx.transform(1,0,Math.sin(wingPhase*.71)*.012,1,0,0);ctx.translate(-px,-py);draw(spec.hairLayers[1]);ctx.restore();
  }else draw(spec.image);
  ctx.restore();
 }
 draw(ctx,u,time){
  if(u.team===0&&u.type==='medic'&&u.appearance==='rina'){if(this.rina?.loaded)return this.rina.draw(ctx,u,time);if(u.hp<=0)return true;}
  const ultimate=u.type==='leader'&&u.team===0&&u.ultimatePose?.active,captain=u.type==='bayonetCaptain';let visual=u.type==='leader'&&u.team===0&&u.appearance==='shion'?'commanderShion':captain?'bayonet':u.type==='leader'&&u.team===0&&u.appearance==='blaze'?(u.flameSkin==='hwarin'?'commanderHwarin':'commanderBlaze'):ultimate?(u.appearance==='shino'?'commanderShinoUltimate':'commanderSargeUltimate'):u.type==='leader'&&u.team===0&&u.appearance==='shino'?'commanderShino':u.type==='sniper'&&u.team===0&&['kayla','hayeon'].includes(u.appearance)?'sniperKayla':u.defenseKind==='laserTower'?'laserTower':u.type;visual=({commando:'machinegun',spectre:'sniper',titan:'rocket'})[u.type]||visual;let item=this.ensure(visual,visual==='bayonet'?1:u.team);if(!item?.ready&&visual!==u.type){item=this.ensure(u.type,u.team);visual=u.type;}if(!item?.ready)return false;if(visual==='commanderShion')return this.drawSword(ctx,u,time,item);if(visual==='commanderHwarin')return this.drawHwarin(ctx,u,time,item);if(visual==='blizzardMage')return this.drawMage(ctx,u,time,item);
  const vehicle=!!item.layers.turret||!!item.layers.body.vehicle,aimFace=vehicle&&Number.isFinite(u.turretFace)?u.turretFace:Number.isFinite(u.aimFace)?u.aimFace:u.face;
  let state=this.motion.get(u);const aim=aimFace+Math.PI/2,fresh=!state,custom=!!item.layers.body.groundShadow;
  if(!state){state={x:u.x,y:u.y,time,body:(Number.isFinite(u.moveFace)?u.moveFace:u.face)+Math.PI/2,walk:u.walk||0};this.motion.set(u,state);}
  const elapsed=Math.max(0,time-state.time),dx=u.x-state.x,dy=u.y-state.y,moved=Math.hypot(dx,dy)>.04||Math.abs((u.walk||0)-state.walk)>.005;
  if(vehicle&&moved&&elapsed>0){const heading=Math.atan2(dy,dx)+Math.PI/2;state.body+=angleDelta(heading,state.body)*Math.min(1,elapsed*7);}
  const facingIndex=((Math.round(aim/TAU*8)%8)+8)%8,swordAction=u.bayonetAttack||time<(u.bayonetThrustUntil||0)||time<(u.bayonetRecoverUntil||0),profileWalk=!ultimate&&!swordAction&&item.layers.sideWalk?.onlyDirections.includes(facingIndex);
  const walking=elapsed===0?!!state.walking:!!(moved&&(profileWalk||item.layers.body.walkFrames?.length)),sideWalking=!!(walking&&profileWalk),walkSpec=sideWalking?item.layers.sideWalk:item.layers.body,bodyAngle=sideWalking?(facingIndex===2?0:Math.PI):vehicle?state.body:aim;
  let frame=elapsed===0?(state.frame||0):0;if(moved&&elapsed>0){
   if(walking){const travel=Math.hypot(dx,dy)||Math.abs((u.walk||0)-state.walk)/.12;state.walkPhase=((state.walkPhase||0)+travel/(walkSpec.walkStride||80))%1;frame=walkSpec.walkFrames[Math.floor(state.walkPhase*walkSpec.walkFrames.length)];}
   else{const frames=walkSpec.frames;frame=frames>=3?1+(Math.sin(u.walk||0)>0?1:0):frames===2?(Math.sin(u.walk||0)>0?1:0):0;}
  }
  if((elapsed>0||fresh)&&!moved&&item.layers.body.aimFrame!==undefined&&u.sniperAim?.target?.hp>0)frame=item.layers.body.aimFrame;
  if((elapsed>0||fresh)&&!walking&&item.layers.body.recoilFrame!==undefined&&(u.recoil||0)>.04)frame=item.layers.body.recoilFrame;
  if(ultimate&&u.appearance!=='blaze'){const pose=u.ultimatePose;frame=time-pose.shotAt<.17?(pose.hand==='right'?item.layers.body.ultimateRightFrame:pose.hand==='left'?item.layers.body.ultimateLeftFrame:0):0;}
  if(visual==='bayonet'||visual==='bladeGuard'){const spec=item.layers.body;if(u.bayonetAttack)frame=spec.bayonetWindupFrame;else if(time<(u.bayonetThrustUntil||0))frame=spec.bayonetThrustFrame;else if(time<(u.bayonetRecoverUntil||0))frame=spec.bayonetRecoverFrame;}
  if(visual==='blizzardMage')frame=u.blizzardCast||time<(u.castUntil||0)?1:0;
  if(visual==='bikeRaider')frame=u.bikeAttack?.phase==='windup'?1:u.bikeAttack?.phase==='charge'?2:0;
  if(visual==='bikeRaider'&&u.bikeAttack)state.body=aim;
  ctx.save();if(visual==='blizzardMage'&&Number.isFinite(u.guardianReturnedAt)){const enter=Math.max(0,Math.min(1,(time-u.guardianReturnedAt)/1.2));ctx.globalAlpha*=.25+.75*enter;ctx.translate(0,-18*(1-enter));ctx.scale(.78+.22*enter,.78+.22*enter);}if(u.boss)ctx.scale(1.35,1.35);else if(captain)ctx.scale(1.12,1.12);
  const flying=!!item.layers.body.flightHeight,lift=flying?(Number.isFinite(u.visualFlightHeight)?u.visualFlightHeight:item.layers.body.flightHeight)+Math.sin(time*5+(u.id||0)*1.7)*2.4:0;
  if(flying){frame=time<(u.flightStrikeUntil||0)?item.layers.body.attackFrame:Math.floor(time*16+(u.id||0))%(item.layers.body.flightFrames||4);ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#172b21';ctx.beginPath();ctx.ellipse(5,4,u.type==='hornet'?23:15,u.type==='hornet'?9:6,0,0,TAU);ctx.fill();ctx.restore();ctx.translate(0,-lift);}
  const recoil=ultimate||flying||walking?0:u.recoil||0,bounce=elapsed===0?(state.bounce||0):walking?-Math.abs(Math.sin((state.walkPhase||0)*TAU))*.25:moved?Math.sin((u.walk||0)*2)*.45:0;
  if(visual==='crimsonAce'){ctx.save();ctx.fillStyle='#17271f';ctx.globalAlpha*=.18;ctx.filter='blur(3px)';ctx.beginPath();ctx.ellipse(10,8,45,22,-.12,0,TAU);ctx.fill();ctx.filter='none';ctx.globalAlpha=.24;ctx.beginPath();ctx.ellipse(0,2,32,13,0,0,TAU);ctx.fill();ctx.restore();}
  if(custom)this.ground(ctx,walkSpec,sideWalking?bodyAngle:aim,frame);
  this.sprite(ctx,walkSpec,bodyAngle,frame,custom?-Math.cos(aimFace)*recoil*9:0,bounce+(custom?-Math.sin(aimFace)*recoil*7:0)+(visual==='blizzardMage'?Math.sin(time*2.1+(u.id||0))*.65:0),time*TAU*(item.layers.body.flapRate||9)+(u.id||0)*1.7);
  if(flying&&item.layers.wings){ctx.save();ctx.globalAlpha*=item.layers.wings.opacity??.46;this.sprite(ctx,item.layers.wings,aim,Math.floor(time*32+(u.id||0))%item.layers.wings.frames);ctx.restore();}
  if(item.layers.turret)this.sprite(ctx,item.layers.turret,aim,0,-Math.cos(aimFace)*recoil*15,(item.layers.turret.mountY||0)-Math.sin(aimFace)*recoil*12+bounce,time*TAU*1.7+(u.id||0)*.8);
  if(captain){ctx.fillStyle='#ffda71';ctx.strokeStyle='#785228';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?2.6:5.6,x=Math.cos(a)*r,y=-79+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();}
  if(u.boss&&['bladeGuard','bikeRaider','bayonetCaptain'].includes(u.type)){ctx.fillStyle='#ffdf71';ctx.strokeStyle='#815a27';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-10,-99);ctx.lineTo(-9,-111);ctx.lineTo(-3,-106);ctx.lineTo(0,-115);ctx.lineTo(4,-106);ctx.lineTo(10,-111);ctx.lineTo(9,-99);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.restore();
  // Motion is presentation-only and only advances with simulation time.
  if(elapsed>0||fresh){state.x=u.x;state.y=u.y;state.time=time;state.walk=u.walk||0;state.frame=frame;state.bounce=bounce;state.walking=walking;state.sideWalking=sideWalking;}
  return true;
 }
 crouched(u){return u.type==='sniper'&&['kayla','hayeon'].includes(u.appearance)&&(this.motion.get(u)?.frame??0)>=3;}
 weaponPoint(u){
  if(u.appearance==='shion')return null;
  if((u.type||u.weapon)==='crimsonAce'){
   const item=this.ensure('crimsonAce',2),s=item?.ready&&item.layers.turret;if(!s?.muzzles)return null;
   const face=Number.isFinite(u.angle)?u.angle:Number.isFinite(u.turretFace)?u.turretFace:Number.isFinite(u.aimFace)?u.aimFace:u.face||0,n=s.directions,index=((Math.round((face+Math.PI/2)/TAU*n)%n)+n)%n,p=s.muzzles[0][index],z=(s.scale||1)*(u.boss?1.35:1),flip=s.mirrorDirections?.includes(index)?-1:1,recoil=u.kind==='muzzle'?.24:u.recoil||0,boss=u.boss?1.35:1;
   return{x:u.x+p[0]*z*flip-Math.cos(face)*recoil*15*boss,y:u.y+p[1]*z+(s.mountY||0)*boss-Math.sin(face)*recoil*12*boss};
  }

  if(u.appearance==='blaze'){
   const item=this.ensure(u.flameSkin==='hwarin'?'commanderHwarin':'commanderBlaze',0),spec=item?.ready&&item.layers.body;if(!spec?.muzzles)return null;
   const source=u.source||u,motion=this.motion.get(source),hwarin=u.flameSkin==='hwarin';
   if(hwarin){
    const firing=u.kind==='flame'||source.ultimatePose?.active||(source.flameUntil||0)>(motion?.time??0),face=Number.isFinite(u.angle)?u.angle:firing?(source.ultimatePose?.active?source.ultimatePose.angle:source.flameAngle??source.aimFace??source.face):(motion?.face??source.aimFace??source.face??0),step=TAU/spec.directions,wanted=face+Math.PI/2;
    let aim=motion?.bodyAngle;if(!Number.isFinite(aim)||Math.abs(angleDelta(wanted,aim))>step/2+.10)aim=Math.round(wanted/step)*step;
    const index=((Math.round(aim/step)%spec.directions)+spec.directions)%spec.directions,frame=firing?(spec.stableFireFrame??6):(motion?.upperFrame??0),p=(spec.muzzles[frame]||spec.muzzles[0])[index];return{x:source.x+p[0],y:source.y+p[1]};
   }
   const face=Number.isFinite(u.angle)?u.angle:Number.isFinite(u.aimFace)?u.aimFace:u.face||0,n=spec.directions,index=((Math.round((face+Math.PI/2)/TAU*n)%n)+n)%n,frame=motion?.frame??3,p=(spec.muzzles[frame]||spec.muzzles[0])[index];return{x:u.x+p[0],y:u.y+p[1]};
  }
  if(u.kind==='ultimateVolley'||u.type==='leader'&&u.ultimatePose?.active){
   const item=this.ensure(u.appearance==='shino'?'commanderShinoUltimate':'commanderSargeUltimate',0),spec=item?.ready&&item.layers.body;if(!spec?.dualMuzzles)return null;
   const event=u.kind==='ultimateVolley',hand=event?u.hand:u.ultimatePose.hand,frame=event?(hand==='right'?1:2):(this.motion.get(u)?.frame||0),a=event?u.angle:u.ultimatePose.angle,n=spec.directions,index=((Math.round((a+Math.PI/2)/TAU*n)%n)+n)%n,p=spec.dualMuzzles[frame][index][hand==='left'?1:0],scale=spec.scale||1;
   return{x:u.x+p[0]*scale,y:u.y+p[1]*scale};
  }
  if((u.type||u.weapon)!=='sniper'||!['kayla','hayeon'].includes(u.appearance)||u.team===1)return null;
  const item=this.ensure('sniperKayla',0),spec=item?.ready&&item.layers.body;if(!spec?.muzzles)return null;
  const state=this.motion.get(u),frame=u.kind==='muzzle'?spec.recoilFrame:state?.frame??0,face=Number.isFinite(u.aimFace)?u.aimFace:Number.isFinite(u.face)?u.face:u.angle||0,n=spec.directions||this.manifest.directions,index=((Math.round((face+Math.PI/2)/TAU*n)%n)+n)%n,p=spec.muzzles[frame]?.[index];if(!p)return null;
  const recoil=u.kind==='muzzle'?.16:u.recoil||0,scale=spec.scale||1;
  return{x:u.x+p[0]*scale-Math.cos(face)*recoil*9,y:u.y+p[1]*scale-Math.sin(face)*recoil*7+(state?.bounce||0)};
 }
 diagnostics(){return{ready:!!this.manifest,loaded:this.loaded,requested:this.assets.size,failures:this.failures};}
}
window.FrontModels=FrontModels;
})();
