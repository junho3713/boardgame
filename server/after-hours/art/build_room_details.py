"""Detailed guest-room furnishings, original metre-scale geometry. Blender 4.4+, no external mesh dependencies.
blender --background --python build_room_details.py -- --out PATH [--render]
Geometry is authored in game coordinates (X, height Y, depth Z), exported Y-up.
"""
import bpy, bmesh, math, os, sys, argparse, json, random
import numpy as np
from mathutils import Vector
from math import sin,cos,pi
ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);ap.add_argument('--render',action='store_true');ap.add_argument('--only',nargs='*');opt=ap.parse_args(sys.argv[sys.argv.index('--')+1:])
OUT=os.path.abspath(opt.out);os.makedirs(OUT,exist_ok=True);random.seed(316)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def W(v):return (v[0],-v[2],v[1])
collections={};current=None;parent=None
def begin(name):
 global current,parent
 current=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(current);collections[name]=current
 parent=None;return empty(name+'_ROOT',(0,0,0))
def reg(o,name,mat=None,p=None):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 current.objects.link(o)
 if p is not None:o.parent=p
 elif parent is not None:o.parent=parent
 if mat is not None:o.data.materials.append(mat)
 return o
def empty(name,loc,p=None):
 o=bpy.data.objects.new(name,None);current.objects.link(o);o.location=W(loc)
 if p is not None:o.parent=p
 return o
def material(name,color,rough=.5,metal=0,alpha=1):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,alpha);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED';m.use_transparency_overlap=False
 return m
def textured(name,color,kind,rough=.5):
 m=material(name,color,rough);n=512;y,x=np.mgrid[0:n,0:n].astype(np.float32)/n;rng=np.random.default_rng(316)
 if kind=='wood':
  # Restrained, irregular pores instead of strongly periodic orange stripes.
  phase=x*110+np.sin(y*8)*1.7+np.sin(y*21+x*4)*.22
  v=.96+.018*np.sin(phase)+.012*np.sin(phase*2.37)+.008*rng.random((n,n))
 elif kind=='stone':v=.97+.02*rng.random((n,n))+.018*np.sin(x*18+y*11)+.012*np.sin(x*35-y*22)
 else:v=.97+.008*np.sin(x*96)*np.cos(y*96)+.008*rng.random((n,n))
 a=np.ones((n,n,4),dtype=np.float32);a[:,:,:3]=np.asarray(color)[None,None,:]*v[:,:,None]
 im=bpy.data.images.new(name+'_BaseColor',width=n,height=n,alpha=False);im.colorspace_settings.name='sRGB';im.pixels.foreach_set(a.ravel());im.update();im.pack();node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);return m
oak=textured('Smoked oak | fine vertical grain',(.25,.17,.105),'wood',.48)
dark=material('Cabinet shadow and gaskets',(.028,.035,.032),.7)
stone=textured('Honed warm limestone',(.71,.69,.61),'stone',.4)
ceramic=material('Glazed warm white porcelain',(.86,.84,.77),.19)
chrome=material('Brushed nickel',(.62,.65,.64),.25,.88)
brass=material('Aged champagne brass',(.48,.34,.15),.31,.78)
glass=material('Clear shower glass | 8 mm',(.73,.83,.82),.12,.08,.16)
linen=textured('Cotton terry towel',(.78,.75,.66),'fabric',.92)
velvet=textured('Muted oxblood upholstery',(.19,.047,.052),'fabric',.82)
water=material('Water in trap',(.10,.18,.17),.12,.2)
ink=material('Clock ink',(.055,.068,.061),.6)
def cube(name,loc,dims,mat,r=.012,p=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=W(loc));o=reg(bpy.context.object,name,mat,p);o.dimensions=(dims[0],dims[2],dims[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  b=o.modifiers.new('Manufactured edge radii','BEVEL');b.width=min(r,min(dims)*.44);b.segments=3;o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
 return o
def mesh(name,verts,faces,mat,p=None):
 me=bpy.data.meshes.new(name);me.from_pydata([W(v) for v in verts],[],faces);me.update();o=bpy.data.objects.new(name,me);current.objects.link(o)
 if p is not None:o.parent=p
 elif parent is not None:o.parent=parent
 me.materials.append(mat)
 for poly in me.polygons:poly.use_smooth=True
 return o
def cyl(name,loc,radius,height,mat,axis='y',p=None,vertices=40):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=height,location=W(loc));o=reg(bpy.context.object,name,mat,p)
 if axis=='x':o.rotation_euler[1]=pi/2
 if axis=='z':o.rotation_euler[0]=pi/2
 b=o.modifiers.new('Machined edge','BEVEL');b.width=min(.003,height*.2);b.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 for f in o.data.polygons:f.use_smooth=True
 return o
def tube(name,points,r,mat,p=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=1;c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for point,v in zip(s.points,points):point.co=(*W(v),1)
 o=bpy.data.objects.new(name,c);current.objects.link(o);o.parent=p if p is not None else parent;c.materials.append(mat);return o
def oval_shell(name,center,rings,mat,p=None,n=64):
 # Profile runs from the outer lip, down the inner cavity, then back up its underside.
 verts=[(center[0]+rx*cos(2*pi*i/n),y,center[2]+rz*sin(2*pi*i/n)) for rx,rz,y in rings for i in range(n)];faces=[]
 for j in range(len(rings)):
  k=(j+1)%len(rings)
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,k*n+(i+1)%n,k*n+i))
 o=mesh(name,verts,faces,mat,p);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();return o
