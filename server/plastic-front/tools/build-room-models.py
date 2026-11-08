"""Original living-room meshes baked with the same projection/light as toy soldiers."""
import importlib.util,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'dist/assets/room';OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('unit_models',Path(__file__).with_name('build-unit-models.py'));models=importlib.util.module_from_spec(spec);spec.loader.exec_module(models)
Mesh=models.Mesh;shade=models.shade
FABRIC=(112,133,120);WOOD=(148,105,69);DARK=(43,48,43);METAL=(124,132,124);CREAM=(202,194,159)
SIZES={'sofa':(1120,520),'armchair':(600,440),'table':(630,360),'cabinet':(700,190),'remote':(112,270),'cushion':(250,170),'slipper':(180,300),'plant':(210,210),'books':(240,165),'blocks':(210,150),'lamp':(160,160)}
def seam(m,c,pts,r=1.2):m.path(c,pts,r)
def padded(m,c,p,size,power=.35):
 p=np.array(p);r=np.array(size)/2;n=28;rings=14
 def signed(v):return math.copysign(abs(v)**power,v)
 for j in range(rings):
  v0=-math.pi/2+j*math.pi/rings;v1=v0+math.pi/rings
  for i in range(n):
   u0=i*math.tau/n;u1=u0+math.tau/n
   pts=[p+r*np.array([signed(math.cos(v))*signed(math.cos(u)),signed(math.cos(v))*signed(math.sin(u)),signed(math.sin(v))]) for u,v in [(u0,v0),(u1,v0),(u1,v1),(u0,v1)]]
   m.face(pts,c,.06)

def sofa(w,h,chair=False):
 m=Mesh();d=h/.8;c=FABRIC
 for x in [-w*.4,w*.4]:
  for y in [-d*.34,d*.34]:m.tube(shade(WOOD,.55),(x,y,2),(x,y,76),17,13,n=12)
 m.box(shade(c,.6),(0,0,95),(w-36,d-26,82),20)
 m.box(c,(0,0,140),(w-20,d-14,118),25)
 m.box(shade(c,.85),(0,-d*.37,310),(w-18,d*.23,440),28)
 count=1 if chair else 3;cw=(w-210)/count
 for i in range(count):
  x=(i-(count-1)/2)*cw
  padded(m,shade(c,1.12),(x,d*.1,207),(cw-10,d*.59,100))
  padded(m,shade(c,1.04),(x,-d*.235,340),(cw-10,d*.21,290))
  seam(m,shade(c,1.32),[(x-cw*.46,d*.36,253),(x+cw*.46,d*.36,253)])
  seam(m,shade(c,.65),[(x-cw*.46,-d*.12,225),(x-cw*.46,-d*.12,465),(x+cw*.46,-d*.12,465),(x+cw*.46,-d*.12,225)],1)
  for z in [300,385]:m.ball(shade(c,.78),(x,-d*.125+2,z),(5,2.5,5),n=10,rings=5,gloss=.05)
 for x in [-w*.45,w*.45]:
  padded(m,shade(c,.9),(x,0,238),(w*.105,d*.93,230))
  padded(m,shade(c,1.18),(x,0,350),(w*.106,d*.87,25))
  seam(m,shade(c,1.35),[(x-w*.043,-d*.38,365),(x-w*.043,d*.38,365)],1.2)
 seam(m,shade(c,1.18),[(-w*.43,d*.49,153),(w*.43,d*.49,153)],1.5)
 # Small woven creases across the front fascia, kept quiet at game scale.
 for i in range(18):
  x=-w*.4+i*w*.8/17;seam(m,shade(c,.83),[(x,d*.49,100),(x+4,d*.495,145)],.55)
 # Cushions, piping and a woven throw make the existing sofa feel lived in.
 for side in ([-1] if chair else [-1,1]):
  px=side*w*.28;pc=(190,151,95) if side<0 else (201,194,163)
  padded(m,pc,(px,d*.01,330),(w*.17,d*.17,160),.5)
  seam(m,shade(pc,1.25),[(px-w*.07,d*.10,275),(px-w*.07,d*.10,390),(px+w*.07,d*.10,390)],1.6)
 if not chair:
  x=w*.17;cloth=(178,157,126)
  for a,b in [(0,65),(65,135),(135,205)]:
   m.face([(x+a,-d*.05,259),(x+b,-d*.05,259),(x+b,d*.47,259),(x+a,d*.47,259)],shade(cloth,1+a/1300),.03)
   m.face([(x+a,d*.47,259),(x+b,d*.47,259),(x+b,d*.49,104),(x+a,d*.49,110)],shade(cloth,.83+a/1500),.03)
  for j in range(13):
   xx=x+j*16;seam(m,(216,202,170),[(xx,-d*.04,260),(xx,d*.47,260),(xx,d*.495,109)],.8)
   seam(m,shade(cloth,.75),[(xx,d*.495,109),(xx+3,d*.51,87)],1)
 return m

