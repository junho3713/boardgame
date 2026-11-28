/* The broken water runs low along the floor. The caller clips it to the damage lane
   and supplies a transform with +x pointing down-current and y across the lane. */
(function(root){
'use strict';
const W=208,H=240,TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
function ease(a,b,x){const t=clamp((x-a)/(b-a));return t*t*(3-2*t);}

// Two small reusable paint layers. The foam is a warped cellular network: large,
// elongated open pools in the trailing sheet, packed little cells at its lip.
let layers,crest,painted=false,paintRows;
function prepare(art){
 if(art)crest=art;
 if(layers||paintRows)return;
 const maps=Array.from({length:2},()=>{
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  return {canvas,ctx,pixels:ctx.createImageData(W,H)};
 });
 const noise=new Float32Array(64*64);
 let seed=25147;
 for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/4294967296;}
 const at=(x,y)=>noise[(y&63)*64+(x&63)];
 function grain(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,b=y-iy;
  a=a*a*(3-2*a);b=b*b*(3-2*b);
  const top=at(ix,iy)*(1-a)+at(ix+1,iy)*a,base=at(ix,iy+1)*(1-a)+at(ix+1,iy+1)*a;
  return top+(base-top)*b;
 }
 function cellEdge(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);
  let first=Infinity,next=Infinity;
  for(let j=iy-1;j<=iy+1;j++)for(let i=ix-1;i<=ix+1;i++){
   const dx=i+.13+.74*at(i,j)-x,dy=j+.13+.74*at(i+23,j+11)-y;
   const distance=dx*dx+dy*dy;
   if(distance<first){next=first;first=distance;}else if(distance<next)next=distance;
  }
  return Math.sqrt(next)-Math.sqrt(first);
 }
 const tint=maps[0].pixels.data,foam=maps[1].pixels.data;
 let cursor=0;
 function row(y){
  const v=(y+.5)/H,bank=4*v*(1-v);
  const finger=grain(v*14,3.2),fringe=grain(v*39,12.7);
  const face=.87+.07*bank+.028*Math.sin(v*19)+.085*(finger-.5)+.025*(fringe-.5);
  const trailing=.29+.59*Math.sqrt(bank)+.16*grain(v*7.5,32);
  for(let x=0;x<W;x++){
   const u=(x+.5)/W,d=face-u,index=4*(y*W+x);
   if(d<-.018||d>trailing)continue;
   const mist=grain(u*36+16,v*49+13),fine=at(x+17,y+21);
   const edgeFade=ease(0,.032,v)*ease(0,.032,1-v);
   const coverage=edgeFade*ease(-.003,.012,d+(mist-.5)*.012)*ease(0,.12,trailing-d);
   if(!coverage)continue;
   const choppy=grain(u*8+11,v*12+.7);
   const depth=clamp(d/trailing);
   // Stretch the pockets along the backwash. Neighbouring cells share edges.
   const px=u*(7+6*(1-depth))+1.5*choppy+.43*mist+.54*Math.sin(v*24+u*8);
   const py=v*19+1.6*grain(u*4,v*7)+.45*Math.sin(u*25+v*11);
   const seams=cellEdge(px,py),tiny=cellEdge(px*2.9+.5,py*2.25+.35);
   const core=1-ease(.029,.14,d+.027*(mist-.5));
   const lace=(1-ease(.021,.17,seams))*(.33+.67*choppy);
   const bubbles=(1-ease(.009,.105,tiny))*(.22+.78*(1-depth)**2);
   const ripped=ease(.11,.61,mist*.42+choppy*.58+.19*(1-depth));
   const eddy=ease(.45,.81,choppy*.63+mist*.37);
   const lather=clamp(core*(.72+.24*mist)+ripped*(.71*lace+.44*bubbles+.36*eddy));
   const thin=(1-depth)**.60,bright=.26+.40*choppy+.19*mist;
   tint[index]=15+47*bright;tint[index+1]=125+65*bright;tint[index+2]=140+66*bright;
   tint[index+3]=Math.round(coverage*thin*(.25+.48*thin)*255);
   const glint=clamp(.25+.6*lather+.24*mist+.08*fine);
   foam[index]=135+119*glint;foam[index+1]=212+42*glint;foam[index+2]=222+33*glint;
   foam[index+3]=Math.round(255*coverage*thin*lather*(.72+.27*fine));
  }
 }
 paintRows=function(count){
  const end=Math.min(H,cursor+count);
  while(cursor<end)row(cursor++);
  if(cursor===H){
   for(const layer of maps)layer.ctx.putImageData(layer.pixels,0,0);
   layers=maps.map(m=>m.canvas);paintRows=null;
   transferFoam();
  }
 };
 // Build during the boss warning in short batches instead of stalling a frame.
 function batch(){
  if(!paintRows)return;
  paintRows(24);
  if(paintRows)schedule();
 }
 function schedule(){
  if(root.requestIdleCallback)root.requestIdleCallback(batch,{timeout:38});
  else root.setTimeout(batch,0);
 }
 schedule();
}