def cut_oval(obj,center,rx,rz):
 bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=1,depth=.3,location=W(center));c=bpy.context.object;c.scale=(rx,rz,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 # Cutter must be in the same local frame as the object.
 c.parent=obj.parent;bpy.context.view_layer.objects.active=obj;mod=obj.modifiers.new('Real counter opening','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(c,do_unlink=True)
def drain(name,center,p=None,r=.029):
 cyl(name+' flange',center,r,.006,chrome,p=p);cyl(name+' inset',(center[0],center[1]+.004,center[2]),r*.78,.004,dark,p=p)
 for i in range(10):
  a=2*pi*i/10;cyl(name+' perforation',(center[0]+cos(a)*r*.47,center[1]+.007,center[2]+sin(a)*r*.47),.002,.003,chrome,p=p,vertices=10)
def rounded_path(name,points,r,mat,p=None):return tube(name,points,r,mat,p)
def faucet(name,x,z,y,p=None,metal=chrome):
 cyl(name+' escutcheon',(x,y+.009,z),.035,.018,metal,p=p)
 pts=[(x,y,z),(x,y+.21,z),(x,y+.24,z)]
 # A rounded elbow leads into a forward-facing spout along negative X.
 for i in range(13):
  a=pi/2*i/12;pts.append((x-.055*(1-cos(a)),y+.24+.055*sin(a),z))
 pts.extend([(x-.15,y+.295,z),(x-.18,y+.28,z),(x-.18,y+.255,z)])
 tube(name+' bent spout',pts,.017,metal,p);cyl(name+' aerator',(x-.18,y+.249,z),.019,.018,metal,p=p)
 cyl(name+' lever hub',(x,y+.23,z+.036),.024,.04,metal,'z',p);tube(name+' lever',[(x,y+.245,z+.058),(x-.065,y+.29,z+.058)],.009,metal,p)

walnut=textured('Walnut | cut veneer',(.26,.145,.072),'wood',.38)
leather=textured('Cognac | fine leather',(.205,.078,.032),'fabric',.62)
lining=textured('Travel lining | moss twill',(.23,.26,.18),'fabric',.95)
upholstery=textured('Sage | woven upholstery',(.245,.29,.23),'fabric',.9)
thread=material('Linen saddle stitching',(.54,.40,.24),.86)
steel=material('Safe | graphite powder coat',(.065,.087,.083),.48,.36)
cream=material('Appliance | enamel ivory',(.69,.68,.60),.29,.16)
amber=material('Warm opal glass',(.83,.71,.49),.45)

def label(name,body,loc,size,mat=brass,p=None,front=True):
 cu=bpy.data.curves.new(name,'FONT');cu.body=body;cu.size=size;cu.align_x='CENTER';cu.align_y='CENTER';cu.extrude=.0003
 ob=bpy.data.objects.new(name,cu);current.objects.link(ob);ob.parent=p if p is not None else parent;ob.location=W(loc);cu.materials.append(mat)
 if front:ob.rotation_euler=(pi/2,0,pi)
 return ob

def rr(w,d,r,n=10):
 pts=[]
 for cx,cz,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,pi/2),(-w/2+r,-d/2+r,pi),(w/2-r,-d/2+r,3*pi/2)]:
  for i in range(n):
   a=start+i*pi/2/(n-1);pts.append((cx+r*cos(a),cz+r*sin(a)))
 return pts

