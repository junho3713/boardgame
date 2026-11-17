import * as T from './three.module.js';
import {mergeGeometries} from './BufferGeometryUtils.js';

// Distant photographic detail, architectural foreground parallax and rain at
// several depths. All exterior geometry stays outside the playable hotel room.
export function buildExterior(scene,loader,canvasTexture){
 const exterior=new T.Group();exterior.name='rainy-town-exterior';scene.add(exterior);
 let seed=316170;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const backdrop=loader.load('./assets/rainy-town-night.jpg?v=20261117-exterior',undefined,undefined,()=>{panorama.material.map=null;panorama.material.color.set('#17242c');panorama.material.needsUpdate=true;});backdrop.colorSpace=T.SRGBColorSpace;backdrop.anisotropy=4;
 const verts=[],uv=[],indices=[],segments=100,radius=38,height=24;
 // Extend the image's edge pixels above/below the photographic band. The
 // backdrop must not reveal a curved top or bottom edge beside the glass.
 const rows=[{y:-80,v:0},{y:2.6-height/2,v:0},{y:2.6+height/2,v:1},{y:80,v:1}];
 for(const row of rows)for(let i=0;i<=segments;i++){
   const angle=(i/segments-.5)*Math.PI;
   verts.push(Math.sin(angle)*radius,row.y,-Math.cos(angle)*radius);uv.push(i/segments,row.v);
 }
 for(let row=0;row<rows.length-1;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+1,c=a+segments+2,d=a+segments+1;indices.push(a,b,c,a,c,d);}
 const panoramaGeo=new T.BufferGeometry();panoramaGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3));panoramaGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));panoramaGeo.setIndex(indices);panoramaGeo.computeVertexNormals();
 const panorama=new T.Mesh(panoramaGeo,new T.MeshBasicMaterial({map:backdrop,color:'#c5d0d6',fog:false,toneMapped:false}));panorama.name='distant-rainy-town';exterior.add(panorama);
 // A real ground plane occludes the lower panorama when looking down. This
 // avoids stretching the photograph's last pixel row into vertical smears.
 const roadMap=canvasTexture((a,w,h)=>{
   a.fillStyle='#252d31';a.fillRect(0,0,w,h);
   for(let i=0;i<7000;i++){const shade=25+Math.floor(random()*28);a.fillStyle=`rgba(${shade},${shade+4},${shade+6},.35)`;a.fillRect(random()*w,random()*h,1,1);}
   for(let i=0;i<24;i++){a.fillStyle='rgba(6,15,20,.14)';a.beginPath();a.ellipse(random()*w,random()*h,10+random()*80,5+random()*28,random()*Math.PI,0,Math.PI*2);a.fill();}
 },512,512);roadMap.wrapS=roadMap.wrapT=T.RepeatWrapping;roadMap.repeat.set(12,12);
 const road=new T.Mesh(new T.PlaneGeometry(110,110),new T.MeshLambertMaterial({map:roadMap,color:'#7d8b91'}));road.rotation.x=-Math.PI/2;road.position.set(0,-8.05,-35);road.name='wet-exterior-ground';exterior.add(road);

 const masonry=canvasTexture((a,w,h)=>{
   a.fillStyle='#4a4643';a.fillRect(0,0,w,h);
   for(let row=0;row<32;row++)for(let col=-1;col<15;col++){
     const x=(col+(row%2)*.5)*w/14,y=row*h/32,shade=55+Math.floor(random()*32);
     a.fillStyle=`rgb(${shade+9},${shade+3},${shade})`;a.fillRect(x+1,y+1,w/14-2,h/32-2);
   }
   for(let i=0;i<90;i++){const x=random()*w;a.fillStyle=`rgba(10,17,18,${.02+random()*.06})`;a.fillRect(x,random()*h,1+random()*8,60+random()*350);}
 },512,1024);
 const material={
   brick:new T.MeshStandardMaterial({map:masonry,color:'#72808a',roughness:.93}),
   trim:new T.MeshStandardMaterial({color:'#4c5558',roughness:.88}),
   metal:new T.MeshStandardMaterial({color:'#1d292e',roughness:.62,metalness:.4}),
   darkGlass:new T.MeshBasicMaterial({color:'#17272c',toneMapped:false}),
   warmGlass:new T.MeshBasicMaterial({color:'#655438',toneMapped:false}),
   windowShade:new T.MeshBasicMaterial({color:'#26363d',toneMapped:false})
 };
 const batches=Object.fromEntries(Object.keys(material).map(k=>[k,[]]));
 function block(batch,w,h,d,x,y,z){const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);batches[batch].push(g);}
 function pipe(points,r=.018,batch='metal'){
   const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*8),r,5,false);batches[batch].push(g);
 }
 // Peripheral buildings fill grazing-angle views when the player approaches
 // the window, without placing a flat facade across the central sightline.
 for(const b of [{x:-15,z:-20,w:5.5,h:10.5},{x:16,z:-22,w:6,h:12}]){
   const ground=-8.2,front=b.z+2.2,top=ground+b.h;
   block('brick',b.w,b.h,4.4,b.x,ground+b.h/2,b.z);
   block('trim',b.w+.22,.18,4.6,b.x,top+.03,b.z);
   for(const side of [-1,1])block('trim',.12,.44,4.5,b.x+side*(b.w/2-.1),top+.24,b.z);
   block('trim',b.w,.44,.13,b.x,top+.24,front);
   for(let floor=0;floor<4;floor++){
     const y=ground+1.5+floor*2.25;
     block('trim',b.w+.08,.09,.16,b.x,y-.66,front+.045);
     for(let col=0;col<4;col++){
       const x=b.x-b.w*.36+col*b.w*.24,w=.78,h=1.18;
       block('metal',w+.10,h+.10,.09,x,y,front+.02);
       const lit=random()<.18;
       block(lit?'warmGlass':random()<.55?'darkGlass':'windowShade',w,h,.02,x,y,front+.075);
       block('trim',w+.2,.07,.28,x,y-h/2-.04,front+.14);
       block('metal',.035,h,.035,x,y,front+.094);
       if(lit){block('windowShade',.13,h,.024,x-w*.3,y,front+.095);block('windowShade',.11,h,.024,x+w*.3,y,front+.095);}
       if((floor+col)%5===0){
         block('trim',.58,.38,.26,x+w*.65,y-.4,front+.22);
         for(let i=0;i<4;i++)block('metal',.46,.016,.008,x+w*.65,y-.51+i*.07,front+.355);
       }
     }
   }
   const drainX=b.x+b.w*.42;
   pipe([[drainX,top,front+.13],[drainX,top-.3,front+.25],[drainX,-7.9,front+.25]],.032);
   block('metal',.8,.48,.72,b.x-.7,top+.33,b.z+.7);
   pipe([[b.x+.7,top,b.z],[b.x+.7,top+1.3,b.z]],.018);
   for(let i=0;i<4;i++)pipe([[b.x+.2,top+.7+i*.16,b.z],[b.x+1.2,top+.7+i*.16,b.z]],.008);
 }
 // Thin suspended wires sit well beyond the pane, so head movement gives
 // a subtle depth cue instead of looking like painted scratches on glass.
 for(let i=0;i<3;i++)pipe([[-12,4.1+i*.12,-12],[-5,3.4+i*.12,-13.7],[3,3.25+i*.12,-15],[12,3.8+i*.12,-16.5]],.007);
 for(const [key,geometries]of Object.entries(batches))if(geometries.length){
   const merged=mergeGeometries(geometries,false),o=new T.Mesh(merged,material[key]);o.name='exterior-'+key;exterior.add(o);geometries.forEach(g=>g.dispose());
 }

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
