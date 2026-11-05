/* Matching lightweight fallback while the baked toy meshes load. */
(()=>{'use strict';
const colors={ant:'#cf5e2d',soldierAnt:'#ad3f24',beetle:'#84954c',bruteBeetle:'#567158',stagBeetle:'#3a6f86',rhinoBeetle:'#914d35'},scales={ant:.72,soldierAnt:.95,beetle:1.05,bruteBeetle:1.35,stagBeetle:1.2,rhinoBeetle:1.4};
function draw(ctx,u){
 const color=colors[u.type];if(!color)return false;
 const ant=u.type==='ant'||u.type==='soldierAnt';ctx.save();ctx.scale(scales[u.type],scales[u.type]);
 const oval=(x,y,rx,ry,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();},piece=(points,width,c)=>{ctx.strokeStyle=c;ctx.lineWidth=width;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
 oval(4,6,ant?27:32,ant?31:36,'#17231a38');
 for(const side of [-1,1])for(let i=0;i<3;i++){const y=-12+i*11,w=Math.sin((u.walk||0)*2)*side*(i%2?-3:3),x=ant?24:29;piece([[side*7,y],[side*(ant?17:21),y-3+w],[side*x,y+5+w]],5,color);oval(side*x,y+5+w,4,3.2,color);}
 const body=(x,y,rx,ry)=>{const g=ctx.createRadialGradient(x-rx*.3,y-ry*.4,1,x,y,Math.max(rx,ry));g.addColorStop(0,color);g.addColorStop(.6,color);g.addColorStop(1,'#293a34');oval(x,y,rx,ry,g);oval(x-rx*.3,y-ry*.35,rx*.28,ry*.16,'#ffffff1f');};
 body(0,ant?17:11,ant?13:17.5,ant?17:23);body(0,ant?-4:-10,ant?8:16,ant?9:13);body(0,-26,11.5,10.5);
 if(!ant)piece([[0,-10],[0,30]],.9,'#23372b99');
 if(ant||!['stagBeetle','rhinoBeetle'].includes(u.type))for(const side of [-1,1]){piece([[side*6,-32],[side*10,-39],[side*16,-43]],3,color);oval(side*16,-43,2,2.8,color);}
 if(u.type==='stagBeetle')for(const side of [-1,1]){ctx.strokeStyle=color;ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(side*7,-32);ctx.bezierCurveTo(side*25,-37,side*24,-56,side*6.5,-60);ctx.stroke();piece([[side*19,-46],[side*12,-48]],4,color);}
 if(u.type==='rhinoBeetle'){piece([[0,-30],[0,-38],[0,-48]],7,color);for(const side of [-1,1])piece([[0,-47],[side*5.5,-55]],4,color);}
 for(const side of [-1,1]){oval(side*9,-31,3,3,'#182323');oval(side*9-.5,-32,.8,.8,'#e7eed9');}
 ctx.restore();return true;
}
window.FrontToyInsects={draw};
})();
