"""Build the reflection guest variants and optional portraits with Blender 4.4.

blender -b -P build_mirror_guest.py -- <Rocketbox avatar folder> <output.glb> [<portrait.png>]
Supported inputs: Male_Adult_04 (m006) and Female_Adult_11 (f011).
Model and texture license is included in public/credits.txt.
"""
import math
import sys
import tempfile
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

source, output, *extras = [Path(value).resolve() for value in sys.argv[sys.argv.index("--") + 1:]]
portrait = extras[0] if extras else None
avatars = {"Male_Adult_04": "m006", "Female_Adult_11": "f011"}
avatar_name = next(name for name in avatars if (source / "Export" / (name + ".fbx")).is_file())
texture_prefix = avatars[avatar_name]
woman = texture_prefix == "f011"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source / "Export" / (avatar_name + ".fbx")), use_anim=False)
rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
bones = rig.pose.bones
bpy.context.scene.render.fps = 24

def world_atlas(obj, material, w, h):
    """Rasterize the rest pose into its UV layout so a fabric edge crosses seams continuously."""
    mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
    mesh.calc_loop_triangles()
    uv = np.array([tuple(item.uv) for item in mesh.uv_layers.active.data]) * (w, h)
    verts = np.array([tuple(obj.matrix_world @ v.co) for v in mesh.vertices])
    xyz = np.full((h, w, 3), np.nan, dtype=np.float32)
    for tri in mesh.loop_triangles:
        if mesh.materials[tri.material_index].name != material.name:
            continue
        p = uv[list(tri.loops)]
        a, b = p[1:] - p[0]
        det = a[0]*b[1] - a[1]*b[0]
        if abs(det) < 1e-5:
            continue
        x0, y0 = np.maximum(0, np.floor(p.min(axis=0))).astype(int)
        x1, y1 = np.minimum((w, h), np.ceil(p.max(axis=0))).astype(int)
        x, y = np.meshgrid(np.arange(x0, x1)+.5-p[0, 0], np.arange(y0, y1)+.5-p[0, 1])
        s, t = (x*b[1]-y*b[0])/det, (a[0]*y-a[1]*x)/det
        inside = (s >= 0) & (t >= 0) & (s+t <= 1)
        q = verts[list(tri.vertices)]
        xyz[y0:y1, x0:x1][inside] = q[0] + s[inside,None]*(q[1]-q[0]) + t[inside,None]*(q[2]-q[0])
    for _ in range(4):  # Bleed the UV islands for filtered/mipmapped sampling.
        missing = np.isnan(xyz[..., 0])
        prev = xyz.copy()
        for axis, shift in [(0,1),(0,-1),(1,1),(1,-1)]:
            near = np.roll(prev, shift, axis=axis)
            valid = missing & np.isfinite(near[..., 0])
            xyz[valid] = near[valid]
    return np.nan_to_num(xyz, nan=-20.)


def style_evening_guest(image, obj, material, part):
    w, h = image.size
    pixels = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    rgb = pixels.reshape(h, w, 4)[..., :3]
    u, v = np.meshgrid((np.arange(w) + .5) / w, (np.arange(h) + .5) / h)
    x, y, z = world_atlas(obj, material, w, h).transpose(2,0,1)
    # A sweeping bias-cut neckline meets the long sleeve on the high shoulder.
    edge = 1.392 + .51 * np.clip(x, -.18, .17)
    coverage = np.clip((edge-z)/.002+.5, 0, 1)
    collar = np.exp(-((z-1.419-.08*np.abs(x))/.009)**2) * np.exp(-(x/.12)**4)
    skin = (1 + .025*collar - .025*np.clip((y-.03)/.12,0,1))[...,None]*[.74,.532,.383]
    silk = np.array([.36,.065,.139])
    if part == "body":
        center = (u > .325) & (u < .675)
        fabric = center | ((v > .393) & (v < .612))
        textile = np.clip((rgb @ [.23,.67,.10] / .18)**.55, .50, 1.45)
        # Carry a continuous bias drape across the former collar and front insert.
        drape = 1 + .04*np.sin(100*(z-.45*x))*np.exp(-((z-1.30)/.10)**2)
        transition = np.clip((z-1.26)/.065,0,1)
        wine = ((1-transition)*textile+transition*drape)[...,None] * silk
        seam = np.exp(-((edge-z-.003)/.0017)**2)
        wine *= (1+.36*seam)[...,None]
        rgb[fabric] = (coverage[...,None]*wine+(1-coverage[...,None])*skin)[fabric]
        # Keep the belt hardware, hands and leather boots in their original UV islands.
    else:
        collar = (z > 1.28) & (z < 1.47)
        blend = (collar*np.clip((1.47-z)/.035,0,1))[...,None]
        drape = 1 + .04*np.sin(100*(z-.45*x))*np.exp(-((z-1.30)/.10)**2)
        neckline = coverage[...,None]*silk*drape[...,None]+(1-coverage[...,None])*skin
        rgb[:] = rgb*(1-blend) + neckline*blend
        # Follow the photographed lip contour and feather the berry colour at the edges.
        lip = np.clip(1-((u-.50)/.049)**2-((v-.594)/.014)**2,0,1)
        rgb *= 1 + lip[...,None]*[.02,-.57,-.30]
        blush = sum(np.exp(-((u-c)/.042)**2-((v-.648)/.035)**2) for c in (.368,.632))
        rgb *= 1 + blush[...,None]*[.05,-.10,-.06]
    image.pixels.foreach_set(pixels)
    image.update()


