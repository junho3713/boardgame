/* Backyard art is deterministic and presentation-only. All collision bodies stay in the engine. */
(()=>{'use strict';
const TAU=Math.PI*2,roadX=y=>800+Math.sin(y*.0031+.6)*95+Math.cos(y*.006)*26;
const rr=(c,x,y,w,h,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}},ellipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();};
function decorations(){const a=[];for(let i=0;i<14;i++){const y=320+i*165,side=i%2?1:-1;a.push({key:'garden-stone-'+i%3,x:roadX(y)+side*(160+i%3*18),y,scale:.63+i%3*.09});}return [...a,{key:'garden-hose',x:1375,y:2460,scale:1.12},{key:'garden-trowel',x:245,y:1950,scale:1.18}];}
function leaf(c,models,x,y,angle,size,kind=0){const n=((Math.round(angle/TAU*12)%12)+12)%12;c.save();c.translate(x,y);c.scale(size,size);if(!models?.draw(c,`leaf-${kind}-${n}`)){c.rotate(angle);const g=c.createLinearGradient(-23,0,23,0);g.addColorStop(0,kind===2?'#986d3b':'#416540');g.addColorStop(.5,kind===2?'#c9a365':'#92aa66');g.addColorStop(1,kind===2?'#89633c':'#527b49');c.fillStyle=g;c.beginPath();c.moveTo(0,44);c.bezierCurveTo(-40,4,-30,-40,0,-62);c.bezierCurveTo(33,-38,36,7,0,44);c.fill();c.strokeStyle='#c7c99488';c.lineWidth=1.5;c.beginPath();c.moveTo(0,38);c.lineTo(0,-54);c.stroke();}c.restore();}
function flower(c,x,y,color,size){c.save();c.translate(x,y);c.scale(size,size);c.strokeStyle='#42683a';c.lineWidth=1.8;c.beginPath();c.moveTo(0,10);c.quadraticCurveTo(-3,-1,1,-14);c.stroke();ellipse(c,-4,3,5,2.1,'#708b49');ellipse(c,5,-2,5,2,'#57763f');for(let k=0;k<5;k++){const a=k*TAU/5;ellipse(c,1+Math.cos(a)*5,-14+Math.sin(a)*5,3.8,3,color);}ellipse(c,1,-14,2.6,2.4,'#c5a858');c.restore();}
function bed(c,models,b,rand){
 c.save();const {x,y,w,h}=b;c.shadowColor='#263d2b55';c.shadowBlur=11;c.shadowOffsetX=7;c.shadowOffsetY=9;rr(c,x,y,w,h,45,'#596d3f');c.shadowColor='transparent';const soil=c.createLinearGradient(x,y,x+w,y+h);soil.addColorStop(0,'#8d7551');soil.addColorStop(.55,'#736047');soil.addColorStop(1,'#5e533d');rr(c,x+9,y+9,w-18,h-18,38,soil);
 c.strokeStyle='#b7aa7b';c.lineWidth=5;rr(c,x+5,y+5,w-10,h-10,42,null,'#9c9567');
 for(let i=0;i<170;i++){const xx=x+24+rand()*(w-48),yy=y+26+rand()*(h-52);c.save();c.translate(xx,yy);c.rotate(rand()*TAU);c.fillStyle=i%3?'#b69b653d':'#382e243d';c.fillRect(-1,-1,2+rand()*6,1+rand()*3);c.restore();}
 for(let i=0;i<15;i++){const xx=x+35+rand()*(w-70),yy=y+38+i*(h-76)/15;leaf(c,models,xx,yy,rand()*TAU,.75+rand()*.45,i%4===0?1:0);if(i%2)flower(c,xx+12,yy+2,['#ddd1a9','#b88c83','#caba76'][i%3],1.5+rand()*.7);}
 c.restore();
}
function deck(c){
 c.save();const x=420,y=2525,w=760,h=275;c.shadowColor='#2c3c2a50';c.shadowBlur=12;c.shadowOffsetY=7;rr(c,x,y,w,h,7,'#68553c');c.shadowColor='transparent';
 for(let i=0;i<7;i++){const yy=y+i*39,g=c.createLinearGradient(x,yy,x,yy+38);g.addColorStop(0,'#c1a06b');g.addColorStop(.15,'#b49764');g.addColorStop(1,'#907748');rr(c,x+2,yy+1,w-4,37,2,g);for(let j=0;j<6;j++){c.strokeStyle=j%2?'#604c2b27':'#e3c59323';c.lineWidth=.7;c.beginPath();c.moveTo(x+8,yy+5+j*5);c.bezierCurveTo(x+200,yy+j*5,x+520,yy+12+j*5,x+w-8,yy+5+j*5);c.stroke();}for(const xx of [x+19,x+w-19]){ellipse(c,xx+1,yy+19,2.5,2,'#534e36');ellipse(c,xx,yy+18,1.5,1.2,'#c8bb8b');}}
 c.restore();
}
function label(c,t,x,y,size,color){c.fillStyle=color;c.textAlign='center';c.font=size+'px sans-serif';c.fillText(t,x,y);}
function smallTools(c){
 // The ruler and pencil use the same warm directional light as the terrain.
 c.save();c.translate(1497,2440);c.rotate(-.15);c.shadowColor='#30432f55';c.shadowBlur=15;c.shadowOffsetX=8;c.shadowOffsetY=9;rr(c,-24,-115,48,230,3,'#d2b36f');c.shadowColor='transparent';const wood=c.createLinearGradient(-24,0,24,0);wood.addColorStop(0,'#e9cc8c');wood.addColorStop(.7,'#c4a25f');wood.addColorStop(1,'#ac8d53');rr(c,-24,-115,48,230,3,wood);for(let i=0;i<24;i++){c.fillStyle='#6f5c37';c.fillRect(-24,i*9-106,i%5?12:23,1);if(i%5===0)label(c,String(i/5),11,i*9-101,9,'#715d37');}c.restore();
 c.save();c.translate(1583,1190);c.rotate(.08);c.shadowColor='#2d3b2966';c.shadowBlur=12;c.shadowOffsetX=6;c.shadowOffsetY=8;rr(c,-13,-170,26,300,3,'#c79740');c.shadowColor='transparent';c.fillStyle='#e5bc69';c.fillRect(-10,-170,8,300);c.fillStyle='#93703b';c.fillRect(7,-170,5,300);c.fillStyle='#d5bc8e';c.beginPath();c.moveTo(-13,130);c.lineTo(0,180);c.lineTo(13,130);c.fill();c.fillStyle='#3c4140';c.beginPath();c.moveTo(-4,164);c.lineTo(0,180);c.lineTo(4,164);c.fill();rr(c,-13,-198,26,28,3,'#ba8073');c.restore();
}
const GRASS_ART={"file":"backyard-grass-upright-v111.webp","width":120.12,"height":114.4,"anchorX":58.63,"anchorY":112.86};
const grassSprite=typeof Image==='function'?new Image():null;if(grassSprite)grassSprite.src='assets/'+GRASS_ART.file;
const grassLayouts=new WeakMap();
function grassPatches(game){
 let saved=grassLayouts.get(game);if(saved&&saved.obstacles===game.obstacles)return saved.items;
 const points=[[170,280],[1360,410],[360,650],[1370,850],[120,1050],[1450,1230],[350,1440],[1260,1640],[150,1850],[1410,2030],[330,2320],[1320,2460]],items=[];
 for(const [i,[x,y]]of points.entries()){if([...game.bases,...game.structures,...game.defenses].some(b=>Math.hypot(x-b.x,y-b.y)<(b.r||45)+80)||game.obstacles.some(o=>x>o.x-50&&x<o.x+o.w+50&&y>o.y-15&&y<o.y+o.h+60))continue;items.push({x,y,scale:.9+(i%4)*.08,phase:i*1.7});}
 grassLayouts.set(game,{obstacles:game.obstacles,items});return items;
}
function grassVisible(p,camera,halfW,halfH){return p.x+80>camera.x-halfW&&p.x-80<camera.x+halfW&&p.y+25>camera.y-halfH&&p.y-170<camera.y+halfH;}
function grass(c,p,units,time){
 if(!grassSprite?.complete||!grassSprite.naturalWidth)return;
 const a=GRASS_ART,covered=units.some(u=>u.hp>0&&Math.abs(u.x-p.x)<a.width*p.scale*.33&&u.y>p.y-a.anchorY*p.scale&&u.y<p.y+16);
 c.save();c.translate(p.x,p.y);c.globalAlpha*=covered?.32:1;c.scale(p.scale,p.scale);ellipse(c,3,2,19,5,'#23382c30');
 // Only a tiny sideways sway: the root always stays on the floor, tips always up.
 c.transform(1,0,Math.sin(time*1.2+p.phase)*.014,1,0,0);c.drawImage(grassSprite,-a.anchorX,-a.anchorY,a.width,a.height);c.restore();
}
function soilDetail(c,w,h,rand){
 c.save();c.beginPath();for(let y=-30;y<h+40;y+=16){const x=roadX(y)-105;y===-30?c.moveTo(x,y):c.lineTo(x,y);}for(let y=h+34;y>-40;y-=16)c.lineTo(roadX(y)+105,y);c.closePath();c.clip();
 // Low, readable soil clumps and shallow depressions are static ground detail.
 for(let i=0;i<430;i++){const y=rand()*h,x=roadX(y)+(rand()-.5)*214,rx=5+rand()*15,ry=3+rand()*7;c.save();c.translate(x,y);c.rotate(rand()*2-1);ellipse(c,2,3,rx,ry,'#70573424');const g=c.createLinearGradient(-rx,-ry,rx,ry);g.addColorStop(0,i%3?'#d9c39a85':'#e0cfaa7d');g.addColorStop(1,'#a0835855');ellipse(c,0,0,rx,ry,g);c.restore();}
 for(let i=0;i<86;i++){const y=40+rand()*(h-80),edge=i%4!==0,x=roadX(y)+(edge?(i%2?-1:1)*(70+rand()*36):(rand()-.5)*100),r=3.5+rand()*6;c.save();c.translate(x,y);c.rotate(rand()*TAU);ellipse(c,2.5,3,r*1.25,r*.65,'#67513740');const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,['#d9d1af','#bec4a5','#cbbba0'][i%3]);g.addColorStop(1,'#98896d');ellipse(c,0,0,r*1.15,r*.72,g);ellipse(c,-r*.3,-r*.22,r*.42,r*.18,'#f1e4c155');c.restore();}
 c.restore();
}
function terrain(c,game,models,texture){
 const {width:w,height:h}=game.bounds();c.save();c.fillStyle='#8e9c59';c.fillRect(0,0,w,h);
 if(texture?.complete&&texture.naturalWidth){
  // One generated image covers the complete map; nothing is repeated or inverted.
  c.drawImage(texture,0,0,w,h);
 }
 // These are placed props, separate from the grass/soil background.
 deck(c);
 for(const d of decorations()){c.save();c.translate(d.x,d.y);c.scale(d.scale,d.scale);models?.draw(c,d.key);c.restore();}
 smallTools(c);c.restore();
}
function obstacle(c,o,index,models,opacity=1){c.save();c.globalAlpha*=opacity;const key=[2,5].includes(index)?'garden-planter-'+index:'obstacle-'+index;if(!models?.draw(c,key,o.x+o.w/2,o.y+o.h/2)&&!models?.draw(c,'obstacle-'+index,o.x+o.w/2,o.y+o.h/2)){c.shadowColor='#263c2b66';c.shadowBlur=12;c.shadowOffsetX=8;c.shadowOffsetY=11;rr(c,o.x,o.y,o.w,o.h,6,o.color);c.shadowColor='transparent';rr(c,o.x+4,o.y+3,o.w-8,o.h-10,4,null,'#e0dfb84d');}c.restore();}
function opacity(o,index,units){const lift=[2,5].includes(index)?100:65;return units.some(u=>u.hp>0&&u.x>o.x-18&&u.x<o.x+o.w+18&&u.y<o.y&&u.y>o.y-lift)?.42:1;}
function visible(o,camera,halfW,halfH){return o.x+o.w+100>camera.x-halfW&&o.x-100<camera.x+halfW&&o.y+o.h+110>camera.y-halfH&&o.y-160<camera.y+halfH;}
window.FrontGarden={grassArt:GRASS_ART,grassPatches,grassVisible,grass,terrain,obstacle,opacity,visible,decorations,roadX,depth:o=>o.y+o.h};
})();