def case_shell(name,w,d,y0,y1,mat,p=None):
 # Continuous rounded shell, including the interior and base; no solid block under an open lid.
 profiles=[(w,d,y0,.075),(w,d,y1,.075),(w-.045,d-.045,y1+.005,.060),(w-.065,d-.065,y1-.015,.05),(w-.065,d-.065,y0+.035,.05),(.06,.06,y0+.035,.02),(.06,.06,y0,.02)]
 verts=[(x,y,z) for ww,dd,y,r in profiles for x,z in rr(ww,dd,min(r,ww*.4,dd*.4))];n=40
 faces=[(j*n+i,j*n+(i+1)%n,((j+1)%len(profiles))*n+(i+1)%n,((j+1)%len(profiles))*n+i) for j in range(len(profiles)) for i in range(n)]
 o=mesh(name,verts,faces,mat,p);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();return o

def piping(name,w,d,y,mat,p=None,center=(0,0),radius=.05):
 pts=rr(w,d,radius);return tube(name,[(x+center[0],y,z+center[1]) for x,z in pts+[pts[0]]],.003,mat,p)

def cushion(name,loc,w,d,h,mat,p=None):
 n=40;verts=[];faces=[]
 # Multiple cross sections give soft, crowned faces and a thin sewn edge.
 for y,scale in [(-h*.48,.70),(-h*.35,.94),(-h*.09,1),(h*.08,1),(h*.36,.92),(h*.49,.68)]:
  for x,z in rr(w*scale,d*scale,min(.09,w*.18,d*.18),10):verts.append((loc[0]+x,loc[1]+y+.004*sin(x*32+z*8),loc[2]+z))
 for j in range(5):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.extend([tuple(range(n-1,-1,-1)),tuple(5*n+i for i in range(n))]);o=mesh(name,verts,faces,mat,p)
 sub=o.modifiers.new('Soft cushion loft','SUBSURF');sub.levels=1
 piping(name+' welt',w,d,loc[1],mat,p,center=(loc[0],loc[2]),radius=min(.09,w*.18,d*.18));return o

def lathe(name,loc,profile,mat,p=None,n=64):
 verts=[(loc[0]+r*cos(i*2*pi/n),loc[1]+y,loc[2]+r*sin(i*2*pi/n)) for r,y in profile for i in range(n)]
 faces=[(j*n+i,j*n+(i+1)%n,((j+1)%len(profile))*n+(i+1)%n,((j+1)%len(profile))*n+i) for j in range(len(profile)) for i in range(n)]
 return mesh(name,verts,faces,mat,p)

def teacup(name,loc,p=None):return props['cup'](name,loc,p)

def chair_at(name,loc,yaw=0):
 g=empty(name,loc,parent);g.rotation_euler[2]=yaw
 for x in [-.22,.22]:
  for z in [-.22,.22]:tube('Chair | splayed tapered frame',[(x*1.1,.025,z*1.14),(x,.44,z)],.022,walnut,g)
 cube('Chair | seat apron',(0,.425,0),(.49,.06,.48),walnut,.018,g);cushion('Chair | tailored seat',(0,.49,0),.50,.49,.105,upholstery,g)
 for x in [-.22,.22]:tube('Chair | back upright',[(x,.40,.22),(x,.85,.29)],.021,walnut,g)
 verts=[]
 for y in [.65,.94]:
  for j in range(25):
   x=-.25+j*.5/24;z=.27-.06*(1-(x/.25)**2);verts.append((x,y,z))
 ob=mesh('Chair | bentwood back',verts,[(i,i+1,26+i,25+i)for i in range(24)],walnut,g);ob.modifiers.new('Back shell thickness','SOLIDIFY').thickness=.025
 tube('Chair | back upper rim',[(-.25+i*.5/24,.945,.27-.06*(1-((-.25+i*.5/24)/.25)**2))for i in range(25)],.014,walnut,g)
 return g

def drawered_table(name,loc,w,d,h=.93):
 g=empty(name,loc,parent)
 cube(name+' | softly rounded top',(0,h,0),(w,.065,d),walnut,.025,g)
 for x in [-w/2+.09,w/2-.09]:
  for z in [-d/2+.09,d/2-.09]:tube(name+' | tapered leg',[(x*1.04,.035,z*1.02),(x,h-.06,z)],.028,walnut,g);cyl(name+' | foot ferrule',(x*1.04,.055,z*1.02),.030,.07,brass,p=g)
 cube(name+' | drawer apron',(0,h-.08,0),(w-.12,.09,d-.12),walnut,.009,g)
 for x in [-w*.245,w*.245]:
  cube(name+' | separate drawer front',(x,h-.08,-d/2-.008),(w*.465,.085,.025),walnut,.006,g)
  tube(name+' | brass bail pull',[(x-.055,h-.075,-d/2-.035),(x-.055,h-.10,-d/2-.065),(x+.055,h-.10,-d/2-.065),(x+.055,h-.075,-d/2-.035)],.005,brass,g)
 return g

sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from hotel_props import make_props
props=make_props(globals())

# 317: the existing bed stays, while furnishings are replaced with fully built objects.
guest=begin('Guestroom317');parent=guest
desk=drawered_table('WritingTable317',(4.24,0,17.2),1.65,.94,.76);desk.rotation_euler[2]=-pi/2
chair_at('DeskChair317',(5.12,0,16.92),pi/2)
teacup('TeaService317',(4.2,.799,17.65),guest)
cube('Desk leather writing pad',(4.23,.799,16.9),(.68,.009,.63),leather,.02)
vanity=drawered_table('Vanity317',(8.9,0,20.16),2,.72,.76)
stool=empty('VanityStool317',(9.38,0,19.51),guest)
for x in [-.21,.21]:
 for z in [-.18,.18]:tube('Vanity stool | frame',[(x,.02,z),(x*.9,.44,z*.9)],.023,walnut,stool)
cushion('Vanity stool | padded top',(0,.48,0),.53,.46,.13,upholstery,stool)
for r in [.443,.464]:tube('Vanity mirror | turned brass rim',[(9+r*cos(2*pi*i/96),1.75+r*sin(2*pi*i/96),20.56)for i in range(97)],.012,brass)
# Bedside furniture gives the bed a believable human scale.
night=drawered_table('Bedside317',(7.12,0,17.18),.64,.55,.60)
lathe('Bedside lamp | spun base',(7.12,.637,17.18),[(.005,0),(.135,0),(.14,.018),(.12,.034),(.035,.05),(.025,.045)],brass)
cyl('Bedside lamp | stem',(7.12,.83,17.18),.015,.32,brass)
lathe('Bedside lamp | open fabric shade',(7.12,1.03,17.18),[(.19,0),(.125,.25),(.119,.25),(.184,0)],linen)
cyl('Bedside lamp | light bulb',(7.12,1.08,17.18),.035,.08,amber)
cube('Bedside folded note',(7.29,.642,17.16),(.15,.008,.21),stone,.003)

# Framed wardrobe with a genuinely empty lower safe niche.
cab=empty('Wardrobe317_ROOT',(4.24,0,19.75),guest);parent=cab
for x in [-.54,.54]:cube('Wardrobe317 | side',(x,1.25,0),(.045,2.4,.72),walnut)
cube('Wardrobe317 | back',(0,1.25,.34),(1.07,2.4,.035),walnut)
for y in [.12,1.13,2.44]:cube('Wardrobe317 | shelf',(0,y,0),(1.10,.055,.74),walnut)
for x in [-.273,.273]:
 cube('Wardrobe317 | upper recessed door',(x,1.78,-.38),(.542,1.24,.045),walnut,.008)
 cube('Wardrobe317 | inset shadow',(x,1.78,-.407),(.425,1.09,.008),dark,.014)
 cube('Wardrobe317 | raised inner panel',(x,1.78,-.414),(.405,1.07,.015),walnut,.012)
 tube('Wardrobe317 | pull',[(x*.35,1.61,-.44),(x*.35,1.61,-.48),(x*.35,1.83,-.48),(x*.35,1.83,-.44)],.008,brass)
cube('Wardrobe317 | cornice',(0,2.47,0),(1.16,.055,.79),walnut,.016)

# A thick steel case with separate hinged door, locking bolts, recessed symbols and felt interior.
safe=empty('Safe317_ROOT',(4.24,.66,19.32),guest);parent=safe
cube('Safe | rear',(0,0,.30),(.83,.67,.045),steel,.018)
for x in [-.407,.407]:cube('Safe | thick side',(x,0,.095),(.045,.67,.45),steel,.017)
for y in [-.325,.325]:cube('Safe | top bottom',(0,y,.095),(.81,.045,.45),steel,.016)
cube('Safe | felt floor',(0,-.294,.08),(.73,.014,.37),lining,.004)
cube('Safe | envelope',(0,-.278,.14),(.24,.012,.16),linen,.003)
sd=empty('Safe317_Door_Pivot',(-.423,0,-.14),safe)
cube('Safe door | metal slab',(.423,0,0),(.84,.665,.07),steel,.02,sd)
cube('Safe door | interior mechanism',(.423,0,.055),(.66,.46,.04),steel,.016,sd)
for y in [-.20,0,.20]:cyl('Safe door | locking bolt',(.83,y,.055),.017,.065,chrome,'x',sd)
for y in [-.24,.24]:cyl('Safe door | hinge',(0,y,0),.025,.13,chrome,p=sd)
for i in range(4):
 cube('Safe | inset dial rim',(.16+i*.17,.095,-.047),(.132,.145,.016),brass,.012,sd)
 cube('Safe | black dial face',(.16+i*.17,.095,-.058),(.11,.122,.009),dark,.009,sd)
 empty('Safe317_Symbol_'+str(i),(.16+i*.17,.095,-.065),sd)
