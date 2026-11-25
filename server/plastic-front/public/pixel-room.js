/* A four-world-unit floor tile and indexed sprites for the two-star living room. */
(() => {
 'use strict';

 let sheets=[],manifest=null,loading;
 const sources=new WeakMap(),canvasDraw=new WeakMap();
 const base='assets/pixel-room/';
 function load(){
  if(!loading)loading=fetch(base+'manifest.json?v=20261125-snap1').then(r=>{
   if(!r.ok)throw Error('Pixel atlas manifest '+r.status);return r.json();
  }).then(async data=>{
   const pages=await Promise.all(data.pages.map(async file=>{
    const img=new Image();img.src=base+file;await img.decode();return img;
   }));
   sheets=pages;manifest=data.sprites;
  }).catch(err=>{loading=null;console.warn('도트 전장 이미지 로딩',err);});
  return loading;
 }
 function entry(img){
  if(!manifest||!(img instanceof HTMLImageElement)||!img.naturalWidth)return null;
  if(!sources.has(img)){
   const pathname=new URL(img.currentSrc||img.src,document.baseURI).pathname;
   sources.set(img,manifest[pathname.split('/assets/').pop()]||null);
  }
  return sources.get(img);
 }
 function drawSprite(draw,img,args){
  const rect=entry(img);
  if(!rect)return draw(img,...args);
  const [page,x,y,w,h]=rect,ow=img.naturalWidth,oh=img.naturalHeight;
  if(args.length===8){
   const [sx,sy,sw,sh,...dest]=args;
   return draw(sheets[page],x+sx*w/ow,y+sy*h/oh,sw*w/ow,sh*h/oh,...dest);
  }
  const dest=args.length===2?[...args,ow,oh]:args;
  return draw(sheets[page],x,y,w,h,...dest);
 }
 // Segmented models generate moving hair, wings and shadows from a source
 // image at its authored resolution. Give those masks the same snapped art.
 function layeredSource(img){
  if(!entry(img))return img;
  const c=document.createElement('canvas');
  c.width=c.naturalWidth=img.naturalWidth;c.height=c.naturalHeight=img.naturalHeight;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  drawSprite(ctx.drawImage.bind(ctx),img,[0,0]);return c;
 }
 function setMode(ctx,active){
  if(!canvasDraw.has(ctx))canvasDraw.set(ctx,ctx.drawImage.bind(ctx));
  const draw=canvasDraw.get(ctx);
  ctx.drawImage=active?(img,...args)=>drawSprite(draw,img,args):draw;
  if(active)load();
 }
 const pickupCache=new Map();
 const starPixels=[
  '........#........',
  '.......#h#.......',
  '.......#hl#......',
  '......#hhll#.....',
  '......#hlll#.....',
  '.#####hhlll#####.',
  '#whhhhhlllllllld#',
  '.#hhhhllggggggd#.',
  '..#hhllggggggd#..',
  '...#llggggggd#...',
  '....#ggggggd#....',
  '....#ggglggd#....',
  '...#ggl###gd#....',
  '...#ll#...#gd#...',
  '..#ld#.....#gd#..',
  '..###.......###..'
 ];
 const cratePixels=[
  '...#############...',
  '..#hhlllllllhlld#..',
  '.#hhllllllllllldd#.',
  '#hhhhhhhhhhhhhhhhh#',
  '#lwwlllddddddllwwd#',
  '###################',
  '.#dlwllhhlhhllwdd#.',
  '.#dlwlggghggglwdd#.',
  '.#dlwlggwhwgglwdd#.',
  '.#dlwlggghggglwdd#.',
  '.#dlwlllllllllwdd#.',
  '.#ddddddddddddddd#.',
  '..###############..'
 ];
 const pickupPalettes={
  star:{'#':'#4c2e21',w:'#fffdeb',h:'#fff2a3',l:'#ffd154',g:'#f4a134',d:'#ac602b'},
  supply:{'#':'#283c33',w:'#f5deb0',h:'#b8c593',l:'#8caa76',g:'#608462',d:'#4d6851'},
  rare:{'#':'#302c49',w:'#fff1bc',h:'#ddcfff',l:'#ab91cb',g:'#786a9d',d:'#52466f'}
 };
 function pickupTexture(kind,shine){
  const key=kind+(shine?'*':'');
  if(pickupCache.has(key))return pickupCache.get(key);
  const rows=kind==='star'?starPixels:cratePixels,palette=pickupPalettes[kind];
  const canvas=document.createElement('canvas');
  canvas.width=rows[0].length;canvas.height=rows.length;
  const pen=canvas.getContext('2d');
  rows.forEach((row,y)=>Array.from(row).forEach((ch,x)=>{
   if(ch==='.')return;
   pen.fillStyle=palette[ch];pen.fillRect(x,y,1,1);
  }));
  if(kind==='rare'){
   const jewel=['..h..','.hwh.','hwgwh','.hlh.','..h..'];
   jewel.forEach((row,y)=>Array.from(row).forEach((ch,x)=>{
    if(ch!=='.'){pen.fillStyle=palette[ch];pen.fillRect(7+x,6+y,1,1);}
   }));
  }
  if(shine){
   pen.fillStyle=palette.w;pen.fillRect(4,6,4,1);pen.fillRect(6,5,1,3);
  }
  pickupCache.set(key,canvas);return canvas;
 }
 function pickup(ctx,kind,x,y,time){
  const image=pickupTexture(kind,kind==='star'&&time%1.6<.22);
  const width=image.width*3,height=image.height*3;
  const top=kind==='star'?y-height/2:y-height;
  ctx.drawImage(image,Math.round(x-width/2),Math.round(top),width,height);
 }
 function backingRatio(deviceRatio,metrics){
  const nativeRatio=deviceRatio||1;
  const preferred=Math.min(metrics.ratio,Math.max(.6,1/(2*metrics.scale)));
  const step=Math.max(1,Math.ceil(nativeRatio/metrics.ratio),Math.round(nativeRatio/preferred));
  return nativeRatio/step;
 }
 function terrain(ctx,game){
  const world=game.bounds(),w=Math.ceil(world.width/4),h=Math.ceil(world.height/4);
  let seed=6743;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);};
  const rect=(x,y,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),width,height);};
  ctx.save();ctx.scale(4,4);
  rect(0,0,w,h,'#936345');
  const boards=[['#d8a975','#ce9f6a','#e1b682'],['#d1a06e','#c69563','#dcad78'],['#d6a571','#c99a68','#e1b481'],['#d8ab7c','#cda170','#e4b989']];
  const pw=119,ph=29;
  for(let y=0,row=0;y<h;y+=ph,row++)for(let x=-(row%3)*39;x<w;x+=pw){
   const [body,dark,light]=boards[rand(boards.length)];
   rect(x+1,y+1,pw-1,ph-1,body);rect(x+1,y+1,pw-1,1,light);rect(x+1,y+ph-1,pw-1,1,dark);
   for(let n=0;n<6;n++){
    const gx=x+3+rand(82),gy=y+4+rand(ph-7),len=5+rand(24);
    rect(gx,gy,len,1,n%3?dark:light);if(n%2===0)rect(gx+len,gy-1,2+rand(6),1,dark);
   }
   if(rand(6)===0){
    const kx=x+24+rand(48),ky=y+9+rand(10);rect(kx-5,ky,11,1,dark);rect(kx-3,ky-1,7,1,dark);rect(kx-2,ky,5,1,light);
   }
  }
  function rug(cx,cy,rw,rh){
   const x=Math.round(cx-rw/2),y=Math.round(cy-rh/2);
   rect(x+2,y+3,rw,rh,'#a17c59');
   for(let xx=x+2;xx<x+rw-2;xx+=4){rect(xx,y-3,2,3,'#e1c99e');rect(xx,y+rh,2,4,'#d9be93');}
   rect(x,y,rw,rh,'#456963');rect(x+2,y+2,rw-4,rh-4,'#d4ba8e');rect(x+4,y+4,rw-8,rh-8,'#935f49');
   rect(x+7,y+7,rw-14,rh-14,'#d4ba8e');rect(x+8,y+8,rw-16,rh-16,'#71968a');
   const diamond=(mx,my,r,color)=>{for(let yy=-r;yy<=r;yy++){const dx=r-Math.abs(yy);rect(mx-dx,my+yy,2*dx+1,1,color);}};
   for(let yy=y+17,j=0;yy<y+rh-15;yy+=12,j++)for(let xx=x+18+(j%2)*10;xx<x+rw-13;xx+=20){
    diamond(xx,yy,2,'#83a397');rect(xx,yy,1,1,'#62867c');
   }
   for(let xx=x+7;xx<x+rw-6;xx+=8){rect(xx,y+5,3,1,'#edd5a8');rect(xx,y+rh-6,3,1,'#edd5a8');}
   for(const ax of [-1,1])for(const ay of [-1,1]){
    const cornerX=ax<0?x+12:x+rw-13,cornerY=ay<0?y+12:y+rh-13;
    for(let n=0;n<5;n++){
     rect(cornerX-ax*n*2,cornerY-ay*(4-n)*2,2,2,'#b8b49a');
     rect(cornerX-ax*n*2,cornerY-ay*(6-n)*2,1,1,'#537c73');
    }
   }
   const mx=Math.round(cx),my=Math.round(cy),r=Math.min(10,Math.floor(rh/9));
   for(const side of [-1,1]){
    diamond(mx+side*17,my,4,'#5f857b');diamond(mx+side*17,my,2,'#b7b398');
   }
   diamond(mx,my,r+2,'#5c8178');diamond(mx,my,r,'#a1ae99');diamond(mx,my,r-2,'#597e76');
   diamond(mx,my,3,'#ccb995');rect(mx-1,my-1,3,3,'#a07b5e');
  }
  rug(900*w/2400+1030/8,2990*h/4200+850/8,258,213);
  rug(650*w/2400+1450/8,920*h/4200+1050/8,362,263);
  // The entry mat sits directly above the green HQ and remains traversable.
  const home=game.bases[0];rug(home.x/4,(home.y-210)/4,149,79);
  rect(0,0,6,h,'#926d54');rect(2,0,2,h,'#e5c79b');rect(w-6,0,6,h,'#9c785b');rect(w-4,0,2,h,'#e1c69b');
  ctx.restore();
 }
 window.FrontPixelRoom={load,setMode,layeredSource,terrain,pickup,backingRatio};
})();
