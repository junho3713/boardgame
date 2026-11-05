/* Original environment meshes baked to small transparent sprites. */
(()=>{'use strict';
class FrontWorldModels{
 constructor(onReady){this.assets=new Map();this.failures=0;this.ready=fetch('assets/world/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('world manifest');return r.json();}).then(async m=>{await Promise.all(Object.entries(m.models).map(([key,s])=>new Promise(resolve=>{const image=new Image();image.onload=()=>{this.assets.set(key,{...s,image});resolve();};image.onerror=()=>{this.failures++;resolve();};image.src=`assets/world/${s.file}?v=${m.version}`;})));onReady?.();}).catch(()=>{this.failures++;});}
 draw(ctx,key,x=0,y=0){const s=this.assets.get(key);if(!s)return false;if(s.contactShadow){ctx.save();ctx.shadowColor='#233b2b40';ctx.shadowBlur=4;ctx.shadowOffsetX=3;ctx.shadowOffsetY=4;}ctx.drawImage(s.image,x-s.anchorX,y-s.anchorY,s.width,s.height);if(s.contactShadow)ctx.restore();return true;}
 diagnostics(){return{loaded:this.assets.size,failures:this.failures};}
}
window.FrontWorldModels=FrontWorldModels;
})();
