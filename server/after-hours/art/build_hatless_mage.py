"""Blender 4.4: blender -b -P build_hatless_mage.py -- model.glb portrait.png [figure.png] [source.blend]

Models the hatless character from the supplied design sheet in Blender coordinates.
The editable costume pieces share one rig facing -Y. All dimensions are in metres.
"""
import math
import sys
import tempfile
from pathlib import Path

import bpy
import numpy as np
from mathutils import Quaternion, Vector

output, portrait, *extras = [Path(p).resolve() for p in sys.argv[sys.argv.index("--") + 1:]]
figure = next((p for p in extras if p.suffix.lower()==".png"), None)
source_scene = next((p for p in extras if p.suffix.lower()==".blend"), None)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 24
tau = math.tau
sin, cos, pi = math.sin, math.cos, math.pi


def linear(c):
    c /= 255
    return c / 12.92 if c < .04045 else ((c + .055) / 1.055) ** 2.4


materials = []
def paint(name, color, rough=.76, metal=0, fill=.20):
    rgb = tuple(linear(int(color[i:i+2],16)) for i in (0,2,4))
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb,1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    for k, v in {"Base Color":(*rgb,1),"Roughness":rough,"Metallic":metal,
                 "Specular IOR Level":.23,"Emission Color":(*rgb,1),"Emission Strength":fill}.items():
        shader.inputs[k].default_value = v
    materials.append(mat)
    return len(materials)-1


skin = paint("Warm peach skin", "f5cfb0", .96, fill=.18)
lip = paint("Rose ink", "9e5c60")
mouth = paint("Mouth interior", "773d48", .96)
tongue = paint("Lower lip and tongue", "dc8883", .94)
tooth = paint("Warm ivory", "fbe5d2", .90)
hair = paint("Espresso hair", "503b42", .90, fill=.27)
hair_shadow = paint("Plum shadow", "34272e")
hair_light = paint("Chestnut locks", "59414a", .90, fill=.25)
glint = paint("Chestnut ribbon light", "70505a", .68)
ink = paint("Soft black lashes", "312533")
red = paint("Vermilion wool", "b83646")
red_dark = paint("Crimson binding", "872c3c")
gold = paint("Saffron braid", "efb753", .64)
gold_light = paint("Sunlit piping", "ffd783", .56)
cape = paint("Aubergine cloak", "493747")
lining = paint("Oxblood lining", "763f44")
boot = paint("Russet leather", "b55537", .58)
sole = paint("Chestnut soles", "61393b")
stocking = paint("Charcoal stocking", "483f51")
wrap = paint("Ivory linen", "f0e6dc")
wrap_shadow = paint("Linen selvedge", "c7bdb6")
belt = paint("Black cherry belt", "42333e")
buckle = paint("Old silver", "c4c2c4", .34, .46)
eye = paint("Hand-painted ruby eyes", "ffffff", .56, fill=.24)


def iris_map():
    # One eye painting is shared by both eyes. Mesh UVs retain the almond silhouette.
    w,h = 320,192
    u,v = np.meshgrid((np.arange(w)+.5)/w,(np.arange(h)+.5)/h)
    x=(u-.48)/.225
    y=(v-.515)/.445
    r=np.hypot(x,y)
    rgb=np.zeros((h,w,3))
    sclera=np.clip((v-.50)*1.4,0,1)[...,None]
    rgb[:]=[.996,.94,.88]-sclera*[.13,.16,.14]
    a=np.arctan2(y,x)
    bevel=np.clip((.98-r)*10,0,1)
    sunset=np.clip((.67-y)/1.7,0,1)
    ray=(.5+.5*np.cos(a*28+.6*np.sin(a*7)))*np.clip(1-abs(r-.72)*4,0,1)
    pigment=np.array([.15,.085,.13])+sunset[...,None]*[.60,.14,.13]+ray[...,None]*[.055,.038,.02]
    pigment=bevel[...,None]*pigment+(1-bevel[...,None])*[.18,.10,.15]
    pupil=np.clip((.40-np.hypot(x*1.15,(y-.11)*.84))*26,0,1)
    pigment=pigment*(1-pupil[...,None])+pupil[...,None]*[.14,.075,.115]
    inside=np.clip((1-r)*70,0,1)[...,None]
    rgb=rgb*(1-inside)+pigment*inside
    for cx,cy,rx,ry,tint in [(-.34,.37,.21,.15,(1,.98,.89)),(.39,-.53,.095,.067,(1,.86,.63))]:
        spot=np.clip((1-np.hypot((x-cx)/rx,(y-cy)/ry))*14,0,1)[...,None]
        rgb=rgb*(1-spot)+spot*tint
    img=bpy.data.images.new("Garnet iris",width=w,height=h,alpha=False)
    rgba=np.ones((h,w,4),dtype=np.float32)
    rgba[...,:3]=np.clip(rgb,0,1)
    img.pixels.foreach_set(rgba.ravel())
    with tempfile.TemporaryDirectory() as tmp:
        img.filepath_raw=str(Path(tmp)/"garnet.png")
        img.file_format="PNG"
        img.save()
        packed=bpy.data.images.load(img.filepath_raw)
        packed.pack()
    mat=materials[eye]
    tex=mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image=packed
    for key in ("Base Color","Emission Color"):
        mat.node_tree.links.new(tex.outputs["Color"],mat.node_tree.nodes.get("Principled BSDF").inputs[key])