def table(w,h):
 m=Mesh();d=h/.8;c=WOOD
 for x in [-w*.4,w*.4]:
  for y in [-d*.36,d*.36]:
   m.tube(shade(c,.65),(x,y,0),(x*.94,y*.95,250),13,19,n=8)
   m.box(shade(c,.8),(x*.94,y*.95,233),(42,42,50),4)
 for y in [-d*.34,d*.34]:m.box(shade(c,.78),(0,y,236),(w*.83,20,45),3)
 m.box(shade(c,.55),(0,0,267),(w,d,38),12)
 m.box(c,(0,0,290),(w-2,d-2,22),12)
 for i in range(21):
  y=-d*.46+i*d*.92/20;pts=[(-w*.46,y,302),(-w*.2,y+math.sin(i)*3,302),(w*.18,y-3,302),(w*.46,y+2,302)]
  seam(m,shade(c,.83 if i%3 else 1.15),pts,.65 if i%3 else .9)
 # Inlaid tabletop border, small saucer and coffee cup establish household scale.
 seam(m,shade(c,1.35),[(-w*.45,-d*.43,302),(w*.45,-d*.43,302),(w*.45,d*.43,302),(-w*.45,d*.43,302),(-w*.45,-d*.43,302)],1)
 x=w*.24;y=-d*.12;m.ball(CREAM,(x,y,307),(47,43,5),n=24,rings=6,gloss=.2)
 m.tube(CREAM,(x,y,309),(x,y,365),27,30,n=24,gloss=.3);m.tube(shade(CREAM,.7),(x,y,365),(x,y,367),24,n=24)
 m.tube((65,48,34),(x,y,367),(x,y,368),21,n=24)
 m.path(CREAM,[(x+26,y,351),(x+43,y,352),(x+43,y,325),(x+25,y,323)],4)
 # A hardback with visible page edges; it sits on the existing raised tabletop.
 book(m,(-w*.23,-d*.04,304),(141,155,24),(66,104,109),-.13)
 for j in range(4):
  yy=d*.18+j*7;seam(m,shade(WOOD,.68),[(-w*.35,yy,303),(-w*.29,yy+2,303),(-w*.19,yy,303)],.65)
 # Lift the top/apron by 90, lengthen the legs, and keep the cup and tabletop thickness intact.
 m.faces=[(p+np.column_stack((np.zeros(len(p)),np.zeros(len(p)),np.where(p[:,2]>150,90,0))),c,g) for p,c,g in m.faces]
 return m

def cabinet(w,h):
 m=Mesh();d=h/.8;c=shade(WOOD,.83)
 for x in [-w*.41,w*.41]:
  for y in [-d*.32,d*.32]:m.tube(shade(c,.6),(x,y,0),(x,y,63),10,n=8)
 m.box(shade(c,.6),(0,0,170),(w,d,226),9);m.box(c,(0,0,292),(w+8,d+8,20),7)
 for i in range(4):
  x=(i-1.5)*w*.24;m.box(shade(c,1.04),(x,d/2+2,174),(w*.232,9,192),5)
  m.box(shade(c,.77),(x,d/2+7,174),(w*.19,2,151),2)
  m.tube(METAL,(x+29,d/2+11,192),(x+29,d/2+11,212),2.6,n=10)
  for j in range(6):seam(m,shade(c,.91),[(x-w*.09+j*7,d/2+9,110),(x-w*.09+j*7+2,d/2+9,238)],.5)
 m.box(DARK,(0,-d*.05,316),(w*.36,d*.45,18),5)
 m.box(shade(DARK,.8),(0,-d*.08,355),(34,22,75),3)
 m.box((30,37,38),(0,-d*.08,535),(w*.79,28,360),12)
 m.box((57,77,82),(0,-d*.08+15,535),(w*.75,1,321),2)
 # Dark reflective screen, subtle diagonal glints and a standby LED.
 for i in range(5):
  x=-w*.34+i*w*.12;m.face([(x,-d*.08+16,393),(x+w*.12,-d*.08+16,393),(x+w*.34,-d*.08+16,675),(x+w*.26,-d*.08+16,675)],(61+i*2,81+i*2,85+i*2),.35)
 m.ball((130,178,159),(w*.31,-d*.08+16,370),(2,2,2),n=8,rings=4)
 for j in range(4):book(m,(-w*.34+j*24,d*.03,303),(18,100,49+j*6),[(160,95,73),(162,148,101),(74,112,111),(188,179,146)][j],0)
 m.box((49,58,56),(w*.35,d*.04,339),(68,95,74),6)
 for z in [323,350]:m.tube((29,36,34),(w*.35,d*.04+49,z),(w*.35,d*.04+51,z),14,n=16)
 return m