if woman:
    figure = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
    world = figure.matrix_world
    inverse = world.inverted()
    # Flatten the old knitted V collar into the continuous shoulder/chest surface.
    heights = [1.295,1.32,1.35,1.38,1.40,1.42,1.44,1.46,1.48]
    depth = [-.094,-.080,-.055,-.029,-.011,.003,.015,.018,.009]
    normals = [n.vector.copy() for n in figure.data.corner_normals]
    soft_normals = {}
    for vertex in figure.data.vertices:
        p = world @ vertex.co
        if abs(p.x) < .19:
            waist = math.exp(-((p.z-1.12)/.095)**2)
            p.x *= 1-.10*waist
            p.y = .02+(p.y-.02)*(1-.08*waist)
        target = np.interp(p.z, heights, depth)+1.45*p.x*p.x
        if 1.30 < p.z < 1.47 and abs(p.x)<.14 and abs(target-p.y)<.026:
            blend = min(1., (p.z-1.30)/.023,(1.47-p.z)/.025,(.14-abs(p.x))/.035)
            # Retain depth ordering at the narrow rows of overlapping welt vertices.
            p.y += (target-p.y)*(.70*blend)
            slope = (np.interp(p.z+.005, heights, depth)-np.interp(p.z-.005, heights, depth))/.01
            normal = world.to_3x3().transposed() @ Vector((2.90*p.x,-1,slope))
            soft_normals[vertex.index] = (normal.normalized(),blend)
        vertex.co = inverse @ p
    for loop in figure.data.loops:
        if loop.vertex_index in soft_normals:
            normal, blend = soft_normals[loop.vertex_index]
            normals[loop.index] = normals[loop.index].lerp(normal,blend).normalized()
    figure.data.normals_split_custom_set(normals)
    bpy.context.view_layer.update()

# Embed small colour maps and keep the hair alpha threshold.
with tempfile.TemporaryDirectory() as temp:
    for part in ("body", "head", "opacity"):
        material = bpy.data.materials[texture_prefix + "_" + part]
        nodes = material.node_tree.nodes
        nodes.clear()
        surface = nodes.new("ShaderNodeBsdfPrincipled")
        surface.inputs["Roughness"].default_value = .66 if woman else .84
        surface.inputs["Specular IOR Level"].default_value = .23
        links = material.node_tree.links
        links.new(surface.outputs["BSDF"], nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
        tex = nodes.new("ShaderNodeTexImage")
        image = bpy.data.images.load(str(source / "Textures" / (texture_prefix + "_" + part + "_color.tga")))
        size = 768 if part == "head" or (woman and part == "body") else 512
        image.scale(size, size)
        if woman and part in ("body", "head"):
            style_evening_guest(image, figure, material, part)
        extension = "png" if part == "opacity" else "jpg"
        image.file_format = "PNG" if part == "opacity" else "JPEG"
        image.filepath_raw = str(Path(temp) / (part + "." + extension))
        image.save()
        tex.image = bpy.data.images.load(image.filepath_raw)
        tex.image.pack()
        links.new(tex.outputs["Color"], surface.inputs["Base Color"])
        if part == "opacity":
            # A threshold preserves fine hair/lash edges without depth sorting.
            cutoff = nodes.new("ShaderNodeMath")
            cutoff.operation = "GREATER_THAN"
            cutoff.inputs[1].default_value = .38
            links.new(tex.outputs["Alpha"], cutoff.inputs[0])
            links.new(cutoff.outputs[0], surface.inputs["Alpha"])

if woman:
    # Small articulated-looking drops share the head joint with the original ear lobes.
    head_material = bpy.data.materials[texture_prefix + "_head"]
    ear_map = world_atlas(figure, head_material, 256, 256)
    def jewelry_material(name, color, metal, roughness):
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*color,1)
        bsdf.inputs["Metallic"].default_value = metal
        bsdf.inputs["Roughness"].default_value = roughness
        return mat
    gold = jewelry_material("Brushed champagne gold", (.79,.48,.16), .78, .24)
    pearl = jewelry_material("Warm freshwater pearl", (.89,.79,.72), .28, .22)
    for sign, u in ((-1,.25),(1,.75)):
        lobe = Vector(ear_map[round(.609*256),round(u*256)]) + Vector((sign*.003,0,0))
        pieces = []
        for name, offset, scale, mat in (
            ("Gold stud", .001, (.0047,.0042,.0047), gold),
            ("Gold link", -.009, (.0016,.0016,.010), gold),
            ("Pearl drop", -.023, (.0063,.0063,.009), pearl),
        ):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=lobe+Vector((0,0,offset)))
            piece = bpy.context.object
            piece.name = name
            piece.scale = scale
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            piece.data.materials.append(mat)
            for poly in piece.data.polygons:
                poly.use_smooth = True
            pieces.append(piece)
        bpy.ops.object.select_all(action="DESELECT")
        for piece in pieces:
            piece.select_set(True)
        bpy.context.view_layer.objects.active = pieces[0]
        bpy.ops.object.join()
        earring = pieces[0]
        earring.name = "Pearl earring " + ("L" if sign > 0 else "R")
        head_weight = earring.vertex_groups.new(name="Bip01 Head")
        head_weight.add(list(range(len(earring.data.vertices))),1,"REPLACE")
        earring.modifiers.new("Follow head", "ARMATURE").object = rig
        # The exporter needs the mesh inside the armature hierarchy to encode the skin.
        earring.parent = rig
        earring.matrix_parent_inverse = rig.matrix_world.inverted()

