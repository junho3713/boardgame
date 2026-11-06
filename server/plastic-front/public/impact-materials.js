/* Cached, textured combat materials. All motion comes from event/simulation time. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const hash=(x,y=0,seed=0)=>{let v=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(seed|0,1442695041);v=Math.imul(v^(v>>>13),1274126177);return((v^(v>>>16))>>>0)/4294967295;};
function noise(x,y,seed){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,tx=fx*fx*(3-2*fx),ty=fy*fy*(3-2*fy);
 const a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),c=hash(ix,iy+1,seed),d=hash(ix+1,iy+1,seed);
 return(a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty;
}
function turbulence(x,y,seed){return noise(x,y,seed)*.55+noise(x*2.03+7,y*2.03-3,seed+1)*.26+noise(x*4.11-2,y*4.11+6,seed+2)*.13+noise(x*8.17,y*8.17,seed+3)*.06;}
let sharedMaterials=null;
function cloudTexture(kind,seed){
 const size=144,canvas=root.document.createElement('canvas');canvas.width=canvas.height=size;
 const c=canvas.getContext('2d'),data=c.createImageData(size,size),density=new Float32Array(size*size),heat=new Float32Array(size*size);
 // A turbulent volume gives the sprite its silhouette, surface folds, and uneven light.
 // Noise is baked only once; nothing here runs per projectile or animation frame.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=(x-size*.5)/(size*.44),ny=(y-size*.5)/(size*.44),n=turbulence(nx*2.7+11,ny*2.7+13,seed),warp=turbulence(nx*1.8-9,ny*1.8+7,seed+17);
  const d=Math.hypot(nx+(warp-.5)*.25,ny+(n-.5)*.2),edge=1-d+(n-.5)*.53,idx=y*size+x;
  density[idx]=smooth(0,.34,edge)*(.66+.34*n);heat[idx]=clamp(1-d*.68+(n-.5)*.85);
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const idx=y*size+x,i=idx*4,d=density[idx],n=heat[idx],up=density[Math.max(0,y-2)*size+Math.max(0,x-2)],down=density[Math.min(size-1,y+2)*size+Math.min(size-1,x+2)],light=clamp(.52+(up-down)*1.9+(size-y)/size*.2);
  let r,g,b,a;
  if(kind==='fire'){
   const hot=smooth(.30,.90,n),core=smooth(.76,.99,n);
   r=145+hot*110;g=37+hot*155+core*55;b=9+hot*28+core*155;a=d*(.72+.28*hot);
  }else if(kind==='smoke'){
   const warm=smooth(.35,.94,n)*.44;
   r=35+light*45+warm*57;g=38+light*43+warm*21;b=36+light*39;a=d*.83;
  }else{
   r=117+light*52;g=99+light*46;b=69+light*38;a=d*.52;
  }
  data.data[i]=r;data.data[i+1]=g;data.data[i+2]=b;data.data[i+3]=Math.round(a*255);
 }
 c.putImageData(data,0,0);return canvas;
}
function softTexture(){
 const canvas=root.document.createElement('canvas');canvas.width=canvas.height=96;const c=canvas.getContext('2d'),g=c.createRadialGradient(48,48,0,48,48,48);
 g.addColorStop(0,'#fffef7');g.addColorStop(.08,'#fff9de');g.addColorStop(.25,'#ffd58ac4');g.addColorStop(.55,'#f28b2940');g.addColorStop(1,'#c34b0900');c.fillStyle=g;c.fillRect(0,0,96,96);return canvas;
}
function stamp(c,image,x,y,w,h,angle,alpha,blend='source-over'){
 if(!image||alpha<=.001||w<=0||h<=0)return;
 c.save();c.globalAlpha*=clamp(alpha);c.globalCompositeOperation=blend;c.translate(x,y);c.rotate(angle);c.drawImage(image,-w/2,-h/2,w,h);c.restore();
}
function eventSeed(e){return(Math.round((e.x||0)*3)^Math.round((e.y||0)*7)^Math.imul((e.index||0)+1,787))|0;}
function shockFront(c,x,y,r,age,fade,seed,boss){
 const dust=sharedMaterials?.dust;if(!dust)return;
 const expansion=1-Math.exp(-age*8),reach=r*(.2+expansion*.91),count=boss?11:8,opacity=fade*(1-smooth(.27,.88,age));
 // Pressure is visible through lifted floor dust, never through a drawn outline.
 // Uneven spacing and radial drift keep a second paired event from making rings.
 for(let i=0;i<count;i++){
  const a=i*TAU/count+(hash(i,2,seed)-.5)*.34,d=reach*(.8+hash(i,3,seed)*.27),spread=r*(.18+age*.34)*(1+hash(i,4,seed)*.46),px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.6;
  stamp(c,dust[i%2],px,py,spread,spread*(.32+hash(i,5,seed)*.16),(hash(i,6,seed)-.5)*.24,opacity*(.33+hash(i,7,seed)*.18));
 }
}
function debris(c,x,y,r,age,fade,seed,boss){
 const count=boss?18:11;
 c.save();c.lineCap='round';
 for(let i=0;i<count;i++){
  const a=hash(i,7,seed)*TAU,speed=.45+hash(i,8,seed)*.8,t=age*(1.1+hash(i,9,seed)*.3),d=r*speed*(1-Math.exp(-t*4.2)),px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.55-r*.63*Math.sin(t*Math.PI),size=(boss?2:1.3)+hash(i,11,seed)*1.5;
  const opacity=fade*(.4+.6*hash(i,12,seed));c.globalAlpha=opacity;c.strokeStyle=i%3?'#ffb54f':'#ffe2a1';c.lineWidth=size*.56;
  c.beginPath();c.moveTo(px,py);c.lineTo(px-Math.cos(a)*(4+9*(1-age)),py-Math.sin(a)*4+5*(1-age));c.stroke();
  c.save();c.translate(px,py);c.rotate(a+age*(i%2?7:-9));c.fillStyle=i%3?'#71452a':'#b38a54';c.beginPath();c.moveTo(-size,-size*.6);c.lineTo(size*.7,-size*.3);c.lineTo(size*.3,size*.65);c.lineTo(-size*.7,size*.3);c.closePath();c.fill();c.fillStyle='#ffe0a3';c.fillRect(-size*.6,-size*.5,size*.9,.65);c.restore();
 }
 c.restore();
}
function install(Effects){
 if(!Effects||Effects.prototype.impactMaterialVersion)return;
 const p=Effects.prototype;p.impactMaterialVersion=1;
 p.prepareImpactMaterials=function(){
  if(sharedMaterials)return sharedMaterials;
  if(!root.document?.createElement)return null;
  sharedMaterials={fire:[cloudTexture('fire',71),cloudTexture('fire',281),cloudTexture('fire',907)],smoke:[cloudTexture('smoke',43),cloudTexture('smoke',191),cloudTexture('smoke',523)],dust:[cloudTexture('dust',109),cloudTexture('dust',631)],flash:softTexture()};
  return sharedMaterials;
 };
 p.drawImpactMaterial=function(c,e,{boss=false,style=null,accentOnly=false}={}){
  const materials=this.prepareImpactMaterials();if(!materials)return false;
  const q=clamp(1-e.t/Math.max(.001,e.max||1)),fade=1-smooth(.53,1,q),r=clamp(e.radius||60,12,180),seed=eventSeed(e),x=e.x,y=e.y;
  const growth=1-Math.exp(-q*9),fireFade=(1-smooth(.22,.8,q))*(.7+.3*smooth(0,.08,q)),smokeFade=smooth(.05,.29,q)*(1-smooth(.6,1,q));
  c.save();
  if(accentOnly){
   // Evolution events accompany an ordinary explosion at the same point. They
   // add a directional secondary shock without painting a second opaque fireball.
   shockFront(c,x,y,r*(boss?1.14:1.02),q,fade*.27,seed+19,boss);
   debris(c,x,y,r*.95,q,fade*.58,seed+47,boss);
   if(style==='siege'&&q<.38){const length=r*(.5+q);stamp(c,materials.flash,x,y-4,length*2,9,0,(1-q/.38)*.27,'lighter');}
   c.restore();return true;
  }
  // Uneven contact soot anchors the blast to the board before the pressure front.
  for(let i=0;i<3;i++)stamp(c,materials.smoke[i],x+(i-1)*r*.19,y+3,r*(.62+q*.38),r*(.24+q*.12),i*.7,fade*.20);
  shockFront(c,x,y,r,q,fade*.84,seed,boss);
  for(let i=0;i<(boss?10:7);i++){
   const a=i*2.399963+hash(i,0,seed)*.5,d=r*(.15+growth*.7),w=r*(.25+q*.3)*(1+hash(i,1,seed)*.4);
   stamp(c,materials.dust[i%2],x+Math.cos(a)*d,y+Math.sin(a)*d*.57,w,w*.5,a*.3,fade*.4);
  }
  // Smoke rises behind the luminous lobes. Each lobe has independent scale,
  // rotation, lateral drift and surface lighting, so it never reads as a disk.
  for(let i=0;i<(boss?7:5);i++){
   const a=i*2.399963+hash(i,3,seed),d=r*(.13+growth*.26),w=r*(.48+q*.48)*(1+hash(i,4,seed)*.3),px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.43-r*q*(.25+hash(i,5,seed)*.35)-r*.08;
   stamp(c,materials.smoke[i%3],px,py,w,w*(.75+q*.22),a+q*.25,smokeFade*(boss?.45:.35));
  }
  // A generated cut-out may replace the central material without changing the
  // animation or the deterministic fallback. It must already be decoded.
  const supplied=this.impactFireImage,external=supplied?.complete&&supplied.naturalWidth?supplied:null;
  for(let i=0;i<(boss?8:6);i++){
   const a=i*2.399963+hash(i,13,seed)*.45,d=r*(.05+growth*.28),w=r*(.4+growth*.46)*(1+hash(i,14,seed)*.22),px=x+Math.cos(a)*d,py=y-9+Math.sin(a)*d*.5-r*q*(.13+hash(i,15,seed)*.27);
   stamp(c,materials.fire[i%3],px,py,w,w*(.76+hash(i,16,seed)*.3),a+q*.38,fireFade*(boss?.74:.66));
  }
  if(external)stamp(c,external,x,y-r*.12-r*q*.18,r*(.75+growth*.7),r*(.65+growth*.7),0,fireFade*.8);
  stamp(c,materials.fire[1],x,y-10-r*q*.22,r*(.38+growth*.53),r*(.4+growth*.6),q*.4,fireFade*.42*(1-smooth(.10,.30,q)),'lighter');
  const flash=(1-smooth(.008,.12,q));
  stamp(c,materials.flash,x,y-9,r*(boss?2:1.55),r*(boss?1.7:1.2),0,flash*(boss?.86:.66),'lighter');
  if(boss)stamp(c,materials.flash,x,y-9,r*2.65,r*.14,0,flash*.67,'lighter');
  debris(c,x,y,r,q,fade,seed,boss);
  c.restore();return true;
 };
 p.drawMuzzleMaterial=function(c,e){
  const materials=this.prepareImpactMaterials();if(!materials)return false;
  const style=e.style||'',weapon=e.weapon||({siege:'tank',cluster:'rocket',mortarTwin:'mortar',pierce:'sniper',heatPierce:'machinegun',heat:'machinegun',ricochet:'guntruck'}[style]||'rifle'),heavy=weapon==='tank'||weapon==='crimsonAce',rocket=weapon==='rocket',q=clamp(1-e.t/Math.max(.001,e.max||.12)),fade=1-smooth(.12,.94,q),angle=e.angle||0;
  const point=this.muzzlePoint?this.muzzlePoint({...e,weapon,origin:e.origin??true}):{x:e.x+Math.cos(angle)*32,y:e.y+Math.sin(angle)*25-25},length=heavy?58:rocket?33:weapon==='sniper'?34:style==='heatPierce'?31:23,width=heavy?26:rocket?17:11,seed=eventSeed(e),pulse=.68+.32*(1-q);
  c.save();c.translate(point.x,point.y);c.rotate(angle);
  stamp(c,materials.flash,5,0,length*1.45,width*2.1,0,fade*.48,'lighter');
  // Hot gas is a directed turbulent plume, with side vents and a white aperture.
  for(let i=0;i<3;i++){
   const l=length*(.52+i*.18)*pulse,offset=(hash(i,4,seed)-.5)*width*.23;
   stamp(c,materials.fire[i],l*.31,offset,l,width*(.76-i*.14),i*.12,fade*(.75-i*.1),'lighter');
  }
  if(heavy||style==='heatPierce')for(const side of [-1,1])stamp(c,materials.fire[side===1?1:2],2,side*width*.24,length*.38,width*.52,side*.85,fade*.6,'lighter');
  stamp(c,materials.flash,2,0,17,width*.76,0,fade*.95,'lighter');
  if(q>.2)stamp(c,materials.smoke[1],length*(.2+q*.25),-q*3,length*(.35+q*.3),width*(.65+q*.7),.16,Math.sin(q*Math.PI)*.21);
  c.restore();return true;
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install(root.FrontEffects);
})(typeof window==='undefined'?globalThis:window);
