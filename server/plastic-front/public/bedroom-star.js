/* Bedroom floor: oversized household props, approved room art and a warm traversable rug. */
(function(root){'use strict';
const variants=new WeakMap();
function waves(base){if(variants.has(base))return variants.get(base);const r=JSON.parse(JSON.stringify(base));r.opening=[];r.swarm.firstAt=8;r.boss.firstAt=240;r.assault.firstAt=210;const eliteAt={bladeGuard:240,beetle:90,stagBeetle:360,rhinoBeetle:480,bruteBeetle:420};r.swarm.mix=r.swarm.mix.map(m=>({...m,at:eliteAt[m.type]??m.at}));
 Object.assign(r.pressure.early,{swarmBatch:{base:2,add:1,every:3,max:4},swarmInterval:{base:6.5,perTier:-.25,min:4.5}});
 Object.assign(r.pressure.late,{combatCap:{base:34,perTier:2,max:80,absolute:true},swarmBatch:{base:4,add:1,every:3,max:8},swarmInterval:{base:4,perTier:-.1,min:2.8},swarmCap:{base:40,perTier:2,max:64},assaultBatch:{base:5,add:1,every:3,max:10}});variants.set(base,r);return r;
}
const config={id:'bedroom-star',worldId:'bedroom',name:'방바닥 · 2성',width:3200,height:3400,
 hq:{x:1600,y:1750,hp:4000},start:{x:1600,y:2000},
 starters:[['barricade',1420,1940],['barricade',1780,1940],['mgTower',1370,1720],['mgTower',1830,1720]],
 supplies:[{x:1370,y:2070},{x:1830,y:2070},{x:1590,y:1420},{x:1220,y:1750},{x:1940,y:1760}],
 rug:{x:1030,y:1190,w:1100,h:1240,color:'#a8b5ab',shade:'#899d96',trim:'#e8dcca'},
 props:[
  ['bedroomBin','장난감 수납함',2120,1480,440,238],['cushion','커다란 방석',2090,950,500,340],
  ['slipper','왼쪽 실내화',730,1490,290,570],['slipper','오른쪽 실내화',2260,1990,290,570],
  ['books','쌓인 동화책',1880,2660,420,289],['books','바닥에 놓인 책',450,2710,370,254],
  ['blocks','나무 블록',510,1080,320,229],['blocks','흩어진 블록',2630,2700,300,214],
  ['bedroomBin','수납 바구니',510,480,610,330],['lamp','방 한쪽 스탠드',2770,620,155,155],
  ['cushion','바닥 방석',160,2110,430,292],['plant','창가 화분',2680,3000,200,200]
 ],covers:[[1210,960,190,136],[1740,1010,190,131],[1170,2640,190,136],[2550,1300,190,131]]};
function obstacles(){return [...config.props.map(([kind,label,x,y,w,h])=>({kind,label,x,y,w,h,bedroom:true})),...config.covers.map(([x,y,w,h],i)=>({kind:i%2?'books':'blocks',label:(i%2?'책':'블록')+' 엄폐',x,y,w,h,bedroom:true,cover:true}))];}
const BIN={file:'assets/bedroom/toy-bin-v1.webp',width:768,height:512,anchorX:390,anchorY:312.5,footprintW:600,footprintH:325};
let bin=null,failures=0,loading=null;
function prepare(){if(typeof Image==='undefined')return Promise.resolve();return loading??=new Promise(resolve=>{bin=new Image();bin.onload=()=>resolve();bin.onerror=()=>{failures++;bin=null;resolve();};bin.src=BIN.file;});}
function binRect(o){const k=Math.min(o.w/BIN.footprintW,o.h/BIN.footprintH);return{x:o.x+o.w/2-BIN.anchorX*k,y:o.y+o.h/2-BIN.anchorY*k,w:BIN.width*k,h:BIN.height*k};}
function terrain(c,game){
 const room=root.FrontLivingRoom,{w,h,rand}=room.floorSurface(c,game);c.save();room.wovenRug(c,config.rug,rand);
 // A second small bedside mat and quiet sunlight keep the scale domestic, with no industrial markings.
 room.wovenRug(c,{x:240,y:2260,w:730,h:490,color:'#b8a989',shade:'#a5997f',trim:'#e7d5b9'},rand);
 room.windowLight(c,w,1040,850);room.windowLight(c,w,2540,520);
 c.strokeStyle='#fff0cf28';c.lineWidth=2;for(let i=0;i<7;i++){c.beginPath();c.moveTo(120+170*i,3200);c.lineTo(230+170*i,3199);c.stroke();}
 // The skirting is floor decoration, not a hidden collision wall.
 for(const x of [0,w-26]){const g=c.createLinearGradient(x,0,x+26,0);g.addColorStop(0,'#967b5a');g.addColorStop(.5,'#ecddc3');g.addColorStop(1,'#c3a781');c.fillStyle=g;c.fillRect(x,0,26,h);}
 c.fillStyle='#e6d7bd';c.fillRect(26,0,w-52,34);c.fillStyle='#b69a7455';c.fillRect(26,34,w-52,4);
 const light=c.createLinearGradient(w,700,0,h);light.addColorStop(0,'#fff2ce12');light.addColorStop(1,'#6c81770a');c.fillStyle=light;c.fillRect(0,0,w,h);c.restore();
}
function obstacle(c,o){if(o.kind!=='bedroomBin'){root.FrontLivingRoom.furniture(c,o);return;}prepare();const r=binRect(o);if(bin?.complete&&bin.naturalWidth)c.drawImage(bin,r.x,r.y,r.w,r.h);else{c.save();c.fillStyle='#789393';c.beginPath();c.roundRect(o.x,o.y-70,o.w,o.h+70,22);c.fill();c.fillStyle='#d7ccb7';c.fillRect(o.x+9,o.y-59,o.w-18,30);c.restore();}}
function visible(o,camera,halfW,halfH){if(o.kind!=='bedroomBin')return root.FrontLivingRoom.furnitureVisible(o,camera,halfW,halfH);const r=binRect(o);return r.x+r.w+80>camera.x-halfW&&r.x-80<camera.x+halfW&&r.y+r.h+80>camera.y-halfH&&r.y-80<camera.y+halfH;}
function opacity(o,units){if(o.kind!=='bedroomBin')return root.FrontLivingRoom.furnitureOpacity(o,units);const r=binRect(o);return units.some(u=>u.hp>0&&u.x>r.x&&u.x<r.x+r.w&&u.y>r.y&&u.y<o.y)?.45:1;}
function migrate(game){
 const outpost=game.desktopStar||game.world?.variant==='desktop-star';
 if(!outpost&&!game.factoryStar&&game.world?.id!=='factory')return false;
 if(outpost){
  Object.assign(game.bases[0],{x:config.hq.x,y:config.hq.y});
  delete game.desktopStar;
 }
 game.factoryStar=false;game.bedroomStar=true;game.starExperiment=true;game.starMax=2;game.mapId='bedroom';game.world={id:'bedroom',variant:config.id,width:config.width,height:config.height,scale:1,layoutVersion:7};game.obstacles=obstacles();game.navigationCache.clear();
 // Keep progress, casualties, resources and damage; resolve only positions covered by the new household objects.
 for(const u of [...game.units,...(game.buildings||[]).filter(b=>b.mobile)])if(u.hp>0){game.resolvePosition(u);u.route=null;u.routeGoal=null;}
 for(const p of game.pickups||[])if(p.active)game.resolvePosition(p,24);
 for(const b of game.buildings||[])if(b.hp>0&&!b.mobile){const hp=b.hp;b.hp=0;game.resolvePosition(b,Math.hypot(b.w,b.h)/2+8);b.hp=hp;}
 game.moveOrder=null;return true;
}
const api={config,obstacles,waves,terrain,obstacle,visible,opacity,depth:o=>o.y+o.h,prepare,binRect,migrate,diagnostics:()=>({bin:!!bin?.naturalWidth,failures})};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrontBedroom=api;
})(typeof window==='undefined'?globalThis:window);
