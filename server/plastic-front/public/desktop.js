/* Desk props and user-supplied power-strip cover, aligned to navigation bodies. */
(()=>{'use strict';
const box=(c,x,y,w,h,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}},oval=(c,x,y,rx,ry,fill,stroke)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}},text=(c,s,x,y,size=16,color='#dbe3cd')=>{c.font=`600 ${size}px sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(s,x,y);};
function terrain(c,game){
 const {width:w,height:h}=game.bounds();let seed=77;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 const wood=c.createLinearGradient(0,0,w,h);wood.addColorStop(0,'#ae8459');wood.addColorStop(.45,'#d0ad7f');wood.addColorStop(1,'#9e7851');c.fillStyle=wood;c.fillRect(0,0,w,h);
 for(let i=0;i<1000;i++){const y=random()*h;c.strokeStyle=i%3?'#56341b19':'#ffdfa82e';c.lineWidth=.5+random()*2;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y+random()*12,w*.7,y-8,w,y+random()*18);c.stroke();}
 for(const y of [610,1360,2090]){c.fillStyle='#68472b24';c.fillRect(0,y,w,2);c.fillStyle='#f3d7ac44';c.fillRect(0,y+2,w,1);}
 c.save();c.shadowColor='#30251e66';c.shadowBlur=25;c.shadowOffsetX=12;c.shadowOffsetY=18;box(c,525,980,1325,1290,32,'#243c39');c.shadowColor='transparent';
 const mat=c.createLinearGradient(525,980,1850,2270);mat.addColorStop(0,'#466865');mat.addColorStop(.55,'#354e4d');mat.addColorStop(1,'#2b4140');box(c,534,988,1307,1274,25,mat,'#718b80');
 c.lineWidth=2;c.setLineDash([3,7]);box(c,545,1000,1285,1252,20,null,'#b0bd9b77');c.setLineDash([]);c.fillStyle='#c4d7c10a';for(let i=0;i<14000;i++)c.fillRect(551+random()*1270,1005+random()*1230,1,1);
 c.strokeStyle='#b8cdb54a';c.lineWidth=3;c.setLineDash([14,12]);c.beginPath();c.moveTo(655,1600);c.lineTo(1720,1600);c.stroke();c.setLineDash([]);for(const x of [850,1190,1530]){c.beginPath();c.moveTo(x-16,1574);c.lineTo(x,1556);c.lineTo(x+16,1574);c.stroke();}text(c,'방어선',1190,1635,15,'#c7d6bf88');text(c,'PLASTIC FRONT',1190,2223,25,'#d3dfc866');text(c,'DESK DEFENSE / 20:00',1190,2250,12,'#d3dfc880');c.restore();
 for(const [x,y,a]of [[555,930,.4],[1820,1790,-.4],[1580,2300,.8]]){c.save();c.translate(x,y);c.rotate(a);c.lineWidth=3;box(c,-13,-28,26,56,11,null,'#e1d7b8');box(c,-7,-22,14,44,6,null,'#888879');c.restore();}
 oval(c,2025,770,98,68,null,'#6743272d');oval(c,2028,773,92,63,null,'#67432715');
 c.strokeStyle='#303b34';c.lineWidth=9;c.beginPath();c.moveTo(1400,110);c.bezierCurveTo(1470,15,1740,75,1800,0);c.stroke();c.strokeStyle='#738272';c.lineWidth=2;c.stroke();
 const light=c.createRadialGradient(w,100,80,w,100,1900);light.addColorStop(0,'#fff0b738');light.addColorStop(1,'#fff0b700');c.fillStyle=light;c.fillRect(0,0,w,h);
 for(const x of [0,w-26]){const rim=c.createLinearGradient(x,0,x+26,0);rim.addColorStop(0,'#68472b');rim.addColorStop(.5,'#e4c596');rim.addColorStop(1,'#88633e');box(c,x,0,26,h,3,rim);}text(c,'책상 위 최후의 방어선',1190,65,25,'#4c3c2c80');
}
function slab(c,w,h,lift,top,side='#515a50',r=12){
 c.save();c.shadowColor='#281d1660';c.shadowBlur=22;c.shadowOffsetX=15;c.shadowOffsetY=22;box(c,0,0,w,h,r,side);c.shadowColor='transparent';box(c,0,-lift,w,h,r,top,'#ffffff44');const g=c.createLinearGradient(0,-lift,w,h-lift);g.addColorStop(0,'#ffffff28');g.addColorStop(.45,'#ffffff00');g.addColorStop(1,'#00000026');box(c,0,-lift,w,h,r,g);c.restore();
}
const coverImages=new Map(),propImages=new Map(),propArt=window.FrontDesktopProps?.art||{};let coverFailures=0,propFailures=0;
const coverReady=Promise.all(Object.values(window.FrontDesktopCover.art).map(s=>new Promise(resolve=>{const image=new Image();image.onload=()=>{coverImages.set(s.file,image);resolve();};image.onerror=()=>{coverFailures++;resolve();};image.src='assets/desktop/'+s.file+'?v=2';})));
const propReady=Promise.all(Object.values(propArt).map(s=>new Promise(resolve=>{const image=new Image();image.onload=()=>{propImages.set(s.file,image);resolve();};image.onerror=()=>{propFailures++;resolve();};image.src='assets/desktop/'+s.file+'?v=6';})));
let notebookImage=null;const notebookReady=new Promise(resolve=>{const image=new Image();image.onload=()=>{notebookImage=image;resolve();};image.onerror=()=>resolve();image.src='assets/desktop/'+window.FrontDesktopNotebook.art.file+'?v=7';});
const itemShape=window.FrontDesktopItems,itemArt=itemShape?.art||{},itemImages=new Map();let itemFailures=0;
const itemReady=Promise.all(Object.values(itemArt).map(s=>new Promise(resolve=>{const image=new Image();image.onload=()=>{itemImages.set(s.file,image);resolve();};image.onerror=()=>{itemFailures++;resolve();};image.src='assets/desktop/'+s.file+'?v=9';})));
const ready=Promise.all([coverReady,propReady,notebookReady,itemReady]);
function drawItem(c,o){const s=itemArt[o.kind],r=itemShape.sprite(o),image=itemImages.get(s.file);c.save();if(!image&&o.kind==='mug'){const f=itemShape.floor(o);oval(c,f.x+f.w/2,f.y+f.h/2,f.w/2,f.h/2,'#1d302b38');}if(image)c.drawImage(image,...s.crop,r.x,r.y,r.w,r.h);else box(c,r.x,r.y,r.w,r.h,8,o.kind==='eraser'?'#e999ac':o.kind==='mug'?'#926641':'#e9c54c');c.restore();}
function drawProp(c,o){const s=propArt[o.kind],r=window.FrontDesktopProps.sprite(o),image=propImages.get(s.file);c.save();c.shadowColor='#1b262b55';c.shadowBlur=9;c.shadowOffsetX=5;c.shadowOffsetY=6;oval(c,o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,'#1d302b45');c.shadowColor='transparent';if(image)c.drawImage(image,...s.crop,r.x,r.y,r.w,r.h);else{box(c,o.x,o.y-o.h,o.w,o.h*1.5,20,o.kind==='smileMug'?'#f5e4c5':'#ece9dc');oval(c,o.x+o.w/2,o.y-o.h,o.w/2,o.h*.3,'#f7f4e9');oval(c,o.x+o.w/2,o.y-o.h,o.w*.18,o.h*.17,'#a08a6a');}c.restore();}
function propOpacity(o,units){if(itemArt[o.kind]){const r=itemShape.sprite(o),f=itemShape.floor(o);return units.some(u=>u.hp>0&&u.x>r.x-15&&u.x<r.x+r.w+15&&u.y>r.y&&u.y<f.y+f.h)?.4:1;}if(propArt[o.kind]){const r=window.FrontDesktopProps.sprite(o);return units.some(u=>u.hp>0&&u.x>r.x-15&&u.x<r.x+r.w+15&&u.y>r.y&&u.y<o.y+o.h)?.4:1;}return units.some(u=>u.hp>0&&u.x>o.x-20&&u.x<o.x+o.w+20&&u.y<o.y&&u.y>o.y-90)?.4:1;}
function drawCover(c,o){
 const shape=window.FrontDesktopCover,s=shape.style(o),r=shape.rect(o),image=coverImages.get(s.file);c.save();c.shadowColor='#18231f55';c.shadowBlur=5;c.shadowOffsetX=3;c.shadowOffsetY=5;
 if(image){const height=r.w*s.crop[3]/s.crop[2];c.drawImage(image,...s.crop,r.x,r.y+r.h-height,r.w,height);}
 else{
  box(c,r.x,r.y,r.w,r.h,Math.min(10,r.h/4),'#e4e4d9','#b7bdb0');c.shadowColor='transparent';const count=s===shape.art.four?4:3,step=r.w/(count+1);
  box(c,r.x+step*.25,r.y+r.h*.37,step*.5,r.h*.36,4,'#ef9b25');
  for(let i=1;i<=count;i++){const x=r.x+step*(i+.3);box(c,x-step*.3,r.y+r.h*.09,step*.6,r.h*.17,4,'#f7a125');oval(c,x,r.y+r.h*.63,step*.35,r.h*.25,'#bbbdb3');for(const dy of [-.09,.09])oval(c,x,r.y+r.h*(.63+dy),r.h*.035,r.h*.04,'#62685f');}
 }
 c.restore();
}
function obstacle(c,o){if(itemArt[o.kind]){drawItem(c,o);return;}if(o.kind==='notebook'&&notebookImage){const s=window.FrontDesktopNotebook.art,r=window.FrontDesktopNotebook.rect(o);c.save();c.shadowColor='#281d1644';c.shadowBlur=10;c.shadowOffsetX=5;c.shadowOffsetY=7;c.drawImage(notebookImage,...s.crop,r.x,r.y,r.w,r.h);c.restore();return;}if(propArt[o.kind]){drawProp(c,o);return;}if(o.kind==='deskCover'){drawCover(c,o);return;}const {w,h,kind}=o;c.save();c.translate(o.x,o.y);
 if(kind==='keyboard'){
  slab(c,w,h,34,'#d8d2bf','#54615a',19);box(c,15,-20,w-30,h-30,11,'#53635a');const cols=17,kw=(w-50)/cols,kh=(h-56)/5;
  for(let row=0;row<5;row++)for(let col=0;col<cols;col++){if(row===4&&col>4&&col<11)continue;const wide=row===4&&col===4?kw*7-5:kw-5,x=26+col*kw,y=-13+row*kh;box(c,x,y+5,wide,kh-5,5,'#6e8072');box(c,x,y,wide,kh-7,5,row===0&&col===0?'#c68d67':col>=14?'#7d9e8a':'#ece5d0','#fff6df88');if(wide<kw)text(c,row===0?'F'+(col+1):['QWERTYUIOPASDFGHJK','ASDFGHJKLZXCVBNM','ZXCVBNM123456789'][Math.min(row-1,2)]?.[col]||'•',x+wide/2,y+kh*.55,10,col>=14?'#f1e6cd':'#607366');}text(c,'PF / MECHANICAL',w-105,h-9,11);
 }else if(kind==='notebook'){
  slab(c,w,h,28,'#e8dec0','#6e8b80',10);box(c,16,-17,w-31,h-27,5,'#f5ecd1');box(c,32,-5,w-65,45,4,'#738e80');text(c,'DEFENSE PLAN',w/2,24,23,'#eee9d1');
  for(let i=0;i<12;i++){c.strokeStyle='#8c9d8b55';c.lineWidth=1.5;c.beginPath();c.moveTo(50,85+i*29);c.lineTo(w-32,85+i*29);c.stroke();}c.strokeStyle='#b6816c66';c.beginPath();c.moveTo(68,60);c.lineTo(68,h-48);c.stroke();
  for(let i=0;i<13;i++){const y=18+i*35;oval(c,12,y,7,5,'#53665a');c.strokeStyle='#c7c4aa';c.lineWidth=5;c.beginPath();c.ellipse(5,y-5,15,8,-.2,Math.PI*.4,Math.PI*1.95);c.stroke();}
  c.save();c.translate(230,215);c.rotate(-.12);c.strokeStyle='#718a7999';c.lineWidth=3;box(c,-73,-53,146,116,5,null,c.strokeStyle);for(const x of [-45,0,45]){c.beginPath();c.moveTo(x,45);c.lineTo(x,-27);c.lineTo(x-9,-14);c.moveTo(x,-27);c.lineTo(x+9,-14);c.stroke();}c.restore();text(c,'20 MIN / HOLD THE LINE',225,412,14,'#768474');
 }else if(kind==='mug'){
  oval(c,w*.53+14,h*.54+17,w*.51,h*.48,'#35271a45');c.lineWidth=18;oval(c,w*.81,h*.37,43,53,null,'#e7dfc6');c.lineWidth=1;const g=c.createLinearGradient(15,0,w*.75,h);g.addColorStop(0,'#fff0d5');g.addColorStop(.45,'#cbd0b9');g.addColorStop(1,'#788e7d');box(c,18,0,w*.67,h*.78,40,g);oval(c,w*.4,h*.74,w*.33,32,'#a7b49e');oval(c,w*.4,-4,w*.34,50,'#f3e9cd','#d7ccb4');oval(c,w*.4,-7,w*.27,36,'#77583b');oval(c,w*.4,-11,w*.24,29,'#3f3024');oval(c,w*.33,-18,19,6,'#c8aa7755');text(c,'PF',w*.4,112,40,'#597d69');text(c,'FIELD COFFEE',w*.4,138,11,'#597d69');
 }else if(kind==='tape'){
  slab(c,w,h,22,'#bfb58c','#7e775c',35);oval(c,w/2,h*.42-22,w*.4,h*.36,'#ded2a8','#f7ecc1');oval(c,w/2,h*.42-22,w*.22,h*.2,'#756d52');oval(c,w/2,h*.42-29,w*.18,h*.15,'#ad9772');c.lineWidth=4;oval(c,w/2,h*.42-22,w*.28,h*.25,null,'#f2e6bd');box(c,w*.4,h*.75-22,w*.38,h*.18,2,'#d8c996');
 }else if(kind==='eraser'){
  slab(c,w,h,20,'#ca9b8b','#8b6c63',9);box(c,w*.36,-20,w*.46,h,2,'#e4d9bd','#f5ebd2');text(c,'PLASTIC',w*.58,30,12,'#6c8173');text(c,'ERASER',w*.58,49,11,'#6c8173');
 }else if(kind==='books'){
  c.save();c.shadowColor='#30271c55';c.shadowOffsetX=12;c.shadowOffsetY=16;c.shadowBlur=15;for(let i=0;i<3;i++){const x=i%2?13:0,y=-i*22;box(c,x,y+14,w-15,h-10,8,['#725444','#597b70','#96734e'][i]);c.shadowColor='transparent';box(c,x+7,y+8,w-30,h-22,4,'#dfd5b5');for(let j=0;j<5;j++){c.fillStyle='#938e7733';c.fillRect(x+14,y+22+j*24,w-47,1);}box(c,x,y,w-15,h-35,7,['#9c7857','#78978a','#bd9b6c'][i]);}text(c,'SMALL WARS',w*.47,h*.4-44,26,'#f3e5bf');text(c,'A FIELD GUIDE',w*.47,h*.4-16,12,'#ede0b7');c.restore();
 }else if(kind==='pencilbox'){
  slab(c,w,h,26,'#6e8c80','#354e47',24);box(c,12,-17,w-24,h-22,17,null,'#c1c9ad66');c.strokeStyle='#bfc6a3';c.lineWidth=3;c.setLineDash([3,4]);c.beginPath();c.moveTo(25,36);c.lineTo(w-25,36);c.stroke();c.setLineDash([]);box(c,w-55,24,27,18,4,'#c4bd99');text(c,'SUPPLY KIT',w/2,h*.65,19,'#e3ddba');
 }
 c.restore();
}
window.FrontDesktop={terrain,obstacle,ready,diagnostics:()=>({loaded:coverImages.size,failed:coverFailures}),itemDiagnostics:()=>({loaded:itemImages.size,failed:itemFailures}),propDiagnostics:()=>({loaded:propImages.size,failed:propFailures}),depth:o=>{const r=itemArt[o.kind]?itemShape.floor(o):o.kind==='deskCover'?window.FrontDesktopCover.rect(o):o;return r.y+r.h;},opacity:propOpacity,visible:(o,cam,hw,hh)=>{const r=itemArt[o.kind]?itemShape.sprite(o):propArt[o.kind]?window.FrontDesktopProps.sprite(o):{x:o.x,y:o.y-130,w:o.w,h:o.h+260};return r.x+r.w+100>cam.x-hw&&r.x-100<cam.x+hw&&r.y+r.h+100>cam.y-hh&&r.y-100<cam.y+hh;}};
})();