iris_map()
verts,faces,colors,weights,uvs=[],[],[],[],[]
parts=[]
def part(name):
    parts.append((name,len(verts),len(faces)))
H="Head"
P="Pelvis"
S="Spine"
N="Neck"


def vertex(point, joint, uv=(0,0)):
    weights.append({joint:1} if isinstance(joint,str) else joint)
    verts.append(tuple(point))
    uvs.append(uv)
    return len(verts)-1


def face(indices, material):
    faces.append(tuple(indices))
    colors.append(material)


def grid(rows,material,wrap_cols=False,reverse=False):
    n=len(rows[0])
    for a,b in zip(rows,rows[1:]):
        for j in range(n if wrap_cols else n-1):
            k=(j+1)%n
            ids=[a[j],a[k],b[k],b[j]]
            face(ids[::-1] if reverse else ids,material)


def mixj(j1,j2,t):
    t=max(0,min(1,t))
    return {j:w for j,w in [(j1,1-t),(j2,t)] if w>0}


def trunk(z):
    return mixj(P,S,(z-.94)/.21)


def rings(profiles, material, joint, segments=48, wave=0):
    # Each row is height, horizontal radius, depth, centre x, centre y.
    rows=[]
    for z,rx,ry,cx,cy in profiles:
        row=[]
        for j in range(segments):
            a=tau*j/segments
            ripple=1+wave*cos(8*a+.65*z)
            point=(cx+rx*sin(a)*ripple,cy-ry*cos(a)*ripple,z)
            row.append(vertex(point,joint(z) if callable(joint) else joint))
        rows.append(row)
    grid(rows,material,True)
    face(rows[0][::-1],material)
    face(rows[-1],material)


def torso_rings(rows,material,joint,**opts):
    rings([(z,x,y,0,.01) for z,x,y in rows],material,joint,**opts)


def pipe(points, radii, material, joint, sides=10):
    pts=[Vector(p) for p in points]
    rows=[]
    for i,pt in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
        axis=Vector((0,1,0))
        if abs(tangent.dot(axis))>.93:
            axis=Vector((1,0,0))
        a=tangent.cross(axis).normalized()
        b=tangent.cross(a).normalized()
        r=float(radii if isinstance(radii,(float,int)) else radii[i])
        j=joint(i) if callable(joint) else joint
        rows.append([vertex(pt+r*(cos(t*tau/sides)*a+sin(t*tau/sides)*b),j) for t in range(sides)])
    grid(rows,material,True)
    face(rows[0][::-1],material)
    face(rows[-1],material)


def ellipsoid(center,scale,material,joint):
    cx,cy,cz=center
    rows=[]
    for a in np.linspace(-pi/2+.016,pi/2-.016,15):
        rows.append((cz+scale[2]*sin(a),scale[0]*cos(a),scale[1]*cos(a),cx,cy))
    rings(rows,material,joint,24)


# Named joints also serve as real eye anchors for the first person mirror.
armature=bpy.data.armatures.new("Mage skeleton")
rig=bpy.data.objects.new("Hatless travelling mage",armature)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
def bone(name,start,end,parent=None):
    j=armature.edit_bones.new("Bip01 "+name)
    j.head,j.tail=start,end
    if parent:
        j.parent=armature.edit_bones["Bip01 "+parent]
    return j


bone(P,(0,.01,.90),(0,.01,1.09))
bone(S,(0,.01,1.09),(0,.01,1.397),P)
bone(N,(0,.008,1.397),(0,0,1.482),S)
bone(H,(0,0,1.482),(0,0,1.765),N)
for side,s in [("L",1),("R",-1)]:
    bone(side+"Eye",(.057*s,-.105,1.612),(.057*s,-.135,1.612),H)
    bone(side+" UpperArm",(.144*s,.013,1.374),(.203*s,.018,1.147),S)
    bone(side+" Forearm",(.203*s,.018,1.147),(.237*s,-.017,.951),side+" UpperArm")
    bone(side+" Hand",(.237*s,-.017,.951),(.249*s,-.027,.859),side+" Forearm")
    bone(side+" Thigh",(.084*s,.012,.913),(.088*s,.003,.508),P)
    bone(side+" Calf",(.088*s,.003,.508),(.090*s,.018,.111),side+" Thigh")
    bone(side+" Foot",(.090*s,.018,.111),(.090*s,-.108,.044),side+" Calf")
bpy.ops.object.mode_set(mode="OBJECT")

# The face narrows towards the jaw and has a shallow projected nose and upper lip.
part("Face and ears")
head_profile=[
 (1.495,.005,.060,.027),(1.502,.028,.076,.043),(1.517,.055,.089,.061),
 (1.539,.086,.102,.083),(1.567,.112,.112,.102),(1.608,.129,.113,.116),
 (1.648,.138,.115,.126),(1.686,.136,.117,.133),(1.720,.126,.114,.126),
 (1.75,.106,.103,.110),(1.775,.075,.079,.085),(1.791,.039,.045,.051),(1.796,.005,.009,.010)]