cyl('Safe handle | hub',(.62,-.13,-.065),.046,.035,brass,'z',sd)
tube('Safe handle | lever',[(.62,-.13,-.09),(.73,-.13,-.09),(.75,-.115,-.09)],.015,brass,sd)
label('Safe | maker plate','HOTEL  /  317',(.27,-.19,-.041),.024,brass,sd)

# An actual leather case shell; lid, lining, corner caps and straps remain distinct.
parent=guest
for x in [8.18,9.22]:
 tube('317 luggage rack | crossing A',[(x,.035,18.28),(x,.49,18.92)],.024,walnut)
 tube('317 luggage rack | crossing B',[(x,.035,18.92),(x,.49,18.28)],.024,walnut)
 cyl('317 rack | brass pivot',(x,.255,18.60),.028,.06,brass,'x')
for z in [18.26,18.94]:tube('317 rack | rail',[(8.1,.49,z),(9.3,.49,z)],.022,walnut)
for x in [8.24,8.55,8.85,9.16]:cube('317 rack | woven web',(x,.486,18.6),(.07,.014,.67),lining,.005)
case=empty('Luggage317_ROOT',(8.7,.72,18.6),guest);parent=case
case_shell('Luggage | hollow leather base',1.22,.74,-.20,.14,leather)
cube('Luggage | fabric liner',(0,-.157,0),(1.10,.015,.62),lining,.025)
for z in [-.327,.327]:cube('Luggage | inner side lining',(0,-.01,z),(1.09,.285,.008),lining,.005)
lid=empty('Luggage317_Lid_Pivot',(0,.145,.365),case)
cube('Luggage | arched leather lid',(0,.052,-.365),(1.22,.135,.74),leather,.055,lid)
cube('Luggage | lid fabric panel',(0,-.022,-.365),(1.11,.016,.62),lining,.028,lid)
piping('Luggage | lid seam',1.18,.70,.112,thread,lid,center=(0,-.365),radius=.08)
piping('Luggage | base seam',1.20,.72,-.14,thread)
for x in [-.40,.40]:
 cube('Luggage | lid strap',(x,.124,-.365),(.065,.009,.71),walnut,.004,lid)
 cube('Luggage | front strap',(x,-.014,-.373),(.065,.29,.009),walnut,.004)
 cube('Luggage | latch plate',(x,.035,-.387),(.115,.10,.019),brass,.012)
 cube('Luggage | lid latch',(x,-.025,-.737),(.065,.11,.021),brass,.01,lid)
 for z in [-.27,.27]:cube('Luggage | metal foot',(x,-.218,z),(.09,.027,.07),dark,.009)
for x in [-.15,.15]:cube('Luggage | handle bracket',(x,-.045,-.389),(.055,.07,.026),brass,.01)
tube('Luggage | rounded leather grip',[(-.15,-.045,-.405),(-.13,.015,-.46),(.13,.015,-.46),(.15,-.045,-.405)],.019,leather)
cube('Luggage | three-wheel lock surround',(0,.092,-.39),(.265,.07,.035),brass,.01)
for i in range(3):
 dial=empty('Luggage317_Dial_'+str(i),(-.076+i*.076,.093,-.415),case)
 cyl('Luggage dial | knurled barrel',(0,0,0),.027,.052,dark,'x',dial,32)
 empty('Luggage317_Number_'+str(i),(0,0,-.029),dial)
for i in range(2):
 cushion('Luggage | folded garment',(-.27,.025+i*.065,.05),.43,.43,.09,linen if i==0 else upholstery)
cube('Luggage | inner leather pocket',(.30,-.06,.24),(.37,.17,.025),lining,.02)

