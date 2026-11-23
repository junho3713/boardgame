import * as T from '../three.module.js';
import {PORTALS,ROOMS} from './school-state.js';

// Check whether any point on a reflective surface can be seen through its doorway.
export function canSeeSurface(camera,room,doorOpen,doorIndex,x,zMin,zMax){
  const p=camera.position,r=ROOMS[room],door=PORTALS[doorIndex];
  if(p.x>=r.x0&&p.x<=r.x1&&p.z>=r.z0&&p.z<=r.z1)return true;
  if(!doorOpen||p.x<ROOMS.hall.x0||p.x>ROOMS.hall.x1)return false;
  const t=(door.at-p.x)/(x-p.x);
  if(!(t>=0&&t<=1))return false;
  return T.MathUtils.lerp(p.z,zMax,t)>door.lo-.06&&T.MathUtils.lerp(p.z,zMin,t)<door.hi+.06;
}

export function limitReflection(reflector,updatesPerSecond){
  const draw=reflector.onBeforeRender;
  let mainCamera,time=0,lastDraw=-Infinity,active=false;
  reflector.onBeforeRender=function(renderer,scene,camera){
    // Reflectors can appear in each other's images. Reuse their most recent texture.
    if(camera!==mainCamera||time-lastDraw<1/updatesPerSecond)return;
    draw.call(this,renderer,scene,camera);lastDraw=time;
  };
  return function update(camera,seconds,visible){
    if(visible&&!active)lastDraw=-Infinity;
    mainCamera=camera;time=seconds;active=visible;
    reflector.visible=visible;
  };
}

// Three.js checks every instance of a batch once its aggregate sphere is hit.
export function boundInstanceRaycasts(batch,matrices){
  const geometry=batch.geometry;
  geometry.computeBoundingBox();
  const boxes=matrices.map(matrix=>geometry.boundingBox.clone().applyMatrix4(matrix));
  batch.computeBoundingBox();
  const mesh=new T.Mesh(geometry,batch.material);
  const inverse=new T.Matrix4(),localRay=new T.Ray(),end=new T.Vector3(),segment=new T.Box3(),hits=[];
  batch.raycast=function(caster,results){
    inverse.copy(batch.matrixWorld).invert();
    localRay.copy(caster.ray).applyMatrix4(inverse);
    if(!localRay.intersectsBox(batch.boundingBox))return;
    const limited=Number.isFinite(caster.far);
    if(limited){
      caster.ray.at(caster.far,end).applyMatrix4(inverse);
      segment.set(localRay.origin,localRay.origin).expandByPoint(end);
    }
    for(let i=0;i<boxes.length;i++){
      const bounds=boxes[i];
      if(limited&&!segment.intersectsBox(bounds))continue;
      if(!localRay.intersectsBox(bounds))continue;
      mesh.matrixWorld.multiplyMatrices(batch.matrixWorld,matrices[i]);
      mesh.raycast(caster,hits);
      for(const hit of hits){hit.object=batch;hit.instanceId=i;results.push(hit);}
      hits.length=0;
    }
  };
}