head_rows=np.array(head_profile)
head_z=head_rows[:,0]
head_derivatives=np.gradient(head_rows[:,1:],head_z,axis=0)
def headsize(z):
    i=max(0,min(len(head_z)-2,int(np.searchsorted(head_z,z)-1)))
    height=head_z[i+1]-head_z[i]
    t=float(np.clip((z-head_z[i])/height,0,1))
    return ((2*t**3-3*t*t+1)*head_rows[i,1:] + (t**3-2*t*t+t)*height*head_derivatives[i]
            +(-2*t**3+3*t*t)*head_rows[i+1,1:] + (t**3-t*t)*height*head_derivatives[i+1])


def visage(x,z):
    rx,front,_=headsize(z)
    cross=max(0,1-min(abs(x)/rx,.99999)**2.45)**.50
    nose=.020*math.exp(-(x/.014)**2-((z-1.573)/.014)**2)+.007*math.exp(-(x/.013)**2-((z-1.595)/.03)**2)
    socket=.0042*math.exp(-((abs(x)-.054)/.030)**2-((z-1.616)/.020)**2)
    cheek=.005*math.exp(-((abs(x)-.075)/.033)**2-((z-1.573)/.023)**2)
    return -front*cross-nose+socket-cheek


rows=[]
for z in np.linspace(1.495,1.796,72):
    rx,_,back=headsize(z)
    row=[]
    for k in range(96):
        a=tau*k/96
        x=rx*sin(a)
        y=visage(x,z) if cos(a)>=0 else -back*cos(a)
        row.append(vertex((x,y,z),H))
    rows.append(row)
grid(rows,skin,True)
face(rows[0][::-1],skin)
face(rows[-1],skin)
for s in (-1,1):
    ellipsoid((s*.119,.003,1.568),(.014,.013,.023),skin,H)


def face_line(coords,thickness,material):
    pipe([(x,visage(x,z)-.0024,z) for x,z in coords],thickness,material,H,8)


part("Eyes, brows and expression")
for s in (-1,1):
    rows=[]
    top,bottom=[],[]
    for i in range(29):
        t=i/28
        x=s*(.023+.069*t)
        crest=max(0,sin(pi*t))**.70
        mid=1.608+.0125*t+(.0012 if s<0 else 0)
        high=mid+.0135*crest
        low=mid-.0188*crest
        top.append((x,high))
        bottom.append((x,low))
        col=[]
        for k in range(7):
            f=k/6
            z=low+(high-low)*f
            y=visage(x,z)-.002-.004*crest*sin(pi*f)
            col.append(vertex((x,y,z),H,(t,(z-1.587)/.052)))
        rows.append(col)
    grid(rows,eye,reverse=s==1)
    face_line(top,[.0009+.0029*(sin(pi*i/28)**.75)+.0013*i/28 for i in range(29)],ink)
    face_line(bottom[9:],[.00045+.00065*sin(pi*i/19) for i in range(20)],hair_shadow)
    face_line([top[-2],top[-1],(.100*s,1.629)],[.0026,.0027,.00025],ink)
    brow=[((.019+.069*t)*s,1.634+.020*t+.003*sin(pi*t)) for t in np.linspace(0,1,14)]
    face_line(brow,[.0006+.0022*max(0,sin(pi*i/13))**.7 for i in range(14)],hair_shadow)

def expression_patch(outline,mat,offset):
    # Slightly convex painted surface, conforming to the cheek in three-quarter view.
    center=[sum(v[i] for v in outline)/len(outline) for i in (0,1)]
    cx,cz=center
    middle=vertex((cx,visage(cx,cz)-offset,cz),H)
    border=[vertex((x,visage(x,z)-offset,z),H) for x,z in outline]
    for i,j in enumerate(border):
        face([middle,j,border[(i+1)%len(border)]],mat)

opening=[(-.025,1.545),(-.022,1.548),(-.015,1.550),(-.006,1.549),(.003,1.550),
         (.012,1.555),(.020,1.555),(.025,1.551),(.027,1.545),(.026,1.536),
         (.022,1.530),(.016,1.529),(.005,1.533),(-.006,1.536),(-.017,1.539),(-.024,1.541)]
expression_patch(opening[::-1],mouth,.0021)
expression_patch([(-.012,1.539),(.000,1.539),(.009,1.540),(.016,1.541),(.023,1.540),
                  (.024,1.536),(.021,1.532),(.017,1.531),(.004,1.535)][::-1],tongue,.0027)
expression_patch([(-.019,1.548),(-.011,1.548),(-.014,1.543)][::-1],tooth,.0033)
face_line([(-.003,1.572),(.0005,1.571),(.003,1.572)],[.00025,.00048,.00025],lip)

# A continuous bob shell has a hand-plotted hairline. The main fringe is cut
# into that shell so the crown stays smooth when viewed from above or behind.
part("Bob and swept fringe")
hair_edges=[(-180,1.544),(-156,1.536),(-141,1.549),(-130,1.531),(-120,1.552),
 (-111,1.533),(-102,1.559),(-93,1.540),(-82,1.568),(-74,1.552),(-66,1.577),
 (-58,1.611),(-52,1.625),(-45,1.678),(-42,1.644),(-35,1.638),(-31,1.680),
 (-27,1.652),(-18,1.640),(-14,1.704),(-11,1.657),(1,1.632),(5,1.639),
 (10,1.710),(15,1.671),(24,1.650),(28,1.680),(35,1.648),(45,1.632),
 (48,1.662),(53,1.639),(62,1.600),(68,1.581),(76,1.553),(85,1.572),
 (94,1.538),(106,1.557),(116,1.534),(125,1.549),(143,1.532),
 (155,1.549),(170,1.536),(180,1.544)]
