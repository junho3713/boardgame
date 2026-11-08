"""Original toy miniatures: build 3-D polygon meshes and bake lit WebP sprite atlases.
No third-party models or textures. Run with Python, numpy and Pillow.
"""
from pathlib import Path
import math, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets/models'
OUT.mkdir(parents=True,exist_ok=True)
TAU=math.tau
# x=right, y=forward/back on ground, z=up. Camera at the south and above.
LIGHT=np.array([-.48,-.55,.69]); LIGHT/=np.linalg.norm(LIGHT)
VIEW=np.array([0,.6,.8]); HALF=(LIGHT+VIEW); HALF/=np.linalg.norm(HALF)
GREEN=(83,125,54); RED=(163,83,56); CHAR=(38,53,35); RUBBER=(31,38,29); IVORY=(218,211,163); GLASS=(90,128,120); GOLD=(205,173,76)
def shade(c,v):return tuple(max(0,min(255,int(x*v))) for x in c)
class Mesh:
 def __init__(self):self.faces=[]
 def face(self,pts,c,gloss=.2):self.faces.append((np.array(pts,dtype=float),c,gloss))
 def box(self,c,p,size,bevel=0):
  x,y,z=p;w,d,h=np.array(size)/2
  if bevel:
   b=min(bevel,w*.4,d*.4);ring=[(-w+b,-d),(w-b,-d),(w,-d+b),(w,d-b),(w-b,d),(-w+b,d),(-w,d-b),(-w,-d+b)]
   bottom=[(x+a,y+b,z-h) for a,b in ring];top=[(x+a*.93,y+b*.93,z+h) for a,b in ring]
   self.face(top,c,.4);self.face(bottom[::-1],c)
   for i in range(8):j=(i+1)%8;self.face([bottom[i],bottom[j],top[j],top[i]],c,.35)
  else:
   vs=[(x+a*w,y+b*d,z+e*h) for a,b,e in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
   for f in [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]:self.face([vs[i] for i in f],c,.35)
 def tube(self,c,a,b,r,r2=None,n=12,gloss=.4):
  a=np.array(a,dtype=float);b=np.array(b,dtype=float);v=b-a;v/=np.linalg.norm(v);u=np.cross(v,[0,0,1] if abs(v[2])<.9 else [0,1,0]);u/=np.linalg.norm(u);w=np.cross(v,u);r2=r if r2 is None else r2
  p=[a+r*(math.cos(i*TAU/n)*u+math.sin(i*TAU/n)*w) for i in range(n)];q=[b+r2*(math.cos(i*TAU/n)*u+math.sin(i*TAU/n)*w) for i in range(n)]
  self.face(p[::-1],c,gloss);self.face(q,c,gloss)
  for i in range(n):j=(i+1)%n;self.face([p[i],p[j],q[j],q[i]],c,gloss)
 def ball(self,c,p,r,n=14,rings=7,gloss=.6):
  p=np.array(p);r=np.array(r)
  for j in range(rings):
   v0=-math.pi/2+j*math.pi/rings;v1=v0+math.pi/rings
   for i in range(n):
    u0=i*TAU/n;u1=u0+TAU/n
    self.face([p+r*np.array([math.cos(v)*math.cos(u),math.cos(v)*math.sin(u),math.sin(v)]) for u,v in [(u0,v0),(u1,v0),(u1,v1),(u0,v1)]],c,gloss)
 def helmet(self,c):
  # Classic steel-helmet silhouette: broad rolled rim, flared skirt, high dome.
  profile=[(14.8,13.5,51),(15.8,14.4,51.8),(14.8,13.5,52.7),(14.2,12.9,55.7),(12.5,11.7,60),(8.8,8.1,63.4),(4.4,4.2,65),(.15,.15,65.4)]
  rings=[];n=24
  for rx,ry,z in profile:
   rings.append([(rx*math.cos(i*TAU/n),ry*math.sin(i*TAU/n),z-math.sin(i*TAU/n)*max(0,1-(z-51)/8)) for i in range(n)])
  self.face(rings[0][::-1],shade(c,.48),.25)
  for k in range(len(rings)-1):
   color=shade(c,.58 if k==0 else .87 if k==1 else 1)
   for i in range(n):j=(i+1)%n;self.face([rings[k][i],rings[k][j],rings[k+1][j],rings[k+1][i]],color,.45)
  self.face(rings[-1],c,.45)
 def star(self,p,r,c):
  x,y,z=p;pts=[(x+math.sin(i*math.pi/5)*(r if i%2==0 else r*.43),y+math.cos(i*math.pi/5)*(r if i%2==0 else r*.43),z) for i in range(10)]
  for i in range(10):self.face([(x,y,z),pts[i],pts[(i+1)%10]],c,.2)
 def path(self,c,pts,r=1.2):
  for a,b in zip(pts,pts[1:]):self.tube(c,a,b,r,n=8)

def infantry(kind,team,phase,ultimate=None):
 m=Mesh();c=GREEN if team==0 else RED;light=shade(c,1.13);dark=shade(c,.72);step=[0,1,-1][phase]
 # Human proportions: narrow shoulders, long articulated legs and a fitted M1 shell.
 for side in [-1,1]:
  stride=side*step*7;hip=(side*4.1,1,29);knee=(side*5.1,stride*.48-1,16);foot=(side*6,stride,4)
  m.tube(c,hip,knee,3.1,2.7,n=10);m.ball(c,knee,(2.9,3,3),n=10,rings=5)
  m.tube(c,knee,foot,2.5,2.1,n=10);m.box(dark,(side*6,stride-2,2.5),(5.5,10,5),1)
 m.box(dark,(0,1,30),(13,9,6),2);m.box(c,(0,0,42),(16,10,22),2.5)
 m.box(light,(0,-5.1,43),(12,1,15),1);m.box(dark,(0,0,33),(17,11,2),.7)
 for side in [-1,1]:
  m.box(light,(side*5.4,-6,35),(4.5,3,5),.6);m.box(dark,(side*5,-5.9,45),(1.2,1,14))
  shoulder=(side*8.7,0,49);elbow=(side*12,-5,41)
  hand=(7,-13 if side>0 else -25,46)
  if kind=='rocket':hand=(13,-10 if side>0 else -24,49)
  if kind=='mortar':hand=(10,-15 if side>0 else -21,37)
  if kind=='medic':hand=(side*9,-9,37);elbow=(side*11,-2,42)
  if ultimate is not None:
   kick=ultimate==side;elbow=(side*11,-8,47+(4 if kick else 0));hand=(side*10,-19+(4 if kick else 0),48+(10 if kick else 0))
  m.ball(c,shoulder,(3.6,4,4),n=10,rings=5);m.tube(c,shoulder,elbow,2.8,2.3,n=10)
  m.ball(c,elbow,(2.4,2.5,2.5),n=8,rings=4);m.tube(light,elbow,hand,2.2,1.8,n=10);m.ball(c,hand,(2.2,2.4,2.2),n=8,rings=4)
 m.box(dark,(0,7,43),(11,5,14),1.5);m.box(light,(0,9.8,44),(9,1,9),1)
 m.tube(dark,(0,0,51),(0,0,56),2.4)
 m.ball(light,(0,-.5,59),(4.8,4.5,5.7),n=12,rings=6);m.ball(light,(0,-5,59),(1.4,1.5,1.5),n=8,rings=4)
 helmet=Mesh();helmet.helmet(shade(c,.96))
 m.faces.extend((v*np.array([.49,.52,.63])+np.array([0,0,62-51*.63]),color,gloss) for v,color,gloss in helmet.faces)
 for side in [-1,1]:m.path(dark,[(side*4.7,-1,62),(side*4.7,-3,56),(side*2,-5,54)],.5)
 if kind=='leader':
  m.star((0,-1,71.5),2.8,GOLD);m.box(dark,(-5,7,47),(4,4,8),.7);m.tube(CHAR,(-5,7,51),(-6,7,73),.45,n=6)
  m.box(GOLD,(-8,-2,51),(3.5,3,1.2))
 if ultimate is not None:
  for side in [-1,1]:
   kick=ultimate==side;x=side*10;y=-19+(4 if kick else 0);z=48+(10 if kick else 0)
   m.tube(CHAR,(x,y,z),(x,y-12,z+(6 if kick else 0)),1.7,n=10);m.box(dark,(x,y-3,z),(3.5,9,3.8),.6);m.tube(dark,(x,y,z),(x,y+2,z-5),1.4,n=8)
   m.box(GOLD,(x-1.9,y-2,z),(0.4,3,1))
 elif kind=='medic':
  m.box(IVORY,(0,-5.8,45),(8,1,8),.7);m.box(c,(0,-6.5,45),(2,1,6));m.box(c,(0,-6.6,45),(6,1,2))
  m.box(IVORY,(12,-4,32),(7,9,10),1);m.box(c,(16,-4,32),(1,2.5,7));m.box(c,(16,-4,32),(1,6,2.5))
  m.box(IVORY,(0,0,71.5),(6,6,.6));m.box(c,(0,0,72),(2,5,.6));m.box(c,(0,0,72.4),(5,2,.6))
 elif kind=='rocket':
  m.tube(dark,(12,9,51),(12,-30,51),3.7,n=14);m.tube(light,(12,-30,51),(12,-35,51),4.2,1.7,n=14);m.tube(CHAR,(12,9,51),(12,10,51),3,n=14)
  m.box(c,(12,-8,47),(4,6,4),.7);m.box(GOLD,(12,-18,54.5),(2,7,.7))
 elif kind=='mortar':
  m.ball(dark,(14,-9,3),(11,10,1.5),n=16,rings=4);m.tube(c,(14,-9,6),(14,-29,36),4,n=16);m.tube(CHAR,(14,-29,36),(14,-30,37.5),3,n=16)
  for x in [5,23]:m.tube(light,(14,-21,24),(x,-16,3),1,n=8)
  m.box(dark,(-9,8,35),(5,6,18),1);m.box(GOLD,(-9,8,44),(4,5,1.5))
 else:
  y=-43 if kind=='sniper' else -37 if kind=='machinegun' else -33
  # Butt at the shoulder; trigger hand and forward support hand share the bore line.
  m.box(dark,(7,-8,46),(3.5,13,4.5),.7);m.box(c,(7,-17,46),(4,12,4),.7)
  m.tube(CHAR,(7,-23,47),(7,y,47),1.2 if kind=='sniper' else 1.6,n=10)
  m.box(dark,(7,-13,42),(2.5,4,6),.5);m.tube(dark,(7,y,47),(7,y-2,47),2,n=10)
  if kind=='sniper':
   m.tube(dark,(7,-12,51),(7,-24,51),1.9,n=12);m.tube(GLASS,(7,-24,51),(7,-24.5,51),1.5,n=12)
   # Flat, double-sided leaf blades sit on the back, shoulders and rear helmet.
   for i in range(14):
    x=(i%5-2)*3.7;y=4+(i//5)*2.5;z=47+(i%3)*3
    if i>=10:x=(i%4-1.5)*3;y=2;z=63
    tip=(x+(-1 if x<0 else 1)*3,y+6,z-7);leaf=[(x-2,y,z),(x,y-2,z+1),(x+2,y,z),tip]
    m.face(leaf,shade(c,.8+(i%3)*.13),.1);m.face(leaf[::-1],shade(c,.72),.1);m.tube(light,(x,y,z),tip,.35,n=5)

   m.tube(dark,(7,-32,45),(3,-28,37),.6,n=6);m.tube(dark,(7,-32,45),(11,-28,37),.6,n=6)
  if kind=='machinegun':
   m.box(dark,(13,-16,43),(7,9,8),1);m.box(GOLD,(13,-16,47),(5,7,.7));m.box(c,(7,-23,46),(6,13,5),1)
   for i in range(4):m.tube(GOLD,(10+i*1.2,-15,47),(10+i*1.2,-19,47),.5,n=6)
 return m

def vehicle(kind,team,layer,phase=0):
 m=Mesh();c=GREEN if team==0 else RED;light=shade(c,1.18);dark=shade(c,.62)
 if kind=='guntruck':
  if layer=='turret':
   m.tube(dark,(0,11,23),(0,11,30),7,n=16);m.box(c,(0,8,33),(11,16,8),2);m.tube(CHAR,(0,3,34),(0,-22,34),2,n=10);m.box(dark,(9,10,30),(8,12,7),1);m.box(GOLD,(9,10,34),(7,10,1));return m
  for x in [-23,23]:
   for y in [-23,14,28]:
    m.tube(RUBBER,(x-3,y,9),(x+3,y,9),8,n=16);m.tube(dark,(x-3.3,y,9),(x+3.3,y,9),4.3,n=12)
    for j in range(4):
     a=j*math.pi/2+phase*math.pi/4;outer=x+(-3.6 if x<0 else 3.6)
     m.tube(light,(outer,y,9),(outer,y+math.cos(a)*4,9+math.sin(a)*4),.7,n=6)
  m.box(dark,(0,0,12),(42,75,8),3);m.box(c,(0,-28,20),(38,22,12),3);m.box(light,(0,-30,26),(34,18,1.5),1)
  m.box(c,(0,-11,27),(39,19,25),3);m.box(GLASS,(0,-21,32),(31,1.3,13),1);m.box(c,(0,-22,32),(2,1.4,15))
  for x in [-20,20]:m.box(GLASS,(x,-11,32),(1,12,12),1);m.box(light,(x,-6,22),(1.5,4,2));m.box(dark,(x,-2,24),(3,6,19),1)
  m.box(dark,(0,18,16),(36,34,7),2)
  for x in [-20,20]:m.box(c,(x,18,23),(3,37,13),1)
  m.box(c,(0,36,22),(40,3,13),1);m.box(light,(0,18,13),(33,31,1));m.box(dark,(0,-41,12),(43,5,4),1)
  for x in [-13,13]:m.box(IVORY,(x,-40,22),(7,2,5),1)
  for x in [-8,-4,0,4,8]:m.box(dark,(x,-40,17),(2,1,6))
  m.star((0,-29,27),6,IVORY)
 elif kind in ['tank','artillery']:
  if layer=='turret':
   m.tube(dark,(0,0,23),(0,0,26),13,n=18);m.box(c,(0,-1,30),(27,31,13),5);m.box(light,(-2,1,37),(18,20,1),3)
   reach=61 if kind=='artillery' else 53
   m.tube(dark,(0,-12,32),(0,-reach,32),3.5,2.7,n=12);m.tube(light,(0,-18,32),(0,-reach+5,32),2.8,n=12);m.tube(CHAR,(0,-reach,32),(0,-reach-1,32),2.1,n=12)
   m.tube(dark,(4,7,37),(4,7,40),6,n=16);m.tube(c,(4,7,40),(4,7,41),5,n=16);m.tube(CHAR,(-9,10,37),(-10,12,58),.6,n=6);m.star((-5,-3,37.8),4.5,GOLD)
   return m
  for x in [-24,24]:
   m.box(RUBBER,(x,0,10),(11,66,17),4)
   for y in range(-27,29,8):
    m.box(dark,(x,y+phase*3,19),(12,3,2),.6);m.tube(CHAR,(x-5.7,y,8),(x+5.7,y,8),5,n=12);m.tube(light,(x-5.9,y,8),(x+5.9,y,8),2,n=10)
  m.box(c,(0,0,18),(40,62,19),5);m.box(light,(0,-6,28),(31,43,2),4);m.box(dark,(0,23,28),(25,12,2),1)
  for x in range(-10,12,4):m.box(light,(x,23,29),(1,10,1))
  for x in [-18,18]:m.box(IVORY,(x,-29,24),(4,3,4),1);m.box(dark,(x,28,24),(4,3,5),1)
  m.box(dark,(0,-33,14),(36,4,4),1)
 return m

def insect(kind,phase):
 m=Mesh();step=1 if phase else -1
 armored=kind in ['stagBeetle','rhinoBeetle'];rhino=kind=='rhinoBeetle';beetle=kind in ['beetle','bruteBeetle'] or armored
 c={'ant':(116,68,34),'soldierAnt':(144,61,32),'beetle':(98,112,47),'bruteBeetle':(68,84,43),'stagBeetle':(47,65,44),'rhinoBeetle':(88,57,36)}[kind]
 scale={'ant':.72,'soldierAnt':.95,'beetle':1.05,'bruteBeetle':1.35,'stagBeetle':1.2,'rhinoBeetle':1.4}[kind]
 for side in [-1,1]:
  for i in range(3):
   y=-13+i*11;wiggle=step*side*(1 if i%2 else -1)*4
   a=(side*8,y,11);b=(side*21,y+wiggle,10);d=(side*29,y+7+wiggle,1)
   m.tube(shade(c,.55),a,b,1.8,n=8);m.tube(shade(c,.7),b,d,1.4,.7,n=8);m.ball(shade(c,.8),b,(2.3,2.3,2.3),n=8,rings=4)
 if beetle:
  m.ball(c,(0,10,13),(15,24,13),n=20,rings=10);m.tube(shade(c,.5),(0,-7,24),(0,29,18),.65,n=6)
  for side in [-1,1]:
   for i in range(3):m.path(shade(c,1.28),[(side*(5+i*3),-1,24-i),(side*(7+i*3),12,24-i*2),(side*(5+i*3),26,19-i)],.45)
 else:
  m.ball(c,(0,17,11),(11,17,10),n=16,rings=8);m.ball(shade(c,.7),(0,-1,10),(6,6,7),n=12,rings=6)
 m.ball(shade(c,.8),(0,-12,12),(11,12,10),n=16,rings=8);m.ball(c,(0,-28,10),(11 if armored else 9,10,9),n=16,rings=7)
 for side in [-1,1]:
  m.ball(GOLD,(side*7,-34,15),(1.7,2,1.6),n=8,rings=4)
  m.path(shade(c,.6),[(side*6,-33,14),(side*11,-42,17),(side*18,-46,20)],.9)
 if kind=='stagBeetle':
  for side in [-1,1]:
   m.path(shade(c,1.25),[(side*5,-33,10),(side*15,-43,14),(side*15,-54,17),(side*6,-59,20)],2.6)
   m.path(shade(c,1.15),[(side*15,-45,14),(side*8,-48,15)],1.8)
 elif rhino:
  m.path(shade(c,1.45),[(0,-32,12),(0,-40,20),(0,-45,33),(0,-53,37)],3.5)
  m.path(shade(c,1.45),[(0,-45,33),(-7,-51,38)],1.5);m.path(shade(c,1.45),[(0,-45,33),(7,-51,38)],1.5)
 else:
  for side in [-1,1]:m.path(shade(c,.5),[(side*3,-34,8),(side*7,-41,9),(side*2,-44,10)],1.5)
 if kind=='bruteBeetle':
  for side in [-1,1]:
   for i in range(4):m.tube((154,144,75),(side*12,-3+i*9,16),(side*22,-5+i*9,20),3,0,n=8)
 m.faces=[(v*scale,c,g) for v,c,g in m.faces]
 return m

def render(mesh,angle,cell,shadow=True):
 ss=2;size=cell*ss;anchor=(cell/2,cell*.70);co,si=math.cos(angle),math.sin(angle);rot=np.array([[co,-si,0],[si,co,0],[0,0,1]])
 faces=[];sil=[]
 for pts,color,gloss in mesh.faces:
  vs=pts@rot.T;n=np.cross(vs[1]-vs[0],vs[2]-vs[0]);norm=np.linalg.norm(n)
  if norm<1e-7:continue
  n/=norm
  # Primitives have outward winding except ellipsoid rings, corrected by shape winding.
  if np.dot(n,VIEW)<-.03:continue
  diffuse=max(0,np.dot(n,LIGHT));spec=max(0,np.dot(n,HALF))**22*gloss
  lit=tuple(int(np.clip(v*(.43+.7*diffuse)+spec*135,0,255)) for v in color)
  xy=[((v[0]+anchor[0])*ss,(v[1]*.8-v[2]*.6+anchor[1])*ss) for v in vs]
  faces.append((np.mean(vs@VIEW),xy,lit))
  if shadow:sil.append([((v[0]+v[2]*.5+anchor[0])*ss,(v[1]*.8+v[2]*.28+anchor[1])*ss) for v in vs])
 im=Image.new('RGBA',(size,size))
 if shadow:
  mask=Image.new('L',(size,size));d=ImageDraw.Draw(mask)
  for poly in sil:d.polygon(poly,fill=65)
  mask=mask.filter(ImageFilter.GaussianBlur(2.5*ss));im.paste((24,36,23,255),(0,0,size,size),mask)
 d=ImageDraw.Draw(im)
 for _,xy,color in sorted(faces,key=lambda a:a[0]):d.polygon(xy,fill=(*color,255))
 return im.resize((cell,cell),Image.Resampling.LANCZOS)

def atlas(kind,team,layer,frames,cell):
 sheet=Image.new('RGBA',(cell*8,cell*2*frames))
 for f in range(frames):
  model=infantry(kind,team,f) if kind in HUMAN else vehicle(kind,team,layer,f) if kind in VEHICLES else insect(kind,f)
  for a in range(16):
   im=render(model,a*TAU/16,cell,shadow=layer!='turret')
   sheet.paste(im,((a%8)*cell,(f*2+a//8)*cell))
 file=f'{kind}-{team}-{layer}.webp';sheet.save(OUT/file,'WEBP',quality=88,method=6,exact=True)
 return {'file':file,'cell':cell,'frames':frames,'anchorX':cell/2,'anchorY':cell*.7}
HUMAN=['leader','rifle','machinegun','sniper','rocket','mortar','medic'];VEHICLES=['tank','guntruck','artillery'];BUGS=['ant','soldierAnt','beetle','bruteBeetle','stagBeetle','rhinoBeetle']
if __name__=='__main__':
 import sys
 sniper_only='--sniper-only' in sys.argv
 infantry_only='--infantry-only' in sys.argv or sniper_only
 manifest=json.loads((OUT/'manifest.json').read_text()) if infantry_only else {'version':2,'directions':16,'columns':8,'models':{}}
 for kind in (['sniper'] if sniper_only else HUMAN if infantry_only else HUMAN+VEHICLES+BUGS):
  entries={}
  for team in ([2] if kind in BUGS else [0,1]):
   key=f'{kind}-{team}';data={}
   for layer in (['body','turret'] if kind in VEHICLES else ['body']):
    cell=128 if kind in HUMAN else 160 if kind in VEHICLES or kind in ['bruteBeetle','rhinoBeetle','stagBeetle'] else 112
    frames=3 if kind in HUMAN else 2 if kind in BUGS or (kind in VEHICLES and layer=='body') else 1
    data[layer]=atlas(kind,team,layer,frames,cell)
   manifest['models'][key]=data;print(key,flush=True)
 manifest['version']=7
 (OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
 # A review sheet at one consistent angle and scale, separate from game assets.
 sheet=Image.new('RGB',(1000,600),(228,230,213));d=ImageDraw.Draw(sheet)
 for i,kind in enumerate(HUMAN+VEHICLES+BUGS):
  team=2 if kind in BUGS else 0;cell=160 if kind in VEHICLES or kind in ['bruteBeetle','rhinoBeetle','stagBeetle'] else 128 if kind in HUMAN else 112
  model=infantry(kind,team,0) if kind in HUMAN else vehicle(kind,team,'body') if kind in VEHICLES else insect(kind,0)
  im=render(model,-math.pi/4,cell)
  if kind in VEHICLES:im=Image.alpha_composite(im,render(vehicle(kind,team,'turret'),-math.pi/4,cell,False))
  im=im.resize((int(cell*1.25),int(cell*1.25)),Image.Resampling.LANCZOS);x=(i%8)*125;y=(i//8)*280
  sheet.paste(im,(x+(125-im.width)//2,y+60),im)
  d.text((x+8,y+255),kind,fill=(41,59,39))
 sheet.save(OUT/'unit-preview.webp','WEBP',quality=92,method=6)
 print('bytes',sum(p.stat().st_size for p in OUT.glob('*.webp')),flush=True)