def aim(name, child_name, direction):
    """Align a joint-to-joint segment in world space with its parent already posed."""
    bone = bones["Bip01 " + name]
    child = bones["Bip01 " + child_name]
    world = rig.matrix_world
    matrix = world @ bone.matrix
    segment = (world @ child.head - world @ bone.head).normalized()
    turn = segment.rotation_difference(Vector(direction).normalized())
    bone.matrix = world.inverted() @ (turn.to_matrix().to_4x4() @ matrix)
    # Rotate about the joint itself.
    bone.location = (0, 0, 0)
    bpy.context.view_layer.update()

def pose(low, stride):
    for bone in bones:
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
    bpy.context.view_layer.update()
    aim("Pelvis", "Spine", (0, -.87 if low else -.025, .49 if low else 1))
    aim("Neck", "Head", (0, -.4 if low else -.22, 1))
    for side, sign in (("L", 1), ("R", -1)):
        swing = sign * stride
        aim(side+" UpperArm", side+" Forearm", (.13*sign, (-.39 if low else .03)+swing*.34, -1))
        aim(side+" Forearm", side+" Hand", (.045*sign, (-.89 if low else -.25)+swing*.30, -.84))
        if low:
            aim(side+" Thigh", side+" Calf", (.23*sign, -.94, .43+swing*.08))
            aim(side+" Calf", side+" Foot", (.1*sign, .90, -.44+swing*.10))
        else:
            aim(side+" Thigh", side+" Calf", (.055*sign, -.035-swing*.44, -1))
            aim(side+" Calf", side+" Foot", (.018*sign, .08-swing*.33+max(0,-swing)*.23, -1))
        aim(side+" Foot", side+" Toe0", (.20*sign, -1, -.69))
    # The eye anchors include the slight forward tilt when crouching.

rig.animation_data_clear()
animated = ["Pelvis", "Neck"] + [s+" "+j for s in ("L","R") for j in ("UpperArm","Forearm","Thigh","Calf","Foot")]
for name, low, walk in [("Stand",False,False),("Walk",False,True),("Crouch",True,False),("CrouchWalk",True,True)]:
    rig.animation_data_create().action = bpy.data.actions.new(name)
    for frame in (1, 7, 13, 19, 25):
        pose(low, math.sin((frame-1)*math.tau/24) if walk else 0)
        for joint in animated:
            bones["Bip01 "+joint].keyframe_insert("rotation_quaternion",frame=frame)
    action = rig.animation_data.action
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name,1,action)
    track.mute = True
    rig.animation_data.action = None
pose(False,0)
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_animation_mode="ACTIONS",
                          export_force_sampling=False,
                          export_skins=True,export_morph=False,
                          export_cameras=False,export_lights=False,export_image_format="AUTO")



if portrait:
    # Photograph the actual rig and textures used in the game.
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new("Studio")
    scene.world.color = (.07, .07, .07)
    look_at = rig.matrix_world @ bones["Bip01 Head"].head
    eye_z = (rig.matrix_world @ bones["Bip01 LEye"].head).z
    target = Vector((0, look_at.y-.025, eye_z-(.136 if woman else .051)))
    bpy.ops.object.camera_add(location=target + Vector((.28 if woman else -.21, -1.12, .048)))
    cam = bpy.context.object
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = .59 if woman else .525
    scene.camera = cam

    def light(name, pos, color, energy, size):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = target + Vector(pos)
        obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()

    light("Warm window", (-.46, -.68, .65), (1, .85, .74), 25, .72)
    light("Soft fill", (.45, -.56, -.17), (.78, .88, 1), 10, .85)
    light("Hall light", (.36, .32, .54), (1, .69, .42), 8, .48)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 320, 400
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str(portrait)
    bpy.ops.render.render(write_still=True)