angles=np.array([p[0] for p in hair_edges])
fringe=np.array([p[1] for p in hair_edges])
samples=sorted(set(range(-180,180,3))|set(angles[:-1]))
def hair_surface(a,z):
    # The crown sweeps forward into a narrow, turned-under nape.
    d=(z-1.642)/.161
    f=math.sqrt(max(.0002,1-max(0,d)**2))
    lower=max(0,1.638-z)
    rx=(.155-.19*lower)*f
    front=(.143-.085*lower)*f
    back=(.159-.105*lower)*f
    if z<1.791:
        sx,fy,by=headsize(z)
        rx=max(rx,sx+.007)
        front=max(front,fy+.022)
        back=max(back,by+.008)
    return Vector((rx*sin(a),.010-(front if cos(a)>=0 else back)*cos(a),z))

rows=[]
for t in np.linspace(0,1,42):
    row=[]
    for deg in samples:
        a=math.radians(deg)
        edge=float(np.interp(deg,angles,fringe))
        # Near the part each section sweeps across the forehead rather than radiating straight down.
        # Common crown rings avoid twisting quads above each deep fringe notch.
        z=(1.8028+(1.718-1.8028)*t/.64 if t<.64 else 1.718+(edge-1.718)*(t-.64)/.36)
        bend=.11*sin(pi*min(1,(1.8028-z)/.16))*cos(a+.4)
        p=hair_surface(a+bend,z)
        row.append(vertex(p,H))
    rows.append(row)
grid(rows,hair,True,reverse=True)
face(rows[0],hair)
# A narrow dark underside defines the tips without a thick ink outline.
turned=[]
for deg in samples:
    a=math.radians(deg)
    z=float(np.interp(deg,angles,fringe))
    p=hair_surface(a,z+.003)
    p.x*=.985
    p.y=.01+(p.y-.01)*.984
    turned.append(vertex(p,H))
grid([rows[-1],turned],hair_shadow,True,reverse=True)

def tress(sections,mat):
    # Cubic interpolation of section centres, widths and twists gives a curved
    # tapered solid with a different silhouette from the front, side and rear.
    path=np.array(sections,dtype=float)
    slope=np.gradient(path,axis=0)
    rows=[]
    for q in np.linspace(0,len(path)-1,(len(path)-1)*9+1):
        k=min(int(q),len(path)-2)
        t=q-k
        x,y,z,w,d,angle=((2*t**3-3*t*t+1)*path[k]+(t**3-2*t*t+t)*slope[k]
                   +(-2*t**3+3*t*t)*path[k+1]+(t**3-t*t)*slope[k+1])
        a=math.radians(angle)
        row=[]
        for v in np.arange(16)*tau/16:
            across=max(.0002,w)*cos(v)
            depth=max(.0002,d)*sin(v)
            row.append(vertex((x+across*cos(a)-depth*sin(a),y+across*sin(a)+depth*cos(a),z),H))
        rows.append(row)
    grid(rows,mat,True,reverse=True)
    face(rows[0],mat)
    face(rows[-1][::-1],mat)

part("Face-framing locks")
for s in (-1,1):
    # The long locks sit forward of the ears, narrow by the jaw, and kick out at the shoulder.
    def side(points):
        return [(s*x,y,z,w,d,s*angle) for x,y,z,w,d,angle in points]
    tress(side([(.103,-.027,1.742,.011,.003,55),(.122,-.065,1.684,.024,.006,51),
                (.130,-.069,1.615,.025,.007,55),(.120,-.066,1.553,.021,.007,60),
                (.096,-.062,1.497,.021,.007,43),(.090,-.073,1.451,.023,.007,34),
                (.105,-.083,1.405,.022,.007,26),(.122,-.086,1.381,.014,.004,18),
                (.143,-.083,1.366+.008*s,.0005,.0005,10)]),hair)
    tress(side([(.134,.031,1.722,.017,.006,94),(.151,.036,1.664,.025,.009,82),
                (.152,.047,1.610,.021,.009,70),(.164,.063,1.584,.013,.005,52),
                (.183,.079,1.573,.0006,.0005,27)]),hair)
    tress(side([(.137,.063,1.687,.016,.008,95),(.148,.078,1.630,.023,.008,86),
                (.146,.092,1.582,.018,.006,75),(.132,.106,1.546,.0007,.0004,60)]),hair_light)

# Continuous bare neck and shoulders, a broad bound neckline and the bodice
# share a cross-section at their seams. There is no overlapping shoulder mantle.
part("Neck and exposed shoulders")
def shoulder_weight(a,t):
    j=("L" if sin(a)>0 else "R")+" UpperArm"
    return mixj(S,j,.72*abs(sin(a))**6*t)
