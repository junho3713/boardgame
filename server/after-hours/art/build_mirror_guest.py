"""Build the reflection guest with Blender 4.4.

blender -b -P build_mirror_guest.py -- <Rocketbox Male_Adult_04 folder> <output.glb>
Input: original Export/Male_Adult_04.fbx and Textures/m006_*_color.tga.
Model and texture license is included in public/credits.txt.
"""
import math
import sys
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector

source, output = map(Path, sys.argv[sys.argv.index("--") + 1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source / "Export" / "Male_Adult_04.fbx"), use_anim=False)
rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
bones = rig.pose.bones
bpy.context.scene.render.fps = 24

# Use small, embedded colour maps. Keep the transparent hair cards.
with tempfile.TemporaryDirectory() as temp:
    for part in ("body", "head", "opacity"):
        material = bpy.data.materials["m006_" + part]
        nodes = material.node_tree.nodes
        nodes.clear()
        surface = nodes.new("ShaderNodeBsdfPrincipled")
        surface.inputs["Roughness"].default_value = .84
        surface.inputs["Specular IOR Level"].default_value = .23
        links = material.node_tree.links
        links.new(surface.outputs["BSDF"], nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
        tex = nodes.new("ShaderNodeTexImage")
        image = bpy.data.images.load(str(source / "Textures" / ("m006_" + part + "_color.tga")))
        size = 768 if part == "head" else 512
        image.scale(size, size)
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

