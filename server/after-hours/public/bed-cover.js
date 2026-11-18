import * as T from './three.module.js';

const materials = new Set(['Oxblood | woven jacquard', 'Oxblood | tailored piping', 'Ivory | seam thread']);
const cotton='Ivory | washed cotton';
export const isBedCover = o => o.isMesh && materials.has(o.material?.name);

// Bed-local +Z points to the foot. Each pose uses the original cloth coordinates
// so the jacquard, piping and cuff gather together and reverse without drift.
const pullPoses = [.32, .68, 1];
const smooth = T.MathUtils.smoothstep;
const bell = value => Math.exp(-value * value);

function pullCloth(point, amount, cuff) {
  const {x, y} = point;
  if (point.z >= 1.34) return; // The material hanging over the foot stays put.
  const nearHand = smooth(x, -.95, .65);
  const grip = bell((x - .64) / .39);
  const pull = amount * (1 - .46 * (1 - nearHand) * (1 - amount));
  // The loose lip rides up against the bound edge before the quilt piles up.
  if (cuff) point.z += pull * (.10 + .044 * grip) * (1 - smooth(point.z, -.76, -.38));
  const z = point.z;
  const loose = 1 - smooth(z, -.60, 1.34);
  const travel = .62 + .22 * nearHand + .12 * grip + .044 * Math.sin(5.3 * x + .55);
  point.z += travel * pull * loose;

  // The leading corner pulls first. Short curved ridges develop in the slack
  // behind it. Vary their reach across the bed so they break up at the sides.
  const skew = .13 * x + .065 * Math.sin(2.9 * x + .4);
  const depth = z + skew;
  const first = .123 * (.50 + .50 * bell((x - .42) / .61)) * bell((depth + .18) / .145);
  const middle = .146 * (.44 + .56 * bell((x + .25) / .74)) * bell((depth - .24 - .09 * Math.cos(3.1 * x)) / .17);
  const last = .089 * (.25 + .75 * bell((x - .18) / .64)) * bell((depth - .68 + .11 * Math.sin(3.5 * x)) / .14);
  const gather = pull * (.38 + .62 * amount);
  const top = smooth(y, .48, .78);
  const hemWave = .071 * bell((z + .53 - .062 * Math.sin(x * 5.2 + .5)) / .092);
  const pinch = .037 * bell((x - .47 + (z + .6) * .64) / .12) * bell((z + .50) / .37);
  const ridges = first + middle + last + hemWave + pinch;
  const liftAtGrip = .036 * Math.sin(Math.PI * amount) * grip * bell((z + .54) / .30);
  point.y += top * (gather * ridges + liftAtGrip);
  // The visible side still hangs under gravity. Its pleats billow outward.
  point.x += Math.sign(x) * smooth(Math.abs(x), .82, 1.01) * (.035 + (1 - top) * .55) * ridges * gather;
  // Let the ivory overhang settle onto the exposed sheet ahead of the quilt.
  if (cuff) {
    const freeLip = 1 - smooth(z, -.65, -.53);
    point.y -= pull * (freeLip * .059 + .032 * smooth(Math.abs(x), .81, .95));
  }
}

export function prepareCoverMesh(mesh, bed, cottonCuff = false) {
  mesh.updateWorldMatrix(true, false);
  const toBed = bed.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  const fromBed = toBed.clone().invert();
  const geometry = mesh.geometry.clone(), base = geometry.attributes.position;
  const point = new T.Vector3();
  // Mattress, pillows and folded ivory hem share one material in the GLB.
  // Select only connected triangles of the hem from seeds above the sheet at
  // the head edge of the quilt. UV seams may split it into several islands.
  let movable;
  if (cottonCuff) {
    const parent = Int32Array.from({length:base.count},(_,i)=>i);
    const find = i => { while(parent[i]!==i) i=parent[i]=parent[parent[i]]; return i; };
    const index = geometry.index;
    for(let n=0;n<index.count;n+=3){
      const a=find(index.getX(n));parent[find(index.getX(n+1))]=a;parent[find(index.getX(n+2))]=a;
    }
    const hem=new Set();
    for(let i=0;i<base.count;i++){
      point.fromBufferAttribute(base,i).applyMatrix4(toBed);
      if(point.y>.785 && point.z>-.68 && point.z<-.34)hem.add(find(i));
    }
    movable=Uint8Array.from(parent,(_,i)=>Number(hem.has(find(i))));
  }
  const poses = [], normals = [];
  for (const amount of pullPoses) {
    const pose = base.clone();
    for (let i = 0; i < base.count; i++) {
      if(movable&&!movable[i])continue;
      point.fromBufferAttribute(base, i).applyMatrix4(toBed);
      pullCloth(point, amount, cottonCuff || mesh.material.name === 'Ivory | seam thread');
      point.applyMatrix4(fromBed);
      pose.setXYZ(i, point.x, point.y, point.z);
    }
    const temp = geometry.clone(); temp.setAttribute('position', pose); temp.computeVertexNormals();
    const normal = temp.attributes.normal, originalNormal = geometry.attributes.normal;
    if (movable && originalNormal) {
      for (let i=0; i<base.count; i++) if (!movable[i]) {
        normal.setXYZ(i, originalNormal.getX(i), originalNormal.getY(i), originalNormal.getZ(i));
      }
    }
    normals.push(normal); poses.push(pose); temp.dispose();
  }
  geometry.morphAttributes.position = poses; geometry.morphAttributes.normal = normals;
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  mesh.geometry = geometry; mesh.updateMorphTargets();
  mesh.material = mesh.material.clone(); mesh.material.side = T.DoubleSide;
}