def garment_ring(z,rx,ry,side_rise,shift,weight,fold=0):
    row=[]
    for a in np.arange(96)*tau/96:
        flank=abs(sin(a))
        drape=fold*(.65*sin(7*a+.8)+.35*sin(11*a-1.1))
        pt=((rx+drape)*sin(a),shift-(ry+drape*.7)*cos(a),z+side_rise*flank**1.4)
        row.append(vertex(pt,weight(a) if callable(weight) else weight))
    return row
# From the bound neckline to the neck. A gently modelled clavicle lies in the mesh.
neckline=(1.302,.211,.113,.016,.009)
surface_sections=[neckline,(1.315,.209,.110,.023,.010),(1.329,.202,.105,.026,.012),
                  (1.346,.190,.094,.026,.013),(1.362,.171,.083,.022,.014),
                  (1.375,.140,.072,.017,.013),(1.388,.100,.061,.010,.011),
                  (1.407,.062,.050,.004,.008),(1.430,.045,.044,.0,.007),
                  (1.470,.042,.043,.0,.005),(1.515,.047,.047,.0,.001)]
rows=[]
for i,(z,rx,ry,rise,cy) in enumerate(surface_sections):
    row=garment_ring(z,rx,ry,rise,cy,(lambda a: shoulder_weight(a,max(0,1-i/7))) if i<8 else N)
    rows.append(row)
grid(rows,skin,True)

part("Off-shoulder tunic")
body_sections=[(.742,.220,.141,.002),(.748,.223,.144,.002),(.772,.220,.143,.002),(.803,.210,.137,.003),
               (.89,.174,.120,.0045),(.976,.142,.101,.0025),(1.032,.124,.088,.001),
               (1.064,.122,.088,.001),(1.100,.134,.092,.005),(1.145,.142,.101,.003),
               (1.19,.149,.106,.0025),(1.229,.156,.111,.002),(1.260,.177,.113,.0018),
               (1.280,.205,.114,.001)]
rows=[]
for z,rx,ry,fold in body_sections:
    side_rise=.016*max(0,min(1,(z-1.20)/.080))
    row=garment_ring(z,rx,ry,side_rise,.009,
          (lambda a:shoulder_weight(a,(z-1.20)/.080)) if z>1.20 else trunk(z),fold)
    rows.append(row)
for i in range(len(rows)-1):
    grid(rows[i:i+2],red_dark if i==0 else gold if i==1 else red,True)
face(rows[0][::-1],red_dark)
part("Bound neckline and hem embroidery")
rows=[]
for t,rx,ry in [(0,.205,.113),(.10,.209,.115),(.82,.212,.116),(1,.211,.113)]:
    rows.append(garment_ring(1.280+.022*t,rx,ry,.016,.009,lambda a:shoulder_weight(a,1)))
grid(rows,gold,True)
for s in (-1,1):
    pipe([(s*.014,-.104,1.279),(s*.009,-.108,1.265),(-s*.013,-.106,1.248)],
         [.0018,.0025,.0009],belt,S,8)
def skirt_point(a,z):
    rx,ry,fold=[np.interp(z,[p[0] for p in body_sections],[p[i] for p in body_sections]) for i in (1,2,3)]
    fold*=.65*sin(7*a+.8)+.35*sin(11*a-1.1)
    return ((rx+fold+.001)*sin(a),.009-(ry+.7*fold+.001)*cos(a),z)
for k in range(18):
    a=tau*k/18
    rows=[[vertex(skirt_point(a+tau/18*t,.775+.049*(1-abs(2*t-1))+dz),P)
           for t in np.linspace(0,1,17)] for dz in [-.0025,.0025]]
    grid(rows,gold)

part("Choker and clasp")
rings([(1.457,.0445,.045,0,.004),(1.459,.0455,.046,0,.004),
       (1.480,.046,.047,0,.004),(1.482,.045,.046,0,.004)],belt,N)
def plate(x,z,d):
    return (x,-.043-d+.15*x,z)
for w,h,d,mat in [(.010,.012,.0015,buckle),(.007,.009,.0024,stocking)]:
    ids=[vertex(plate(.008+x,1.469+z,d),N) for x,z in [(-w,-h),(w,-h),(w,h),(-w,h)]]
    face(ids,mat)

part("Waist belt and buckle")

# A slanted leather belt uses its own surface so the buckle sits flush.
def beltpoint(a,t):
    return (.132*sin(a),.006-.101*cos(a),1.036+.020*sin(a)+t*.062)


rows=[[vertex(beltpoint(k*tau/64,t),trunk(1.075)) for k in range(64)] for t in [0,.06,.94,1]]
grid(rows,belt,True)
for level in (.06,.94):
    pts=[beltpoint(k*tau/64,level) for k in range(65)]
    pipe(pts,.0018,sole,trunk(1.075),6)
buckle_c=Vector((.043,-.094,1.078))
def clasp(x,z):
    return buckle_c+Vector((x,.25*x-.002,z+.16*x))
pipe([clasp(x,z) for x,z in [(-.026,-.019),(.026,-.019),(.026,.019),(-.026,.019),(-.026,-.019)]],
     .0048,buckle,trunk(1.075),10)
pipe([clasp(-.006,0),clasp(.021,0)],.0024,buckle,trunk(1.075),8)



