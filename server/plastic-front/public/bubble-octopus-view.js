/* Presentation for the rubber bath toy. All timing follows the simulation clock. */
(function(root){
'use strict';
const TAU=Math.PI*2, cell=128, size=76;
const clamp=n=>Math.min(1,Math.max(0,n));
const maxHealthBarTrack=1+(root.FrontBubbleOctopusRules?.shieldFraction||0);
const atlas=typeof Image==='function'?new Image():null;
if(atlas){atlas.decoding='async';atlas.src='assets/models/bubble-octopus-v2.webp';}
function oval(c,x,y,rx,ry,color){
 c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();
}
function film(c,x,y,r,solid=false){
 const g=c.createRadialGradient(x-r*.35,y-r*.41,0,x,y,r);
 g.addColorStop(0,solid?'#efffff':'#edffff28');
 g.addColorStop(.25,solid?'#a4f5ff':'#a2e9ff0c');
 g.addColorStop(.68,solid?'#27bcdf':'#c0affc0c');
 g.addColorStop(.86,solid?'#288dbd':'#a4e5f63b');
 g.addColorStop(1,solid?'#abffff':'#b7edffbd');
 oval(c,x,y,r,r,g);
 c.lineCap='round';
 for(const [start,end,color,width] of [[3.55,4.45,'#f2ffff',.095],[.43,1.30,'#f3c4f3',.064],[1.39,2.12,'#91f6ff',.05]]){
  c.beginPath();c.strokeStyle=color;c.lineWidth=Math.max(.65,r*width);
  c.arc(x,y,r*.88,start,end);c.stroke();
 }
}
function fallback(c){
 for(let i=0;i<8;i++){const a=i*TAU/8;oval(c,Math.cos(a)*15,Math.sin(a)*6-4,7,4.5,'#bc87cc');}
 oval(c,0,-15,16,17,'#c79bda');oval(c,-7,-19,2.3,3.4,'#432c44');oval(c,7,-19,2.3,3.4,'#432c44');
 oval(c,0,-12,4.3,4,'#f1b2c9');oval(c,0,-12,2.3,2.1,'#75496d');
}
function model(c,u,time){
 const angle=u.foamWindup?.angle??u.aimFace??u.face??0;
 const dir=(Math.round(angle*16/TAU)+16)%16;
 const cycle=(u.walk||0)+time*2+(u.id||0);
 const wind=u.foamWindup;
 const windProgress=wind?clamp((time-wind.startedAt)/(wind.fireAt-wind.startedAt||.4)):0;
 const castAge=time-(u.bubbleInflatedAt??-Infinity);
 const swell=castAge>=0&&castAge<.56?Math.sin(Math.PI*castAge/.56):0;
 const gait=Math.sin(cycle),hop=Math.abs(gait)*1.65;
 const pose=swell>.28||windProgress>.4?3:gait>.48?1:gait<-.48?2:0;
 c.save();
 c.save();c.translate(5,7);c.scale(1,.43);
 const ground=c.createRadialGradient(-3,-2,0,0,0,32);
 ground.addColorStop(0,'#282022b8');ground.addColorStop(.52,'#382a336b');ground.addColorStop(1,'#382a3300');
 oval(c,0,0,32,32,ground);c.restore();
 c.translate(0,-hop);c.scale(1+.04*swell,1+.06*swell);
 if(atlas?.complete&&atlas.naturalWidth===cell*8){
  c.drawImage(atlas,dir%8*cell,(pose*2+(dir>>3))*cell,cell,cell,-size/2,-90*size/cell,size,size);
 }else fallback(c);
 if(wind){
  const x=Math.cos(angle)*23,y=Math.sin(angle)*12.2-17;
  for(let i=0;i<3;i++){
   const a=cycle+i*TAU/3,spread=3+(1-windProgress)*9;
   film(c,x+Math.cos(a)*spread,y+Math.sin(a)*spread,1.2+windProgress);
  }
  film(c,x,y,2.5+7*windProgress,true);
 }
 c.restore();return true;
}
// Use max HP as the ruler. Bonus shield can extend the track past a full health bar.
function healthBarLayout(hp,maxHp,shieldHp=0){
 const health=maxHp>0?clamp(hp/maxHp):0;
 const shield=maxHp>0?clamp(shieldHp/maxHp):0;
 const filled=health+shield;
 return {health,shield,filled,track:Math.max(1,filled)};
}
function healthPaint(c,bar,x,baseWidth,hpColor){
 if(!bar.shield)return hpColor;
 const fill=c.createLinearGradient(x,0,x+baseWidth*bar.filled,0);
 const seam=bar.shield/bar.filled;
 fill.addColorStop(0,'#72d8ff');fill.addColorStop(seam,'#72d8ff');
 fill.addColorStop(seam,hpColor);fill.addColorStop(1,hpColor);
 return fill;
}
function shieldCast(c,u,time){
 const s=u.bubbleShield;
 if(!(u.hp>0&&s?.hp>0))return;
 const type=root.FrontTypes?.[u.type],r=(u.r||type?.r||14)*(u.boss?1.35:1);
 const flight=u.visualFlightHeight??type?.flightHeight??0,empress=u.type==='swordEmpress';
 const tall=u.type==='crimsonAce'||u.type==='assassin'||type?.stab;
 const rx=empress?93:Math.max(25,r*1.35+12),ry=empress?98:Math.max(tall?43:27,r*(tall?1.62:1.25)+14);
 const charge=clamp((time-(s.at??time))/.20),remaining=clamp(s.hp/(s.maxHp||s.hp));
 const swell=.88+.12*charge;
 c.save();c.translate(0,7-ry-flight);c.scale(swell,swell*ry/rx);
 c.globalAlpha*=.55+.28*remaining+.11*(1-charge);
 film(c,0,0,rx);
 c.strokeStyle='#bdf9f4';c.lineWidth=1.45;c.beginPath();c.arc(0,0,rx,0,TAU);c.stroke();
 c.restore();
}
function air(c,game,visible){
 for(const shot of game.foamShots||[]){
  if(!visible(shot))continue;
  const a=shot.angle,dx=Math.cos(a),dy=Math.sin(a),w=game.time*12;
  c.save();c.translate(shot.x,shot.y);
  oval(c,1,3,10,3.6,'#324b5430');
  for(let i=3;i>0;i--){
   const drift=Math.sin(w-i*1.7)*i*.8;
   film(c,-dx*i*5-dy*drift,-17-dy*i*5+dx*drift,5-i*.82);
  }
  film(c,0,-17,10+Math.sin(w)*.6,true);c.restore();
 }
}
function event(c,e){
 if(e.kind!=='bubbleShieldPop'&&e.kind!=='bubbleFoamImpact')return false;
 const impact=e.kind==='bubbleFoamImpact',p=clamp(1-e.t/e.max),k=1-p;
 const radius=e.radius||(impact?46:20),a=e.angle||0;
 c.save();c.translate(e.x,e.y);c.globalAlpha*=k;
 c.strokeStyle=impact?'#eaffff':'#b5eaff';c.lineWidth=1+2.6*k;
 c.beginPath();c.ellipse(0,-3,radius*(.24+.76*p),radius*(.15+.37*p),0,0,TAU);c.stroke();
 for(let i=0;i<(impact?12:8);i++){
  const theta=i*2.4+e.x*.025,travel=radius*(.32+i%4*.12)*p;
  const drift=impact?radius*.19*p:0;
  const x=Math.cos(theta)*travel+Math.cos(a)*drift;
  const y=Math.sin(theta)*travel*.66+Math.sin(a)*drift-9-(7+i%3*4)*Math.sin(p*Math.PI);
  film(c,x,y,(2+i%3)*(.35+.65*k));
 }
 c.restore();return true;
}
root.FrontBubbleOctopusView={model,healthBarLayout,healthPaint,maxHealthBarTrack,shieldCast,air,event};
})(typeof window==='undefined'?globalThis:window);
