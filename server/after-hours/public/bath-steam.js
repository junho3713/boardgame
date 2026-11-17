import * as T from './three.module.js';
import {GARMENT_PATHS} from './puzzle-tricks.js?v=20261117-tricks1';

export function buildBathSteam({scene,state,canvasTexture,mirror}){
 const texture=canvasTexture((a,w,h)=>{
  const mist=a.createLinearGradient(0,h,0,0);mist.addColorStop(0,'#d1d9d0');mist.addColorStop(.65,'#cad5cde8');mist.addColorStop(1,'#c1cec6a6');a.fillStyle=mist;a.fillRect(0,0,w,h);
  for(let n=0;n<360;n++){
   const x=(n*.61803399%1)*w,y=(n*.41421356%1)*h;
   a.fillStyle='#e9f1e33b';a.fillRect(x,y,1.5,2+(n%11)*.65);
  }
  a.globalCompositeOperation='destination-out';a.lineCap='round';a.lineJoin='round';
  a.font='42px serif';a.textAlign='center';a.fillText('접수',w/2,h*.25);
  GARMENT_PATHS.forEach((path,i)=>{a.save();a.translate(w*(.16+i*.27),h*.37);a.scale(5,5);a.strokeStyle='#000';a.lineWidth=2.6;a.stroke(new Path2D(path));a.restore();});
  for(const x of[.385,.655]){a.lineWidth=8;a.beginPath();a.moveTo(w*x-12,h*.52);a.lineTo(w*x+25,h*.52);a.lineTo(w*x+12,h*.52-12);a.moveTo(w*x+25,h*.52);a.lineTo(w*x+12,h*.52+12);a.stroke();}
  a.globalCompositeOperation='source-over';
 },1024,626);
 const fog=new T.Mesh(new T.PlaneGeometry(1.8,1.1),new T.MeshBasicMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
 fog.name='Condensation revealing soap garment marks';fog.position.copy(mirror.position);fog.position.x-=.006;fog.rotation.copy(mirror.rotation);Object.assign(fog.userData,{interactId:'bathSteamMirror',label:'욕실 거울 · 비누 자국'});fog.renderOrder=3;scene.add(fog);
 const indicator=new T.Mesh(new T.PlaneGeometry(.19,.065),new T.MeshBasicMaterial({map:canvasTexture((a,w,h)=>{a.fillStyle='#c9ba97';a.fillRect(0,0,w,h);a.font='bold 56px serif';a.textAlign='center';a.textBaseline='middle';a.fillStyle='#173f53';a.fillText('C',w*.22,h*.52);a.fillStyle='#782e26';a.fillText('H',w*.78,h*.52);a.strokeStyle='#77694f';a.beginPath();a.moveTo(w*.46,h*.6);a.lineTo(w*.54,h*.4);a.stroke();},256,96)}));
 indicator.position.set(7.825,.965,.245);indicator.rotation.order='YXZ';indicator.rotation.y=-Math.PI/2;indicator.rotation.x=-1.10;Object.assign(indicator.userData,{interactId:'basinHeat',label:'수전 온도 · C 냉수 / H 온수'});scene.add(indicator);
 const back=new T.Mesh(new T.BoxGeometry(.197,.072,.010),new T.MeshStandardMaterial({color:'#7d755f',roughness:.44,metalness:.5}));
 indicator.add(back);back.position.z=-.006;
 const foot=new T.Mesh(new T.BoxGeometry(.043,.019,.145),back.material);foot.position.set(7.831,.951,.245);scene.add(foot);
 const wispMap=canvasTexture((a,w,h)=>{
  const g=a.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
  g.addColorStop(0,'#eef4ed99');g.addColorStop(.45,'#eef4ed60');g.addColorStop(1,'#eef4ed00');
  a.fillStyle=g;a.fillRect(0,0,w,h);
 },64);
 const wisps=Array.from({length:7},()=>{
  const sprite=new T.Sprite(new T.SpriteMaterial({map:wispMap,transparent:true,depthWrite:false,opacity:0}));
  sprite.raycast=()=>{};sprite.renderOrder=4;scene.add(sprite);return sprite;
 });
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 let time=0,warmth=0;
 return {fog,update(dt){
  time+=dt;warmth+=((state.faucetHot&&state.faucetOn?1:0)-warmth)*(1-Math.exp(-dt*.95));
  wisps.forEach((w,i)=>{
   const p=(time*.46+i/7)%1;w.visible=!reduced&&warmth>.015;
   w.position.set(7.78+.044*Math.sin(i*7+p*4)-.07*p,.89+p*.54,-.2+.065*Math.sin(i*8+p*5));
   w.scale.set(.08+p*.18,.075+p*.16,1);
   w.material.opacity=.17*warmth*Math.sin(Math.PI*p);
  });
  fog.visible=state.bathSteam>.025;fog.material.opacity=Math.min(.86,state.bathSteam*.86);indicator.userData.label=state.faucetHot?'수전 온도 H · 냉수로 돌리기':'수전 온도 C · 온수로 돌리기';}};
}