for side,s in [("L",1),("R",-1)]:
    upper,fore,hand=[side+" "+name for name in ("UpperArm","Forearm","Hand")]
    thigh,calf,foot=[side+" "+name for name in ("Thigh","Calf","Foot")]
    def arm_weights(z):
        return mixj(fore,upper,(z-1.116)/.071)
    # Tailored shoulders, gathered sleeves and a turned-back gold cuff.
    part(side+" sleeve")
    sleeve=[(.939,.051,.051,.241,-.019),(.952,.053,.053,.241,-.018),
            (.992,.048,.047,.234,-.013),(1.021,.047,.050,.226,-.005),
            (1.074,.052,.053,.214,.002),(1.109,.049,.050,.210,.009),
            (1.145,.051,.052,.200,.013),(1.174,.055,.053,.197,.015),
            (1.219,.056,.056,.182,.017),(1.254,.054,.058,.172,.016),
            (1.279,.043,.051,.163,.016),(1.294,.025,.038,.155,.016)]
    def sided(rows):
        return [(z,rx,ry,s*x,y) for z,rx,ry,x,y in rows]
    rings(sided(sleeve),red,arm_weights,32)
    rings(sided([(.933,.054,.052,.243,-.020),(.942,.058,.055,.242,-.019),
                 (.971,.056,.054,.238,-.016)]),gold,fore,32)
    rings(sided([(.929,.045,.044,.243,-.020),(.939,.047,.045,.242,-.020)]),red_dark,fore,32)
    # Palm and tapered fingers, held in a relaxed curve.
    part(side+" fingerless glove")
    ellipsoid((s*.243,-.023,.918),(.029,.019,.041),stocking,hand)
    for j in range(4):
        x=.222+j*.0135
        length=(.042,.047,.044,.034)[j]
        curl=(.011,.019,.025,.027)[j] if s==1 else (.012,.014,.016,.019)[j]
        path=[(s*x,-.026,.901),(s*(x+.001),-.026,.891),
              (s*(x+.002),-.027+.35*curl,.902-length*.64),
              (s*(x+.001),-.028+.78*curl,.902-length*.93),
              (s*x,-.027+curl,.902-length)]
        pipe(path,[.0070,.0068,.0065,.0056,.0035],skin,hand)
        ellipsoid(path[-1],(.0036,.0038,.0034),skin,hand)
    pipe([(s*.221,-.029,.930),(s*.211,-.035,.914),(s*.205,-.041,.902)],
         [.009,.008,.0049],skin,hand)
    # One dark stocking and one wrapped leg, as in the front view of the sheet.
    part(side+" leg")
    legs=[(.115,.038,.040,.091,.015),(.24,.042,.048,.090,.016),
          (.337,.055,.062,.089,.018),(.420,.051,.055,.089,.010),
          (.49,.044,.045,.088,.001),(.526,.049,.052,.088,.001),
          (.64,.063,.069,.084,.009),(.751,.073,.082,.081,.010),(.855,.075,.084,.081,.012)]
    def leg_weights(z):
        return mixj(calf,thigh,(z-.468)/.091)
    legmat=stocking if s==1 else wrap
    rings(sided(legs),legmat,leg_weights,40)
    if s==-1:
        rows=[]
        for t in np.linspace(0,7.05,259):
            a=t*tau
            row=[]
            for offset,thickness in [(0,.0025),(.003,.0028),(.029,.0018),(.060,.0008),(.064,.0003)]:
                z=.339+t*.0595+offset
                r=[np.interp(z,[p[0] for p in legs],[p[i] for p in legs]) for i in (1,2,3,4)]
                pt=(s*r[2]+(r[0]+thickness)*sin(a),r[3]-(r[1]+thickness)*cos(a),z)
                row.append(vertex(pt,leg_weights(z)))
            rows.append(row)
        grid(rows,wrap,reverse=True)
    # Boot lasts have a forward toe, a flat sole and a separate stacked heel.
    part(side+" boot")
    rings(sided([(.021,.052,.099,.091,-.046),(.037,.054,.103,.091,-.047),
                 (.057,.055,.104,.091,-.048),(.075,.052,.089,.091,-.036),
                 (.093,.043,.061,.091,-.005),(.118,.039,.048,.091,.008),
                 (.14,.040,.047,.091,.014)]),boot,foot,42)
    rings(sided([(.014,.052,.099,.091,-.047),(.021,.055,.104,.091,-.047),
                 (.031,.055,.105,.091,-.047)]),sole,foot,40)
    rings(sided([(.005,.042,.035,.091,.020),(.023,.046,.040,.091,.018)]),sole,foot,28)
    rings(sided([(.095,.041,.045,.091,.014),(.126,.042,.047,.091,.015),
                 (.192,.044,.048,.090,.017),(.283,.052,.054,.089,.016),
                 (.310,.059,.060,.089,.016)]),boot,calf,36)
    cuff=[]
    for t in [0,.08,.84,1]:
        cuff.append([vertex((s*.089+(.061-.003*t)*sin(a),.016-(.061-.003*t)*cos(a),
                    .300+.059*t-.020*max(0,cos(a))**4),calf) for a in np.arange(40)*tau/40])
    grid(cuff,gold,True)
    for i,t in [(0,0),(-1,1)]:
        inner=[]
        for a in np.arange(40)*tau/40:
            inner.append(vertex((s*.089+(.054-.003*t)*sin(a),.016-(.054-.003*t)*cos(a),
                        .301+.058*t-.020*max(0,cos(a))**4),calf))
        grid([cuff[i],inner],gold,True,reverse=t==0)


