import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from './public/three.module.js';
import {buildSchool} from './public/school/school-scene.js';
import {fresh,act,glassCode,holes,PORTALS,walkable,where} from './public/school/school-state.js';

test('original classroom and broadcast puzzles open three successive gates',()=>{
  const s=fresh();
  for(const id of ['film','mount','roomKey','classDoor','boothDoor','load','exitKey','exitDoor','leave'])assert.equal(act(s,id),false,id);
  assert.ok(act(s,'board'));assert.ok(act(s,'board'));assert.equal(act(s,'film'),false);
  for(const id of ['board','film','mount','light','flip','turn'])assert.ok(act(s,id),id);
  assert.equal(act(s,'film'),false);
  assert.equal(new Set(holes(s.turn,s.back).map(p=>p[1])).size,3);
  assert.equal(glassCode(),'798');
  assert.equal(act(s,'drawer','789'),false);assert.ok(act(s,'drawer',glassCode()));assert.equal(s.roomKey,false);
  for(const id of ['roomKey','classDoor','boothDoor','tray','tape','load'])assert.ok(act(s,id),id);
  assert.equal(act(s,'air','BAC'),false);assert.ok(act(s,'air','CAB'));assert.equal(s.exitKey,false);
  for(const id of ['exitKey','exitDoor','leave'])assert.ok(act(s,id),id);assert.ok(s.escaped);
});
test('free exploration opens the actual wall apertures and leaves the yard explorable',()=>{
  const free=fresh(true),story=fresh();
  for(const p of PORTALS){
    const m=(p.lo+p.hi)/2,[x,z]=p.axis==='x'?[p.at,m]:[m,p.at];
    assert.ok(walkable(free,x,z,[]));assert.equal(walkable(story,x,z,[]),false);
    assert.equal(walkable(free,p.axis==='x'?p.at:p.lo-.4,p.axis==='x'?p.lo-.4:p.at,[]),false);
  }
  assert.equal(where(-6,9),'yard');assert.equal(act(free,'leave'),false);
});
test('all required 3D items can be seen and picked from physically reachable positions',()=>{
  // Textures are painted by the browser. Geometry, blockers and raycasts use the shipping Three.js objects.
  const previous=globalThis.document;
  const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(target,k)=>target[k]??(()=>{})});
  globalThis.document={createElement:()=>({getContext:()=>ctx})};
  try {
    const s=fresh(),lvl=buildSchool({capabilities:{getMaxAnisotropy:()=>1}},s),cam=new T.PerspectiveCamera();
    const ray=new T.Raycaster();ray.far=2.65;
    let position=[-.75,4.65];
    function sync(){lvl.update(4,0,cam,false);lvl.scene.updateMatrixWorld(true);}
    function reach(x,z){
      const step=.13,start=position, queue=[[0,0]],visited=new Set(['0/0']);
      for(let i=0;i<queue.length;i++){
        const [a,b]=queue[i],px=start[0]+a*step,pz=start[1]+b*step;
        if(Math.hypot(px-x,pz-z)<step&&walkable(s,x,z,lvl.blocks)){position=[x,z];return true;}
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const u=a+dx,v=b+dz,k=u+'/'+v;
          if(visited.has(k))continue;visited.add(k);
          if(walkable(s,start[0]+u*step,start[1]+v*step,lvl.blocks))queue.push([u,v]);
        }
      }
      return false;
    }
    function use(id,x,z,point,action=id,val){
      sync();assert.ok(reach(x,z),'walk to '+id);
      const origin=new T.Vector3(x,1.57,z),toward=new T.Vector3(...point).sub(origin).normalize();
      ray.set(origin,toward);assert.equal(lvl.pick(ray)?.id,id,'pick '+id);
      if(action)assert.ok(act(s,action,val),action);sync();
    }
    sync();assert.equal(reach(-6,-3.45),false);
    use('board',.4,-3.85,[.4,2.1,-5.17]);
    use('film',1.54,-3.90,[1.56,2.04,-5.16]);
    use('light',-3.88,-2.62,[-4.49,1.43,-2.30]);
    use('window',3.83,0,[4.48,1.80,-.02],'mount');
    assert.ok(act(s,'flip'));assert.ok(act(s,'turn'));
    use('drawer',-2.98,-3.15,[-2.98,.84,-3.87],'drawer',glassCode());
    use('roomKey',-2.98,-3.16,[-2.915,.775,-3.654]);
    use('classDoor',-3.88,-3.44,[-4.6,1.35,-3.43]);
    assert.equal(reach(-10,-5),false);
    use('chart',-6.44,.45,[-7.49,1.71,.45],null);
    use('tray',-6.12,4.04,[-5.25,.43,4.0]);
    use('tape',-6.08,4.04,[-5.48,.464,4.04]);
    use('boothDoor',-6.48,-6.01,[-7.6,1.36,-6.01]);
    use('deck',-11.50,-6.05,[-11.5,1.05,-7.0],'load');
    use('patch',-9.88,-6.04,[-9.88,1.05,-6.99],'air','CAB');
    use('exitKey',-11.72,-4.11,[-12.557,1.30,-4.11]);
    assert.equal(reach(-6,8.5),false);
    use('exitDoor',-6.12,6.62,[-6.1,1.31,7.6]);assert.ok(reach(-6.12,8.5));assert.ok(act(s,'leave'));
  }finally{if(previous)globalThis.document=previous;else delete globalThis.document;}
});
