import {STOCK,WEIGHABLES,rotatedEdges,TRAY_BORDER,LINEN_TAGS} from './puzzle-evidence.js?v=20261117-bath3';

export function buildPuzzleProps({T,state:s,helpers:h,materials:m,canvasTexture}){
 const {box,rb,cyl,group,mesh,rod,sign,interactive}=h;
 const cream=new T.MeshStandardMaterial({color:'#ded3b9',roughness:.87});
 const steel=new T.MeshStandardMaterial({color:'#aeb8b1',roughness:.34,metalness:.75});
 const dark=new T.MeshStandardMaterial({color:'#293d33',roughness:.8});
 function topLabel(g,text,w,d,y){const face=sign(text,w,d,0,0,0,0,'#354738','#d8ceb1');g.add(face);face.rotation.x=-Math.PI/2;face.position.set(0,y,0);return face;}
 function stamp(a,n,x,y,size=10){a.save();a.translate(x,y);a.strokeStyle='#e2c99a';a.lineWidth=2;a.beginPath();if(n===1)a.arc(0,0,size*.6,0,Math.PI*2);if(n===2)a.rect(-size*.6,-size*.6,size*1.2,size*1.2);if(n===3)for(const x of[-size*.6,0,size*.6]){a.moveTo(x,-size*.6);a.lineTo(x,size*.6);}if(n===4){a.moveTo(0,-size*.7);a.lineTo(size*.7,size*.6);a.lineTo(-size*.7,size*.6);a.closePath();}a.stroke();a.restore();}
 const tileMaps=Array.from({length:4},(_,i)=>Array.from({length:4},(_,turn)=>canvasTexture((a,w,H)=>{a.fillStyle='#705438';a.fillRect(0,0,w,H);a.strokeStyle='#bfa171';a.lineWidth=2;a.beginPath();a.moveTo(w/2,20);a.quadraticCurveTo(35,35,20,H/2);a.quadraticCurveTo(35,H-35,w/2,H-20);a.quadraticCurveTo(w-35,H-35,w-20,H/2);a.quadraticCurveTo(w-35,35,w/2,20);a.stroke();rotatedEdges(i,turn).forEach((n,j)=>stamp(a,n,...[[w/2,12],[w-12,H/2],[w/2,H-12],[12,H/2]][j]));},128)));
 const tray=interactive(group(-1.80,.548,6.85),'teaTray','찻상 · 한 조각이 빠진 상감판');
 rb(.57,.08,.57,0,.04,0,m.darkwood,tray,.012);const tiles=[];
 for(let i=0;i<4;i++){const x=i%2===0?-.116:.116,z=i<2?-.116:.116;rb(.224,.015,.224,x,.09,z,m.wood,tray,.004);const t=mesh(new T.PlaneGeometry(.218,.218),new T.MeshStandardMaterial({map:tileMaps[i][0],roughness:.7}),tray);t.rotation.x=-Math.PI/2;t.position.set(x,.1,z);tiles.push(t);}
 const borderMap=canvasTexture((a,w,H)=>{a.clearRect(0,0,w,H);for(const [i,sides]of Object.entries(TRAY_BORDER)){const x=Number(i)%2===0?w*.30:w*.70,y=Number(i)<2?H*.30:H*.70;for(const [side,n]of Object.entries(sides)){const p=Number(side);stamp(a,n,p===3?14:p===1?w-14:x,p===0?14:p===2?H-14:y,8);}}},256);
 const border=mesh(new T.PlaneGeometry(.56,.56),new T.MeshStandardMaterial({map:borderMap,transparent:true,roughness:.8}),tray);border.rotation.x=-Math.PI/2;border.position.y=.101;
 const drawer=group(0,.032,.015,tray);box(.48,.012,.40,0,0,0,m.wood,drawer);rb(.5,.047,.02,0,.012,.205,m.wood,drawer,.005);rod([-.045,.012,.226],[.045,.012,.226],.007,m.brass,drawer);
 const k=group(.02,.013,.06,drawer);const ring=mesh(new T.TorusGeometry(.023,.004,8,20),m.brass,k);ring.rotation.x=-Math.PI/2;rod([0,0,.02],[0,0,.09],.005,m.brass,k);box(.025,.008,.01,.01,0,.075,m.brass,k);
 // The old oversized measuring vessels are replaced with ordinary pantry tins.
 const stockJars=[];
 for(const [i,j]of WEIGHABLES.entries()){
  const g=interactive(group(5.99+i*.22,.975,5.22),'stockJar'+i,j.name+' 통 · 집기 / 안쪽 조사');stockJars.push(g);
  const tin=new T.MeshStandardMaterial({color:j.color,roughness:.4,metalness:.45});cyl(.075,.075,.20,0,.11,0,tin,g,48);cyl(.077,.077,.018,0,.218,0,steel,g,48);cyl(.079,.079,.014,0,.012,0,steel,g,48);const l=sign(j.name,.09,.055,0,0,0);g.add(l);l.position.set(0,.12,.076);topLabel(g,j.name,.10,.07,.229);
 }
 const scale=interactive(group(4.99,.97,5.22),'kitchenScale','주방 저울');rb(.28,.06,.31,0,.03,0,cream,scale,.018);cyl(.145,.145,.018,0,.105,-.02,steel,scale,48);cyl(.06,.06,.04,0,.075,-.02,steel,scale);const display=topLabel(scale,'0 g',.11,.045,.063);display.position.z=.105;const weightMaps=[0,...WEIGHABLES.map(j=>j.gross)].map(weight=>canvasTexture((a,w,H)=>{a.fillStyle='#d8ceb1';a.fillRect(0,0,w,H);a.fillStyle='#23352b';a.font='bold 46px monospace';a.textAlign='center';a.textBaseline='middle';a.fillText(weight+' g',w/2,H/2);},256,96));
 const paper=interactive(group(5.42,1.50,4.76),'stockSheet','야간 근무 수첩 · 재고 기록');box(.31,.40,.009,0,0,0,cream,paper);const face=sign('야간 근무\n11월 16일',.29,.38,0,0,0,0,'#344938','#dfd4b9');paper.add(face);face.position.z=.006;
 // A useful writing tool and the story that explains what was erased.
 const desk=interactive(group(9.35,.801,19.93),'pencil317','317호 메모와 연필');box(.23,.004,.17,0,0,0,cream,desk);topLabel(desk,'지워진 기록',.22,.16,.004);const pencil=group(.15,.008,0,desk);rod([0,0,-.09],[0,0,.065],.0045,m.wood,pencil);const point=mesh(new T.ConeGeometry(.0045,.025,8),dark,pencil);point.rotation.x=-Math.PI/2;point.position.z=.0775;
 // Separate laundry evidence in three physically different places in the bathroom.
 const tagLocations=[[6.38,1.02,1.335,Math.PI,false],[7.50,.950,-.75,0,true],[3.81,1.43,.80,Math.PI/2,false]];
 LINEN_TAGS.forEach((tag,i)=>{const [x,y,z,rotation,flat]=tagLocations[i];const g=interactive(group(x,y,z),'linenTag'+i,'말려 둔 세탁 의뢰표 · '+tag.name);g.rotation.y=rotation;if(flat)g.rotation.x=-Math.PI/2;box(.13,.19,.003,0,0,0,cream,g);const face=sign(tag.name,.12,.17,0,0,0,0,'#344938','#dfd4b9');g.add(face);face.position.z=.002;const clip=rb(.025,.04,.008,0,.095,.004,steel,g,.003);});
 const pad=interactive(group(7.402,.67,-.2),'linenCabinet','린넨장 · 접수 순서 자물쇠');pad.rotation.y=-Math.PI/2;rb(.25,.10,.025,0,0,0,m.brass,pad,.006);const padLabel=sign('접수 순서',.23,.075,0,0,0,0,'#e3d6bc','#334039');pad.add(padLabel);padLabel.position.z=.014;
 const linenReward=interactive(group(7.64,.426,-.63),'linenReward','린넨장 안의 꽃무늬 열쇠');box(.20,.004,.17,0,0,0,cream,linenReward);topLabel(linenReward,'차 상자',.18,.15,.003);const keyRing=mesh(new T.TorusGeometry(.023,.005,8,20),m.brass,linenReward);keyRing.rotation.x=-Math.PI/2;keyRing.position.set(0,.009,0);rod([0,.009,.02],[0,.009,.09],.005,m.brass,linenReward);box(.024,.008,.009,.008,.009,.075,m.brass,linenReward);
 return{update(dt){stockJars.forEach((g,i)=>{g.visible=!s.inventory.includes('stock_'+WEIGHABLES[i].id);g.position.set(s.stockOnScale===i?4.99:5.99+i*.22,s.stockOnScale===i?1.08:.975,s.stockOnScale===i?5.20:5.22);});display.material.map=weightMaps[s.stockOnScale+1]||weightMaps[0];scale.userData.label='주방 저울 · '+(WEIGHABLES[s.stockOnScale]?.gross||0)+' g';pad.visible=!s.linenCabinetOpen;linenReward.visible=s.linenCabinetOpen&&!s.tinKeyTaken;const alpha=Math.min(1,dt*5);drawer.position.z+=((s.traySolved?.20:.015)-drawer.position.z)*alpha;k.visible=s.traySolved&&!s.kitchenKeyTaken;tiles.forEach((t,i)=>{t.visible=i!==3||s.inlayInstalled;t.material.map=tileMaps[i][s.trayTurns[i]];});pencil.visible=!s.pencilTaken;}};
}