parts.append(("End",len(verts),len(faces)))
# Painted shadows keep the jaw and collarbones readable under the hotel's moving lights.
def painted_skin(name,point):
    x,y,z=point
    base=np.array(materials[skin].diffuse_color[:3])
    dark=blush=0.
    if name=="Face and ears":
        front=max(0,min(1,-y/.065))
        blush=math.exp(-((abs(x)-.079)/.026)**2-((z-1.581)/.014)**2)*front
        dark=.13*max(0,min(1,(z-1.644)/.03))*front
    elif name=="Neck and exposed shoulders":
        dark=.28*math.exp(-((z-1.479)/.030)**2)
        if y<-.020:
            collar=1.361+.14*abs(x)
            dark+=.14*math.exp(-((z-collar)/.007)**2)*math.exp(-((abs(x)-.065)/.047)**2)
            dark+=.08*math.exp(-(x/.014)**2-((z-1.364)/.010)**2)
    return (*np.clip(base*(1-dark)*[1,1-.16*blush,1-.12*blush],0,1),1)

def use_paint(mat_id,layer):
    mat=materials[mat_id]
    shade=mat.node_tree.nodes.new("ShaderNodeVertexColor")
    shade.layer_name=layer
    # glTF carries vertex paint on base colour only. Its emissive colour is uniform.
    mat.node_tree.links.new(shade.outputs["Color"],mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])

use_paint(skin,"Skin paint")
use_paint(hair,"Chestnut tones")
use_paint(hair_light,"Chestnut tones")
for (name,v0,f0),(_,v1,f1) in zip(parts,parts[1:]):
    mesh=bpy.data.meshes.new(name)
    local_faces=[tuple(idx-v0 for idx in f) for f in faces[f0:f1]]
    mesh.from_pydata(verts[v0:v1],[],local_faces)
    mesh.update()
    model=bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(model)
    palette=sorted(set(colors[f0:f1]))
    for m in palette:
        mesh.materials.append(materials[m])
    if skin in palette:
        tint=mesh.color_attributes.new(name="Skin paint",type="BYTE_COLOR",domain="POINT")
        for i,pt in enumerate(verts[v0:v1]):
            tint.data[i].color=painted_skin(name,pt)
    if name in ("Bob and swept fringe","Face-framing locks"):
        tint=mesh.color_attributes.new(name="Chestnut tones",type="BYTE_COLOR",domain="POINT")
        for i,(x,y,z) in enumerate(verts[v0:v1]):
            a=math.atan2(x,-y+.010)
            ridge=1.733+.014*cos(a+.55)
            sheen=math.exp(-((z-ridge)/.017)**2)*(.5+.5*cos(a+.8))**2
            side_shadow=.20*max(0,min(1,(1.67-z)/.10))
            base=np.array(materials[hair].diffuse_color[:3])
            color=base*(1-side_shadow+.13*sheen+.024*cos(13*a+4*z))
            tint.data[i].color=(*color,1)
    uv=mesh.uv_layers.new(name="Iris painting") if eye in palette else None
    for poly,mat in zip(mesh.polygons,colors[f0:f1]):
        poly.use_smooth=True
        poly.material_index=palette.index(mat)
        if uv:
            for loop in poly.loop_indices:
                uv.data[loop].uv=uvs[v0+mesh.loops[loop].vertex_index]
    joints=sorted({j for ws in weights[v0:v1] for j in ws})
    groups={j:model.vertex_groups.new(name="Bip01 "+j) for j in joints}
    for i,ws in enumerate(weights[v0:v1]):
        for joint,weight in ws.items():
            groups[joint].add([i],weight,"REPLACE")
    model.parent=rig
    model.modifiers.new("Guest movement","ARMATURE").object=rig


def turn(name,degrees,axis=(1,0,0)):
    joint=rig.pose.bones["Bip01 "+name]
    local=joint.bone.matrix_local.to_quaternion().inverted() @ Vector(axis)
    joint.rotation_quaternion=Quaternion(local,math.radians(degrees))


def aim_at(name,point):
    bpy.context.view_layer.update()
    j=rig.pose.bones["Bip01 "+name]
    turn_world=(j.tail-j.head).rotation_difference(Vector(point)-j.head)
    base=j.matrix.to_quaternion() @ j.rotation_quaternion.inverted()
    j.rotation_quaternion=base.inverted() @ turn_world @ base @ j.rotation_quaternion


def show_palm():
    bpy.context.view_layer.update()
    j=rig.pose.bones["Bip01 L Hand"]
    axis=(j.tail-j.head).normalized()
    current=(j.matrix @ j.bone.matrix_local.inverted()).to_quaternion() @ Vector((0,-1,0))
    camera=Vector((.15,-1,0))
    a=(current-axis*current.dot(axis)).normalized()
    b=(camera-axis*camera.dot(axis)).normalized()
    angle=math.atan2(axis.dot(a.cross(b)),a.dot(b))
    base=j.matrix.to_quaternion() @ j.rotation_quaternion.inverted()
    j.rotation_quaternion=base.inverted() @ Quaternion(axis,angle) @ base @ j.rotation_quaternion


