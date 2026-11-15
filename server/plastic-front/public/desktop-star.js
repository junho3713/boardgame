/* Desk Outpost: a separate two-star battlefield. Map data is shared by browser, saves and workers. */
(function(root){'use strict';
const config={id:'desktop-star',name:'책상 전초기지 · 2성',width:2800,height:3200,hq:{x:1400,y:1600,hp:4000},start:{x:1400,y:1830},starters:[['barricade',1200,1790],['barricade',1600,1790],['mgTower',1130,1570],['mgTower',1670,1570]],supplies:[{x:1180,y:1870},{x:1630,y:1860},{x:1380,y:1250},{x:900,y:1580},{x:1900,y:1590}],props:[
 ['keyboard','기계식 키보드',590,130,1620,300],['notebook','작전 수첩',120,1080,360,540],['mug','아이스 커피',2280,1080,260,250],['books','책 더미',100,2490,440,420],['pencilbox','보급 필통',2210,2530,410,300],['tape','예비 테이프',2210,2010,240,200],['eraser','지우개',400,700,170,89.25],['mechanicalPencil','샤프',1990,620,264,90],['smileMug','스마일 머그컵',270,2040,160,105],['toiletRoll','세운 두루마리 휴지',2370,650,155,100]
],covers:[[840,1040,250,90],[1700,1050,260,90],[780,2110,260,90],[1780,2110,260,90],[550,1590,170,80],[2090,1590,170,80]]};
function obstacles(){return [...config.props.map(([kind,label,x,y,w,h])=>({kind,label,x,y,w,h})),...config.covers.map(([x,y,w,h],i)=>({kind:'deskCover',label:'멀티탭 엄폐 '+(i+1),x,y,w,h,cover:true}))];}
const variants=new WeakMap();
function waves(base){if(variants.has(base))return variants.get(base);const r=JSON.parse(JSON.stringify(base));r.opening=[];r.swarm.firstAt=8;r.boss.firstAt=240;r.assault.firstAt=210;const eliteAt={bladeGuard:240,beetle:90,stagBeetle:360,rhinoBeetle:480,bruteBeetle:420};r.swarm.mix=r.swarm.mix.map(m=>({...m,at:eliteAt[m.type]??m.at}));
 Object.assign(r.pressure.early,{swarmBatch:{base:2,add:1,every:3,max:4},swarmInterval:{base:6.5,perTier:-.25,min:4.5}});
 Object.assign(r.pressure.late,{combatCap:{base:34,perTier:2,max:80,absolute:true},swarmBatch:{base:4,add:1,every:3,max:8},swarmInterval:{base:4,perTier:-.1,min:2.8},swarmCap:{base:40,perTier:2,max:64},assaultBatch:{base:5,add:1,every:3,max:10}});variants.set(base,r);return r;
}
function terrain(c,game){
 const w=game.bounds().width,h=game.bounds().height,box=(x,y,width,height,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,width,height,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}},label=(s,x,y,size,color)=>{c.font='700 '+size+'px system-ui';c.textAlign='center';c.fillStyle=color;c.fillText(s,x,y);};
 c.save();const wood=c.createLinearGradient(0,0,w,h);wood.addColorStop(0,'#b99a71');wood.addColorStop(.55,'#d1b48b');wood.addColorStop(1,'#8f7251');c.fillStyle=wood;c.fillRect(0,0,w,h);let seed=431;for(let i=0;i<550;i++){seed=seed*16807%2147483647;const y=seed/2147483647*h;c.strokeStyle=i%3?'#65482c1c':'#f2d9a438';c.lineWidth=1;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y+12,w*.7,y-14,w,y+8);c.stroke();}
 c.shadowColor='#172d3d70';c.shadowBlur=24;c.shadowOffsetX=14;c.shadowOffsetY=20;box(630,800,1540,1740,45,'#1d3341');c.shadowColor='transparent';const mat=c.createLinearGradient(650,800,2140,2540);mat.addColorStop(0,'#426a7b');mat.addColorStop(.6,'#2d4e61');mat.addColorStop(1,'#203d50');box(642,812,1516,1716,35,mat,'#91afad');
 c.save();c.beginPath();c.roundRect(660,830,1480,1680,26);c.clip();c.strokeStyle='#9dc4c414';c.lineWidth=1;for(let x=660;x<2150;x+=80){c.beginPath();c.moveTo(x,830);c.lineTo(x,2520);c.stroke();}for(let y=830;y<2520;y+=80){c.beginPath();c.moveTo(660,y);c.lineTo(2150,y);c.stroke();}c.restore();
 c.lineWidth=2;c.setLineDash([4,9]);box(662,832,1476,1676,26,null,'#c7d6b877');c.setLineDash([]);
 c.strokeStyle='#d9d7aa45';c.lineWidth=3;for(const radius of [235,455]){c.beginPath();c.ellipse(1400,1600,radius,radius*.84,0,0,Math.PI*2);c.stroke();}
 for(let side=0;side<4;side++){const a=side*Math.PI/2;c.save();c.translate(1400,1600);c.rotate(a);c.strokeStyle='#e6d09b70';c.lineWidth=3;c.setLineDash([15,14]);c.beginPath();c.moveTo(270,0);c.lineTo(590,0);c.stroke();c.setLineDash([]);for(const d of [315,405,495]){c.beginPath();c.moveTo(d+14,-15);c.lineTo(d,0);c.lineTo(d+14,15);c.stroke();}c.restore();}
 label('OUTPOST 02',1400,2210,49,'#e0d6acb3');label('사방 방어 · 2성 분대',1400,2250,22,'#cbd6c7a6');label('HOLD THE CENTER / 20:00',1400,2290,16,'#cbd6c799');label('PLASTIC FRONT',1400,3020,33,'#493e3077');
 for(const [x,y,a]of [[720,720,.2],[2100,2680,-.35],[650,2690,.55]]){c.save();c.translate(x,y);c.rotate(a);box(-95,-17,190,34,2,'#e3cf9266');c.restore();}
 const light=c.createRadialGradient(w,0,100,w,0,2700);light.addColorStop(0,'#fff3b333');light.addColorStop(1,'#fff3b300');c.fillStyle=light;c.fillRect(0,0,w,h);c.restore();
}
const api={config,obstacles,waves,terrain};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrontDesktopStar=api;
})(typeof window==='undefined'?globalThis:window);