export function createBedSearch({bed, fallbackBlanket, scene, state, canvasTexture}) {
  const targets = [fallbackBlanket];
  prepareCoverMesh(fallbackBlanket, bed);
  const stock = canvasTexture((a,w,h) => {
    a.fillStyle='#c5aa83'; a.fillRect(0,0,w,h); a.strokeStyle='#806446'; a.lineWidth=4; a.strokeRect(6,6,w-12,h-12);
    a.fillStyle='#5c4b36'; a.fillRect(w*.045,h*.10,w*.91,2);
    a.font='28px serif'; a.fillText('인화실   /   316',w*.075,h*.31);
    a.font='16px serif'; a.fillText('두 장을 겹쳐 볼 것',w*.075,h*.48);
    a.fillStyle='#795634'; a.fillRect(w*.10,h*.58,w*.79,h*.32);
    a.fillStyle='#cdc7a3'; a.fillRect(w*.17,h*.64,w*.13,h*.18); a.fillRect(w*.57,h*.64,w*.13,h*.18);
  },384,256);
  const page = new T.PlaneGeometry(.248,.162,14,10), vertices = page.attributes.position;
  for (let i=0; i<vertices.count; i++) {
    const x=vertices.getX(i), y=vertices.getY(i);
    vertices.setZ(i,.002 + .008*Math.pow(Math.abs(x)/.124,3) + .004*Math.sin(y*22+x*8));
  }
  page.computeVertexNormals();
  const note = new T.Mesh(page,new T.MeshStandardMaterial({map:stock,roughness:.84,side:T.DoubleSide}));
  note.name='316 darkroom slip with contact film'; note.rotation.order='YXZ';
  note.rotation.set(-Math.PI/2,-.19,0); note.receiveShadow=true;
  Object.assign(note.userData,{interactId:'filmA',label:'인화실 쪽지 집기'});
  note.visible=false; scene.add(note);
  const x=bed.position.x+.54, z=bed.position.z-.25;
  const curl=Array.from({length:vertices.count},(_,i)=>vertices.getZ(i));
  function seatNote() {
    bed.updateWorldMatrix(true,true);
    const support=[];
    bed.traverseVisible(o=>{if(o.isMesh&&(!targets.includes(o)||o.material.name===cotton))support.push(o);});
    const cast=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
    const probe=(px,pz)=>{cast.ray.origin.set(px,2,pz);return cast.intersectObjects(support,false)[0]?.point.y??.76;};
    const baseY=probe(x,z);note.position.set(x,baseY+.004,z);note.updateWorldMatrix(true,false);
    // Follow the small crest in the cotton so the edge of the slip never
    // disappears into the mattress. Sample at load time, not during play.
    const grid=[],cols=5,rows=4,point=new T.Vector3();
    for(let iy=0;iy<rows;iy++){
      const row=[];grid.push(row);
      for(let ix=0;ix<cols;ix++){
        point.set((ix/(cols-1)-.5)*.248,(iy/(rows-1)-.5)*.162,0).applyMatrix4(note.matrixWorld);
        row.push(probe(point.x,point.z)-baseY);
      }
    }
    for(let i=0;i<vertices.count;i++){
      const u=T.MathUtils.clamp(vertices.getX(i)/.248+.5,0,1)*(cols-1);
      const v=T.MathUtils.clamp(vertices.getY(i)/.162+.5,0,1)*(rows-1);
      const ix=Math.min(Math.floor(u),cols-2),iy=Math.min(Math.floor(v),rows-2);
      const a=T.MathUtils.lerp(grid[iy][ix],grid[iy][ix+1],u-ix);
      const b=T.MathUtils.lerp(grid[iy+1][ix],grid[iy+1][ix+1],u-ix);
      vertices.setZ(i,curl[i]+T.MathUtils.lerp(a,b,v-iy));
    }
    vertices.needsUpdate=true;page.computeVertexNormals();page.computeBoundingSphere();
  }
  seatNote();
  let t=0;
  return {note, setModel(model) {
    model.traverse(o=>{
      if(o.userData.interactId==='bed'){delete o.userData.interactId;delete o.userData.label;}
      if(isBedCover(o)||o.material?.name===cotton){prepareCoverMesh(o,bed,o.material.name===cotton);targets.push(o);}
    });
    seatNote();
  }, update(dt) {
    t=T.MathUtils.clamp(t+(state.bedCoverFolded?1:-1)*dt/.95,0,1);
    const p=t*t*(3-2*t);
    const next=p<=pullPoses[0]?0:p<=pullPoses[1]?1:2;
    const start=next===0?0:pullPoses[next-1];
    const blend=(p-start)/(pullPoses[next]-start);
    for(const mesh of targets) {
      const weights=mesh.morphTargetInfluences;
      weights.fill(0);
      if(next>0) weights[next-1]=1-blend;
      weights[next]=blend;
    }
    // Enable the slip while it is still physically occluded. The fabric then
    // reveals or hides its edge continuously as the player changes direction.
    note.visible=t>.08&&!state.filmJoined&&!state.inventory.includes('filmA');
    bed.userData.label=state.bedCoverFolded?'이불 다시 덮기':'이불을 발치로 당기기';
  }};
}