# Mechanical music box: recessed mechanism, cylinder pins, comb, gears and an open lined lid.
music=empty('MusicBox317_ROOT',(8.5,.82,20.06),guest);parent=music
case_shell('Music box | wooden case',.64,.43,0,.18,walnut)
cube('Music box | brass mounting plate',(0,.045,0),(.55,.012,.34),brass,.009)
ml=empty('MusicBox317_Lid',(0,.18,.20),music)
cube('Music box | raised lid',(0,.012,-.20),(.65,.05,.43),walnut,.02,ml)
cube('Music box | lid satin inset',(0,-.018,-.20),(.56,.008,.34),lining,.012,ml)
label('Music box | inner label','NOCTURNE',(0,-.024,-.20),.041,brass,ml,False).rotation_euler=(0,pi,0)
ml.rotation_euler[0]=math.radians(108)
for x in [-.15,.15]:cube('Music | bearing block',(x,.095,.015),(.025,.10,.12),brass,.008)
drum=empty('MusicBox317_Drum',(0,.135,.015),music)
cyl('Music | pinned cylinder',(0,0,0),.064,.28,brass,'x',drum,64)
for i in range(56):
 a=i*2.399;x=-.12+(i%14)*.018
 cyl('Music | raised pin',(x,.065*sin(a),.065*cos(a)),.0028,.012,chrome,'x',drum,8)
cube('Music | comb base',(0,.073,-.12),(.31,.017,.07),chrome,.004)
for i in range(23):cube('Music | tuned steel tooth',(-.132+i*.012,.085,-.077),(.006,.009,.09-i*.0015),chrome,.001)
for x,r,y in [(.23,.065,.08),(.21,.032,.107),(-.23,.04,.08)]:
 cyl('Music | gear hub',(x,y,.025),r,.012,brass)
 for i in range(20):
  a=i*pi/10;o=cube('Music | gear tooth',(x+r*cos(a),y,.025+r*sin(a)),(.011,.013,.013),brass,.001);o.rotation_euler[2]=-a
cyl('Music | winding socket',(-.333,.105,0),.022,.025,brass,'x')
cube('Music | winding square',(-.348,.105,0),(.003,.016,.016),dark,.001)
label('Music box | front plaque','317  /  NOCTURNE',(0,.092,-.221),.026,brass)
for x in [-.23,.23]:
 for z in [-.13,.13]:cyl('Music box | foot',(x,-.012,z),.023,.025,brass)

# 316 kitchen furniture that was still made of placeholder boxes.
suite=begin('SuiteDetails316');parent=suite
for i,x in enumerate([-3.14,-2.70]):props['cup']('MinibarCup_'+str(i),(x,.995,9.7),suite,False)
fridge=empty('Fridge316_ROOT',(4.0,0,5.14),suite)
cube('Fridge | rounded steel cabinet',(0,1.0,0),(.64,1.94,.82),cream,.038,fridge)
for cy,h in [(1.60,.65),(.66,1.19)]:
 cube('Fridge | door gasket',(0,cy,.42),(.595,h,.026),dark,.018,fridge)
 cube('Fridge | formed enamel door',(0,cy,.455),(.61,h-.017,.07),cream,.029,fridge)
 tube('Fridge | curved nickel handle',[(.19,cy-.14,.50),(.19,cy-.14,.55),(.19,cy+.14,.55),(.19,cy+.14,.50)],.012,chrome,fridge)
for x in [-.23,.23]:
 for z in [-.28,.28]:cyl('Fridge | adjustable foot',(x,.039,z),.033,.065,dark,p=fridge)
for i in range(9):cube('Fridge | ventilation slit',(-.24+i*.060,.095,.435),(.04,.022,.01),dark,.003,fridge)
label('Fridge | maker badge','A H',(0,1.84,.496),.035,chrome,fridge).rotation_euler=(pi/2,0,0)
table=drawered_table('DiningTable316',(8.98,0,6.85),2.02,.95,.76);table.rotation_euler[2]=pi/2
chair_at('DiningChair316',(7.83,0,6.85),-pi/2)
trolley=empty('ServiceTrolley316',(5.2,0,9.3),suite)
for y in [.25,.78]:
 cube('Trolley | rimmed tray',(0,y,0),(1.23,.035,.62),walnut,.02,trolley)
 piping('Trolley | tray gallery',1.20,.59,y+.04,brass,trolley,radius=.04)
for x in [-.55,.55]:
 for z in [-.24,.24]:
  tube('Trolley | tubular upright',[(x,.11,z),(x,.89,z)],.014,brass,trolley)
  cyl('Trolley | rubber caster',(x,.065,z),.055,.035,dark,'x',trolley)
  cyl('Trolley | wheel hub',(x-.021,.065,z),.020,.006,chrome,'x',trolley)
