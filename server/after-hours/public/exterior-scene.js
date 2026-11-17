import * as T from './three.module.js';

// A complete spherical environment keeps the outdoor view continuous at every
// window angle. Do not overlay unmatched proxy facades or a clipping ground plane.
export function buildExterior(scene,loader,canvasTexture){
 const exterior=new T.Group();exterior.name='rainy-town-exterior';scene.add(exterior);
 let seed=316170;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const environmentMaterial=new T.MeshBasicMaterial({color:'#c5d0d6',side:T.BackSide,fog:false,toneMapped:false});
 const backdrop=loader.load('./assets/rainy-town-night.jpg?v=20261117-environment2',undefined,undefined,()=>{
   environmentMaterial.map=null;environmentMaterial.color.set('#17242c');environmentMaterial.needsUpdate=true;
 });
 backdrop.colorSpace=T.SRGBColorSpace;backdrop.wrapS=T.RepeatWrapping;backdrop.anisotropy=4;environmentMaterial.map=backdrop;
 const panorama=new T.Mesh(new T.SphereGeometry(46,96,64),environmentMaterial);
 panorama.name='distant-rainy-town';panorama.position.set(0,1.62,-4.5);panorama.rotation.y=Math.PI/2;panorama.frustumCulled=false;exterior.add(panorama);

 // Fine rain falls at three depths and speeds; far rain does not cover the
 // town with the uniformly long bright strokes used by the old placeholder.
 const layers=[];
 for(const layer of [{count:55,width:7,near:4.9,far:7,min:-.3,max:5,opacity:.20},{count:110,width:16,near:7,far:16,min:-7,max:11,opacity:.15},{count:140,width:32,near:16,far:29,min:-8,max:16,opacity:.11}]){
   const positions=new Float32Array(layer.count*6),colors=new Float32Array(layer.count*6),drops=[];
   for(let i=0;i<layer.count;i++){
     const drop={x:(random()-.5)*layer.width,y:layer.min+random()*(layer.max-layer.min),z:-layer.near-random()*(layer.far-layer.near),length:.10+random()*.19,speed:4+random()*3.5};drops.push(drop);
     const brightness=.55+random()*.4;for(let v=0;v<2;v++)colors.set([brightness*.66,brightness*.78,brightness*.86],i*6+v*3);
   }
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));
   const rain=new T.LineSegments(geometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:layer.opacity,depthWrite:false}));rain.name='exterior-rain';rain.frustumCulled=false;exterior.add(rain);layers.push({...layer,positions,drops,geometry});
 }
 const paneTexture=canvasTexture((a,w,h)=>{
   a.clearRect(0,0,w,h);
   for(let i=0;i<64;i++){
     const x=random()*w,y=random()*h,r=.6+random()*1.25,l=5+random()*44;
     const fade=a.createLinearGradient(0,y-l,0,y+2);fade.addColorStop(0,'rgba(167,194,208,0)');fade.addColorStop(1,'rgba(183,209,220,.65)');
     a.strokeStyle=fade;a.lineWidth=r;a.beginPath();a.moveTo(x-.7,y-l);a.bezierCurveTo(x+1,y-l*.7,x-1,y-l*.2,x,y);a.stroke();
     a.strokeStyle='rgba(197,218,224,.55)';a.lineWidth=.65;a.beginPath();a.ellipse(x,y,r,r*1.6,0,.1,Math.PI*1.25);a.stroke();
   }
 },512,1024);paneTexture.wrapT=T.RepeatWrapping;
 const paneRain=new T.Mesh(new T.PlaneGeometry(2.88,1.80),new T.MeshBasicMaterial({map:paneTexture,transparent:true,opacity:.14,depthWrite:false,toneMapped:false}));paneRain.position.set(0,1.65,-4.496);paneRain.name='window-water-trails';exterior.add(paneRain);
 function update(dt,time){
   for(const layer of layers){
     for(let i=0;i<layer.drops.length;i++){
       const d=layer.drops[i];d.y-=dt*d.speed;if(d.y<layer.min)d.y=layer.max;
       const x=d.x+Math.sin(time*.37+d.z)*.06;
       layer.positions.set([x,d.y,d.z,x+.02,d.y-d.length,d.z],i*6);
     }
     layer.geometry.attributes.position.needsUpdate=true;
   }
   paneTexture.offset.y=(time*.006)%1;
 }
 update(0,0);return{group:exterior,update};
}
