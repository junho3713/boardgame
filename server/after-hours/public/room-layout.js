// Walkable interiors and door channels share one layout with the scene and tests.
export const ZONES={
 bedroom:{x0:-3.6,x1:3.6,z0:-4.5,z1:4.5,label:'316호 · 침실'},
 living:{x0:-3.6,x1:3.6,z0:4.5,z1:10.5,label:'316호 · 거실'},
 kitchen:{x0:3.6,x1:9.6,z0:4.5,z1:10.5,label:'316호 · 간이주방'},
 bath:{x0:3.6,x1:8.2,z0:-4.5,z1:1.5,label:'316호 · 욕실'},
 hall:{x0:-3.6,x1:10.2,z0:10.5,z1:13.5,label:'3층 · 호텔 복도',gate:'doorOpen'},
 room317:{x0:3.6,x1:10.2,z0:13.5,z1:20.7,label:'317호 · 객실',gate:'room317Open'},
 exitHall:{x0:4.81,x1:6.49,z0:20.7,z1:23.65,label:'3층 · 비상구 앞',gate:'exitOpen'},
};
export const PASSAGES=[
 {axis:'z',at:4.5,low:1.46,high:2.78},
 {axis:'x',at:3.6,low:6.9,high:8.4},
 {axis:'x',at:3.6,low:-1,high:.4},
 {axis:'z',at:10.5,low:1.46,high:2.78,gate:'doorOpen'},
 {axis:'z',at:13.5,low:4.46,high:5.78,gate:'room317Open'},
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