def remote(w,h):
 m=Mesh();d=h/.8;c=(54,65,66)
 m.box(shade(c,.55),(0,0,12),(w,d,24),16);m.box(c,(0,0,28),(w-4,d-4,15),16)
 m.box(shade(c,.8),(0,d*.15,38),(w*.8,d*.46,5),7)
 for i in range(12):
  x=(i%3-1)*w*.255;y=d*.02+(i//3)*d*.115;m.box((136,148,142),(x,y,43),(w*.15,21,10),4)
 m.tube((33,43,43),(0,-d*.18,36),(0,-d*.18,43),31,n=24);m.tube((112,131,123),(0,-d*.18,43),(0,-d*.18,48),13,n=20)
 m.tube((164,87,68),(0,-d*.4,35),(0,-d*.4,44),11,n=18)
 for x,c2 in [(-30,(144,72,62)),(-10,(122,146,85)),(10,(187,164,80)),(30,(87,137,160))]:m.box(c2,(x,-d*.32,42),(13,12,7),3)
 return m

def cushion(w,h):
 m=Mesh();d=h/.8;c=(178,140,108);m.ball(c,(0,0,68),(w*.5,d*.5,67),n=28,rings=14,gloss=.08)
 pts=[(math.cos(i*math.tau/40)*w*.485,math.sin(i*math.tau/40)*d*.485,68) for i in range(41)]
 seam(m,shade(c,1.35),pts,1.7)
 for a in [0,math.pi/2,math.pi,math.pi*1.5]:seam(m,shade(c,.85),[(math.cos(a)*w*.42,math.sin(a)*d*.42,95),(math.cos(a)*w*.33,math.sin(a)*d*.33,113)],.8)
 for i in range(11):
  x=-w*.34+i*w*.068;seam(m,shade(c,1.12),[(x,-d*.25,110),(x,0,131),(x,d*.25,110)],.55)
 m.ball(shade(c,.72),(0,0,134),(5,5,2),n=10,rings=5,gloss=.02)
 return m

def slipper(w,h):
 m=Mesh();d=h/.8;c=(107,135,130)
 m.ball(shade(c,.6),(0,0,14),(w*.5,d*.5,14),n=28,rings=10,gloss=.1)
 m.ball(shade(c,1.25),(0,0,29),(w*.46,d*.47,13),n=28,rings=10,gloss=.08)
 for i in range(10):
  y=-d*.37+i*d*.075;seam(m,shade(c,1.04),[(-w*.32,y,38),(w*.32,y,38)],.7)
 n=20;lo=-d*.3;hi=d*.06;edge=[]
 for i in range(n):
  a=i*math.pi/n;b=(i+1)*math.pi/n;x0=math.cos(a)*w*.43;z0=40+math.sin(a)*85;x1=math.cos(b)*w*.43;z1=40+math.sin(b)*85
  pts=[(x0,lo,z0),(x1,lo,z1),(x1,hi,z1),(x0,hi,z0)];m.face(pts,c,.08);m.face(pts[::-1],shade(c,.7),.08);edge.append((x0,lo,z0+1))
 edge.append((-w*.43,lo,41));seam(m,shade(c,1.38),edge,1.5)
 for j in range(11):
  y=lo+(hi-lo)*j/10;seam(m,shade(c,1.2),[(-w*.37,y,78),(-w*.2,y,115),(0,y,126),(w*.2,y,115),(w*.37,y,78)],.65)
 return m

def book(m,p,size,c,angle=0):
 x,y,z=p;w,d,h=size;part=Mesh()
 part.box(shade(c,.7),(0,0,2),(w+4,d+4,4),2)
 part.box((212,202,170),(0,1,h/2),(w-5,d-5,h-5),1)
 for dz in range(6,int(h)-2,4):seam(part,(173,160,129),[(-w*.45,d*.48,dz),(w*.45,d*.48,dz)],.35)
 part.box(c,(0,0,h),(w+4,d+4,4),2);part.box(shade(c,.85),(-w*.49,0,h/2),(6,d,h+2),2)
 part.box(shade(c,1.3),(0,-d*.1,h+2.3),(w*.51,d*.08,.5),0)
 ca,sa=math.cos(angle),math.sin(angle)
 for pts,col,g in part.faces:
  q=pts.copy();q[:,0]=pts[:,0]*ca-pts[:,1]*sa+x;q[:,1]=pts[:,0]*sa+pts[:,1]*ca+y;q[:,2]+=z;m.faces.append((q,col,g))

def books(w,h):
 m=Mesh();colors=[(148,80,62),(185,158,104),(67,106,110)]
 for i,c in enumerate(colors):book(m,((i-1)*7,0,i*30),(w*.81,h/.8*.81,28),c,[-.11,.06,-.18][i])
 return m

def plant(w,h):
 m=Mesh();pot=(168,111,78);m.tube(shade(pot,.7),(0,0,5),(0,0,14),75,n=28,gloss=.06)
 m.tube(pot,(0,0,14),(0,0,155),65,87,n=28,gloss=.1);m.tube(shade(pot,1.18),(0,0,149),(0,0,165),91,n=28,gloss=.1)
 m.tube((65,53,37),(0,0,165),(0,0,166),78,n=28,gloss=.01)
 for j in range(12):
  a=j*2.4;root=np.array((math.cos(a)*12,math.sin(a)*12,166));tip=np.array((math.cos(a)*(94+j%3*15),math.sin(a)*(94+j%3*15),270+j%4*53));mid=(root+tip)/2+np.array((0,0,56))
  m.path((65,93,53),[root,mid,tip],2)
  side=np.array((-math.sin(a),math.cos(a),0));base=root*.35+mid*.65;span=33+j%3*10
  col=[(105,145,76),(126,160,89),(79,130,85)][j%3];spine=[]
  def leafrow(t):
   center=base*(1-t)+tip*t+np.array((0,0,math.sin(t*math.pi)*32));spread=max(.003,math.sin(t*math.pi))**.75*span
   return center-side*spread,center+np.array((0,0,7*math.sin(t*math.pi))),center+side*spread
  for k in range(9):
   left,center,right=leafrow(k/8);spine.append(center)
   if k==8:break
   l2,c2,r2=leafrow((k+1)/8)
   for pts,cc in [([left,l2,c2,center],col),([center,c2,r2,right],shade(col,.84))]:
    m.face(pts,cc,.14);m.face(pts[::-1],shade(cc,.8),.07)
  seam(m,shade(col,1.35),spine,.7)
 for j in range(11):
  a=j*2.4;m.ball((117,102,69),(math.cos(a)*j*5,math.sin(a)*j*5,168),(3,3,2),n=6,rings=3,gloss=.01)
 return m

def blocks(w,h):
 m=Mesh();colors=[(177,89,65),(180,153,90),(80,126,130),(114,135,89)]
 for i,(x,y,z) in enumerate([(-54,-31,32),(28,-25,33),(-52,51,32),(27,49,33),(-52,-28,96)]):
  col=colors[i%4];m.box(col,(x,y,z),(66,68,64),6);m.box(shade(col,1.22),(x,y,z+32),(43,44,1),3)
  m.star((x,y,z+33),15,shade(col,.73))
 return m

def lamp(w,h):
 m=Mesh();m.ball((83,75,60),(0,0,14),(77,77,13),n=28,rings=7,gloss=.25)
 m.tube((166,147,105),(0,0,17),(0,0,520),6,n=14,gloss=.45)
 m.tube((205,185,139),(0,0,451),(0,0,640),115,73,n=32,gloss=.05)
 for j in range(32):
  a=j*math.tau/32;seam(m,(224,210,174),[(math.cos(a)*115,math.sin(a)*115,452),(math.cos(a)*73,math.sin(a)*73,640)],.8)
 m.tube((236,221,178),(0,0,450),(0,0,453),116,n=32,gloss=.05)
 return m

def render(mesh,cell,shadowed=True):
 # Orthographic triangle depth buffer: distant controls/seams cannot be painted over
 # by the mean-depth sort of a large tabletop or upholstered panel.
 ss=2;size=cell*ss;anchor=(cell/2,cell*.7);rgba=np.zeros((size,size,4),dtype=np.uint8);depth=np.full((size,size),-np.inf,dtype=np.float32)
 shadow=Image.new('L',(size,size));sd=ImageDraw.Draw(shadow)
 for pts,c,g in mesh.faces:
  if shadowed:sd.polygon([((v[0]+v[2]*.5+anchor[0])*ss,(v[1]*.8+v[2]*.28+anchor[1])*ss) for v in pts],fill=58)
  normal=np.cross(pts[1]-pts[0],pts[2]-pts[0]);norm=np.linalg.norm(normal)
  if norm<1e-7:continue
  normal/=norm
  if normal@models.VIEW<-.03:continue
  diffuse=max(0,normal@models.LIGHT);specular=max(0,normal@models.HALF)**22*g
  color=[int(np.clip(v*(.43+.7*diffuse)+specular*135,0,255)) for v in c]+[255]
  screen=np.column_stack(((pts[:,0]+anchor[0])*ss,(pts[:,1]*.8-pts[:,2]*.6+anchor[1])*ss,pts@models.VIEW))
  for i in range(1,len(pts)-1):
   a,b,c1=screen[[0,i,i+1]];den=(b[1]-c1[1])*(a[0]-c1[0])+(c1[0]-b[0])*(a[1]-c1[1])
   if abs(den)<1e-7:continue
   lo=np.maximum(0,np.floor(np.minimum(np.minimum(a[:2],b[:2]),c1[:2]))).astype(int);hi=np.minimum(size-1,np.ceil(np.maximum(np.maximum(a[:2],b[:2]),c1[:2]))).astype(int)
   if (hi<lo).any():continue
   xs=np.arange(lo[0],hi[0]+1)[None,:]+.5;ys=np.arange(lo[1],hi[1]+1)[:,None]+.5
   wa=((b[1]-c1[1])*(xs-c1[0])+(c1[0]-b[0])*(ys-c1[1]))/den
   wb=((c1[1]-a[1])*(xs-c1[0])+(a[0]-c1[0])*(ys-c1[1]))/den;wc=1-wa-wb
   z=wa*a[2]+wb*b[2]+wc*c1[2];view=depth[lo[1]:hi[1]+1,lo[0]:hi[0]+1];mask=(wa>=-1e-7)&(wb>=-1e-7)&(wc>=-1e-7)&(z>view)
   view[mask]=z[mask];rgba[lo[1]:hi[1]+1,lo[0]:hi[0]+1][mask]=color
 shadow=shadow.filter(ImageFilter.GaussianBlur(5));im=Image.new('RGBA',(size,size));im.paste((28,34,26,255),(0,0,size,size),shadow)
 im=Image.alpha_composite(im,Image.fromarray(rgba));return im.resize((cell,cell),Image.Resampling.LANCZOS)

def main():
 import sys
 table_only='--table-only' in sys.argv
 prior=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else {'models':{}}
 manifest=prior if table_only else {'models':{}}
 manifest['version']=max(5,prior.get('version',0))
 for kind,(w,h) in SIZES.items():
  if table_only and kind!='table':continue
  if kind=='remote' and prior['models'].get(kind,{}).get('source')=='uploaded':
   manifest['models'][kind]=prior['models'][kind];print('remote: preserved uploaded asset',flush=True);continue
  m=sofa(w,h,kind=='armchair') if kind in ['sofa','armchair'] else globals()[kind](w,h)
  cell=math.ceil(max(w*1.6,h*2.6,1152 if kind in ['cabinet','lamp'] else 384)/128)*128
  im=render(m,cell);bbox=im.getbbox();bbox=(max(0,bbox[0]-6),max(0,bbox[1]-6),min(cell,bbox[2]+6),min(cell,bbox[3]+6));im=im.crop(bbox)
  file=kind+'.webp';im.save(OUT/file,'WEBP',quality=91,method=6,exact=True)
  manifest['models'][kind]={'file':file,'width':im.width,'height':im.height,'anchorX':cell/2-bbox[0],'anchorY':cell*.7-bbox[1],'footprintW':w,'footprintH':h}
  if kind=='table':manifest['models'][kind]['surfaceLift']=392*.6
  print(kind,im.size,flush=True)
 (OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
 preview=Image.new('RGB',(1400,math.ceil(len(SIZES)/2)*240),(214,204,181));d=ImageDraw.Draw(preview)
 for i,kind in enumerate(SIZES):
  im=Image.open(OUT/manifest['models'][kind]['file']).convert('RGBA');im.thumbnail((620,390),Image.Resampling.LANCZOS)
  x=(i%2)*700+(700-im.width)//2;y=(i//2)*240+10;im.thumbnail((620,215),Image.Resampling.LANCZOS);preview.paste(im,(x,y),im);d.text(((i%2)*700+25,(i//2)*240+220),kind,fill=(43,57,45))
 preview.save(OUT/'room-preview.webp',quality=90)
 print('total bytes',sum(p.stat().st_size for p in OUT.glob('*.webp')),flush=True)
if __name__=='__main__':main()
