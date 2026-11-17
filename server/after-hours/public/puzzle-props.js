import {STOCK,rotatedEdges,TRAY_BORDER} from './puzzle-evidence.js?v=20261117-puzzles2';

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
 for(const [i,j]of STOCK.entries()){
  const g=interactive(group(6.00+i*.23,.975,5.22),'stockJar'+i,j.name+' 통 · 바닥 각인');
  const tin=new T.MeshStandardMaterial({color:j.color,roughness:.4,metalness:.45});cyl(.075,.075,.20,0,.11,0,tin,g,48);cyl(.077,.077,.018,0,.218,0,steel,g,48);cyl(.079,.079,.014,0,.012,0,steel,g,48);const l=sign(j.name,.09,.055,0,0,0);g.add(l);l.position.set(0,.12,.076);topLabel(g,j.name,.10,.07,.229);
 }
 const scale=interactive(group(4.99,.97,5.22),'kitchenScale','주방 저울');rb(.28,.06,.31,0,.03,0,cream,scale,.018);cyl(.145,.145,.018,0,.105,-.02,steel,scale,48);cyl(.06,.06,.04,0,.075,-.02,steel,scale);const display=topLabel(scale,'0 g',.11,.045,.063);display.position.z=.105;
 const paper=interactive(group(5.42,1.50,4.76),'stockSheet','야간 근무 수첩 · 재고 기록');box(.31,.40,.009,0,0,0,cream,paper);const face=sign('야간 근무\n11월 16일',.29,.38,0,0,0,0,'#344938','#dfd4b9');paper.add(face);face.position.z=.006;
 // A useful writing tool and the story that explains what was erased.
 const desk=interactive(group(9.35,.801,19.93),'pencil317','317호 메모와 연필');box(.23,.004,.17,0,0,0,cream,desk);topLabel(desk,'지워진 기록',.22,.16,.004);const pencil=group(.15,.008,0,desk);rod([0,0,-.09],[0,0,.065],.0045,m.wood,pencil);const point=mesh(new T.ConeGeometry(.0045,.025,8),dark,pencil);point.rotation.x=-Math.PI/2;point.position.z=.0775;
 return{update(dt){const alpha=Math.min(1,dt*5);drawer.position.z+=((s.traySolved?.20:.015)-drawer.position.z)*alpha;k.visible=s.traySolved&&!s.kitchenKeyTaken;tiles.forEach((t,i)=>{t.visible=i!==3||s.inlayInstalled;t.material.map=tileMaps[i][s.trayTurns[i]];});pencil.visible=!s.pencilTaken;}};
}
