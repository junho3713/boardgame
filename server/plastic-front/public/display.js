/* Display preferences change projection and backing pixels, never simulation geometry. */
(()=>{'use strict';
const key='plastic-front-display-v1',defaults={zoom:100,resolution:'auto'};
function clean(value){const n=Number(value?.zoom);return{zoom:Number.isFinite(n)?Math.round(Math.max(75,Math.min(200,n))/5)*5:100,resolution:['auto','low','standard','high'].includes(value?.resolution)?value.resolution:'auto'};}
function read(storage){try{return clean(JSON.parse(storage.getItem(key)));}catch{return{...defaults};}}
function save(storage,value){try{storage.setItem(key,JSON.stringify(clean(value)));return true;}catch{return false;}}
function metrics(width,height,deviceRatio,value,idle=false){const p=clean(value),w=Math.max(1,width),h=Math.max(1,height),native=Number.isFinite(deviceRatio)&&deviceRatio>0?deviceRatio:1,requested=p.resolution==='auto'?Math.min(native,2):{low:.75,standard:1,high:2}[p.resolution],ratio=Math.min(requested,Math.sqrt(8000000/(w*h))),base=idle?Math.max(.42,Math.min(.9,w/1450)):Math.max(.52,Math.min(1.15,w/1080));return{width:Math.max(1,Math.round(w*ratio)),height:Math.max(1,Math.round(h*ratio)),ratio,scale:base*p.zoom/100};}
const api={defaults,clean,read,save,metrics};if(typeof module!=='undefined')module.exports=api;if(typeof window!=='undefined')window.FrontDisplay=api;
})();
