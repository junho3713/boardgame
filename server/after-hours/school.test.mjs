import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from './public/GLTFLoader.js';
import * as T from './public/three.module.js';
import {buildSchool} from './public/school/school-scene.js';
import {fresh,act,glassCode,holes,PORTALS,walkable,where,keyExposed,advancePlumbing} from './public/school/school-state.js';

test('original classroom and broadcast puzzles open three successive gates',()=>{
  const s=fresh();
  for(const id of ['film','mount','roomKey','classDoor','boothDoor','load','exitKey','exitDoor','leave'])assert.equal(act(s,id),false,id);
  assert.ok(act(s,'board'));assert.ok(act(s,'board'));assert.equal(act(s,'film'),false);
  for(const id of ['board','film','mount','light','flip','turn'])assert.ok(act(s,id),id);
  assert.equal(act(s,'film'),false);
  assert.equal(new Set(holes(s.turn,s.back).map(p=>p[1])).size,3);
  assert.equal(glassCode(),'798');
  assert.equal(act(s,'drawer','789'),false);assert.ok(act(s,'drawer',glassCode()));assert.equal(s.roomKey,false);
  for(const id of ['roomKey','classDoor','washDoor','stall2','lid','supply','flush2'])assert.ok(act(s,id),id);
  assert.equal(act(s,'tray'),false);assert.equal(act(s,'lostKey'),false);
  advancePlumbing(s,2);
  for(const id of ['lostKey','boothDoor','tray','tape','load'])assert.ok(act(s,id),id);
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
test('water fixtures have independent taps, drains, shutoff and reversible refill',()=>{
  const s=fresh();act(s,'tap1');act(s,'plug1');advancePlumbing(s,9);
  assert.ok(s.basins[0].basinVolume>.5);assert.equal(s.basins[1].basinVolume,0);
  act(s,'tap1');act(s,'plug1');advancePlumbing(s,9);assert.equal(s.basins[0].basinVolume,0);
  act(s,'lid');act(s,'flush2');advancePlumbing(s,12);assert.equal(s.tanks[1],1);assert.equal(keyExposed(s),false);
  act(s,'supply');act(s,'flush2');advancePlumbing(s,3);assert.equal(s.tanks[1],0);assert.ok(keyExposed(s));
  act(s,'lid');assert.equal(keyExposed(s),false);act(s,'lid');act(s,'supply');advancePlumbing(s,3);
  assert.ok(s.tanks[1]>.4);assert.equal(keyExposed(s),false);
});
test('all required 3D items can be seen and picked from physically reachable positions',async()=>{
  // Textures are painted by the browser. Geometry, blockers and raycasts use the shipping Three.js objects.
  const previous=globalThis.document;
  const gradient=()=>({addColorStop(){}});
  const ctx=new Proxy({createRadialGradient:gradient,createLinearGradient:gradient}, {get:(target,k)=>target[k]??(()=>{})});
  globalThis.document={createElement:()=>({getContext:()=>ctx})};
  try {
    const bytes=await readFile(new URL('./public/school/washroom.glb',import.meta.url));
    const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
    assert.match(asset.asset.generator,/Blender/);
    asset.scene.updateMatrixWorld(true);
    for(const [i,x] of [[1,1.12],[2,2.82]]){
      const pan=asset.scene.getObjectByName('Pan'+i),tank=asset.scene.getObjectByName('Tank'+i);
      const foot=new T.Box3().setFromObject(tank).min.y;
      for(const dx of [-.08,.08]){
        const down=new T.Raycaster(new T.Vector3(x+dx,.55,.21),new T.Vector3(0,-1,0));
        const deck=down.intersectObject(pan,true)[0];
        assert.ok(deck&&Math.abs(foot-deck.point.y)<.003,'cistern sits on the rear deck');
      }
      const down=new T.Raycaster(new T.Vector3(x,.50,.492),new T.Vector3(0,-1,0));
      assert.ok(down.intersectObject(pan,true)[0].point.y<.19,'open well between the seat and trap');
    }
    const s=fresh(),lvl=buildSchool({capabilities:{getMaxAnisotropy:()=>1}},s,asset.scene),cam=new T.PerspectiveCamera();
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
      cam.position.copy(origin);
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
    assert.equal(reach(-9,5.4),false);
    use('washDoor',-6.5,5.5,[-7.6,1.36,5.5]);
    use('washLog',-9,2.35,[-8.97,1.65,.90],null);
    use('tap1',-12.60,4.57,[-13.582,.999,4.585]);
    use('plug1',-12.65,4.81,[-13.36,.804,4.69]);
    use('stall2',-10.78,4.67,[-10.99,1.26,2.95]);
    use('cover2',-10.72,2.37,[-10.98,.46,1.41]);
    use('cover2',-10.72,2.37,[-10.98,.65,1.16]);
    use('supply',-10.49,1.52,[-10.661,.382,.996]);
    use('flush2',-10.54,1.96,[-10.761,.650,1.067]);
    use('lid',-10.50,1.63,[-10.99,.748,1.005]);
    advancePlumbing(s,2);
    use('lostKey',-10.55,1.15,[-10.926,.432,1.019]);
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
