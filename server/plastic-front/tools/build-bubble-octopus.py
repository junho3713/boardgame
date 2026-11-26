"""Bake the Bubble Octopus rubber toy with Blender 4.x and Pillow.

Run with Python (requires Blender on PATH or the BLENDER environment variable).
Optionally pass --preview path.png for a large render of the same game model.
"""

import argparse
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

CELL, VIEWS, POSES, COLUMNS = 128, 16, 4, 8
OUTPUT = Path(__file__).resolve().parents[1] / "public/assets/models/bubble-octopus-v2.webp"


def bake():
    from PIL import Image

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    blender = os.environ.get("BLENDER") or shutil.which("blender")
    if not blender:
        installs = Path(os.environ.get("ProgramFiles", "")).glob("Blender Foundation/Blender 4*/blender.exe")
        blender = next(iter(sorted(installs, reverse=True)), None)
    if not blender:
        parser.error("Set BLENDER to the Blender executable.")
    with tempfile.TemporaryDirectory() as tmp:
        command = [str(blender), "-b", "-noaudio", "--python-exit-code", "1",
                   "--python", str(Path(__file__).resolve()), "--", tmp]
        if args.preview:
            command.append(str(args.preview.resolve()))
        subprocess.run(command, check=True)
        sheet = Image.new("RGBA", (CELL * COLUMNS, CELL * POSES * VIEWS // COLUMNS))
        for index in range(POSES * VIEWS):
            with Image.open(Path(tmp) / f"{index}.png") as frame:
                tile = frame.convert("RGBA").resize((CELL, CELL), Image.Resampling.LANCZOS)
            sheet.paste(tile, (index % COLUMNS * CELL, index // COLUMNS * CELL))
        sheet.save(OUTPUT, "WEBP", method=6, quality=93, exact=True)
        print(f"{OUTPUT.name} · {OUTPUT.stat().st_size:,} bytes")


if __name__ == "__main__" and "--" not in sys.argv:
    bake()
    sys.exit(0)

import bpy
from mathutils import Vector


def srgb(rgb):
    def linear(channel):
        v = channel / 255
        return v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4
    return (*map(linear, rgb), 1)


def rubber(name, color, roughness=.36, grain=True):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    surface = nodes.get("Principled BSDF")
    surface.inputs["Base Color"].default_value = srgb(color)
    surface.inputs["Roughness"].default_value = roughness
    if grain:
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 178
        noise.inputs["Detail"].default_value = 2
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = .13
        bump.inputs["Distance"].default_value = .003
        links.new(noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], surface.inputs["Normal"])
    return mat


def sculpt(name, vertices, faces, materials, surfaces=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    for mat in materials:
        data.materials.append(mat)
    for face in data.polygons:
        face.use_smooth = True
        if surfaces:
            face.material_index = surfaces[face.index]
    obj.parent = toy
    return obj


def sphere(name, center, size, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=28, location=center)
    obj = bpy.context.object
    obj.name, obj.scale, obj.parent = name, size, toy
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def turned_ring(name, origin, axis, profile, materials):
    """Revolved cross section with a front rim and a real recessed center."""
    axis = Vector(axis).normalized()
    up = Vector((0, 0, 1)) if abs(axis.z) < .92 else Vector((0, 1, 0))
    side = axis.cross(up).normalized()
    up = axis.cross(side)
    slices = 40
    vertices, faces, used = [], [], []
    for z, radius, _ in profile:
        center = Vector(origin) + axis * z
        for j in range(slices):
            phi = math.tau * j / slices
            vertices.append(center + radius * (side * math.cos(phi) + up * math.sin(phi)))
    for k, (_, _, material) in enumerate(profile[:-1]):
        for i in range(slices):
            a, b = k * slices + i, k * slices + (i + 1) % slices
            faces.append((a, b, b + slices, a + slices))
            used.append(material)
    return sculpt(name, vertices, faces, materials, used)


def catmull(points, t):
    s = t * (len(points) - 1)
    i = min(int(s), len(points) - 2)
    u = s - i
    a, b = points[max(0, i-1)], points[i]
    c, d = points[i+1], points[min(i+2, len(points)-1)]
    return .5 * (2*b + (-a+c)*u + (2*a-5*b+4*c-d)*u*u + (-a+3*b-3*c+d)*u*u*u)


def tentacle(number, pose):
    angle = math.tau * (number + .52) / 8
    radial, side = Vector((math.cos(angle), math.sin(angle), 0)), Vector((-math.sin(angle), math.cos(angle), 0))
    up = Vector((0, 0, 1))
    gait = (0, 1, -1, .45)[pose] * (-1 if number % 2 else 1)
    # The two front pads arc down to the floor, while the outside arms roll up
    # and over. Keep the inside bend radius larger than the tube radius.
    tall = number in (1, 3, 4, 6)
    lift = gait*.10
    if tall:
        controls = [(.32,-.05,.67),(.64,-.04,.47),(.93,-.01,.32),
                    (1.22,.03,.37+lift*.3),(1.43,.07,.57+lift*.7),
                    (1.55,.13,.81+lift),(1.68,.20,.91+lift),
                    (1.78,.29,.83+lift)]
    else:
        controls = [(.32,-.06,.65),(.62,-.05,.52),(.87,-.03,.44),
                    (1.11,0,.45+lift*.2),(1.30,.04,.50+lift*.6),
                    (1.47,.12,.48+lift),(1.59,.23,.34+lift),
                    (1.58,.32,.19+lift*.4)]
    points = [radial*r + side*(s + gait*.045*r) + up*z for r,s,z in controls]
    radii = [.29, .35, .324, .283, .24, .209, .163, .075]
    def section(t):
        loc = catmull(points,t)
        tan = (catmull(points,min(1,t+.002)) - catmull(points,max(0,t-.002))).normalized()
        across = (side - side.dot(tan)*tan).normalized()
        normal = tan.cross(across).normalized()
        radius = catmull(radii,t)
        return loc, across, normal, radius
    count, steps = 32, 42
    vertices, faces, used = [], [], []
    for k in range(steps+1):
        mid, horizontal, normal, radius = section(k/steps)
        for i in range(count):
            a = math.tau*i/count
            vertices.append(mid + radius*(horizontal*(1.04*math.cos(a)) + normal*(.91*math.sin(a))))
    for k in range(steps):
        for i in range(count):
            a, b = k*count+i, k*count+(i+1)%count
            faces.append((a,b,b+count,a+count))
            used.append(0)
    # Close the tip with a round dome aligned to the last section.
    end, across, normal, radius = section(1)
    tangent = across.cross(normal).normalized()
    for level in range(1,7):
        lat = level*math.pi/14
        for i in range(count):
            a = math.tau*i/count
            vertices.append(end + tangent*(radius*math.sin(lat)) +
                            radius*math.cos(lat)*(1.04*across*math.cos(a)+.91*normal*math.sin(a)))
        for i in range(count):
            a, b = (steps+level-1)*count+i, (steps+level-1)*count+(i+1)%count
            faces.append((a,b,b+count,a+count))
            used.append(0)
    faces.append(tuple(range(len(vertices)-count,len(vertices))))
    used.append(0)
    limb = sculpt("Curled rubber arm",vertices,faces,[arm],used)
    color = limb.data.color_attributes.new(name="Arm pigment",type="FLOAT_COLOR",domain="POINT")
    root, tip, under = srgb((158,67,148)), srgb((209,72,151)), srgb((227,111,156))
    for v in limb.data.vertices:
        t = min(1,(v.index//count)/steps)
        low = max(0,min(1,(-math.sin((v.index%count)*math.tau/count)-.57)/.38))*.67
        color.data[v.index].color = tuple((a+(b-a)*t**1.7)*(1-low)+c*low for a,b,c in zip(root[:3],tip[:3],under[:3]))+(1,)
    for t,diam in ((.43,.093),(.56,.092),(.68,.085),(.79,.072),(.88,.054)):
        mid, across, normal, radius = section(t)
        # The pads twist toward the outer flank of the curl. Their row stays
        # visible from above even when a low arm is resting on the floor.
        flank = 1 if side.x > 0 else -1
        desired = radial*.78 + side*(.80*flank) + up*.28
        side_weight, top_weight = desired.dot(across), desired.dot(normal)
        axis = (side_weight*across + top_weight*normal).normalized()
        surface_radius = radius/math.hypot(axis.dot(across)/1.04,axis.dot(normal)/.91)
        base = mid + axis*(surface_radius-.009)
        turned_ring("Suction cup", base, axis, [
            (-.015,diam*.70,0),(0,diam*.99,0),(.022,diam,0),(.034,diam*.78,0),
            (.035,diam*.58,0),(.028,diam*.46,1),(.008,diam*.39,1),(.003,.001,1),
        ],[cups,cupwell])


def face_and_mantle(pose):
    puff = 1.11 if pose == 3 else 1
    breath = (0, .045, -.025, .035)[pose]
    z = 1.055 + breath
    head = sphere("Squeezable mantle",(0,0,z),(.93*puff, .96*puff, 1.015*puff),skin)
    # Color is blended directly onto the molded surface, without raised cheek discs.
    color = head.data.color_attributes.new(name="Mantle pigment",type="FLOAT_COLOR",domain="POINT")
    base, blush = srgb((171,77,161)), srgb((236,104,157))
    for v in head.data.vertices:
        x,y,h = v.co
        spot = math.exp(-((abs(y)-.62)/.21)**2 - ((h+.08)/.115)**2)*max(0,min(1,(x-.38)/.23))
        color.data[v.index].color = tuple(l+(r-l)*spot*.85 for l,r in zip(base[:3],blush[:3]))+(1,)
    # A very fine molded ridge along the dorsal shell.
    ridge = bpy.data.curves.new("Molding line","CURVE")
    ridge.dimensions, ridge.resolution_u, ridge.bevel_depth, ridge.bevel_resolution = "3D",2,.0024,2
    path = ridge.splines.new("POLY")
    path.points.add(84)
    for i,point in enumerate(path.points):
        h = .29+3.36*i/84
        point.co = (.9295*puff*math.cos(h),0,z+1.0145*puff*math.sin(h),1)
    seam = bpy.data.objects.new("Molding line",ridge)
    bpy.context.collection.objects.link(seam)
    seam.parent = toy
    ridge.materials.append(lip)
    for sign in (-1,1):
        center = (.775*puff,sign*.469*puff,z+.218*puff)
        eye = sphere("Polished bead eye",center,(.102,.151,.161),eyes)
        eye.rotation_euler.z = sign*.49
    turned_ring("Round squirter mouth",(.86*puff,0,z-.065*puff),(.979,0,.205),[
        (0,.114,0),(.055,.157,0),(.097,.168,0),(.146,.194,0),(.187,.200,0),
        (.237,.186,0),(.256,.160,0),(.257,.133,0),(.239,.116,1),(.208,.110,1),
        (.151,.107,2),(.100,.095,2),(.093,.001,2),
    ],[lip,innerlip,bore])


def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def area(name,position,energy,size,color):
    light = bpy.data.lights.new(name,"AREA")
    obj = bpy.data.objects.new(name,light)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    aim(obj,(0,0,.9))
    light.energy, light.shape, light.size, light.color = energy, "DISK", size, color


def studio():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 14
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for api in ("OPTIX","METAL","HIP","CUDA"):
        try:
            prefs.compute_device_type = api
            prefs.refresh_devices()
            devices = [dev for dev in prefs.devices if dev.type == api]
            if devices:
                for dev in prefs.devices:
                    dev.use = dev.type == api
                scene.cycles.device = "GPU"
                break
        except (TypeError, RuntimeError):
            continue
    scene.cycles.transparent_max_bounces = 2
    scene.cycles.max_bounces = 3
    scene.render.film_transparent = True
    scene.render.use_persistent_data = True
    scene.render.resolution_percentage = 100
    scene.render.resolution_x = scene.render.resolution_y = CELL*2
    scene.render.image_settings.color_mode = "RGBA"
    scene.world = bpy.data.worlds.new("Warm toy studio")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.48,.47,.52,1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .32
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    area("Large warm key",(-3,-4,6),470,3.7,(1,.91,.84))
    area("Cool frontal fill",(3.3,-3.8,3.2),150,4,(.83,.89,1))
    area("Soft edge light",(1.9,3.5,4.6),355,2.9,(1,.78,.91))
    area("Bead eye catchlight",(-1,-3.6,3.5),37,.57,(1,1,.99))
    cam = bpy.data.cameras.new("Battlefield orthographic")
    camera = bpy.data.objects.new("Battlefield orthographic",cam)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    cam.type, cam.ortho_scale = "ORTHO", 4.0
    tilt = math.radians(32)
    pivot = (90/CELL-.5)*cam.ortho_scale/math.cos(tilt)
    camera.location = (0,-7*math.cos(tilt),pivot+7*math.sin(tilt))
    aim(camera,(0,0,pivot))
    return scene


def frames(folder,preview):
    global toy, skin, arm, cups, cupwell, eyes, lip, innerlip, bore
    scene = studio()
    skin = rubber("Heather purple bath rubber",(171,77,161))
    attr = skin.node_tree.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Mantle pigment"
    skin.node_tree.links.new(attr.outputs["Color"],skin.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
    arm = rubber("Berry arms",(186,74,156))
    pigment = arm.node_tree.nodes.new("ShaderNodeVertexColor")
    pigment.layer_name = "Arm pigment"
    arm.node_tree.links.new(pigment.outputs["Color"],arm.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
    cups = rubber("Coral pink suction cups",(248,150,173))
    cupwell = rubber("Recessed cup wells",(183,76,121))
    eyes = rubber("Chocolate glass eyes",(54,36,34),.17,False)
    lip = rubber("Round magenta lip",(206,72,161),.31)
    innerlip = rubber("Inner rim",(128,45,99))
    bore = rubber("Deep rubber bore",(72,27,68),.53)
    for pose in range(POSES):
        toy = bpy.data.objects.new("Bubble Octopus",None)
        bpy.context.collection.objects.link(toy)
        face_and_mantle(pose)
        for arm_index in range(8):
            tentacle(arm_index,pose)
        if pose == 0 and preview:
            toy.rotation_euler.z = math.radians(-57)
            scene.render.resolution_x = scene.render.resolution_y = 640
            scene.cycles.samples = 48
            scene.render.filepath = str(preview)
            bpy.ops.render.render(write_still=True)
            scene.render.resolution_x = scene.render.resolution_y = CELL*2
            scene.cycles.samples = 14
        for view in range(VIEWS):
            toy.rotation_euler.z = -math.tau*view/VIEWS
            scene.render.filepath = str(folder / f"{pose*VIEWS+view}.png")
            bpy.ops.render.render(write_still=True)
        for obj in list(toy.children):
            bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.objects.remove(toy,do_unlink=True)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--")+1:]
    frames(Path(args[0]),Path(args[1]) if len(args)>1 else None)
