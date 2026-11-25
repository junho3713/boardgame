"""Bake field pickups. Run with Python, NumPy, Pillow and a Blender executable."""

import argparse
import json
import math
from pathlib import Path
from runpy import run_path
import subprocess
import sys
from tempfile import TemporaryDirectory

import numpy as np

CELL = 80
OUTPUT = Path(__file__).resolve().parents[1] / "public/assets/models/field-pickups-v2.webp"


def crystal(palette, scale=1):
    mesh = Mesh()
    # Facets converge into a narrow foot and a cut tip instead of a flat diamond.
    steps = [(1, .6), (5, 6.3), (13, 6.0), (22, .45)]
    rings = [[(radius * math.cos(a) * scale, radius * math.sin(a) * .82 * scale, height * scale)
              for a in (math.tau * i / 6 + .35 for i in range(6))]
             for height, radius in steps]
    mesh.face(rings[0][::-1], palette[1])
    for row, (lower, upper) in enumerate(zip(rings, rings[1:])):
        for i in range(6):
            j = (i + 1) % 6
            color = palette[(i + (row == 1)) % len(palette)]
            mesh.face([lower[i], lower[j], upper[j], upper[i]], color, .92)
    mesh.face(rings[-1], palette[-1], .9)
    return mesh


def molded_shape(mesh, outline, profile, colors, center=(0, 0)):
    # Each bevel ring is raised along the face normal, toward the room camera.
    winding = sum(x * next_y - next_x * y
                  for (x, y), (next_x, next_y) in zip(outline, outline[1:] + outline[:1]))
    if winding > 0:
        outline = outline[::-1]
    # The renderer reads the first three points for the cap normal. Start at a convex corner.
    for index in range(len(outline)):
        a, b, c = (outline[(index + step) % len(outline)] for step in range(3))
        turn = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if turn < -1e-5:
            outline = outline[index:] + outline[:index]
            break
    cx, cy = center
    rings = []
    for depth, scale in profile:
        ring = []
        for x, y in outline:
            x, y = cx + (x - cx) * scale, cy + (y - cy) * scale
            ring.append(world_point(x, y, depth))
        rings.append(ring)
    mesh.face(rings[0][::-1], colors[0], .28)
    for index, (lower, upper) in enumerate(zip(rings, rings[1:])):
        for i in range(len(outline)):
            j = (i + 1) % len(outline)
            mesh.face([lower[i], lower[j], upper[j], upper[i]], colors[index], .70)
    mesh.face(rings[-1], colors[-1], .86)


def world_point(x, y, depth):
    return (x, -.89 * y + .45 * depth, 15 + .45 * y + .89 * depth)


def magnet():
    mesh = Mesh()
    bend = [math.pi + math.pi * i / 28 for i in range(29)]
    spine = [(-10.5, 8.5, 1, 0)] + [
        (10.5 * math.cos(a), -1.6 + 10.5 * math.sin(a), -math.cos(a), -math.sin(a))
        for a in bend
    ] + [(10.5, 8.5, -1, 0)]
    sections = 24
    centers = [np.array(world_point(x, y, 0)) for x, y, _, _ in spine]
    rings = []
    # Sweep a rounded, solid cross-section down both poles and around the bend.
    for x, y, nx, ny in spine:
        ring = []
        for i in range(sections):
            angle = math.tau * i / sections
            side = 6.0 * math.cos(angle)
            ring.append(np.array(world_point(x + nx * side, y + ny * side, 7.0 * math.sin(angle))))
        rings.append(ring)
    for index, (lower, upper) in enumerate(zip(rings, rings[1:])):
        middle = (centers[index] + centers[index + 1]) * .5
        for i in range(sections):
            j = (i + 1) % sections
            face = [lower[i], lower[j], upper[j], upper[i]]
            normal = np.cross(face[1] - face[0], face[2] - face[0])
            if np.dot(normal, np.mean(face, axis=0) - middle) < 0:
                face.reverse()
            mesh.face(face, (48, 134, 204), .90)
    return mesh


def heart():
    mesh = Mesh()
    outline = []
    for i in range(80):
        a = math.tau * i / 80
        x = 15 * math.sin(a) ** 3
        y = .90 * (13 * math.cos(a) - 5 * math.cos(2*a) - 2 * math.cos(3*a) - math.cos(4*a)) + 1.6
        outline.append((x, y))
    molded_shape(mesh, outline,
                 [(-6.8, .62), (-5.7, .81), (-3.4, .95), (-.8, 1), (2.6, .99),
                  (4.8, .93), (6.7, .81), (8, .60), (8.8, .36), (9.1, .08)],
                 [(128, 26, 45), (149, 34, 53), (181, 41, 59), (212, 50, 65),
                  (233, 66, 78), (239, 78, 84), (246, 91, 98), (246, 100, 105),
                  (248, 108, 111), (250, 112, 117)], (0, -2.6))
    return mesh


