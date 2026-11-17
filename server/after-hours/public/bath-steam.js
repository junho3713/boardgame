import * as T from './three.module.js';
import {GARMENT_PATHS} from './puzzle-tricks.js?v=20261117-tricks1';

export function buildBathSteam({scene,state,canvasTexture,mirror}){
 const texture=canvasTexture((a,w,h)=>{
  a.fillStyle='#c4cfc3';a.fillRect(0,0,w,h);
  a.globalCompositeOperation='destination-out';a.lineCap='round';a.lineJoin='round';
  a.font='42px serif';a.textAlign='center';a.fillText('접수',w/2,h*.25);
  GARMENT_PATHS.forEach((path,i)=>{a.save();a.translate(w*(.16+i*.27),h*.37);a.scale(5,5);a.strokeStyle='#000';a.lineWidth=2.6;a.stroke(new Path2D(path));a.restore();});
  for(const x of[.385,.655]){a.lineWidth=8;a.beginPath();a.moveTo(w*x-12,h*.52);a.lineTo(w*x+25,h*.52);a.lineTo(w*x+12,h*.52-12);a.moveTo(w*x+25,h*.52);a.lineTo(w*x+12,h*.52+12);a.stroke();}
  a.globalCompositeOperation='source-over';
 },1024,626);
 const fog=new T.Mesh(new T.PlaneGeometry(1.8,1.1),new T.MeshBasicMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
 fog.name='Condensation revealing soap garment marks';fog.position.copy(mirror.position);fog.position.x-=.006;fog.rotation.copy(mirror.rotation);Object.assign(fog.userData,{interactId:'bathSteamMirror',label:'욕실 거울 · 비누 자국'});fog.renderOrder=3;scene.add(fog);
 const indicator=new T.Mesh(new T.PlaneGeometry(.19,.065),new T.MeshBasicMaterial({map:canvasTexture((a,w,h)=>{a.fillStyle='#dfd5bb';a.fillRect(0,0,w,h);a.font='30px serif';a.textAlign='center';a.textBaseline='middle';a.fillStyle='#355975';a.fillText('C',w*.22,h*.52);a.fillStyle='#994c3d';a.fillText('H',w*.78,h*.52);a.strokeStyle='#77694f';a.beginPath();a.moveTo(w*.46,h*.6);a.lineTo(w*.54,h*.4);a.stroke();},256,96)}));
 indicator.position.set(8.04,1.25,.025);indicator.rotation.y=-Math.PI/2;Object.assign(indicator.userData,{interactId:'basinHeat',label:'수전 온도 · C 냉수 / H 온수'});scene.add(indicator);
 return {fog,update(){fog.visible=state.bathSteam>.025;fog.material.opacity=Math.min(.86,state.bathSteam*.86);indicator.userData.label=state.faucetHot?'수전 온도 H · 냉수로 돌리기':'수전 온도 C · 온수로 돌리기';}};
}