tube('Trolley | push handle',[(-.55,.82,-.24),(-.55,.96,-.24),(-.55,.96,.24),(-.55,.82,.24)],.014,brass,trolley)
for i in range(4):lathe('Trolley | stacked porcelain',(0,.81+i*.016,0),[(0,.002),(.045,.002),(.062,0),(.085,.001),(.108,.007),(.119,.014),(.12,.018),(.117,.021),(.108,.019),(.092,.014),(.072,.010),(.045,.009),(0,.009)],ceramic,trolley)
teacup('Trolley | spare cup',(.32,.802,0),trolley)

# The second bedroom belongs to suite 316. All furniture uses real metre dimensions.
twin=begin('TwinRoom316');parent=twin
bedding=textured('Twin room | ivory cotton percale',(.72,.70,.64),'fabric',.94)
throw=textured('Twin room | slate woven throw',(.16,.23,.25),'fabric',.96)
headcloth=textured('Twin room | moss headboard linen',(.24,.29,.25),'fabric',.92)

def quilt(loc):
 # A continuous duvet drapes past the mattress sides and foot; a turned top edge reads as cloth.
 xs=[-.64,-.61,-.56]+[-.53+i*1.06/30 for i in range(31)]+[.56,.61,.64]
 zs=[-1.15,-1.11,-1.06]+[-1.03+i*1.67/42 for i in range(43)]
 verts=[];faces=[]
 for iz,z in enumerate(zs):
  for ix,x in enumerate(xs):
   side=max(0,abs(x)-.54)/.10;foot=max(0,-z-1.03)/.12
   y=.635-max(side,foot)*.27+.009*sin(x*24+z*11)+.006*sin(x*47-z*7)
   y+=.019*math.exp(-((z-.55)/.075)**2)
   verts.append((loc[0]+x,y,loc[2]+z))
 for j in range(len(zs)-1):
  for i in range(len(xs)-1):
   a=j*len(xs)+i;faces.append((a,a+1,a+len(xs)+1,a+len(xs)))
 ob=mesh('Twin bed | draped cotton duvet',verts,faces,bedding);ob.modifiers.new('Duvet thickness','SOLIDIFY').thickness=.009
 ob.modifiers.new('Soft fabric subdivisions','SUBSURF').levels=1
 # A separate wool runner at the foot, with short combed fringes.
 pts=[]
 for z in [-.95,-.49]:
  for x in xs:
   y=.657-max(0,abs(x)-.54)/.10*.27+.006*sin(x*24+z*11)
   pts.append((loc[0]+x,y,loc[2]+z))
 ob=mesh('Twin bed | woven foot runner',pts,[(i,i+1,len(xs)+i+1,len(xs)+i)for i in range(len(xs)-1)],throw);ob.modifiers.new('Runner hem','SOLIDIFY').thickness=.006
 for x in [-.50+i*.04 for i in range(26)]:tube('Runner | short fringe',[(loc[0]+x,.657,loc[2]-.95),(loc[0]+x,.648,loc[2]-.98)],.0015,throw)

for i,x in enumerate([-7.75,-5.25]):
 bedroot=empty('TwinBed_'+str(i),(0,0,0),twin);parent=bedroot
 # 110 x 210 cm mattress with a 49 cm base and gently rounded upholstered headboard.
 for dx in [-.43,.43]:
  for z in [8.0,9.6]:cyl('Twin bed | recessed foot',(x+dx,.10,z),.035,.20,walnut)
 cube('Twin bed | upholstered divan',(x,.27,8.85),(1.13,.30,2.14),headcloth,.045)
 cube('Twin bed | mattress core',(x,.50,8.85),(1.10,.22,2.10),bedding,.075)
 piping('Twin bed | mattress tape',1.10,2.10,.51,bedding,bedroot,(x,8.85),.07)
 cube('Twin bed | padded headboard',(x,.78,10.01),(1.24,1.28,.10),headcloth,.045)
 for dx in [-.40,0,.40]:cube('Twin bed | upholstered headboard channel',(x+dx,.89,9.946),(.378,.91,.055),headcloth,.04)
 quilt((x,0,8.85))
 cushion('Twin bed | pillow',(x,.735,9.62),.68,.39,.17,bedding)
 cube('Twin bed | pillow folded flange',(x,.677,9.62),(.72,.01,.43),bedding,.025)
