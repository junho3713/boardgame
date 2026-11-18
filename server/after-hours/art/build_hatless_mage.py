"""Blender 4.4: blender -b -P build_hatless_mage.py -- model.glb portrait.png [figure.png]

Models the hatless character from the supplied design sheet in Blender coordinates.
The single skinned mesh faces -Y. The hotel aligns the two eye joints with its camera.
"""
import math
import sys
import tempfile
from pathlib import Path

import bpy
import numpy as np
from mathutils import Quaternion, Vector

output, portrait, *figure = [Path(p).resolve() for p in sys.argv[sys.argv.index("--") + 1:]]
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


skin = paint("Peach porcelain", "ffdabd")
lip = paint("Rose ink", "9e5c60")
hair = paint("Espresso hair", "47343b", .74)
hair_shadow = paint("Plum shadow", "34272e")
hair_light = paint("Chestnut locks", "513b42", .72)
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
    x=(u-.485)/.276
    y=(v-.52)/.56
    r=np.hypot(x,y)
    rgb=np.zeros((h,w,3))
    sclera=np.clip((v-.50)*1.4,0,1)[...,None]
    rgb[:]=[.996,.94,.88]-sclera*[.13,.16,.14]
    a=np.arctan2(y,x)
    bevel=np.clip((.98-r)*10,0,1)
    sunset=np.clip((.67-y)/1.7,0,1)
    ray=(.5+.5*np.cos(a*28+.6*np.sin(a*7)))*np.clip(1-abs(r-.72)*4,0,1)
    pigment=np.array([.22,.10,.17])+sunset[...,None]*[.54,.16,.11]+ray[...,None]*[.055,.038,.02]
    pigment=bevel[...,None]*pigment+(1-bevel[...,None])*[.18,.10,.15]
    pupil=np.clip((.46-np.hypot(x*1.15,(y-.11)*.84))*26,0,1)
    pigment=pigment*(1-pupil[...,None])+pupil[...,None]*[.14,.075,.115]
    inside=np.clip((1-r)*70,0,1)[...,None]
    rgb=rgb*(1-inside)+pigment*inside
    for cx,cy,rx,ry,tint in [(-.32,.45,.19,.22,(1,.98,.89)),(.46,-.42,.085,.10,(1,.86,.63))]:
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
H="Head"
P="Pelvis"
S="Spine"
N="Neck"
C="Cloak"


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
bone(C,(0,.090,1.37),(0,.16,.63),S)
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
head_profile=[
 (1.474,.008,.043,.029),(1.483,.037,.066,.049),(1.503,.068,.088,.067),
 (1.534,.099,.102,.085),(1.566,.120,.111,.102),(1.608,.133,.112,.116),
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
    nose=.0145*math.exp(-(x/.018)**2-((z-1.576)/.017)**2)+.005*math.exp(-(x/.014)**2-((z-1.597)/.038)**2)
    return -front*cross-nose


rows=[]
for z in np.linspace(1.474,1.796,65):
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
    ellipsoid((s*.125,.001,1.567),(.021,.016,.030),skin,H)


def face_line(coords,thickness,material):
    pipe([(x,visage(x,z)-.0024,z) for x,z in coords],thickness,material,H,8)


for s in (-1,1):
    rows=[]
    top,bottom=[],[]
    for i in range(29):
        t=i/28
        x=s*(.018+.081*t)
        crest=sin(pi*t)**.72
        mid=1.609+.0065*t
        high=mid+.023*crest
        low=mid-.0185*crest
        top.append((x,high))
        bottom.append((x,low))
        col=[]
        for k in range(7):
            f=k/6
            z=low+(high-low)*f
            y=visage(x,z)-.002-.004*crest*sin(pi*f)
            col.append(vertex((x,y,z),H,(t,(z-1.586)/.054)))
        rows.append(col)
    grid(rows,eye,reverse=s==1)
    face_line(top,[.0009+.0029*(sin(pi*i/28)**.75)+.0013*i/28 for i in range(29)],ink)
    face_line(bottom[9:],[.00045+.00065*sin(pi*i/19) for i in range(20)],hair_shadow)
    face_line([top[-2],top[-1],(.107*s,1.625)],[.0026,.0027,.00025],ink)
    brow=[((.024+.072*t)*s,1.645+.009*sin(pi*t)+.003*t) for t in np.linspace(0,1,14)]
    face_line(brow,[.0006+.0022*max(0,sin(pi*i/13))**.7 for i in range(14)],hair_shadow)

face_line([(-.020,1.543),(-.012,1.5407),(-.003,1.540),(.005,1.541),(.013,1.5418),(.020,1.544)],
          [.00045,.00115,.00135,.00114,.00085,.0003],lip)
face_line([(-.004,1.568),(.0005,1.5665),(.005,1.568)], [.0003,.0007,.00025],lip)

# Dome, overlapping pointed bob panels and a parted fringe all turn with the head.
def hair_point(a,z,extra=0):
    if z<1.612:
        taper=max(.79,1-(1.612-z)*.72)
        rx,fy,by=.149*taper,.129*taper,.155*taper
    else:
        fac=math.sqrt(max(.0002,1-((z-1.612)/.207)**2))
        rx,fy,by=.152*fac,.130*fac,.155*fac
        if z<1.796:
            sx,front,back=headsize(z)
            rx,fy,by=max(rx,sx+.006),max(fy,front+.020),max(by,back+.005)
    return Vector(((rx+extra)*sin(a),.012-(fy+extra if cos(a)>0 else by+extra)*cos(a),z))


def hairline(a):
    f=max(0,cos(a))
    return 1.500+.012*cos(11*a+.35)*(1-f)+.179*f**1.8


rows=[]
for t in np.linspace(0,1,32):
    rows.append([vertex(hair_point(a,1.818*(1-t)+hairline(a)*t),H) for a in np.arange(72)*tau/72])
grid(rows,hair,True,reverse=True)
face(rows[0],hair)


def lock(start,finish,root,tip,width,shade,depth=.008,streak=False):
    rows=[]
    shine=[]
    root=min(1.816,root+.017)
    for i in range(19):
        t=i/18
        along=t*t*(3-2*t)
        angle=start+(finish-start)*along
        spread=width*(.68+.44*sin(pi*t))*(1-.998*t**2.5)
        lift=sin(min(1,t/.23)*pi/2)
        def strand(u):
            z=root+(tip-root)*t+.006*abs(u)*(1-t)**2
            p=hair_point(angle+u*spread,z,depth*(1-u*u)*lift+.0003)
            if tip<1.50:
                p.x*=1-.17*t**4
                p.y-=.026*t**4
            return p
        row=[]
        for u in np.linspace(-1,1,9):
            row.append(vertex(strand(u),H))
        rows.append(row)
        if .17<t<.74:
            p=strand(-.27)
            p+=Vector((sin(angle),-cos(angle),0))*.001
            shine.append(p)
    grid(rows,shade,reverse=True)
    if streak and len(shine)>1:
        pipe(shine,[.00022+.00085*sin(pi*i/(len(shine)-1)) for i in range(len(shine))],glint,H,6)


for k in range(15):
    a=.99+k*(tau-1.98)/14
    curl=.09*sin(k*1.7)
    lock(a-.08,a+curl,1.779-.011*(k%3),1.491+.019*sin(k*1.82),.226,
         hair_light if k%4==1 else hair,.006+.002*(k%2),k%3==1)
for a,b,tip,w,shade in [(-1.24,-1.10,1.382,.21,hair),(-1.06,-.86,1.411,.145,hair_light),
                          (1.14,1.02,1.390,.205,hair),(1.01,.85,1.427,.13,hair_light)]:
    lock(a,b,1.723,tip,w,shade,.013,True)
for a,b,tip,w,shade in [(-1.08,-1.19,1.556,.23,hair),(-.77,-.93,1.622,.27,hair_light),
                         (-.49,-.65,1.639,.24,hair),(-.28,-.34,1.647,.20,hair_light),
                         (-.055,-.17,1.635,.19,hair),(.11,.18,1.660,.17,hair_light),
                         (.28,.43,1.643,.22,hair),(.53,.66,1.650,.21,hair_light),
                         (.75,.97,1.605,.25,hair)]:
    lock(a,b,1.795,tip,w,shade,.0105,shade==hair_light)

# Tunic, shaped yoke and standing collar. The neckline opens to a small bound V.
torso_rings([(1.345,.071,.059),(1.398,.068,.058),(1.435,.050,.048),(1.509,.047,.044)],skin,N)
torso_rings([(.744,.220,.142),(.758,.226,.144),(.802,.218,.141),(.87,.193,.129),
             (.922,.166,.111),(1.023,.124,.092),(1.092,.118,.085),(1.155,.135,.097),
             (1.239,.154,.110),(1.32,.158,.101),(1.355,.165,.088),
             (1.38,.14,.077),(1.398,.059,.053)],red,trunk,wave=.015)
torso_rings([(.747,.224,.145),(.754,.230,.147),(.775,.227,.147)],gold,trunk,wave=.015)
torso_rings([(.743,.224,.145),(.748,.227,.147)],red_dark,trunk,wave=.015)
torso_rings([(1.415,.052,.049),(1.442,.050,.048)],belt,N)
torso_rings([(1.414,.053,.050),(1.418,.053,.050)],gold,N)

def neck_yoke(a,t):
    front=max(0,cos(a))
    rx=.051+(.163-.051)*t
    ry=.052+(.133-.052)*t
    z=1.425-.063*t-.073*front**3*(1-.78*abs(sin(a)))*t
    x=rx*sin(a)
    y=.003-ry*cos(a)
    if front>.05:
        rz=[1.28,1.32,1.355,1.38,1.398,1.412,1.425]
        width=np.interp(z,rz,[.158,.158,.165,.14,.059,.053,.051])
        depth=np.interp(z,rz,[.106,.101,.088,.077,.053,.052,.051])
        surface=.01-depth*math.sqrt(max(0,1-(x/width)**2))
        y=min(y,surface-.003)
    return Vector((x,y,z))


for lo,hi,mat in [(0,.67,skin),(.67,.93,gold),(.93,1,gold_light)]:
    rows=[[vertex(neck_yoke(k*tau/72,t),S) for k in range(72)] for t in np.linspace(lo,hi,4)]
    grid(rows,mat,True,reverse=True)
for s in (-1,1):
    pipe([(s*.014,-.119,1.292),(s*.010,-.108,1.269),(-s*.009,-.105,1.247)],
         [.0024,.0025,.0018],belt,S,8)
    pipe([(0,-.124,1.288),(s*.012,-.125,1.295),(s*.019,-.123,1.290),(0,-.119,1.281)],
         [.002,.0025,.002,.002],belt,S,8)

def skirt_point(a,z):
    rx=np.interp(z,[.775,.805,.87],[.228,.221,.195])
    ry=np.interp(z,[.775,.805,.87],[.148,.144,.132])
    f=1+.015*cos(8*a+.65*z)
    return (rx*sin(a)*f,.01-ry*cos(a)*f,z)


for k in range(18):
    a=tau*k/18
    points=[skirt_point(a+tau/18*t,.778+.052*(1-abs(2*t-1))) for t in np.linspace(0,1,15)]
    pipe(points,.0038,gold,P,7)

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

# Two-sided, lined cloak. The opening runs behind the elbows, with actual bound edges.
def cloak_point(t,u,inside=False):
    a=.87+(tau-1.74)*u
    edge=abs(2*u-1)
    flare=sin(t*pi*.62)
    rx=.104+.191*flare
    ry=.074+.101*flare
    center=.025+.106*t
    pleat=.011*sin(10*pi*u+.7*t)*sin(pi*.83*t)**1.1
    inset=-.0035 if inside else 0
    return Vector(((rx+pleat+inset)*sin(a),center-(ry+pleat+inset)*cos(a),
                   1.405-t*(.792-.054*edge**4)+.014*t**3*cos(6*pi*u)))


def cloak_joint(t):
    return mixj(S,C,min(1,max(0,(t-.06)/.58)))


for inside,mat in [(False,cape),(True,lining)]:
    rows=[]
    for t in np.linspace(0,1,23):
        rows.append([vertex(cloak_point(t,u,inside),cloak_joint(t)) for u in np.linspace(0,1,57)])
    grid(rows,mat,reverse=not inside)
for t0,t1,mat in [(0,.037,gold),(.951,.986,gold),(.986,1,gold_light)]:
    rows=[]
    for t in np.linspace(t0,t1,4):
        row=[]
        for u in np.linspace(0,1,57):
            pt=cloak_point(t,u)
            pt+=Vector((pt.x,pt.y-(.025+.106*t),0)).normalized()*.0015
            row.append(vertex(pt,cloak_joint(t)))
        rows.append(row)
    grid(rows,mat,reverse=True)
for u in (0,1):
    ts=np.linspace(0,1,30)
    pipe([cloak_point(t,u) for t in ts],[.004+.002*t for t in ts],
         gold,lambda i:cloak_joint(ts[i]),8)

# Shoulder capelet overlaps the sleeve heads and is bound to each upper arm at the edge.
for t0,t1,mat in [(0,.77,cape),(.77,.94,gold),(.94,1,gold_light)]:
    rows=[]
    for t in np.linspace(t0,t1,5):
        row=[]
        for a in np.linspace(.66,tau-.66,65):
            fl=abs(sin(a))
            rx=.055+.186*t
            ry=.056+.082*t
            z=1.431-.019*t-(.043+.064*fl**1.4)*t**3+.018*fl**2*sin(pi*t*.85)
            pt=(rx*sin(a),.005-ry*cos(a),z)
            j=("L" if sin(a)>0 else "R")+" UpperArm"
            row.append(vertex(pt,mixj(S,j,fl**3*t**1.5)))
        rows.append(row)
    grid(rows,mat,reverse=True)

for side,s in [("L",1),("R",-1)]:
    upper,fore,hand=[side+" "+name for name in ("UpperArm","Forearm","Hand")]
    thigh,calf,foot=[side+" "+name for name in ("Thigh","Calf","Foot")]
    def arm_weights(z):
        return mixj(fore,upper,(z-1.116)/.071)
    # Tailored shoulders, gathered sleeves and a turned-back gold cuff.
    sleeve=[(.939,.053,.053,.241,-.019),(.952,.057,.054,.241,-.018),
            (1.002,.052,.050,.231,-.008),(1.093,.052,.053,.212,.006),
            (1.151,.055,.054,.203,.015),(1.199,.056,.056,.192,.018),
            (1.299,.062,.064,.166,.017),(1.347,.068,.067,.150,.014),
            (1.374,.059,.060,.141,.016),(1.389,.035,.043,.136,.015)]
    def sided(rows):
        return [(z,rx,ry,s*x,y) for z,rx,ry,x,y in rows]
    rings(sided(sleeve),red,arm_weights,32)
    rings(sided([(.933,.054,.052,.243,-.020),(.942,.058,.055,.242,-.019),
                 (.971,.056,.054,.238,-.016)]),gold,fore,32)
    rings(sided([(.929,.045,.044,.243,-.020),(.939,.047,.045,.242,-.020)]),red_dark,fore,32)
    # Palm and tapered fingers, held in a relaxed curve.
    ellipsoid((s*.243,-.023,.918),(.032,.021,.044),stocking,hand)
    for j in range(4):
        x=.222+j*.0135
        length=(.048,.055,.051,.040)[j]
        pipe([(s*x,-.030,.900),(s*(x+.002),-.034,.888),
              (s*(x+.004),-.041,.900-length+.007),(s*(x+.003),-.044,.900-length)],
             [.0078,.0076,.0066,.0044],stocking,hand)
    pipe([(s*.221,-.029,.930),(s*.211,-.035,.914),(s*.205,-.041,.902)],
         [.010,.009,.0058],stocking,hand)
    # One dark stocking and one wrapped leg, as in the front view of the sheet.
    legs=[(.115,.038,.040,.091,.015),(.24,.042,.048,.090,.016),
          (.337,.055,.062,.089,.018),(.420,.051,.055,.089,.010),
          (.49,.044,.045,.088,.001),(.526,.049,.052,.088,.001),
          (.64,.063,.069,.084,.009),(.751,.073,.082,.081,.010),(.855,.075,.084,.081,.012)]
    def leg_weights(z):
        return mixj(calf,thigh,(z-.468)/.091)
    legmat=stocking if s==1 else wrap
    rings(sided(legs),legmat,leg_weights,40)
    if s==-1:
        zs=np.linspace(.30,.775,180)
        pts=[]
        for n,z in enumerate(zs):
            a=n/(len(zs)-1)*tau*7.4
            r=[np.interp(z,[p[0] for p in legs],[p[i] for p in legs]) for i in (1,2,3,4)]
            pts.append((s*r[2]+(r[0]+.0005)*sin(a),r[3]-(r[1]+.0005)*cos(a),z))
        pipe(pts,.0024,wrap_shadow,lambda i:leg_weights(zs[i]),6)
    # Boot lasts have a forward toe, a flat sole and a separate stacked heel.
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


mesh=bpy.data.meshes.new("Mage sculpt and wardrobe")
mesh.from_pydata(verts,[],faces)
mesh.update()
model=bpy.data.objects.new("Mage",mesh)
scene.collection.objects.link(model)
for m in materials:
    mesh.materials.append(m)
uv=mesh.uv_layers.new(name="Iris painting")
for polygon,mat in zip(mesh.polygons,colors):
    polygon.use_smooth=True
    polygon.material_index=mat
    for loop in polygon.loop_indices:
        uv.data[loop].uv=uvs[mesh.loops[loop].vertex_index]
groups={j.name[6:]:model.vertex_groups.new(name=j.name) for j in armature.bones}
for i,ws in enumerate(weights):
    for joint,weight in ws.items():
        groups[joint].add([i],weight,"REPLACE")
model.parent=rig
model.modifiers.new("Guest movement","ARMATURE").object=rig


def turn(name,degrees,axis=(1,0,0)):
    joint=rig.pose.bones["Bip01 "+name]
    local=joint.bone.matrix_local.to_quaternion().inverted() @ Vector(axis)
    joint.rotation_quaternion=Quaternion(local,math.radians(degrees))


for action_name,low,walking in [("Stand",False,False),("Walk",False,True),
                                ("Crouch",True,False),("CrouchWalk",True,True)]:
    rig.animation_data_create().action=bpy.data.actions.new(action_name)
    for frame in [1,7,13,19,25]:
        step=sin(tau*(frame-1)/24) if walking else 0
        turn(S,38 if low else 0)
        turn(N,-28 if low else 0)
        turn(C,-43+step*2 if low else step*2.8)
        for side,s in [("L",1),("R",-1)]:
            stride=s*step
            turn(side+" Thigh",(-77 if low else 0)-stride*(12 if low else 24))
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
        for j in rig.pose.bones:
            if j.name[6:] not in (H,P,"LEye","REye","L Hand","R Hand"):
                j.keyframe_insert("rotation_quaternion",frame=frame,group=j.name)
    action=rig.animation_data.action
    track=rig.animation_data.nla_tracks.new()
    track.name=action_name
    track.strips.new(action_name,1,action)
    track.mute=True
    rig.animation_data.action=None
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


photo(portrait,(0,0,1.566),(.16,-1.7,.065),.565,400,500)
if figure:
    photo(figure[0],(0,0,.919),(.65,-2.7,.18),1.99,620,840)
