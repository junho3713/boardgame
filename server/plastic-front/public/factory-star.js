/* Toy Works: code-native plastic machinery, walkable moving belts and a separate two-star map. */
(function(root){'use strict';
const defense=typeof module!=='undefined'&&module.exports?require('./desktop-star.js'):root.FrontDesktopStar;
const config={id:'factory-star',worldId:'factory',name:'장난감 공장 · 2성',width:3200,height:3400,
 hq:{x:1600,y:1750,hp:4000},start:{x:1600,y:2000},
 starters:[['barricade',1420,1940],['barricade',1780,1940],['mgTower',1370,1720],['mgTower',1830,1720]],
 supplies:[{x:1370,y:2070},{x:1830,y:2070},{x:1590,y:1420},{x:1270,y:1750},{x:1930,y:1750}],
 belts:[{x:1080,y:650,w:135,h:2200,axis:'y',direction:1},{x:1985,y:650,w:135,h:2200,axis:'y',direction:-1},{x:450,y:1330,w:2300,h:135,axis:'x',direction:1},{x:450,y:2150,w:2300,h:135,axis:'x',direction:-1}],
 props:[
  ['factoryAssembly','조립 로봇 A',680,930,380,310],['factoryAssembly','조립 로봇 B',2140,930,380,310],
  ['factoryAssembly','도색 로봇 C',680,2400,400,330],['factoryAssembly','도색 로봇 D',2120,2400,400,330],
  ['factoryPress','사출 프레스',850,1670,200,190],['factoryPress','성형 프레스',2150,1670,200,190],
  ['factoryRack','부품 선반',100,1500,290,560],['factoryRack','완구 선반',2810,1500,290,560],
  ['factoryGenerator','주 동력 장치',1440,300,320,300],['factoryGenerator','예비 발전기',1420,2940,360,210],
  ['factoryCrates','운송 팔레트',180,2710,350,220],['factoryCrates','출하 팔레트',2670,2710,350,220]
 ],covers:[[1260,1110,170,130],[1770,1110,170,130],[1260,2480,170,130],[1770,2480,170,130]]};
function obstacles(){return [...config.props.map(([kind,label,x,y,w,h])=>({kind,label,x,y,w,h})),...config.covers.map(([x,y,w,h],i)=>({kind:'factoryBin',label:'부품함 엄폐 '+(i+1),x,y,w,h,cover:true}))];}
const box=(c,x,y,w,h,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
const oval=(c,x,y,rx,ry,fill,stroke)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
function label(c,s,x,y,size=18,color='#e4e6cf'){c.font='800 '+size+'px system-ui';c.textAlign='center';c.fillStyle=color;c.fillText(s,x,y);}
function gradient(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
function stripes(c,x,y,w,h){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle='#e6b54d';c.fillRect(x,y,w,h);c.fillStyle='#333f44';for(let d=-h;d<w+h;d+=42){c.beginPath();c.moveTo(x+d,y);c.lineTo(x+d+21,y);c.lineTo(x+d+21-h,y+h);c.lineTo(x+d-h,y+h);c.closePath();c.fill();}c.restore();}
function gear(c,x,y,r,color){c.save();c.translate(x,y);c.strokeStyle=color;c.lineWidth=r*.3;c.beginPath();c.arc(0,0,r*.7,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.fillStyle=color;c.fillRect(-r*.14,-r,r*.28,r*.35);}c.restore();}
function slab(c,w,h,lift,top,side){c.save();c.shadowColor='#12262e66';c.shadowBlur=15;c.shadowOffsetX=12;c.shadowOffsetY=19;box(c,0,0,w,h,13,side);c.shadowColor='transparent';box(c,0,-lift,w,h,13,gradient(c,0,-lift,w,h,top,side),'#d9e6dc70');c.fillStyle='#ffffff1c';c.fillRect(12,-lift+10,w-24,8);c.restore();}
function terrain(c,game){
 const {width:w,height:h}=game.bounds();c.save();c.fillStyle=gradient(c,0,0,w,h,'#526f73','#293f49');c.fillRect(0,0,w,h);
 for(let y=0;y<h;y+=160)for(let x=0;x<w;x+=160){c.fillStyle=(x/160+y/160)%2?'#afc8ba0b':'#081f2a0b';c.fillRect(x+2,y+2,156,156);c.strokeStyle='#132d3659';c.lineWidth=2;c.strokeRect(x+1,y+1,158,158);for(const [dx,dy]of [[12,12],[148,148]]){oval(c,x+dx,y+dy,2,2,'#a2b5a03b');}}
 // The golden apron is walkable floor; only the machinery bodies block movement.
 box(c,1200,1480,800,550,36,'#3c565c','#d7b34c');box(c,1212,1492,776,526,27,null,'#d7b34c66');
 for(const b of config.belts){c.save();c.shadowColor='#0e27365c';c.shadowBlur=8;c.shadowOffsetY=9;box(c,b.x-14,b.y-14,b.w+28,b.h+28,14,'#25363d');c.shadowColor='transparent';box(c,b.x,b.y,b.w,b.h,7,'#162f37','#7f9b9b');c.lineWidth=5;c.strokeStyle='#b3a261';if(b.axis==='y'){c.beginPath();c.moveTo(b.x-6,b.y+15);c.lineTo(b.x-6,b.y+b.h-15);c.moveTo(b.x+b.w+6,b.y+15);c.lineTo(b.x+b.w+6,b.y+b.h-15);}else{c.beginPath();c.moveTo(b.x+15,b.y-6);c.lineTo(b.x+b.w-15,b.y-6);c.moveTo(b.x+15,b.y+b.h+6);c.lineTo(b.x+b.w-15,b.y+b.h+6);}c.stroke();c.restore();}
 for(const o of obstacles()){const p=18;c.save();stripes(c,o.x-p,o.y-p,o.w+p*2,11);stripes(c,o.x-p,o.y+o.h+p-11,o.w+p*2,11);c.strokeStyle='#edc25d80';c.lineWidth=2;c.strokeRect(o.x-p,o.y-p,o.w+p*2,o.h+p*2);c.restore();}
 for(const side of [-1,1]){const x=1600+side*1420;c.fillStyle='#7a989140';c.fillRect(x-4,160,8,h-320);for(let y=200;y<h-160;y+=175){box(c,x-14,y,28,48,6,'#809996','#b8c4aa');}}
 for(const [x,y,text]of [[1600,170,'TOY WORKS / 02'],[1600,2770,'ASSEMBLY FLOOR'],[1600,2820,'장난감 공장 · 2성 분대']])label(c,text,x,y,text.includes('장난감')?25:44,'#d2dbbd99');
 for(const [x,y,angle]of [[1600,650,Math.PI/2],[1600,3070,-Math.PI/2],[480,1750,0],[2720,1750,Math.PI]]){c.save();c.translate(x,y);c.rotate(angle);for(let i=0;i<3;i++){c.strokeStyle='#eac663aa';c.lineWidth=6;c.beginPath();c.moveTo(-38-i*45,-24);c.lineTo(-12-i*45,0);c.lineTo(-38-i*45,24);c.stroke();}c.restore();}
 label(c,'CONTROL',1600,1600,18,'#f7dfa180');label(c,'중앙 제어기지',1600,1880,19,'#f7dfa1aa');
 // Loading bay doors, wall panels and lamps establish a factory silhouette at every edge.
 for(const [x,y,w0,h0]of [[70,70,3060,55],[70,3270,3060,55]]){box(c,x,y,w0,h0,10,'#21343e','#8eaa9b');for(let i=x+30;i<x+w0-30;i+=120)box(c,i,y+12,68,11,4,'#ebc36c');}
 for(const x of [450,2540])for(const y of [260,3050]){stripes(c,x,y,210,28);label(c,'LOADING',x+105,y-18,19,'#e8c66a');}
 const light=c.createRadialGradient(1600,1550,300,1600,1550,2400);light.addColorStop(0,'#d7eedc09');light.addColorStop(1,'#06182659');c.fillStyle=light;c.fillRect(0,0,w,h);c.restore();
}
function motion(c,game){
 const t=game.time||0;c.save();for(const b of config.belts){c.save();c.beginPath();c.rect(b.x+5,b.y+5,b.w-10,b.h-10);c.clip();const vertical=b.axis==='y',length=vertical?b.h:b.w,offset=((t*42*b.direction)%60+60)%60;
  c.strokeStyle='#63848777';c.lineWidth=3;for(let d=-60;d<length+60;d+=60){const q=d+offset;c.beginPath();if(vertical){c.moveTo(b.x+5,b.y+q);c.lineTo(b.x+b.w-5,b.y+q);}else{c.moveTo(b.x+q,b.y+5);c.lineTo(b.x+q,b.y+b.h-5);}c.stroke();}
  for(let i=0;i<5;i++){const along=((i*445+t*42*b.direction)%length+length)%length,x=vertical?b.x+b.w/2:b.x+along,y=vertical?b.y+along:b.y+b.h/2;toyPart(c,x,y,i);}
  c.restore();}c.restore();
}
function toyPart(c,x,y,index){c.save();c.translate(x,y);c.shadowColor='#07151a66';c.shadowBlur=4;c.shadowOffsetY=5;const colors=['#d89b53','#8dc3b5','#c77d68','#87a9c0'];box(c,-23,-21,46,42,10,colors[index%4],'#d7deca');c.shadowColor='transparent';oval(c,-9,-3,3,4,'#243f48');oval(c,9,-3,3,4,'#243f48');box(c,-8,9,16,4,2,'#46635b');c.restore();}
function obstacle(c,o,time=0){
 const {w,h,kind}=o;c.save();c.translate(o.x,o.y);
 if(kind==='factoryAssembly'){
  slab(c,w,h,58,'#d99555','#8f5742');box(c,18,-39,w*.59,h*.75,15,gradient(c,18,-39,w*.59,h*.75,'#6e9d9b','#345d68'),'#b1d0b5');
  box(c,w*.66,-35,w*.27,h*.55,10,'#315462','#b7c5a3');box(c,w*.69,-22,w*.21,h*.27,5,'#172f3a','#81a8a6');
  label(c,'0'+(o.x<1600?1:2),w*.795,h*.09,33,'#b6dfbd');for(let i=0;i<3;i++)oval(c,w*(.7+i*.08),h*.4,8,8,i===2?'#d17459':i===1?'#e5c568':'#9ccead','#18353b');
  stripes(c,18,h*.8,w-36,22);box(c,22,h*.91,w-44,12,4,'#392f2c');
  // Rounded robot arm, visible joints and a soft plastic two-finger gripper.
  c.lineCap='round';c.lineJoin='round';const bx=w*.22,by=h*.43;c.strokeStyle='#694738';c.lineWidth=35;c.beginPath();c.moveTo(bx,by);c.lineTo(bx+32,by-126);c.lineTo(bx+125,by-88);c.stroke();c.strokeStyle='#f1be6c';c.lineWidth=23;c.stroke();
  for(const [x,y]of [[bx,by],[bx+32,by-126],[bx+125,by-88]]){oval(c,x,y,22,20,'#527986','#d4d6b4');oval(c,x,y,9,8,'#2c4d57','#a9c7b0');}
  c.strokeStyle='#ced5bd';c.lineWidth=10;c.beginPath();c.moveTo(bx+116,by-69);c.lineTo(bx+104,by-45);c.lineTo(bx+114,by-31);c.moveTo(bx+135,by-69);c.lineTo(bx+147,by-45);c.lineTo(bx+137,by-31);c.stroke();toyPart(c,w*.44,h*.52,1);
  label(c,o.label,w/2,h+27,18,'#d9d9bd');
 }else if(kind==='factoryPress'){
  slab(c,w,h,38,'#8bad9f','#426b6a');box(c,20,-72,w-40,h*.72,10,'#344c55','#b5c4ac');
  for(const x of [35,w-50])box(c,x,-85,16,h*.68,5,'#c3cfb8','#688d8b');box(c,12,-116,w-24,49,10,'#e4a557','#ffe1a2');
  box(c,w*.4,-68,w*.2,h*.32,6,'#aec3b9','#e4d9ad');stripes(c,22,h*.45,w-44,21);toyPart(c,w/2,h*.52,2);gear(c,w*.5,-94,14,'#715747');label(c,'PRESS',w/2,h+22,17,'#c4d4bd');
 }else if(kind==='factoryBin'){
  slab(c,w,h,38,'#79aaae','#3c666f');box(c,13,-26,w-26,h-24,9,'#264b58','#c7c89f');
  for(let i=0;i<5;i++){const x=26+(i%3)*(w-48)/2,y=4+Math.floor(i/3)*42;gear(c,x,y,15,['#dcbb64','#a4c4b0','#d38c64'][i%3]);}
  box(c,w*.34,h*.62,w*.32,17,4,'#e0c46d');c.strokeStyle='#2e555d';c.lineWidth=6;c.beginPath();c.moveTo(w*.4,h*.71);c.lineTo(w*.6,h*.71);c.stroke();
 }else if(kind==='factoryRack'){
  slab(c,w,h,55,'#547d83','#294854');for(let row=0;row<3;row++){const y=-35+row*(h-45)/3;box(c,15,y,w-30,(h-70)/3,8,'#203d4b','#88ada1');for(let i=0;i<3;i++){const cw=(w-66)/3;box(c,27+i*(cw+8),y+14,cw,(h-130)/3,7,['#d39e60','#87b3b0','#bd806a'][(i+row)%3],'#decfa1');gear(c,27+i*(cw+8)+cw/2,y+50,15,'#344f5366');}stripes(c,11,y+(h-70)/3-10,w-22,12);}
 }else if(kind==='factoryGenerator'){
  slab(c,w,h,65,'#718e91','#344f5c');box(c,18,-47,w*.53,h*.8,14,'#304d5b','#96b6ac');for(let i=0;i<6;i++)box(c,33,-25+i*h*.1,w*.43,9,4,'#172e3a');
  box(c,w*.63,-32,w*.26,h*.45,8,'#253f4e','#adbfaa');const glow=.65+.35*Math.sin(time*2);c.globalAlpha=glow;oval(c,w*.76,h*.08,18,18,'#bfe5a0');c.globalAlpha=1;label(c,'⚡',w*.76,h*.34,35,'#e6c367');stripes(c,18,h*.82,w-36,19);
 }else if(kind==='factoryCrates'){
  slab(c,w,h,18,'#8e7963','#4f584f');for(let i=0;i<3;i++){const bw=(w-45)/3,x=10+i*(bw+12);c.save();c.translate(x,10);slab(c,bw,h-40,48,['#a5b4a4','#cda064','#7ea6a6'][i],'#48686a');box(c,10,-32,bw-20,h-66,5,null,'#c6d0ae');gear(c,bw/2,h*.2,18,'#536e66');c.restore();}
 }
 c.restore();
}
const api={config,obstacles,waves:base=>defense.waves(base),terrain,motion,obstacle};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrontFactory=api;
})(typeof window==='undefined'?globalThis:window);
