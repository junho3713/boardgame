// 317's last room, corridor service fixtures, and a walkable two-storey stairwell.
export function buildHotelExtension({T,scene,state,helpers:h,materials:m,partitionDoor}){
 const {box,rb,rod,cyl,mesh,group,sign,interactive}=h;
 const concrete=new T.MeshStandardMaterial({color:'#898b82',roughness:.96});
 const steel=new T.MeshStandardMaterial({color:'#66756e',roughness:.47,metalness:.5});
 const dark=new T.MeshStandardMaterial({color:'#242e2a',roughness:.67});
 const safety=new T.MeshStandardMaterial({color:'#c3b56d',roughness:.8});
 // A furnished last room beyond the locked INNER door, with a physical clue and key.
 box(6.6,.16,3.9,6.9,-.08,22.65,m.floorMat);box(6.6,.12,3.9,6.9,3.24,22.65,m.ivory);
 for(const x of[3.58,10.28])box(.16,3.2,3.9,x,1.6,22.65,m.wallpaper);
 box(6.7,3.2,.16,6.9,1.6,24.68,m.wallpaper);
 for(const x of[3.69,10.17])box(.08,.75,3.9,x,.375,22.65,m.darkwood);
 box(6.5,.75,.08,6.9,.375,24.56,m.darkwood);
 rb(1.7,.08,.68,7.5,.78,24.03,m.wood);for(const x of[6.78,8.22])for(const z of[23.8,24.25])box(.06,.74,.06,x,.37,z,m.darkwood);
 // Furniture footprints are kept away from the approach and return path.
 const tableSolid={x:7.5,z:24.03,w:1.7,d:.68};
 // The extension receives shared solids through its caller, avoiding invisible blockers.
 const notice=interactive(group(7.5,.832,23.94),'evacuationPlan','테이블 위 접힌 대피 안내');
 const sheet=box(.35,.008,.27,0,0,0,m.paper,notice);
 const print=sign('대피 안내\n317 → STAIRS',.33,.25,0,0,0);notice.add(print);print.position.set(0,.006,0);print.rotation.set(-Math.PI/2,0,Math.PI);
 const key=interactive(group(7.5,.834,23.94),'stairKey','열쇠함 안 3층 계단문 열쇠');
 const ring=mesh(new T.TorusGeometry(.032,.007,10,32),m.brass,key);ring.rotation.x=Math.PI/2;
 rod([0,0,.028],[0,0,.12],.007,m.brass,key);box(.028,.012,.015,.01,0,.096,m.brass,key);
 const tag=sign('3F STAIRS',.15,.07,0,0,0);key.add(tag);tag.rotation.set(-Math.PI/2,0,Math.PI);tag.position.set(.10,.002,.025);
 const emergency=interactive(group(7.05,.83,23.94),'evacuationBox','계단 열쇠함 · 방향 잠금');
 box(.44,.018,.32,0,.009,0,m.darkwood,emergency);for(const x of[-.21,.21])box(.02,.16,.32,x,.08,0,m.wood,emergency);for(const z of[-.15,.15])box(.44,.16,.02,0,.08,z,m.wood,emergency);
 const emergencyLid=group(0,.16,-.16,emergency);rb(.46,.028,.34,0,0,.16,m.wood,emergencyLid);for(const x of[-.12,0,.12])box(.06,.012,.06,x,.02,.16,m.brass,emergencyLid);
 emergency.add(key);key.position.set(0,.03,0);notice.position.x=7.75;
 const cabinet=group(4.4,0,23.9);rb(1.1,1.1,.62,0,.55,0,m.darkwood,cabinet);for(const y of[.3,.8]){rb(.98,.45,.04,0,y,-.33,m.wood,cabinet);rod([-.10,y,-.36],[.10,y,-.36],.012,m.brass,cabinet);}
 sign('대피 안내 · 3층',.75,.2,7.5,1.5,24.56,Math.PI);
 const roomLight=new T.PointLight('#efdbaf',13,7,1.8);roomLight.position.set(7.0,2.7,22.7);scene.add(roomLight);
 cyl(.23,.27,.09,7,3.03,22.7,m.brass);box(.32,.035,.32,7,2.96,22.7,m.ivory);
 // The elevator is visibly out of service, with a readable and actionable notice.
 const lift=interactive(group(10.14,0,12),'elevator','엘리베이터 · 고장 / 운행 중지');lift.rotation.y=-Math.PI/2;
 rb(1.9,2.7,.08,0,1.35,0,dark,lift);for(const x of[-.43,.43])box(.85,2.48,.04,x,1.24,.06,steel,lift);
 box(.025,2.45,.02,0,1.23,.089,dark,lift);for(const y of[.75,1.4]){const strip=box(1.75,.08,.025,0,y,.11,safety,lift);strip.rotation.z=.22;}
 const liftNotice=sign('운행 중지\n제어부 고장 · 계단 이용',1.05,.43,0,0,0);lift.add(liftNotice);liftNotice.position.set(0,1.65,.13);
 const liftReadout=sign('—',.32,.15,0,0,0);lift.add(liftReadout);liftReadout.position.set(0,2.48,.1);
 interactive(sign('← 계단 · STAIRS',1.0,.2,1.0,2.5,13.36,Math.PI),'elevator','비상계단 안내');
 // Corridor west wall opening and steel fire door.
 const stairDoor=partitionDoor(-3.6,12.75,1.5,Math.PI/2,'stairsOpen','stairDoor','3층 계단문');
 stairDoor.children.slice(0,3).forEach((o,i)=>o.material=i?dark:steel);
 for(const z of[11.19,12.81])box(.20,2.76,.10,-3.6,1.38,z,steel);box(.20,.1,1.72,-3.6,2.78,12,steel);
 interactive(sign('3F STAIRS\n계단 · 2층으로',.7,.32,-3.49,2.2,12,Math.PI/2),'stairDoor','3층 계단문 · 열쇠 구멍');
 box(1,.16,3,-4.1,-.08,12,concrete);box(6.6,.12,3,-6.9,3.24,12,concrete);
 // 18 risers: 180 mm high, 300 mm deep; camera floor height uses the same dimensions.
 for(let i=1;i<=18;i++){const x=-4.6-(i-.5)*.3,y=-i*.18;box(.3,.18,3,x,y-.09,12,concrete);for(const z of[10.8,13.2])box(.025,.006,.12,x+.13,y+.004,z,safety);}
 box(.2,.16,3,-10.1,-3.32,12,concrete);
 box(.16,3.24,3,-10.28,1.62,12,concrete);
 for(const z of[10.42,13.58])box(6.6,6.44,.16,-6.9,.02,z,concrete);
 for(const z of[10.68,13.32]){rod([-4.05,.93,z],[-4.6,.93,z],.035,steel);rod([-4.6,.93,z],[-10,-2.31,z],.035,steel);rod([-10,-2.31,z],[-10.6,-2.31,z],.035,steel);for(let i=0;i<=6;i++){const x=-4.6-i*.9,y=-i*.54;rod([x,y,z],[x,y+.9,z],.024,steel);}}
 // Lower landing has usable floor space and retains access back upstairs.
 box(4,.16,5.5,-12.2,-3.32,13.25,concrete);box(4,.12,5.5,-12.2,.03,13.25,concrete);
 box(.16,3.24,5.5,-14.28,-1.62,13.25,concrete);box(4.16,3.24,.16,-12.2,-1.62,16.08,concrete);box(4.16,3.24,.16,-12.2,-1.62,10.42,concrete);box(.16,3.24,2.5,-10.12,-1.62,14.75,concrete);
 sign('2F\n계단 로비',.9,.55,-14.18,-1.55,12,Math.PI/2);sign('3F ↑',.55,.23,-7.2,.10,13.48,Math.PI);
 const diffuser=new T.MeshStandardMaterial({color:'#d8e3d9',emissive:'#a7c7b4',emissiveIntensity:.5});
 for(const [x,y,z]of[[-4.3,2.4,13.47],[-7.1,.6,13.47],[-10,-1.1,13.47],[-12.6,-.6,15.95]]){const light=new T.PointLight('#c7ddce',7,5,1.7);light.position.set(x,y,z-.18);scene.add(light);box(.46,.20,.09,x,y,z,steel);box(.40,.13,.025,x,y,z-.06,diffuser);}
 return{solids:[tableSolid,{x:4.4,z:23.9,w:1.1,d:.62}],update(){key.visible=state.evacuationBoxOpen&&!state.stairKeyTaken;emergencyLid.rotation.x=state.evacuationBoxOpen?-1.8:0;}};
}
