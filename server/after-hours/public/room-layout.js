// Walkable interiors and door channels share one layout with the scene and tests.
export const ZONES={
 bedroom:{x0:-3.6,x1:3.6,z0:-4.5,z1:4.5,label:'316호 · 침실'},
 twin:{x0:-9.2,x1:-3.6,z0:4.5,z1:10.5,label:'316호 · 트윈 침실'},
 living:{x0:-3.6,x1:3.6,z0:4.5,z1:10.5,label:'316호 · 거실'},
 kitchen:{x0:3.6,x1:9.6,z0:4.5,z1:10.5,label:'316호 · 간이주방'},
 bath:{x0:3.6,x1:8.2,z0:-4.5,z1:1.5,label:'316호 · 욕실'},
 hall:{x0:-3.6,x1:10.2,z0:10.5,z1:13.5,label:'3층 · 호텔 복도',gate:'doorOpen'},
 room317:{x0:3.6,x1:10.2,z0:13.5,z1:20.7,label:'317호 · 거실',gate:'room317Open'},
 kitchen317:{x0:-1.2,x1:3.6,z0:13.5,z1:18.7,label:'317호 · 주방',gate:'kitchen317Open'},
 bath317:{x0:10.2,x1:14.8,z0:13.5,z1:19.5,label:'317호 · 욕실',gate:'bath317Open'},
 exitHall:{x0:3.6,x1:12.1,z0:20.7,z1:24.6,label:'317호 · 침실',gate:'exitOpen'},
 stairs:{x0:-10.2,x1:-3.6,z0:10.5,z1:13.5,label:'비상계단 · 3층 → 2층',gate:'stairsOpen'},
 lowerHall:{x0:-14.2,x1:-10.2,z0:10.5,z1:16,label:'2층 · 계단 로비',gate:'stairsOpen'},
};
export const PASSAGES=[
 {axis:'x',at:-3.6,low:11.25,high:12.75,gate:'stairsOpen'},
 {axis:'x',at:-10.2,low:10.5,high:13.5,gate:'stairsOpen'},
 {axis:'x',at:-3.6,low:6.3,high:7.7,gate:'twinOpen'},
 {axis:'z',at:4.5,low:1.46,high:2.78,gate:'bedroomOpen'},
 {axis:'x',at:3.6,low:6.9,high:8.4,gate:'kitchenOpen'},
 {axis:'x',at:3.6,low:-1,high:.4,gate:'bathDoorOpen'},
 {axis:'z',at:10.5,low:1.46,high:2.78,gate:'doorOpen'},
 {axis:'z',at:13.5,low:4.46,high:5.78,gate:'room317Open'},
 {axis:'x',at:3.6,low:14.75,high:16.05,gate:'kitchen317Open'},
 {axis:'x',at:10.2,low:17,high:18.4,gate:'bath317Open'},
 {axis:'z',at:20.7,low:5,high:6.3,gate:'exitOpen'},
];
export function zoneAt(x,z){for(const [id,b]of Object.entries(ZONES))if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1)return id;return null;}
export function canWalk(s,x,z,solids=[]){
 const r=.22;
 const inside=Object.values(ZONES).some(b=>(!b.gate||s[b.gate])&&x>b.x0+r&&x<b.x1-r&&z>b.z0+r&&z<b.z1-r);
 const passage=PASSAGES.some(p=>{if(p.gate&&!s[p.gate])return false;const along=p.axis==='z'?x:z,across=p.axis==='z'?z:x;return along>p.low+r&&along<p.high-r&&Math.abs(across-p.at)<.4;});
 if(!inside&&!passage)return false;
 return !solids.some(b=>{const c=Math.cos(b.yaw||0),q=Math.sin(b.yaw||0),dx=x-b.x,dz=z-b.z;return Math.abs(dx*c-dz*q)<b.w/2+r&&Math.abs(dx*q+dz*c)<b.d/2+r;});
}

// Eighteen physical 300 mm treads descend a 3.24 m storey.
export function floorHeight(x,z){if(z>=10.5&&z<=16&&x<=-10)return -3.24;if(z>=10.5&&z<=13.5&&x< -4.6)return -Math.min(18,Math.ceil((-4.6-x)/.3))* .18;return 0;}
