"""Original metre-scale hotel fixtures. Blender 4.4+, no external mesh dependencies.
blender --background --python build_fixtures.py -- --out PATH [--render]
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

def draped_towel(x,top,z,width,length):return props['hanging_towel']('Hand towel '+str(x),x,top,z,width,length)

def spun_kettle(loc):return props['kettle']('HotelKettle_ROOT',loc)
def faucet(name,x,z,y,p=None,metal=chrome):
 cyl(name+' escutcheon',(x,y+.009,z),.035,.018,metal,p=p)
 pts=[(x,y,z),(x,y+.21,z),(x,y+.24,z)]
 # A rounded elbow leads into a forward-facing spout along negative X.
 for i in range(13):
  a=pi/2*i/12;pts.append((x-.055*(1-cos(a)),y+.24+.055*sin(a),z))
 pts.extend([(x-.15,y+.295,z),(x-.18,y+.28,z),(x-.18,y+.255,z)])
 tube(name+' bent spout',pts,.017,metal,p);cyl(name+' aerator',(x-.18,y+.249,z),.019,.018,metal,p=p)
 cyl(name+' lever hub',(x,y+.23,z+.036),.024,.04,metal,'z',p);tube(name+' lever',[(x,y+.245,z+.058),(x-.065,y+.29,z+.058)],.009,metal,p)

sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from hotel_props import make_props
props=make_props(globals())

# Bathroom: dry vanity / WC zone and a full-width, separately screened wet zone.
bath=begin('Bathroom316');parent=bath
vanity=empty('Vanity_ROOT',(7.77,0,-.2),bath);parent=vanity
cube('Vanity | left side',(0,.56,-.885),(.61,.61,.03),oak)
cube('Vanity | right side',(0,.56,.885),(.61,.61,.03),oak)
cube('Vanity | recessed rear',(.28,.56,0),(.035,.61,1.78),oak)
cube('Vanity | shelf',(0,.36,0),(.58,.035,1.76),oak)
cube('Vanity | back shadow',(.30,.56,0),(.025,.61,1.76),dark)
# A fixed upper rail closes the gap above the doors and conceals the basin underside.
cube('Vanity | upper face rail',(-.313,.856,0),(.045,.045,1.79),oak,.006)
cube('Vanity | bottom face rail',(-.313,.259,0),(.045,.035,1.79),oak,.005)
counter=cube('Vanity | stone counter with cutout',(0,.91,0),(.74,.065,1.92),stone,.018);cut_oval(counter,(-.05,.91,0),.245,.345)
cube('Vanity | backsplash',(.345,1.0,0),(.035,.16,1.92),stone,.009)
oval_shell('Vanity | genuinely recessed ceramic basin',(-.05,0,0),[(.245,.345,.949),(.24,.34,.958),(.226,.326,.952),(.212,.312,.93),(.2,.295,.89),(.165,.25,.82),(.105,.17,.755),(.029,.029,.73),(.029,.029,.71),(.1,.16,.723),(.19,.28,.79),(.23,.33,.90)],ceramic)
drain('Vanity drain',(-.05,.727,0));faucet('Vanity faucet',.235,0,.948)
for side in [-1,1]:
 pivot=empty('Vanity_Door_Left_Pivot' if side<0 else 'Vanity_Door_Right_Pivot',(-.324,.255,side*.9),vanity)
 dz=-side*.45
 cube('Vanity door | framed oak',(0,.309,dz),(.035,.612,.895),oak,.006,pivot)
 cube('Vanity door | recessed panel',(-.022,.309,dz),(.008,.49,.75),oak,.005,pivot)
 tube('Vanity door | bar pull',[(-.05,.47,dz-side*.28),(-.075,.47,dz-side*.28),(-.075,.31,dz-side*.28),(-.05,.31,dz-side*.28)],.009,brass,pivot)
 cyl('Vanity door | lock barrel',(-.025,.48,dz),.017,.014,brass,'x',pivot)
for i in range(3):props['folded_towel']('Folded spare towel '+str(i),(.08,.38+i*.055,.49),.34,.42,vanity)
cube('UV bulb carton',(-.03,.402,-.43),(.30,.04,.43),stone,.005)
for z in [-.68,.68]:cube('Cabinet wall bracket',(.24,.25,z),(.14,.05,.04),dark)
# Mirror trim and toiletries remain independent of the in-game planar reflection.
parent=bath
for z in [-1.12,.72]:cube('Mirror | brass side',(8.105,1.83,z),(.025,1.15,.024),brass,.004)
for y in [1.255,2.405]:cube('Mirror | brass end',(8.105,y,-.2),(.025,.025,1.86),brass,.004)
for z in [-1.33,.93]:
 cube('Vanity wall lamp backplate',(8.10,1.95,z),(.045,.25,.1),brass,.012)
 cyl('Vanity wall lamp opal tube',(8.02,1.95,z),.045,.31,ceramic)
for z in [-.82,.43]:
 cyl('Soap pump bottle',(7.74,1.04,z),.038,.18,material('Olive toiletry bottle',(.14,.21,.15),.3));cyl('Soap pump collar',(7.74,1.145,z),.025,.03,brass);tube('Soap pump nozzle',[(7.74,1.17,z),(7.68,1.17,z)],.007,brass)
# WC with a hollow bowl, separate seat, lifted lid, cistern and flush button.
wc=empty('Toilet_ROOT',(5.35,0,.69),bath);parent=wc
oval_shell('WC | hollow porcelain bowl',(0,0,0),[(.235,.34,.435),(.23,.335,.455),(.19,.28,.446),(.155,.235,.40),(.10,.16,.32),(.055,.08,.24),(.075,.11,.15),(.14,.19,.075),(.19,.25,.12),(.21,.30,.30)],ceramic)
cube('WC | concealed floor pedestal',(0,.08,.11),(.28,.16,.4),ceramic,.06)
oval_shell('WC | separate seat ring',(0,0,-.005),[(.235,.33,.472),(.235,.33,.493),(.192,.278,.497),(.19,.277,.47)],ceramic)
cube('WC | cistern',(0,.61,.36),(.43,.55,.21),ceramic,.06);cube('WC | cistern lid',(0,.893,.36),(.45,.035,.235),ceramic,.018)
cyl('WC | dual flush button',(.07,.917,.36),.036,.008,chrome);cube('WC | flush split',(.07,.923,.36),(.002,.002,.053),dark,.0005)
lid=empty('WC_Lid_Pivot',(0,.49,.25),wc)
lv=[(.235*cos(2*pi*i/64),.29+.29*sin(2*pi*i/64),z) for z in [-.002,.032] for i in range(64)]
lf=[tuple(range(63,-1,-1)),tuple(range(64,128))]+[(i,(i+1)%64,(i+1)%64+64,i+64)for i in range(64)]
lidMesh=mesh('WC | oval raised lid',lv,lf,ceramic,lid);bevel=lidMesh.modifiers.new('Lid rolled edge','BEVEL');bevel.width=.006;bevel.segments=3;lidMesh.modifiers.new('Lid normals','WEIGHTED_NORMAL');lid.rotation_euler[0]=-.15
cyl('WC | water trap',(0,.265,-.01),.08,.006,water)
parent=bath
cube('Toilet roll mounting',(4.68,.68,1.35),(.08,.12,.035),brass,.008);tube('Toilet roll holder',[(4.68,.68,1.31),(4.68,.68,1.18),(4.88,.68,1.18)],.012,brass);cyl('Toilet tissue roll',(4.79,.68,1.18),.066,.15,linen,'x');cube('Tissue loose end',(4.79,.59,1.135),(.15,.15,.006),linen,.001)
# Shower: low threshold, glass fixed panels, operable door, metal fittings and niche.
cube('Shower | sloped-looking stone tray',(5.92,.045,-3.4),(4.28,.06,1.96),stone,.012)
cube('Shower | slim threshold',(5.92,.07,-2.35),(4.28,.065,.07),stone,.008)
for x,w in [(4.43,1.08),(7.08,1.96)]:
 cube('Shower fixed glass',(x,1.15,-2.35),(w,2.18,.008),glass,.002)
 for xx in [x-w/2,x+w/2]:cube('Shower frame upright',(xx,1.16,-2.35),(.018,2.23,.02),brass,.003)
cube('Shower top rail',(5.92,2.285,-2.35),(4.3,.025,.025),brass,.004)
door=empty('Shower_Door_Pivot',(6.05,0,-2.35),bath)
cube('Shower door glass',(-.5,1.16,0),(.97,2.15,.008),glass,.002,door)
for x in [-.98,-.02]:cube('Shower door edge',(x,1.16,0),(.016,2.19,.02),brass,.002,door)
for y in [.32,1.88]:cube('Shower hinge',(-.02,y,.018),(.045,.11,.055),chrome,.008,door)
tube('Shower handle',[(-.86,.95,.04),(-.86,.95,.085),(-.86,1.3,.085),(-.86,1.3,.04)],.012,chrome,door)
parent=bath
cube('Shower | linear drain surround',(6.95,.08,-4.15),(1.15,.014,.075),chrome,.006)
for i in range(24):cube('Linear drain slot',(6.42+i*.046,.089,-4.15),(.018,.003,.047),dark,.002)
tube('Shower | riser',[(6.95,1.1,-4.30),(6.95,2.35,-4.30),(6.95,2.43,-4.23),(6.95,2.43,-3.93)],.02,chrome)
cyl('Rain shower head',(6.95,2.40,-3.93),.18,.035,chrome)
for j in range(4):
 for i in range(12):
  a=2*pi*i/12;r=.035+j*.037;cyl('Rain head rubber nozzle',(6.95+r*cos(a),2.377,-3.93+r*sin(a)),.004,.006,dark,vertices=8)
cube('Shower | mixer plate',(6.95,1.12,-4.445),(.24,.19,.028),chrome,.015)
cyl('Shower | mixer wall connection',(6.95,1.12,-4.371),.033,.15,chrome,'z')
cyl('Shower | mixer knob',(6.95,1.12,-4.30),.045,.06,chrome,'z')
for y in [1.24,2.27]:
 cyl('Shower riser | wall rosette',(6.95,y,-4.452),.034,.025,chrome,'z')
 tube('Shower riser | wall stand-off',[(6.95,y,-4.44),(6.95,y,-4.30)],.014,chrome)
tube('Handshower rail',[(7.63,1.1,-4.31),(7.63,2.03,-4.31)],.012,chrome)
for y in [1.17,1.97]:
 cyl('Handshower | wall rosette',(7.63,y,-4.452),.030,.025,chrome,'z')
 tube('Handshower | rail stand-off',[(7.63,y,-4.44),(7.63,y,-4.31)],.012,chrome)
cyl('Handshower | sliding rail collar',(7.63,1.69,-4.31),.023,.065,chrome)
tube('Handshower | cradle arm',[(7.63,1.69,-4.31),(7.63,1.69,-4.24)],.014,chrome)
cyl('Handshower | cradle sleeve',(7.63,1.69,-4.24),.024,.052,chrome)
head=cyl('Handshower head',(7.63,1.83,-4.24),.065,.025,chrome,'z')
cyl('Handshower | spray insert',(7.63,1.83,-4.225),.056,.005,dark,'z')
for j in range(3):
 for i in range(8+j*4):
  a=i*2*pi/(8+j*4);r=.014+j*.017
  cyl('Handshower | rubber jet',(7.63+r*cos(a),1.83+r*sin(a),-4.221),.0023,.004,linen,'z',vertices=8)
tube('Handshower handle',[(7.63,1.78,-4.24),(7.63,1.60,-4.24)],.018,chrome)
cyl('Hose | handset threaded union',(7.63,1.584,-4.24),.021,.04,chrome)
cyl('Hose | outlet wall rosette',(7.14,1.04,-4.452),.034,.025,chrome,'z')
tube('Hose | wall outlet elbow',[(7.14,1.04,-4.44),(7.14,1.04,-4.28),(7.14,1.005,-4.28)],.018,chrome)
cyl('Hose | outlet threaded union',(7.14,.993,-4.28),.021,.04,chrome)
# Two cubic curves form one hanging hose. Both ends terminate inside threaded unions.
def hose_curve(a,b,c,d,n=48):
 return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in range(3)) for t in [i/n for i in range(n+1)]]
hose= hose_curve((7.63,1.57,-4.24),(7.64,1.18,-4.17),(7.76,.64,-4.16),(7.45,.64,-4.16))
hose+=hose_curve((7.45,.64,-4.16),(7.16,.64,-4.16),(7.14,.83,-4.23),(7.14,.98,-4.28))[1:]
tube('Flexible shower hose',hose,.009,chrome)
for i in range(1,len(hose)-1,3):
 p=Vector(W(hose[i]));direction=(Vector(W(hose[i+1]))-Vector(W(hose[i-1]))).normalized()
 bpy.ops.mesh.primitive_torus_add(major_segments=8,minor_segments=4,location=p,major_radius=.0093,minor_radius=.0011)
 rib=reg(bpy.context.object,'Hose | flexible metal rib',chrome)
 rib.rotation_euler=Vector((0,0,1)).rotation_difference(direction).to_euler()
cube('Shower niche dark recess',(4.65,1.4,-4.34),(1.12,.56,.045),dark,.005)
for y in [1.09,1.71]:cube('Shower niche stone shelf',(4.65,y,-4.23),(1.22,.04,.24),stone,.004)
for x in [4.06,5.24]:cube('Shower niche side',(x,1.4,-4.23),(.04,.64,.24),stone,.004)
for i in range(3):
 cyl('Shower amenity bottle',(4.35+i*.29,1.25,-4.21),.043,.26,material('Amber amenity '+str(i),(.18,.11+.025*i,.045),.25));cyl('Amenity pump',(4.35+i*.29,1.4,-4.21),.026,.04,brass)
tube('Towel rail | mounted to tiled wall',[(6.05,1.48,1.45),(6.05,1.48,1.36),(6.70,1.48,1.36),(6.70,1.48,1.45)],.012,brass)
for x in [6.05,6.70]:cyl('Towel rail | wall rosette',(x,1.48,1.455),.026,.018,brass,'z')
for x in [6.22,6.54]:draped_towel(x,1.48,1.36,.28,.50 if x<6.4 else .46)
# Privacy door: framed frosted pane above a solid lower panel, hinged into the dry zone.
entry=empty('Bath_Entry_Pivot',(3.76,0,-1),bath)
cube('Bathroom door lower panel',(0,.77,.675),(.045,1.5,1.35),oak,.015,entry)
for z in [.065,1.285]:cube('Bathroom door upper stile',(0,1.99,z),(.045,.94,.13),oak,.008,entry)
for y in [1.56,2.45]:cube('Bathroom door upper rail',(0,y,.675),(.045,.09,1.35),oak,.008,entry)
frost=material('Frosted privacy glass',(.62,.70,.66),.55,.05,.78)
cube('Bathroom door frosted pane',(0,2,.675),(.012,.79,1.10),frost,.002,entry)
tube('Bathroom door brass lever',[(.045,1.05,1.12),(.09,1.05,1.12),(.09,1.05,.96)],.012,brass,entry)
for y in [.3,1.3,2.3]:cyl('Bathroom door hinge',(0,y,.015),.018,.11,brass,p=entry)

# Kitchen: full cabinet carcasses, real sink opening and deep stainless bowl.
kitchen=begin('Kitchen316');parent=kitchen
cab=empty('Kitchen_ROOT',(6.3,0,5.04),kitchen);parent=cab
cube('Kitchen | cabinet back',(0,.47,-.32),(3.68,.83,.035),oak)
cube('Kitchen | toe kick',(0,.10,0),(3.62,.15,.57),dark)
cube('Kitchen | bottom shelf',(0,.20,0),(3.68,.04,.65),oak)
for x in [-1.82,-1.30,0,.91,1.82]:cube('Kitchen | cabinet partition',(x,.54,0),(.035,.69,.67),oak)
for x in [-1.35,-.45,.45,1.35]:
 cube('Kitchen | door framed front',(x,.54,.355),(.895,.67,.035),oak,.006)
 cube('Kitchen | door inset panel',(x,.54,.377),(.73,.52,.012),oak,.006)
 tube('Kitchen | brass pull',[(x-.13,.76,.39),(x-.13,.76,.43),(x+.13,.76,.43),(x+.13,.76,.39)],.009,brass)
top=cube('Kitchen | stone counter with real sink opening',(0,.93,0),(3.83,.07,.81),stone,.016);cut_oval(top,(-.8,.93,0),.365,.275)
# Elliptical rounded sink rim transitions down to a deep rectangular-ish metal bowl.
oval_shell('Kitchen | deep stainless sink bowl',(-.8,0,0),[(.378,.288,.970),(.375,.285,.98),(.357,.267,.977),(.34,.25,.95),(.325,.235,.91),(.31,.22,.80),(.29,.20,.765),(.05,.05,.75),(.045,.045,.735),(.29,.20,.745),(.33,.24,.82),(.365,.275,.96)],chrome)
drain('Kitchen basket strainer',(-.8,.752,0),r=.043)
# High arc kitchen mixer, longer than a basin tap.
pts=[(-.8,.98,-.31),(-.8,1.19,-.31)]
for i in range(25):
 a=pi*i/24;pts.append((-.8,1.19+.17*sin(a),-.14-.17*cos(a)))
pts.append((-.8,1.12,.03));tube('Kitchen | curved mixer spout',pts,.018,chrome)
cyl('Kitchen | tap base',(-.8,.982,-.31),.033,.025,chrome);cyl('Kitchen | aerator',(-.8,1.108,.03),.022,.04,chrome)
tube('Kitchen | mixer lever',[(-.73,1.03,-.31),(-.68,1.15,-.31)],.009,chrome)
cube('Kitchen | sponge tray',(-1.37,.984,-.15),(.22,.022,.14),ceramic,.012);cube('Kitchen | sponge',(-1.37,1.01,-.15),(.14,.035,.085),material('Muted green sponge',(.18,.24,.14),.95),.01)
cube('Kitchen | inset two-ring hob',(.88,.976,0),(.84,.025,.57),dark,.018)
for x in [.68,1.08]:
 for rr in [.065,.092,.12]:
  tube('Hob ceramic ring',[(x+rr*cos(2*pi*i/64),.992,rr*sin(2*pi*i/64)) for i in range(65)],.0025,chrome)
 for z in [-.18]:cyl('Hob control',(x,.999,z),.022,.012,brass)
spun_kettle((1.49,.970,0))

# A round enamel wall clock, with independent hour/minute hand pivots.
clock=begin('WallClock316');parent=clock;clock.scale=(.65,.65,.65)
clockInk=material('Clock dial printed ink',(.035,.043,.039),.86)
clockFace=material('Clock matte ivory enamel',(.85,.84,.79),.60)
clockMetal=material('Clock brushed champagne bezel',(.42,.36,.25),.38,.65)
cyl('Clock | dark housing',(0,0,0),.306,.072,dark,'z',vertices=128)
cyl('Clock | fine metal bezel',(0,0,.042),.310,.026,clockMetal,'z',vertices=128)
cyl('Clock | inset dial',(0,0,.055),.291,.012,clockFace,'z',vertices=128)
# All marks point radially away from the axle in Blender's X/Z dial plane.
for i in range(60):
 a=2*pi*i/60;length=.022 if i%5==0 else .009;width=.0042 if i%5==0 else .0019;r=.274-length/2
 mark=cube('Clock tick '+str(i),(sin(a)*r,cos(a)*r,.0614),(width,length,.00035),clockInk,0);mark.rotation_euler[1]=a
font_path='C:/Windows/Fonts/segoeui.ttf'
clockFont=bpy.data.fonts.load(font_path) if os.path.exists(font_path) else bpy.data.fonts.get('Bfont')
for i in range(1,13):
 a=pi*i/6;cu=bpy.data.curves.new('Clock numeral','FONT');cu.body=str(i);cu.font=clockFont;cu.size=.050;cu.align_x='CENTER';cu.align_y='CENTER';cu.extrude=0;cu.resolution_u=20
 ob=bpy.data.objects.new('Clock numeral '+str(i),cu);current.objects.link(ob);ob.parent=clock;ob.location=W((sin(a)*.222,cos(a)*.222,.0617));ob.rotation_euler=(pi/2,0,0);cu.materials.append(clockInk)
for name,length,width,z in [('Clock_Hour_Hand',.145,.012,.076),('Clock_Minute_Hand',.219,.0065,.085)]:
 pivot=empty(name,(0,0,z),clock)
 outline=[(-width/2,-.018),(width/2,-.018),(width/2,length*.70),(width*.17,length),(0,length+.003),(-width*.17,length),(-width/2,length*.70)]
 verts=[(x,y,d) for d in [-.0018,.0018] for x,y in outline];n=len(outline);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 hand=mesh(name+' | tapered blade',verts,faces,ink,pivot)
 for poly in hand.data.polygons:poly.use_smooth=False
cyl('Clock | axle washer',(0,0,.092),.014,.006,clockMetal,'z',vertices=48)
cyl('Clock | dark axle pin',(0,0,.097),.006,.006,ink,'z',vertices=32)
cube('Clock | small key compartment',(0,-.326,-.015),(.20,.065,.075),dark,.008)
cover=empty('Clock_Key_Cover',(0,-.326,.065),clock);cube('Clock | compartment cover',(0,0,-.038),(.18,.052,.014),clockMetal,.005,cover)
mesh('Clock | triangle on rear',[(-.05,-.06,-.040),(.05,-.06,-.040),(.05,.04,-.040)],[(0,1,2)],brass)

# Lounge: rounded upholstered cushions, piping and a proper coffee-table assembly.
lounge=begin('Lounge316');parent=lounge
sofa=empty('Sofa_ROOT',(-1.35,0,8.35),lounge);parent=sofa
cube('Sofa | recessed plinth',(0,.22,.03),(2.25,.23,.92),oak,.04)
for x in [-.98,.98]:
 for z in [-.34,.34]:cyl('Sofa | tapered brass foot',(x,.12,z),.035,.20,brass)
cube('Sofa | upholstery base',(0,.44,0),(2.42,.25,1.02),velvet,.10)
for x in [-1.12,1.12]:cube('Sofa | padded arm',(x,.67,0),(.26,.50,1.03),velvet,.09)
for x in [-.51,.51]:
 cube('Sofa | loose seat cushion',(x,.61,-.075),(.98,.20,.83),velvet,.085)
 back=cube('Sofa | back cushion',(x,.91,.35),(1.00,.56,.22),velvet,.085);back.rotation_euler[0]=-.10
 for yy,zz in [(.705,-.075),(.92,.235)]:
  pts=[]
  for i in range(65):
   a=2*pi*i/64;pts.append((x+.44*math.copysign(abs(cos(a))**.28,cos(a)),yy,zz+.35*math.copysign(abs(sin(a))**.28,sin(a))))
  if yy<.8:tube('Sofa | cushion welt',pts,.004,velvet)
pill=cube('Sofa | accent pillow',(-.72,.87,.02),(.42,.43,.14),linen,.09);pill.rotation_euler[1]=-.2
parent=lounge
table=empty('CoffeeTable_ROOT',(-1.35,0,6.85),lounge);parent=table
cube('Coffee table | rounded stone top',(0,.51,0),(1.7,.065,.82),stone,.032)
cube('Coffee table | underside apron',(0,.45,0),(1.53,.07,.66),oak,.02)
for x in [-.65,.65]:
 for z in [-.25,.25]:cyl('Coffee table | leg',(x,.23,z),.025,.44,brass)
cube('Coffee table | lower shelf',(0,.16,0),(1.45,.035,.59),oak,.014)
cube('Hotel magazine pages',(-.38,.558,-.02),(.34,.025,.43),linen,.003);cube('Hotel magazine cover',(-.38,.573,-.02),(.35,.006,.44),material('Magazine muted ink',(.18,.23,.2),.72),.003)
for i,x in enumerate([.22,.53]):props['cup']('LoungeCup_'+str(i),(x,.544,.06),table)

# Bedroom: framed wardrobe, believable wire hangers, and an actually hollow travel case.
bedroom=begin('Bedroom316');parent=bedroom
wardrobe=empty('Wardrobe_ROOT',(-2.4,0,3.91),bedroom);parent=wardrobe
for x in [-.92,.92]:cube('Wardrobe | oak side',(x,1.32,0),(.065,2.29,.74),oak,.013)
cube('Wardrobe | backing',(0,1.32,.34),(1.82,2.29,.035),oak,.006)
for y in [.19,2.45]:cube('Wardrobe | shelf',(0,y,0),(1.9,.07,.74),oak,.01)
cube('Wardrobe | cornice',(0,2.52,0),(2.05,.10,.85),oak,.022)
for x in [-.76,.76]:
 for z in [-.24,.24]:cyl('Wardrobe | turned foot',(x,.10,z),.055,.20,oak)
tube('Wardrobe | hanging rail',[(-.82,2.15,.04),(.82,2.15,.04)],.014,brass)
for i,x in enumerate([-.54,0,.54]):
 h=empty('Wire_Hanger_'+str(i),(x,2.07,.04),wardrobe)
 pts=[(-.205,-.105,0),(-.19,-.085,0),(-.095,-.048,0),(-.025,0,0),(.025,0,0),(.095,-.048,0),(.19,-.085,0),(.205,-.105,0),(.195,-.12,0),(-.195,-.12,0),(-.205,-.105,0)]
 tube('Hanger | shoulder and trouser bar',pts,.0045,chrome,h)
 hook=[(-.008,.002,0),(-.008,.034,0)]
 hook.extend([( .025+.033*cos(a),.066+.033*sin(a),0) for a in np.linspace(pi, -.4,30)])
 tube('Hanger | curved open hook',hook,.0045,chrome,h)
for side in [-1,1]:
 p=empty('Wardrobe_Door_Left_Pivot' if side<0 else 'Wardrobe_Door_Right_Pivot',(side*.93,0,-.4),wardrobe)
 x=-side*.465
 cube('Wardrobe door | frame',(x,1.32,0),(.924,2.18,.055),oak,.008,p)
 cube('Wardrobe door | upper inset',(x,1.77,-.035),(.72,.97,.018),oak,.006,p)
 cube('Wardrobe door | lower inset',(x,.70,-.035),(.72,.84,.018),oak,.006,p)
 tube('Wardrobe door | brass pull',[(x-side*.3,1.11,-.055),(x-side*.3,1.11,-.10),(x-side*.3,1.31,-.10),(x-side*.3,1.31,-.055)],.011,brass,p)
# Folded linen and shoes give the cabinet usable scale without hiding the hangers.
for i in range(2):cube('Wardrobe | folded blanket',(-.42,.27+i*.07,.02),(.61,.06,.42),linen,.025)
for x in [.30,.57]:cube('Wardrobe | guest slippers',(x,.25,-.02),(.17,.055,.31),linen,.035)
parent=bedroom
for x in [2.13,3.17]:
 tube('Luggage rack | crossed leg A',[(x,0,.58),(x,.49,1.22)],.023,brass)
 tube('Luggage rack | crossed leg B',[(x,0,1.22),(x,.49,.58)],.023,brass)
for z in [.56,1.24]:tube('Luggage rack | top rail',[(2.07,.49,z),(3.23,.49,z)],.022,brass)
for x in [2.2,2.5,2.8,3.1]:cube('Luggage rack | leather web',(x,.486,.9),(.07,.012,.65),dark,.005)
case=empty('Suitcase_ROOT',(2.65,.72,.9),bedroom);parent=case
leather=material('Travel case | dark cognac leather',(.17,.083,.039),.56)
caseLining=textured('Travel case | woven lining',(.38,.33,.24),'fabric',.9)
cube('Travel case | rigid base',(0,-.18,0),(1.10,.065,.68),leather,.025)
for x in [-.525,.525]:cube('Travel case | side shell',(x,-.015,0),(.055,.29,.68),leather,.024)
for z in [-.315,.315]:cube('Travel case | end shell',(0,-.015,z),(1.05,.29,.05),leather,.022)
cube('Travel case | inner lining',(0,-.137,0),(.98,.02,.56),caseLining,.012)
cube('Travel case | repair patch',(0,-.122,-.04),(.14,.008,.09),linen,.004)
cu=bpy.data.curves.new('Repair patch number','FONT');cu.body='316';cu.size=.042;cu.align_x='CENTER';cu.align_y='CENTER';ob=bpy.data.objects.new('Repair patch 316',cu);current.objects.link(ob);ob.parent=case;ob.location=W((0,-.116,-.04));cu.materials.append(ink)
lid=empty('Suitcase_Lid_Pivot',(0,.15,.33),case)
cube('Travel case | padded lid',(0,.045,-.33),(1.10,.12,.68),leather,.045,lid)
cube('Travel case | lid lining',(0,-.025,-.33),(.98,.018,.55),caseLining,.012,lid)
for x in [-.36,.36]:
 cube('Travel case | lid leather strap',(x,.109,-.33),(.07,.009,.67),oak,.004,lid)
 cube('Travel case | brass latch base',(x,.015,-.349),(.105,.09,.025),brass,.01)
 cube('Travel case | latch tongue',(x,-.035,-.68),(.055,.07,.028),brass,.007,lid)
for x in [-.15,.15]:tube('Travel case | handle lug',[(x,.025,-.35),(x,.025,-.39)],.014,brass)
tube('Travel case | curved handle',[(-.15,.025,-.39),(-.13,.085,-.42),(.13,.085,-.42),(.15,.025,-.39)],.022,leather)
for x in [-.43,.43]:
 for z in [-.23,.23]:cube('Travel case | protective foot',(x,-.222,z),(.10,.03,.07),dark,.01)

# Merge static pieces by parent and material while preserving the animated pivots.
for coll in collections.values():
 for ob in list(coll.objects):
  if ob.type in {'CURVE','FONT','MESH'}:
   bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
   bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
   if not ob.get('preserve_uv'):
    uv=ob.data.uv_layers.active or ob.data.uv_layers.new(name='UVMap')
    for poly in ob.data.polygons:
     drop=max(range(3),key=lambda k:abs(poly.normal[k]));axes=[k for k in range(3)if k!=drop]
     for li in poly.loop_indices:
      co=ob.data.vertices[ob.data.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]],co[axes[1]])
 groups={}
 for ob in list(coll.objects):
  if ob.type=='MESH':groups.setdefault((ob.parent.name if ob.parent else '',ob.active_material.name if ob.active_material else ''),[]).append(ob)
 for (_,matname),objects in groups.items():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for ob in objects:ob.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='Merged | '+matname
# Export only the respective collection; all textures are packed into the binaries.
stats={}
for name,coll in collections.items():
 if opt.only and name not in opt.only:continue
 bpy.ops.object.select_all(action='DESELECT')
 for ob in coll.objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=next(ob for ob in coll.objects if ob.type=='MESH')
 file={'Bathroom316':'bathroom-316.glb','Kitchen316':'kitchen-316.glb','WallClock316':'wall-clock-316.glb','Lounge316':'lounge-316.glb','Bedroom316':'bedroom-fixtures-316.glb'}[name]
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,file),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
 stats[file]={'bytes':os.path.getsize(os.path.join(OUT,file)),'objects':len(coll.objects),'triangles':sum(len(p.vertices)-2 for o in coll.objects if o.type=='MESH' for p in o.data.polygons)}
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'hotel-fixtures.blend'))
with open(os.path.join(OUT,'model-spec.json'),'w',encoding='utf8')as f:json.dump(stats,f,indent=2)
print('MODEL_STATS',json.dumps(stats))