function transferFoam(){
 if(painted||!crest?.naturalWidth)return;
 painted=true;
 // Unroll the whitewater at the foot of the painted north-facing crest into
 // the moving foam sheet. Reuse its pale pigment and mottled fine structure.
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),cell=288;
 ctx.setTransform(0,1,1,0,0,0);
 ctx.drawImage(crest,6,cell*2+153,cell-12,64,0,0,H,W);
 const pigment=ctx.getImageData(0,0,W,H).data,foamCtx=layers[1].getContext('2d');
 const water=layers[0].getContext('2d').getImageData(0,0,W,H).data;
 const image=foamCtx.getImageData(0,0,W,H),ink=image.data;
 for(let i=0;i<ink.length;i+=4){
  if(!water[i+3])continue;
  const luma=Math.min(pigment[i],pigment[i+1],pigment[i+2])/255;
  const white=ease(.26,.83,luma)*pigment[i+3]/255;
  const wet=ease(.015,.62,water[i+3]/255);
  const old=ink[i+3]/255;
  const opacity=old*(.61+.52*white)+.57*white*wet;
  ink[i+3]=255*clamp(opacity);
  for(let k=0;k<3;k++)ink[i+k]+=white*(pigment[i+k]-ink[i+k])*.62;
 }
 foamCtx.putImageData(image,0,0);
}

function draw(c,{span,phase,fall,wash,impact}){
 const breaking=ease(.12,.91,fall);
 if(!breaking)return;
 prepare();
 if(paintRows)paintRows(H);
 transferFoam();
 const release=clamp(wash),hit=clamp(impact);
 const depth=span*(.14+.34*breaking+.43*release);
 const aspect=span/H,tip=12+8*hit;
 const inheritedAlpha=c.globalAlpha;
 c.save();
 // Water drags behind its aerated front. Displace each cross-section from a
 // continuous field; fractional strip overlap prevents transparent hairlines.
 const band=12;
 for(let y=0;y<H;y+=band){
  const v=(y+band*.5)/H,edge=Math.sin(v*Math.PI);
  const swirl=Math.sin(v*15-phase*5.3)+.46*Math.sin(v*38+phase*6.2);
  const width=depth+edge*(3+5*release)*swirl,shift=swirl*edge*2.7;
  const top=-span/2+y*aspect;
  c.globalAlpha=inheritedAlpha*breaking*(.84-.18*release);
  c.drawImage(layers[0],0,y,W,band,tip+shift-width,top,width,band*aspect+.24);
  const pull=(4+3*Math.sin(phase*3.1-v*9))*breaking,laceWidth=width+pull;
  c.globalAlpha=inheritedAlpha*breaking*(1-.12*release);
  c.drawImage(layers[1],0,y,W,band,tip+shift-laceWidth,top,laceWidth,band*aspect+.24);
 }
 // Low streaks scatter out of the initial crash and melt back into the foam.
 if(hit>.005){
  c.lineCap='round';c.lineWidth=1.2;
  for(let i=0;i<17;i++){
   const t=(phase*1.7+i*.618034)%1;
   const y=span*((i+.5)/17-.5)+3*Math.sin(i*7.1),x=6+17*t;
   c.globalAlpha=inheritedAlpha*hit*breaking*.72*Math.sin(t*Math.PI);
   c.strokeStyle='#eaffff';c.beginPath();c.moveTo(x,y);
   c.quadraticCurveTo(x+1.8,y+1.2,x+2.8+t,y+Math.sin(i)*2.4);c.stroke();
  }
 }
 c.restore();
}
root.FrontKrakenSwash={prepare,draw};
})(window);
