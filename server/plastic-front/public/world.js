/* Original environment meshes baked to small transparent sprites. */
(()=>{'use strict';
class FrontWorldModels{
 constructor(onReady){this.assets=new Map();this.pending=new Map();this.failures=0;this.onReady=onReady;this.ready=fetch('assets/world/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('world manifest');return r.json();}).then(m=>{this.manifest=m;this.onReady?.();}).catch(()=>{this.failures++;});}
 ensure(key){if(this.assets.has(key))return;if(this.pending.has(key))return;const s=this.manifest?.models[key];if(!s)return;const image=new Image();this.pending.set(key,image);image.onload=()=>{this.assets.set(key,{...s,image});if(!this.rebuildTimer)this.rebuildTimer=setTimeout(()=>{this.rebuildTimer=null;this.onReady?.();},80);};image.onerror=()=>{this.failures++;};image.src=`assets/world/${s.file}?v=${this.manifest.version}`;}

 draw(ctx,key,x=0,y=0){const s=this.assets.get(key);if(!s){this.ensure(key);return false;}if(s.contactShadow){ctx.save();ctx.shadowColor='#233b2b40';ctx.shadowBlur=4;ctx.shadowOffsetX=3;ctx.shadowOffsetY=4;}ctx.drawImage(s.image,x-s.anchorX,y-s.anchorY,s.width,s.height);if(s.contactShadow)ctx.restore();return true;}
 diagnostics(){return{loaded:this.assets.size,failures:this.failures};}
}
window.FrontWorldModels=FrontWorldModels;
})();
