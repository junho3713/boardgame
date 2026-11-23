"""Build the school's west washroom fittings. All dimensions are metres in game XYZ.
blender -b -P build_school_washroom.py -- scene.glb [editable.blend]
"""
import math
import os
import sys
import bpy
import bmesh
from mathutils import Vector
from math import cos, sin, pi

outputs = [os.path.abspath(p) for p in sys.argv[sys.argv.index('--') + 1:]]
bpy.ops.wm.read_factory_settings(use_empty=True)

def world(p):
    x, y, z = p
    return (x, -z, y)

def material(name, rgb, rough, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    return m

glaze = material('Warm vitreous china', (.78,.79,.66), .22)
ivory = material('Ivory phenolic seat', (.48,.49,.39), .36)
steel = material('Satin nickel', (.46,.54,.53), .26, .69)
edge = material('Exposed alloy edges', (.27,.30,.26), .38, .55)
brass = material('Oxidised brass', (.36,.255,.095), .32, .58)
dark = material('Black rubber and openings', (.022,.029,.028), .62)
green = material('Sea green enamel', (.10,.24,.19), .48)
mint = material('Old partitions', (.215,.345,.286), .61)
red = material('Valve red and fibre tag', (.44,.071,.038), .46)
white = material('Cotton paper', (.72,.70,.55), .86)
soap = material('Amber soap', (.57,.265,.06), .32)
static = 'Architecture'
pieces = {}
pivots = {}

def pivot(name, loc):
    pivots[name] = Vector(world(loc))
    return name

def register(obj, name, mat, group):
    obj.name = name
    obj.data.materials.append(mat)
    pieces.setdefault(group, []).append(obj)
    return obj

def block(name, loc, size, mat, bevel=.008, group=static):
    bpy.ops.mesh.primitive_cube_add(size=1, location=world(loc))
    obj = register(bpy.context.object, name, mat, group)
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Rolled edges','BEVEL')
        mod.width = min(bevel,min(size)*.46)
        mod.segments = 2
        obj.modifiers.new('Face normals','WEIGHTED_NORMAL')
    return obj

def shell(name, x, z, profile, mat, group=static, segments=32):
    # A closed cross-section preserves both the outside silhouette and the inner bowl.
    vertices = [world((x+rx*cos(2*pi*i/segments), y, z+offset+rz*sin(2*pi*i/segments)))
                for rx,rz,y,offset in profile for i in range(segments)]
    faces = [(j*segments+i,j*segments+(i+1)%segments,((j+1)%len(profile))*segments+(i+1)%segments,((j+1)%len(profile))*segments+i)
             for j in range(len(profile)) for i in range(segments)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    bm=bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
    for face in mesh.polygons:
        face.use_smooth=True
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    return register(obj,name,mat,group)

def tube(name, points, radius, mat, group=static, loop=False, sides=6):
    data=bpy.data.curves.new(name,'CURVE')
    data.dimensions='3D'; data.resolution_u=1; data.bevel_depth=radius
    data.bevel_resolution=1 if sides<=8 else 2; data.use_fill_caps=True
    line=data.splines.new('POLY'); line.points.add(len(points)-1)
    for point,p in zip(line.points,points):
        point.co=(*world(p),1)
    line.use_cyclic_u=loop
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    return register(obj,name,mat,group)

def ring(name, center, axes, radius, mat, group=static):
    x,y,z=center; a,b=axes
    tube(name,[(x+a*cos(i*pi/16),y,z+b*sin(i*pi/16)) for i in range(32)],radius,mat,group,True)

def pedestal_sink(i,z):
    x=.44
    body='Basin'+str(i)
    shell('Moulded glazed lavatory',x,z,[
        (.030,.030,.730,0),(.105,.170,.755,0),(.165,.250,.820,0),(.200,.295,.890,0),
        (.214,.314,.927,0),(.236,.344,.932,0),(.249,.351,.915,0),
        (.229,.325,.870,0),(.176,.263,.755,0),(.093,.144,.692,0),(.030,.030,.688,0)],glaze,body,44)
    block('Ceramic tap deck',(.167,.900,z),(.22,.067,.64),glaze,.032,body)
    ring('Drain flange',(x,.732,z),(.027,.027),.004,steel,body)
    bung=pivot('Stopper'+str(i),(x,.732,z))
    block('Black rubber waste plug',(x,.738,z),(.044,.012,.044),dark,.006,bung)
    tube('Plug pull ring',[(x-.012,.743,z),(x-.012,.756,z),(x+.012,.756,z),(x+.012,.743,z)],.0028,steel,bung)
    tube('Exposed bottle trap',[(x,.694,z),(x,.43,z),(x-.025,.395,z),(x-.122,.395,z),(x-.151,.43,z),(x-.151,.52,z),(.072,.52,z)],.022,steel)
    for yy in [.50,.67]: ring('Compression collar',(x,yy,z),(.023,.023),.005,edge)
    tap=pivot('Tap'+str(i),(.218,.990,z+.105))
    tube('Bent gooseneck',[(.188,.932,z),(.188,1.08,z),(.194,1.126,z),(.214,1.151,z),(.251,1.167,z),(.352,1.168,z),(.391,1.157,z),(.414,1.138,z),(.42,1.111,z)],.016,steel,body)
    ring('Spout aerator',(.42,1.113,z),(.017,.017),.0038,edge,body)
    tube('Chromed tap spindle',[(.218,.938,z+.105),(.218,.989,z+.105)],.018,steel,body)
    for angle in range(4):
        a=pi*angle/2
        tube('Four-lobed tap handle',[(.218,.990,z+.105),(.218+.043*cos(a),.998,z+.105+.043*sin(a))],.010,steel,tap)
    block('Cold index',(.218,1.005,z+.105),(.025,.009,.025),green,.004,tap)
    for off in [-.22,.22]:
        tube('Wall bracket',[(.064,.792,z+off),(.34,.792,z+off),(.073,.622,z+off)],.012,edge)
    # The supply shutoff and an enamel soap dispenser sit below and above the deck.
    tube('Water feed',[(.08,.60,z+.14),(.16,.60,z+.14),(.18,.64,z+.14),(.18,.87,z+.11)],.011,brass)
    block('Liquid soap housing',(.102,1.36,z-.44),(.16,.31,.13),ivory,.025)
    block('Amber sight glass',(.187,1.37,z-.44),(.018,.112,.048),soap,.008)
    block('Pump tab',(.16,1.19,z-.44),(.11,.035,.076),steel)

# Plan sections run from the flat back, around the right cheek, to the rounded nose.
# Widths are half-widths. The rear deck and washdown well are part of one casting.
pan_outline = [(0,0),(.62,.003),(.83,.046),(.88,.22),(.97,.48),
               (.99,.66),(.87,.83),(.55,.951),(0,1)]
tank_outline = [(0,0),(.70,.001),(.91,.037),(.98,.17),(1,.49),
                (.98,.78),(.89,.944),(.60,.989),(0,1)]
well_outline = [(0,0),(.48,.056),(.79,.175),(.96,.345),(1,.53),
                (.94,.70),(.78,.84),(.47,.95),(0,1)]
seat_outline = [(0,0),(.42,.009),(.69,.066),(.89,.21),(.99,.43),
                (.96,.66),(.80,.835),(.48,.95),(0,1)]

def perimeter(half):
    points=half+[(-a,b) for a,b in reversed(half[1:-1])]
    n=len(points)
    for i in range(n):
        a,b,c,d=[points[(i+k)%n] for k in (-1,0,1,2)]
        for step in range(3):
            t=step/3
            yield tuple(.5*(2*B+(-A+C)*t+(2*A-5*B+4*C-D)*t*t+
                            (-A+3*B-3*C+D)*t*t*t) for A,B,C,D in zip(a,b,c,d))

def casting(name,x,rows,mat,group,through=False):
    # Each row gives the height, half-width and rear/front limits in metres.
    vertices=[]
    for height,width,rear,front,shape in rows:
        vertices.extend(world((x+u*width,height,rear+v*(front-rear))) for u,v in perimeter(shape))
    n=len(vertices)//len(rows)
    faces=[]
    for j in range(len(rows) if through else len(rows)-1):
        a=j*n; b=((j+1)%len(rows))*n
        faces.extend((a+i,a+(i+1)%n,b+(i+1)%n,b+i) for i in range(n))
    if not through:
        for j in (0,len(rows)-1):
            y,_,rear,front,_=rows[j]
            center=len(vertices);vertices.append(world((x,y,(rear+front)/2)))
            faces.extend((j*n+i,j*n+(i+1)%n,center) for i in range(n))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for face in mesh.polygons: face.use_smooth=True
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return register(obj,name,mat,group)

def toilet(i,x):
    pan='Pan'+str(i);tank='Tank'+str(i)
    p,w,t,c=pan_outline,well_outline,tank_outline,seat_outline
    casting('Back-to-wall washdown pan',x,[
        (.005,.135,.108,.614,p),(.009,.144,.100,.629,p),(.025,.147,.099,.635,p),
        (.052,.145,.101,.633,p),(.118,.136,.103,.607,p),(.183,.132,.103,.604,p),
        (.231,.140,.101,.638,p),(.274,.158,.098,.705,p),(.318,.177,.096,.759,p),
        (.353,.188,.095,.791,p),(.372,.190,.095,.804,p),(.382,.189,.096,.808,p),
        (.389,.184,.099,.803,p),(.391,.175,.103,.793,p),
        (.391,.149,.393,.755,w),(.387,.145,.400,.750,w),(.378,.144,.399,.748,w),
        (.351,.140,.402,.736,w),(.310,.130,.406,.718,w),
        (.256,.102,.418,.673,w),(.222,.079,.431,.627,w),
        (.190,.056,.442,.578,w),(.167,.044,.448,.549,w),(.156,.037,.449,.532,w),
        (.141,.031,.438,.504,w),(.122,.028,.421,.477,w)
    ],glaze,pan)
    # Thin seat ring spans the ceramic lip and rests on four rubber buffers.
    for dx in (-.121,.121):
        for zz in (.472,.667):
            block('Seat buffer',(x+dx,.395,zz),(.025,.009,.039),ivory,.004,pan)
    casting('Thermoset seat ring',x,[
        (.400,.178,.359,.802,c),(.402,.184,.354,.807,c),(.412,.185,.354,.808,c),
        (.418,.181,.356,.803,c),(.422,.172,.361,.792,c),
        (.422,.146,.409,.746,w),(.418,.141,.414,.742,w),(.410,.139,.416,.740,w),
        (.401,.142,.412,.744,w)],ivory,pan,True)
    cover=pivot('SeatCover'+str(i),(x,.426,.352))
    casting('Domed seat cover',x,[
        (.430,.173,.355,.799,c),(.429,.181,.353,.805,c),(.433,.187,.351,.810,c),
        (.441,.187,.351,.810,c),(.449,.180,.354,.803,c),
        (.455,.160,.374,.782,c),(.459,.113,.416,.739,c),
        (.461,.052,.484,.675,c)],ivory,cover)
    for dx in (-.075,.075):
        tube('Chrome hinge foot',[(x+dx,.390,.349),(x+dx,.417,.349)],.019,steel,pan)
        tube('Hinge axis',[(x+dx-.030,.426,.352),(x+dx+.030,.426,.352)],.009,steel,pan)
        tube('Cover hinge leaf',[(x+dx,.426,.352),(x+dx,.436,.373)],.012,ivory,cover)
    for dx in (-.125,.125):
        block('Lid buffer',(x+dx,.426,.625),(.024,.009,.043),ivory,.004,cover)
    # Tank foot lands on the cast rear deck. Wall and bottom continue into the interior.
    casting('Close-coupled hollow cistern',x,[
        (.390,.147,.120,.292,t),(.394,.153,.115,.296,t),(.407,.156,.114,.299,t),
        (.430,.165,.110,.304,t),(.490,.177,.103,.309,t),(.663,.195,.091,.317,t),
        (.707,.198,.089,.318,t),(.716,.197,.090,.317,t),(.718,.192,.092,.314,t),
        (.718,.181,.104,.303,t),(.713,.178,.106,.301,t),(.695,.178,.106,.301,t),
        (.483,.157,.120,.287,t),(.437,.147,.126,.281,t),(.424,.137,.132,.275,t)
    ],glaze,tank)
    lid=pivot('CisternLid' if i==2 else 'FixedLid',(x,.718,.205))
    casting('Fitted cistern cap',x,[
        (.718,.197,.088,.320,t),(.720,.207,.082,.327,t),(.731,.207,.082,.327,t),
        (.738,.202,.085,.323,t),(.743,.185,.093,.314,t),(.748,.151,.111,.294,t)
    ],glaze,lid)
    handle=pivot('Flush'+str(i),(x+.192,.658,.219))
    tube('Flush spindle',[(x+.188,.658,.219),(x+.207,.658,.219)],.017,steel,tank)
    tube('Flush paddle',[(x+.205,.658,.219),(x+.217,.658,.222),
         (x+.219,.653,.258),(x+.219,.647,.281)],.009,steel,handle)
    tube('Paddle grip',[(x+.219,.650,.263),(x+.219,.647,.281)],.011,steel,handle)
    # A flexible supply loops from the wall stop to the tank inlet.
    tube('Braided supply hose',[(x+.147,.437,.186),(x+.166,.411,.185),
         (x+.186,.343,.181),(x+.210,.292,.171),(x+.244,.273,.164),
         (x+.277,.281,.160),(x+.304,.323,.158),(x+.319,.382,.157)],.008,steel)
    tube('Angle stop',[(x+.319,.382,.036),(x+.319,.382,.194)],.014,brass)
    tube('Wall escutcheon',[(x+.319,.382,.033),(x+.319,.382,.046)],.033,steel)
    valve=pivot('Supply' if i==2 else 'FixedValve',(x+.319,.382,.196))
    for j in range(3):
        a=j*2*pi/3
        tube('Handwheel spoke',[(x+.319,.382,.196),(x+.319+.038*cos(a),.382+.038*sin(a),.196)],.005,red,valve)
    tube('Red stop wheel',[(x+.319+.043*cos(j*pi/16),.382+.043*sin(j*pi/16),.196)
         for j in range(32)],.007,red,valve,True)
    if i==2:
        tube('Overflow standpipe',[(x-.119,.426,.236),(x-.119,.683,.236)],.012,ivory)
        arm=pivot('FloatArm',(x-.139,.665,.178))
        tube('Brass float arm',[(x-.139,.665,.178),(x-.102,.665,.179),(x-.001,.649,.184)],.004,brass,arm)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=world((x-.001,.648,.184)))
        bob=register(bpy.context.object,'Copper float',brass,arm)
        bob.scale=(.041,.027,.023)
        for face in bob.data.polygons:face.use_smooth=True
        key=pivot('LostKey',(x+.054,.431,.219))
        ring('Key bow',(x+.054,.432,.219),(.022,.016),.004,brass,key)
        block('Key blade',(x+.017,.432,.219),(.054,.007,.010),brass,.0015,key)
        for dx in [-.008,.003]:
            block('Key cut',(x+dx,.432,.225),(.006,.007,.015),brass,.001,key)
        block('Enamel locker fob',(x+.091,.432,.226),(.052,.008,.032),red,.003,key)
    panel=pivot('Stall'+str(i),(x-.70,0,2.15))
    block('Laminated stall door',(x-.014,1.135,2.15),(1.367,1.86,.050),mint,.014,panel)
    for dx in [-.678,.647]:
        block('Folded door trim',(x+dx,1.135,2.15),(.026,1.86,.059),edge,.006,panel)
    for y in [.46,1.77]:
        tube('Hinge knuckle',[(x-.70,y,2.15),(x-.70,y+.115,2.15)],.023,steel,panel)
    block('Latch rose',(x+.47,1.13,2.185),(.12,.08,.018),edge,.009,panel)
    tube('Pull handle',[(x+.47,1.1,2.183),(x+.47,1.1,2.232),(x+.47,1.24,2.232),(x+.47,1.24,2.183)],.013,steel,panel)
    block('Vacancy indicator',(x+.47,1.28,2.183),(.07,.027,.012),green,.004,panel)
    for dx in [-.79,.79]:
        block('Front pilaster',(x+dx,1.14,2.15),(.13,1.96,.073),mint)
        tube('Levelling foot',[(x+dx,.018,2.15),(x+dx,.21,2.15)],.022,steel)
    block('Divider',(x-.806,1.14,1.13),(.045,1.93,2.07),mint)
    for yy in [.32,1.96]:
        block('Wall angle',(x-.806,yy,.103),(.085,.12,.06),steel)
    tube('Paper roll',[(x+.64,.83,1.03),(x+.64,.83,1.17)],.061,white)
    block('Roll holder',(x+.67,.83,1.10),(.10,.16,.19),edge,.015)
    block('Hanging paper',(x+.59,.75,1.102),(.008,.14,.119),white,.002)

pedestal_sink(1,3.68); pedestal_sink(2,5.12)
toilet(1,1.12); toilet(2,2.82)
for xx in (2.15,2.55):
    block('Rack wall plate',(xx,.646,.049),(.048,.159,.013),steel,.004)
    tube('Folded shelf stay',[(xx,.708,.053),(xx,.708,.339),(xx,.685,.339),
         (xx,.582,.058)],.009,steel)
for zz in (.088,.160,.231,.304):
    tube('Rack rail',[(2.143,.711,zz),(2.557,.711,zz)],.007,steel)
block('End partition',(3.63,1.14,1.13),(.045,1.93,2.07),mint)
tube('Partition headrail',[(.27,2.14,2.15),(3.64,2.14,2.15)],.027,steel)
for x in [1.2,2.65,4.16]:
    tube('Old ceiling feed',[(x,3.13,.11),(x,3.13,6.61)],.025,ivory)
    for z in [1.55,4.77]:
        block('Pipe clip',(x,3.16,z),(.079,.085,.045),edge)
# Mop sink and offset wall tap near the high window.
block('Janitor basin base',(1.02,.16,6.30),(.72,.16,.63),glaze,.030)
for dx in [-.333,.333]: block('Slop sink side',(1.02+dx,.31,6.30),(.066,.25,.63),glaze,.023)
for dz in [-.28,.28]: block('Slop sink end',(1.02,.31,6.30+dz),(.66,.25,.065),glaze,.022)
tube('Mop shaft',[(1.06,.32,6.30),(1.42,1.64,6.62)],.015,brass)
for j in range(13):
    a=j*2.4
    tube('Wet mop strand',[(1.06,.36,6.3),(1.06+.09*cos(a),.24,6.3+.09*sin(a))],.012,ivory)
block('Vent cover',(4.55,2.70,.072),(.63,.41,.06),ivory,.023)
for i in range(8):block('Vent louvre',(4.55,2.56+i*.037,.108),(.52,.016,.022),dark,.004)

# Props on the corridor lost-property cabinet, exported in the cabinet's local frame.
rack='PropertyRack'
block('Dented aluminium lunch tin',(.23,.908,.045),(.39,.118,.226),edge,.043,rack)
block('Overlapping lid',(.23,.970,.045),(.40,.030,.233),steel,.034,rack)
block('Faded pupil tag',(.24,.987,.04),(.17,.006,.063),white,.002,rack)
for dx in [-.12,.12]:
    block('Tin lid clasp',(.23+dx,.934,.163),(.043,.056,.014),steel,.004,rack)
tube('Umbrella shaft',[(-.57,.90,.035),(.004,.90,.035)],.009,edge,rack)
tube('Curved umbrella grip',[(-.56,.90,.035),(-.587,.91,.035),(-.606,.93,.035),(-.61,.958,.035),(-.595,.978,.035),(-.572,.982,.035)],.014,dark,rack)
for i in range(8):
    a=i*pi/4
    tube('Folded umbrella gore',[(-.50,.90+.028*cos(a),.035+.028*sin(a)),(-.38,.90+.043*cos(a),.035+.043*sin(a)),(-.19,.90+.029*cos(a+.17),.035+.029*sin(a+.17)),(-.035,.90,.035)],.015,green,rack)
tube('Umbrella tip',[(-.05,.90,.035),(.018,.90,.035)],.010,brass,rack)
lock=pivot('TrayPadlock',(0,0,0))
block('Padlock body',(0,-.039,0),(.082,.078,.032),brass,.009,lock)
tube('Steel shackle',[(-.030,-.004,0),(-.030,.034,0),(-.023,.051,0),(0,.059,0),(.023,.051,0),(.030,.034,0),(.030,-.004,0)],.009,steel,lock)
block('Keyway',(0,-.043,.018),(.014,.025,.005),dark,.004,lock)
tube('Broken thread on shackle',[(.030,.029,0),(.046,.010,.009),(.041,-.004,.016),(.053,-.019,.016)],.003,red,lock)

# Preserve each authored part in the editable file. Batch the exported meshes by motion group.
for name,objects in pieces.items():
    col=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(col)
    for obj in objects:
        for old in list(obj.users_collection): old.objects.unlink(obj)
        col.objects.link(obj)
if len(outputs)>1:
    # The two corridor groups are stored separately from the bathroom fittings in Blender.
    for n in ['PropertyRack','TrayPadlock']:
        bpy.data.collections[n].hide_viewport=True
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=outputs[1],compress=True)
    for n in ['PropertyRack','TrayPadlock']: bpy.data.collections[n].hide_viewport=False
for name,objects in pieces.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.convert(target='MESH')
    if len(objects)>1: bpy.ops.object.join()
    obj=bpy.context.view_layer.objects.active
    # Bake world-space vertices around the named interactive pivot.
    mat=obj.matrix_world.copy(); p=pivots.get(name,Vector((0,0,0)))
    mat.translation-=p
    obj.data.transform(mat)
    obj.rotation_euler=(0,0,0); obj.scale=(1,1,1); obj.location=p
    obj.name=name; obj.data.name=name+'Mesh'
bpy.ops.export_scene.gltf(filepath=outputs[0],export_format='GLB',export_yup=True,
                          export_texcoords=False,export_tangents=False,export_cameras=False,
                          export_lights=False,export_animations=False,export_extras=False)