for action_name,low,walking in [("Stand",False,False),("Walk",False,True),
                                ("Crouch",True,False),("CrouchWalk",True,True)]:
    rig.animation_data_create().action=bpy.data.actions.new(action_name)
    for frame in [1,7,13,19,25]:
        step=sin(tau*(frame-1)/24) if walking else 0
        turn(S,38 if low else 0)
        turn(N,-28 if low else 0)
        if not low and not walking:
            neck=rig.pose.bones["Bip01 Neck"]
            rest=neck.bone.matrix_local.to_quaternion()
            # A small downward glance and asymmetric head tilt complement the drawn brows.
            attitude=Quaternion((0,1,0),math.radians(-4)) @ Quaternion((1,0,0),math.radians(4))
            neck.rotation_quaternion=rest.inverted() @ attitude @ rest
        for side,s in [("L",1),("R",-1)]:
            stride=s*step
            turn(side+" Thigh",(-77 if low else (3*s if not walking else 0))-stride*(12 if low else 24))
            turn(side+" Calf",(116 if low else 2)+max(-stride,0)*(13 if low else 22))
            turn(side+" Foot",(-39 if low else -2)+stride*9)
            for part,pitch,spread in [
                ("UpperArm",(-51 if low else -4)+stride*16,(-9 if s==1 else 3)*(1-abs(step)*.5)),
                ("Forearm",(-31 if low else (-27 if s==1 else -8))-max(-stride,0)*12,
                 (19 if s==1 else -4)*(1-abs(step)*.65)),
            ]:
                name=side+" "+part
                turn(name,pitch)
                arm=rig.pose.bones["Bip01 "+name]
                axis=arm.bone.matrix_local.to_quaternion().inverted() @ Vector((0,1,0))
                arm.rotation_quaternion=Quaternion(axis,math.radians(spread)) @ arm.rotation_quaternion
            if side=="L" and not walking and not low:
                aim_at("L UpperArm",(.209,-.069,1.174))
                aim_at("L Forearm",(.107,-.165,1.311))
                aim_at("L Hand",(.059,-.171,1.342))
                show_palm()
        for j in rig.pose.bones:
            if j.name[6:] not in (H,P,"LEye","REye","R Hand"):
                j.keyframe_insert("rotation_quaternion",frame=frame,group=j.name)
    action=rig.animation_data.action
    track=rig.animation_data.nla_tracks.new()
    track.name=action_name
    track.strips.new(action_name,1,action)
    track.mute=True
    rig.animation_data.action=None
    for j in rig.pose.bones:
        j.rotation_quaternion=(1,0,0,0)
for j in rig.pose.bones:
    j.rotation_quaternion=(1,0,0,0)
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_animation_mode="ACTIONS",
                          export_force_sampling=False,export_skins=True,export_morph=False,
                          export_cameras=False,export_lights=False)
rig.animation_data.action=bpy.data.actions["Stand"]
scene.frame_set(1)

scene.world=bpy.data.worlds.new("Soft daylight")
scene.world.color=(.19,.19,.19)
def studio_light(name,xyz,color,power,size):
    data=bpy.data.lights.new(name,"AREA")
    data.energy,data.color,data.shape,data.size=power,color,"DISK",size
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=xyz
    obj.rotation_euler=(Vector((0,0,1.26))-obj.location).to_track_quat("-Z","Y").to_euler()


studio_light("Window",(-2.1,-3.1,3.8),(1,.89,.80),160,3.6)
studio_light("Sky", (2.4,-1.8,2.0),(.86,.90,1),95,3)
studio_light("Hair edge",(.9,1.6,3.2),(1,.78,.68),140,2.3)
scene.render.engine="CYCLES"
scene.cycles.samples=20
scene.cycles.use_denoising=True
scene.view_settings.view_transform="Standard"
scene.render.film_transparent=True
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
bpy.ops.object.camera_add()
cam=bpy.context.object
cam.data.type="ORTHO"
scene.camera=cam
def photo(file,target,offset,scale,w,h):
    cam.location=Vector(target)+Vector(offset)
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.ortho_scale=scale
    scene.render.resolution_x,scene.render.resolution_y=w,h
    scene.render.resolution_percentage=100
    scene.render.filepath=str(file)
    bpy.ops.render.render(write_still=True)


photo(portrait,(0,0,1.508),(.72,-1.7,.105),.625,520,650)
if figure:
    photo(figure,(0,0,.912),(.52,-2.7,.15),1.94,550,800)
if source_scene:
    scene.frame_end=25
    rig.data.display_type="STICK"
    bpy.ops.object.select_all(action="DESELECT")
    mesh=bpy.data.objects["Face and ears"]
    bpy.context.view_layer.objects.active=mesh
    scene.render.filepath="//mage-render.png"
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                space=area.spaces.active
                space.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
                space.region_3d.view_distance=2.85
                space.region_3d.view_location=(0,0,.94)
                space.region_3d.view_perspective="ORTHO"
                space.overlay.show_overlays=False
                space.shading.type="MATERIAL"
    if bpy.data.images.get("Garnet iris"):
        bpy.data.images.remove(bpy.data.images["Garnet iris"])
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(source_scene),compress=True)
