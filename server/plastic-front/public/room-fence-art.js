/* Uploaded clothespin supports and five-strand thread, kept as separate assets. */
(()=>{'use strict';
 const sprites={},wreckCrops={blue:[84,88,623,590],coral:[63,65,657,647],teal:[48,83,691,645]},crops={blue:[263,52,763,1125],teal:[261,50,785,1158],coral:[247,54,789,1126]};
 const ready=Promise.all(['blue','teal','coral','threads','blue-wreck','coral-wreck','teal-wreck'].map(key=>new Promise(resolve=>{const im=new Image();im.onload=()=>{sprites[key]=im;resolve();};im.onerror=resolve;im.src='assets/fences/'+key+(key==='threads'?'.svg':key.endsWith('-wreck')?'-v168.webp':'.png');})));
 function visible(p,g){return g.visible(p)||g.defenses.some(q=>q.fencePost&&q.lane===p.lane&&g.visible(q));}
 function links(c,g){if(!g.isRoomCampaign())return;for(const {a,b} of g.roomFenceLinks()){
  if(!visible(a,g)&&!visible(b,g))continue;c.save();c.shadowColor='#2d302f66';c.shadowOffsetY=2;c.shadowBlur=2;
  if(sprites.threads)c.drawImage(sprites.threads,a.x,a.y-142,b.x-a.x,140);
  else for(let i=0;i<5;i++){c.strokeStyle='#e5e8e5';c.lineWidth=2;c.beginPath();c.moveTo(a.x,a.y-125+i*26);c.lineTo(b.x,b.y-125+i*26);c.stroke();}
  c.restore();
 }}
 function post(c,p,g){if(!visible(p,g))return;const alive=p.hp>0,im=sprites[p.color]||sprites.blue,crop=crops[p.color]||crops.blue;
  c.save();c.translate(p.x,p.y);c.fillStyle=alive?'#27342955':'#27342922';c.beginPath();c.ellipse(5,5,48,12,0,0,Math.PI*2);c.fill();
  if(!alive){const wreck=sprites[p.color+'-wreck']||sprites['blue-wreck'],bounds=wreckCrops[p.color]||wreckCrops.blue;if(wreck){const w=152,h=w*bounds[3]/bounds[2];c.drawImage(wreck,...bounds,-w/2,22-h,w,h);}else if(im){const h=160,w=h*crop[2]/crop[3];c.translate(18,-8);c.rotate(.9);c.drawImage(im,...crop,-w/2,-h/2,w,h);}c.restore();return;}
  if(im){const h=160,w=h*crop[2]/crop[3];c.drawImage(im,...crop,-w/2,-h+6,w,h);}
  else{c.strokeStyle=alive?'#348eaa':'#657e7a';c.lineWidth=16;c.lineCap='round';for(const sign of [-1,1]){c.beginPath();c.moveTo(-sign*38,-145);c.lineTo(sign*38,0);c.stroke();}}
  c.restore();if(!alive)return;
  c.save();c.fillStyle='#263a32';c.fillRect(p.x-36,p.y+16,72,5);c.fillStyle='#e88d7b';c.fillRect(p.x-36,p.y+16,72*p.hp/p.maxHp,5);
  c.font='10px sans-serif';c.textAlign='center';c.fillStyle='#f4e1c9';c.fillText('철조망 '+Math.ceil(p.hp).toLocaleString(),p.x,p.y+34);c.restore();
 }
 window.FrontRoomFenceArt={ready,links,post};
})();