parent=twin
night=drawered_table('TwinNightstand',(-6.5,0,9.72),.66,.51,.57)
lathe('Twin lamp | weighted ceramic base',(-6.5,.607,9.72),[(.01,0),(.11,0),(.12,.025),(.085,.05),(.055,.18),(.045,.21),(.01,.21)],ceramic)
cyl('Twin lamp | stem',(-6.5,.90,9.72),.012,.22,brass)
lathe('Twin lamp | linen shade',(-6.5,.95,9.72),[(.18,0),(.12,.24),(.115,.24),(.175,0)],bedding)
cyl('Twin lamp | bulb',(-6.5,1.02,9.72),.03,.06,amber)

console=drawered_table('TwinConsole',(-6.55,0,4.99),1.65,.62,.76);console.rotation_euler[2]=pi
for i,x in enumerate([-7.06,-6.55,-6.04]):
 cube('Postcard | maple frame',(x,1.62,4.66),(.44,.34,.025),walnut,.008)
 empty('TwinPostcard_'+str(i),(x,1.62,4.681),twin)
case=empty('CompanionCase_ROOT',(-6.55,.795,5.0),twin);parent=case
case_shell('Companion | lined keepsake case',.60,.37,0,.18,walnut)
cube('Companion | felt inner floor',(0,.043,0),(.51,.012,.28),lining,.009)
lid=empty('CompanionCase_Lid',(0,.18,-.185),case)
cube('Companion | bookmatched hinged lid',(0,.016,.185),(.61,.045,.38),walnut,.012,lid)
cube('Companion | lid inner lining',(0,-.012,.185),(.54,.009,.31),lining,.01,lid)
for x in [-.21,.21]:cyl('Companion | barrel hinge',(x,0,0),.012,.07,brass,'x',lid)
for i,x in enumerate([-.17,0,.17]):
 cube('Companion | inset symbol bezel',(x,.105,.193),(.12,.105,.012),brass,.008)
 empty('CompanionCase_Symbol_'+str(i),(x,.105,.202),case)
label('Companion | key label','317  /  SPARE',(0,.18,.125),.023,brass,case,False)
for x in [-.23,.23]:
 for z in [-.12,.12]:cyl('Companion | felt feet',(x,-.01,z),.02,.02,dark)
parent=twin
# A hollow, correctly scaled water carafe and a tumbler on the console.
lathe('Twin | porcelain water carafe',(-7.12,.799,4.98),[(.01,0),(.065,0),(.069,.035),(.055,.15),(.032,.22),(.031,.27),(.025,.27),(.027,.22),(.047,.145),(.058,.035),(.01,.015)],ceramic)
lathe('Twin | open tumbler',(-7.27,.799,5.09),[(.01,0),(.036,0),(.042,.09),(.037,.09),(.031,.012),(.01,.012)],ceramic)
cube('Twin | bedside journal',(-6.36,.61,9.72),(.16,.022,.23),lining,.006)


# Apply geometry, create UVs for authored meshes, and merge only within material/pivot boundaries.
for coll in collections.values():
 for ob in list(coll.objects):
  if ob.type in {'CURVE','FONT','MESH'}:
   bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
   bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
   if not ob.get('preserve_uv'):
    uv=ob.data.uv_layers.active or ob.data.uv_layers.new(name='UVMap')
    for poly in ob.data.polygons:
     normal=poly.normal;drop=max(range(3),key=lambda k:abs(normal[k]));axes=[k for k in range(3)if k!=drop]
     for li in poly.loop_indices:
      co=ob.data.vertices[ob.data.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]],co[axes[1]])
 groups={}
 for ob in list(coll.objects):
  if ob.type=='MESH':groups.setdefault((ob.parent.name if ob.parent else '',ob.active_material.name if ob.active_material else ''),[]).append(ob)
 for objects in groups.values():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for ob in objects:ob.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='Crafted | '+objects[0].active_material.name
stats={}
for name,coll in collections.items():
 if opt.only and name not in opt.only:continue
 bpy.ops.object.select_all(action='DESELECT')
 for ob in coll.objects:ob.select_set(True)
 file={'Guestroom317':'guestroom-317.glb','SuiteDetails316':'suite-details-316.glb','TwinRoom316':'twin-room-316.glb'}[name]
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,file),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
 stats[file]={'bytes':os.path.getsize(os.path.join(OUT,file)),'objects':len(coll.objects),'triangles':sum(len(p.vertices)-2 for o in coll.objects if o.type=='MESH'for p in o.data.polygons)}
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'room-details.blend'))
print('MODEL_STATS',json.dumps(stats))

