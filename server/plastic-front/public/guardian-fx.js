/* Simulation-owned telegraphs; bounded presentation with no additional damage. */
(()=>{'use strict';const TAU=Math.PI*2;
const wreckImage=new Image();wreckImage.src='assets/models/laser-tower-wreck-v106.webp';
const ring=(c,x,y,r,col,fill)=>{c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);if(fill){c.fillStyle=fill;c.fill();}c.strokeStyle=col;c.stroke();};
const snow=(c,x,y,size,angle=0)=>{c.save();c.translate(x,y);c.rotate(angle);c.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;c.moveTo(0,0);c.lineTo(Math.cos(a)*size,Math.sin(a)*size);}c.stroke();c.restore();};
// An upright ice gateway behind the returning mage, with ground-projected seal.
function portal(c,u,time){
 const before=u.hp<=0&&Number.isFinite(u.respawnAt)?u.respawnAt-time:Infinity;
 const after=u.hp>0&&Number.isFinite(u.guardianReturnedAt)?time-u.guardianReturnedAt:Infinity;
 if(before>1.5&&after>1.2)return;
 const alpha=before<=1.5?Math.max(0,1-before/1.5):Math.max(0,1-after/1.2),spin=time*1.4;
 c.save();c.translate(u.guardianSpawnX??u.x,u.guardianSpawnY??u.y);c.globalAlpha=alpha;
 c.fillStyle='#42c7ff25';c.strokeStyle='#99efff';c.lineWidth=2;
 c.beginPath();c.ellipse(0,3,65,24,0,0,TAU);c.fill();c.stroke();
 c.beginPath();c.ellipse(0,3,48,17,0,0,TAU);c.stroke();
 for(let i=0;i<8;i++){const a=spin+i*TAU/8;c.beginPath();c.moveTo(Math.cos(a)*49,3+Math.sin(a)*17);c.lineTo(Math.cos(a)*62,3+Math.sin(a)*23);c.stroke();}
 c.translate(0,-57);c.scale(.9,1);
 const glow=c.createRadialGradient(0,0,4,0,0,79);glow.addColorStop(0,'#052957dd');glow.addColorStop(.65,'#1074c48c');glow.addColorStop(.86,'#5bdbffcc');glow.addColorStop(1,'#43aaff00');
 c.fillStyle=glow;c.beginPath();c.ellipse(0,0,71,83,0,0,TAU);c.fill();
 for(let j=0;j<4;j++){c.strokeStyle=['#287dea','#55cfff','#d2fbff','#62caff'][j];c.lineWidth=[9,5,2,1][j];c.beginPath();c.ellipse(0,0,55+j*2,72+j*2,0,spin+j,spin+j+TAU*.87);c.stroke();}
 c.strokeStyle='#87eaff';c.lineWidth=1.2;
 for(let i=0;i<5;i++){const r=15+i*8;c.beginPath();c.ellipse(Math.sin(spin+i)*4,0,r,r*1.28,0,spin+i,spin+i+Math.PI*1.3);c.stroke();}
 // Faceted crystals frame the vertical portal; bright top faces and blue side faces.
 for(let i=0;i<10;i++){const a=i*TAU/10,x=Math.cos(a)*61,y=Math.sin(a)*77,k=7+i%3*2;c.save();c.translate(x,y);c.rotate(a+.5);c.fillStyle='#b5f5ff';c.strokeStyle='#ecffff';c.beginPath();c.moveTo(0,-k);c.lineTo(6,0);c.lineTo(0,k);c.lineTo(-5,0);c.closePath();c.fill();c.stroke();c.fillStyle='#438de5';c.beginPath();c.moveTo(0,-k);c.lineTo(0,k);c.lineTo(-5,0);c.closePath();c.fill();c.restore();}
 c.strokeStyle='#e5fcff';for(let i=0;i<16;i++){const a=i*2.4+spin*.3,r=18+(i*13)%48;snow(c,Math.cos(a)*r,Math.sin(a)*r*1.15,2+i%3,spin+i);}
 c.restore();
}
// A faceted, transparent ice dome follows the caster; only simulation-owned state drives it.
function shield(c,u,time){
 const s=u.iceShield;if(u.hp<=0||!s||time>s.until)return;
 const open=Math.max(0,Math.min(1,(time-s.started)/window.FrontGuardians.shieldRaise));
 const fade=Math.max(0,Math.min(1,(s.until-time)/.18)),hit=Number.isFinite(s.hitAt)?Math.max(0,1-(time-s.hitAt)/.3):0;
 c.save();c.globalAlpha*=open*fade;c.translate(0,4);c.scale(.85+.15*open,.8+.2*open);
 c.strokeStyle='#9ceaff';c.lineWidth=1.5;c.fillStyle='#51cfff25';c.beginPath();c.ellipse(0,0,45,17,0,0,TAU);c.fill();c.stroke();
 const outline=()=>{c.beginPath();for(const [i,p]of [[0,-108],[31,-92],[45,-47],[35,-6],[0,15],[-35,-6],[-45,-47],[-31,-92]].entries()){if(i)c.lineTo(...p);else c.moveTo(...p);}c.closePath();};
 const g=c.createRadialGradient(-17,-77,2,0,-46,84);g.addColorStop(0,'#d8ffff55');g.addColorStop(.52,'#54c7ff22');g.addColorStop(1,'#1878e37c');
 outline();c.fillStyle=g;c.fill();c.strokeStyle=hit?'#f0ffff':'#89deff';c.lineWidth=2+hit*2;c.stroke();
 c.save();outline();c.clip();c.strokeStyle='#b3efff65';c.lineWidth=1;
 for(let row=0;row<5;row++)for(let col=0;col<4;col++){const x=(col-1.5)*25+(row%2?12:0),y=-91+row*23;c.beginPath();for(let j=0;j<6;j++){const a=j*TAU/6,p=[x+Math.cos(a)*15,y+Math.sin(a)*15];if(j)c.lineTo(...p);else c.moveTo(...p);}c.closePath();c.stroke();}
 c.fillStyle='#c7f7ff38';c.beginPath();c.moveTo(-31,-92);c.lineTo(0,-108);c.lineTo(-7,-53);c.lineTo(-45,-47);c.closePath();c.fill();
 c.strokeStyle='#ecffff';c.lineWidth=2;c.beginPath();c.moveTo(-31,-90);c.lineTo(-43,-49);c.lineTo(-34,-13);c.stroke();
 if(hit){c.globalAlpha*=hit;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(0,-48);c.lineTo(-13,-61);c.lineTo(-10,-83);c.moveTo(-13,-61);c.lineTo(-33,-66);c.moveTo(0,-48);c.lineTo(18,-40);c.lineTo(30,-21);c.moveTo(18,-40);c.lineTo(37,-52);c.stroke();}
 c.restore();c.strokeStyle='#d4f8ff';c.lineWidth=1.4;snow(c,0,-46,12,time*.2);c.restore();
}
window.FrontGuardianFX={portal,shield,wreck(c,p,time){
 if(wreckImage.complete&&wreckImage.naturalWidth)c.drawImage(wreckImage,-76,-99,152,152);
 else{c.fillStyle='#3d3432';c.beginPath();c.ellipse(0,0,47,24,0,0,TAU);c.fill();c.fillStyle='#8b5147';c.fillRect(-27,-30,48,27);c.strokeStyle='#26232a';c.lineWidth=5;c.beginPath();c.moveTo(-24,-30);c.lineTo(5,-11);c.lineTo(24,-32);c.stroke();}
 const age=time-(p.diedAt??time);if(age<8){c.save();c.globalAlpha=Math.max(0,1-age/8)*.35;for(let i=0;i<4;i++){const t=(age*.5+i*.24)%1;c.fillStyle='#555860';c.beginPath();c.ellipse(7+Math.sin(i+time)*6,-34-t*43,5+t*11,6+t*8,0,0,TAU);c.fill();}c.restore();}
},ground(c,g){c.save();
 for(const u of g.units)if(u.guardianRespawn&&u.type==='blizzardMage'&&g.mission.stage>=3&&g.visible(u))portal(c,u,g.time);
 for(const u of [...g.units.filter(u=>u.fixedGuard),...g.activeDefenses().filter(u=>u.defenseKind==='laserTower')]){if(u.hp<=0||!g.visible(u)||g.mission.stage<(u.activeStage||2))continue;const radius=u.defenseKind==='laserTower'?(g.defenseStats?.(u)?.range??window.FrontGuardians.range):(g.stats?.(u)?.range??window.FrontGuardians.range);c.lineWidth=1;
 if(u.defenseKind==='laserTower'){c.save();c.globalAlpha*=window.FrontRoomCampaign?.config.laser.opacity??.3;c.fillStyle=window.FrontRoomCampaign?.config.laser.color??'#ec443b';c.beginPath();c.arc(u.x,u.y,radius,0,TAU);c.fill();c.restore();c.strokeStyle='#eb534bad';c.lineWidth=1.5;c.beginPath();c.arc(u.x,u.y,radius,0,TAU);c.stroke();}
 else{c.setLineDash([5,12]);ring(c,u.x,u.y,radius,'#9ddfff38');c.setLineDash([]);}
 if(u.blizzardCast){const z=u.blizzardCast,k=Math.max(0,Math.min(1,1-(z.hitAt-g.time)/window.FrontGuardians.windup));c.lineWidth=2;ring(c,z.x,z.y,145,'#d4f6ff','#71cfff35');ring(c,z.x,z.y,145*k,'#aceaff');c.strokeStyle='#e5faff';snow(c,z.x,z.y,24,g.time);}
 }
 for(const u of g.alive(0)){if((u.rootedUntil||0)<=g.time)continue;c.lineWidth=2;ring(c,u.x,u.y,19,'#d7f9ff','#7fcfff66');c.fillStyle='#91dafa9c';c.strokeStyle='#e4faff';for(let i=0;i<5;i++){const a=i*TAU/5,x=u.x+Math.cos(a)*15,y=u.y+Math.sin(a)*9;c.beginPath();c.moveTo(x-5,y+3);c.lineTo(x,y-16);c.lineTo(x+5,y+3);c.closePath();c.fill();c.stroke();}}
 c.restore();},air(c,g){c.save();
 for(const p of g.activeDefenses()){const b=p.laserAttack;if(p.defenseKind!=='laserTower'||!b?.target||!g.visible(p))continue;const a=b.target;if(a.hp<=0)continue;const x=p.x+Math.cos(p.face)*25,y=p.y-52+Math.sin(p.face)*18,tx=a.x,ty=a.y-22;c.strokeStyle=g.time<b.fireAt?'#ff8273':'#ff3c28';c.lineWidth=g.time<b.fireAt?1:7;c.setLineDash(g.time<b.fireAt?[5,6]:[]);c.globalAlpha=g.time<b.fireAt?.7:.65;c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.stroke();if(g.time>=b.fireAt){c.globalAlpha=1;c.strokeStyle='#fff3d9';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.stroke();ring(c,tx,ty,8+Math.sin(g.time*60)*3,'#fff4c9','#ff6b3355');}c.globalAlpha=1;c.setLineDash([]);}
 for(const e of g.effects){if(e.kind==='iceShieldBlock'){const age=Math.max(0,Math.min(1,1-e.t/e.max));c.save();c.translate(e.x,e.y);c.globalAlpha=Math.max(0,1-age);c.strokeStyle='#dbffff';c.lineWidth=2;ring(c,0,0,12+age*39,'#c5faff');for(let i=0;i<12;i++){const a=i*2.39996,x=Math.cos(a)*(12+age*64),y=Math.sin(a)*(9+age*40)-Math.sin(age*Math.PI)*18;c.save();c.translate(x,y);c.rotate(a+age*3);c.fillStyle=i%2?'#e6ffff':'#6ecbff';c.beginPath();c.moveTo(0,-7*(1-age));c.lineTo(4*(1-age),0);c.lineTo(0,9*(1-age));c.lineTo(-3*(1-age),0);c.closePath();c.fill();c.stroke();c.restore();}c.restore();continue;}if(e.kind!=='blizzard')continue;const age=1-e.t/e.max;c.globalAlpha=Math.min(1,e.t*2);c.lineWidth=2;ring(c,e.x,e.y,e.radius*(.7+age*.3),'#c9f3ff','#79cfff22');c.strokeStyle='#e5fbff';for(let i=0;i<30;i++){const a=i*2.39996+age*2,r=e.radius*Math.sqrt((i+.5)/30),x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r-age*30;snow(c,x,y,3+i%5,age+i);}}
 c.restore();}};
})();