def bake():
    global Mesh
    from PIL import Image

    parser = argparse.ArgumentParser()
    parser.add_argument("--blender", default="blender")
    args = parser.parse_args()
    shared = run_path(str(Path(__file__).with_name("build-unit-models.py")))
    Mesh, render = shared["Mesh"], shared["render"]
    green = crystal([(86, 230, 224), (63, 169, 216), (135, 247, 243)])
    violet = crystal([(192, 162, 250), (123, 112, 225), (224, 197, 255)], 1.28)
    atlas = Image.new("RGBA", (CELL * 4, CELL))
    atlas.paste(render(green, .12, CELL, shadow=False), (0, 0))
    atlas.paste(render(violet, -.13, CELL, shadow=False), (CELL, 0))
    with TemporaryDirectory(prefix="field-pickups-") as directory:
        folder = Path(directory)
        geometry = {name: [face.tolist() for face, _, _ in mesh.faces]
                    for name, mesh in (("magnet", magnet()), ("heart", heart()))}
        (folder / "geometry.json").write_text(json.dumps(geometry), encoding="utf8")
        subprocess.run([args.blender, "--background", "--factory-startup", "--threads", "6",
                        "--python-exit-code", "1", "--python", str(Path(__file__).resolve()),
                        "--", str(folder)], check=True)
        for index, name in enumerate(("magnet", "heart"), start=2):
            with Image.open(folder / f"{name}.png") as image:
                atlas.paste(image.resize((CELL, CELL), Image.Resampling.LANCZOS), (CELL * index, 0))
    atlas.save(OUTPUT, quality=94, method=6, exact=True)


def lit_render(folder):
    import bpy
    from mathutils import Euler, Vector

    geometry = json.loads((folder / "geometry.json").read_text(encoding="utf8"))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = CELL * 5
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (.63, .69, .75, 1)
    background.inputs["Strength"].default_value = .28

    center = Vector((0, -12.8, 9.6))
    bpy.ops.object.camera_add(location=center + Vector((0, 120, 160)))
    cam = bpy.context.object
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = CELL
    cam.data.clip_end = 1000
    scene.camera = cam

    for position, power, size, color in [
        ((-56, 25, 81), 135000, 45, (1, .86, .71)),
        ((48, 55, 38), 28500, 55, (.75, .86, 1)),
        ((10, -53, 67), 76000, 39, (1, .94, .80)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=position)
        lamp = bpy.context.object
        lamp.rotation_euler = (Vector((0, 0, 15)) - lamp.location).to_track_quat("-Z", "Y").to_euler()
        lamp.data.energy, lamp.data.size, lamp.data.color = power, size, color

    def material(name, base, roughness, metal=0):
        surface = bpy.data.materials.new(name)
        surface.use_nodes = True
        shader = surface.node_tree.nodes["Principled BSDF"]
        shader.inputs["Base Color"].default_value = (*base, 1)
        shader.inputs["Roughness"].default_value = roughness
        shader.inputs["Metallic"].default_value = metal
        shader.inputs["Coat Weight"].default_value = .23 if not metal else 0
        shader.inputs["Coat Roughness"].default_value = .30
        return surface

    blue = material("Painted blue plastic", (.020, .105, .36), .34)
    red = material("Molded coral plastic", (.54, .017, .042), .31)
    steel = material("Rounded nickel poles", (.66, .72, .76), .28, .69)

    def shaped_part(name, faces, surface, yaw):
        vertices, index, polygons = [], {}, []
        for face in faces:
            polygon = []
            for v in face:
                key = tuple(round(coord, 5) for coord in v)
                if key not in index:
                    index[key] = len(vertices)
                    vertices.append(v)
                polygon.append(index[key])
            polygons.append(polygon)
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], polygons)
        mesh.update()
        part = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(part)
        part.rotation_euler.z = yaw
        part.data.materials.append(surface)
        for face in mesh.polygons:
            face.use_smooth = True
        return part

    for name, surface, yaw in [("magnet", blue, -.19), ("heart", red, .14)]:
        objects = [shaped_part(name, geometry[name], surface, yaw)]
        if name == "magnet":
            rotation = Euler((0, 0, yaw)).to_matrix()
            tilt = math.atan2(.45, -.89)
            for sign in (-1, 1):
                location = rotation @ Vector(world_point(sign * 10.5, 10.1, 0))
                bpy.ops.mesh.primitive_cube_add(size=1, location=location)
                tip = bpy.context.object
                tip.scale = (12.35, 10.9, 14.1)
                bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
                tip.rotation_euler = Euler((tilt, 0, yaw), "XYZ")
                tip.data.materials.append(steel)
                bevel = tip.modifiers.new("Rounded metal edges", "BEVEL")
                bevel.width, bevel.segments, bevel.harden_normals = 2.45, 6, True
                tip.modifiers.new("Flat poles with softened rims", "WEIGHTED_NORMAL")
                for face in tip.data.polygons:
                    face.use_smooth = True
                objects.append(tip)
        scene.render.filepath = str(folder / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        for part in objects:
            bpy.data.objects.remove(part, do_unlink=True)


if __name__ == "__main__":
    if "--" in sys.argv:
        lit_render(Path(sys.argv[sys.argv.index("--") + 1]))
    else:
        bake()
