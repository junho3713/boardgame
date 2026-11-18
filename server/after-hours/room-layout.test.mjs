import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canWalk,zoneAt,floorHeight} from './public/room-layout.js';
import {createState,addItem,useItem,phase} from './public/room-state.js';
function reachable(s,from,to){
 const queue=[from],seen=new Set([from.join(',')]);
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];if(Math.abs(x-to[0])<=1&&Math.abs(z-to[1])<=1)return true;
  for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=nx+','+nz;if(!seen.has(key)&&canWalk(s,nx/10,nz/10)){seen.add(key);queue.push([nx,nz]);}}
 }return false;
}
test('locked internal doors prevent bypasses and progressively reveal each space',()=>{
 const s=createState(),spawn=[0,27];for(const target of [[0,75],[65,75],[58,-15],[-65,70],[21,120]])assert.equal(reachable(s,spawn,target),false);
 s.bathDoorOpen=true;assert.ok(reachable(s,spawn,[58,-15]));assert.equal(reachable(s,spawn,[0,75]),false);
 s.bedroomOpen=true;assert.ok(reachable(s,spawn,[0,75]));assert.equal(reachable(s,spawn,[65,75]),false);assert.equal(reachable(s,spawn,[-65,70]),false);
 s.kitchenOpen=true;assert.ok(reachable(s,spawn,[65,75]));assert.equal(reachable(s,spawn,[-65,70]),false);
 s.twinOpen=true;assert.ok(reachable(s,spawn,[-65,70]));assert.equal(reachable(s,spawn,[21,120]),false);
});
test('316 opens into a hotel corridor while 317 retains an independent locked entrance',()=>{
 const s=createState();s.bedroomOpen=true;s.doorOpen=true;assert.equal(reachable(s,[0,27],[21,120]),true);assert.equal(reachable(s,[21,120],[65,170]),false);
 addItem(s,'passKey');assert.equal(useItem(s,'passKey','entry317'),true);assert.equal(reachable(s,[21,120],[65,170]),true);assert.equal(s.inventory.includes('passKey'),false);
 assert.equal(reachable(s,[65,170],[56,230]),false);s.exitOpen=true;assert.equal(reachable(s,[65,170],[56,230]),true);
});
test('walls, door jambs, furniture and the outer building boundary cannot be crossed',()=>{
 const s=createState(true);for(const p of [[3.6,2],[3.6,6],[0,4.5],[0,10.5],[6,13.5],[8.3,-2],[-3.6,2],[8.2,-2],[10.3,16]])assert.equal(canWalk(s,...p),false,p.join(','));
 for(const p of [[2.12,4.5],[3.6,7.65],[3.6,-.3],[2.12,10.5],[5.12,13.5]])assert.equal(canWalk(s,...p),true,p.join(','));
 assert.equal(canWalk(s,0,7.5,[{x:0,z:7.5,w:1,d:1}]),false);assert.equal(canWalk(s,.6,7.5,[{x:0,z:7.5,w:1,d:1}]),false);
});
test('HUD zones distinguish the suite rooms from the corridor and 317',()=>{
 for(const [p,zone]of[[[-6.5,7],'twin'],[[0,0],'bedroom'],[[0,7.5],'living'],[[6.5,7.5],'kitchen'],[[5.8,-1.5],'bath'],[[2.1,12],'hall'],[[6.5,17],'room317'],[[5.6,23],'exitHall']])assert.equal(zoneAt(...p),zone);
 assert.equal(zoneAt(-10,0),null);
});
test('rotated furniture and hinged door leaves use their rotated collision footprint',()=>{
 const s=createState();const leaf={x:5.7,z:-1,w:1.2,d:.05,yaw:Math.PI/2};assert.equal(canWalk(s,5.7,-1.45,[leaf]),false);assert.equal(canWalk(s,6.15,-1,[leaf]),true);
});
test('corridor hints require finding and using the separate guest-room key',()=>{
 const s=createState();s.doorOpen=true;assert.equal(phase(s),'exit');s.suiteEscaped=true;assert.equal(phase(s),'neighborKey');addItem(s,'passKey');assert.equal(phase(s),'enter317');
 assert.equal(useItem(s,'passKey','exit317'),false);assert.equal(useItem(s,'passKey','entry317'),true);assert.equal(phase(s),'enter317');s.room317Entered=true;assert.equal(phase(s),'galley317');
});


test('317 has four walkable rooms and each side door only opens its own wall',()=>{
 const s=createState();s.room317Open=true;
 const lounge=[52,145],kitchen=[12,163],bath=[125,177],bedroom=[65,221];
 assert.equal(zoneAt(1.2,16.3),'kitchen317');assert.equal(zoneAt(12.5,17.7),'bath317');
 for(const target of [kitchen,bath,bedroom])assert.equal(reachable(s,lounge,target),false);
 s.kitchen317Open=true;assert.ok(reachable(s,lounge,kitchen));assert.equal(reachable(s,kitchen,bath),false);
 s.bath317Open=true;assert.ok(reachable(s,kitchen,bath));assert.equal(reachable(s,bath,bedroom),false);
 s.exitOpen=true;assert.ok(reachable(s,bath,bedroom));
 for(const [x,z] of [[3.6,17.7],[10.2,15.5],[12.0,13.5],[1.2,13.5]])assert.equal(canWalk(s,x,z),false);
});

test('the stair route requires the corridor key and cannot be reached through 317',()=>{
 const s=createState(true);s.stairsOpen=false;
 assert.equal(reachable(s,[56,230],[-115,120]),false);
 assert.equal(canWalk(s,-3.6,12),false);s.stairsOpen=true;
 assert.ok(reachable(s,[56,230],[-115,120]));assert.ok(reachable(s,[-115,120],[56,230]));
 assert.equal(zoneAt(-7,12),'stairs');assert.equal(zoneAt(-12,12),'lowerHall');
 let last=0;for(let i=0;i<=60;i++){const y=floorHeight(-4.4-i*.1,12);assert.ok(y<=last+1e-9);assert.ok(last-y<=.181);last=y;}
 assert.equal(last,-3.24);assert.equal(floorHeight(5.6,23),0);assert.equal(floorHeight(-12,15),-3.24);
});
