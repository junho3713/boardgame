"""Render the combat and multi-drone variants to directional game sprites."""
import argparse
import json
import math
from pathlib import Path
import sys

VARIANTS = ("combatDrone", "combatDroneEvolved", "multiDrone", "multiDroneEvolved")
CELL, DIRECTIONS, FRAMES = 144, 12, 3


def pack(source, output):
    from PIL import Image

    output.mkdir(parents=True, exist_ok=True)
    portraits = Image.new("RGBA", (640, 160))
    for k, name in enumerate(VARIANTS):
        sheet = Image.new("RGBA", (6 * CELL, 2 * FRAMES * CELL))
        for frame in range(FRAMES):
            for direction in range(DIRECTIONS):
                view = (DIRECTIONS // 2 - direction) % DIRECTIONS
                image = Image.open(source / f"{name}-{frame}-{view}.png").convert("RGBA")
                if image.size != (CELL, CELL) or not image.getbbox():
                    raise ValueError(f"Invalid sprite: {name} {frame} {direction}")
                x = direction % 6 * CELL
                y = (2 * frame + direction // 6) * CELL
                sheet.paste(image, (x, y))
        sheet.save(output / f"{name}-body-v1.webp", quality=91, method=4)
        portrait = Image.open(source / f"{name}-review.png").convert("RGBA")
        portrait = portrait.crop(portrait.getbbox())
        portrait.thumbnail((145, 133), Image.Resampling.LANCZOS)
        portraits.alpha_composite(portrait, (k * 160 + (160 - portrait.width) // 2, (160 - portrait.height) // 2))
    (output.parent / "ui").mkdir(exist_ok=True)
    portraits.save(output.parent / "ui" / "combat-drone-portraits-v1.webp", quality=94, method=4)


def bake(output, qa_scripts, preview):
    import bpy
    import bmesh
    from mathutils import Vector

    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 9
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    scene.render.use_persistent_data = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.world = bpy.data.worlds.new("Room bounce")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (.29, .30, .32, 1)
    scene.world.node_tree.nodes.get("Background").inputs[1].default_value = .42

    def material(name, rgb, roughness=.34, metal=.04, glow=0):
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*rgb, 1)
        node = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        node.inputs["Base Color"].default_value = (*rgb, 1)
        node.inputs["Roughness"].default_value = roughness
        node.inputs["Metallic"].default_value = metal
        node.inputs["Emission Color"].default_value = (*rgb, 1)
        node.inputs["Emission Strength"].default_value = glow
        return mat

    graphite = material("Graphite nylon", (.044, .051, .046), .44)
    olive = material("Olive ABS", (.19, .237, .12))
    orange = material("Burnt orange resin", (.67, .18, .055))
    orange_light = material("Saffron molded trim", (.96, .39, .09))
    brass = material("Gold docking frame", (.69, .41, .10), .30, .32)
    teal = material("Teal polymer", (.048, .39, .37), .31)
    aqua = material("Aqua status lens", (.064, .85, .91), .26, .12, .34)
    signal = material("Amber pulse lens", (1, .28, .037), .26, .10, .45)
    blade = material("Rotor blades", (.21, .23, .20), .42)
    nickel = material("Nickel fasteners", (.38, .43, .39), .34, .45)

    def mesh(name, vertices, faces, mat, bevel=0, smooth=False):
        data = bpy.data.meshes.new(name)
        data.from_pydata(vertices, [], faces)
        data.update()
        bm = bmesh.new()
        bm.from_mesh(data)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(data)
        bm.free()
        ob = bpy.data.objects.new(name, data)
        scene.collection.objects.link(ob)
        data.materials.append(mat)
        if bevel:
            edge = ob.modifiers.new("Molded edge", "BEVEL")
            edge.width, edge.segments = bevel, 3
            edge.harden_normals = True
            normal = ob.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
            normal.keep_sharp = True
        for polygon in data.polygons:
            polygon.use_smooth = smooth or bool(bevel)
        return ob

    def prism(name, path, z0, z1, mat, bevel=.05):
        n = len(path)
        v = [(x, y, z) for z in (z0, z1) for x, y in path]
        f = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
        f += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        return mesh(name, v, f, mat, bevel)

    def box(name, at, size, mat, radius=.05, turn=0):
        x, y, z = at
        width, length, depth = (v / 2 for v in size)
        c, s = math.cos(turn), math.sin(turn)
        path = [(x + a * c - b * s, y + a * s + b * c) for a, b in
                [(-width, -length), (width, -length), (width, length), (-width, length)]]
        return prism(name, path, z - depth, z + depth, mat, radius)

    def tube(name, start, finish, radius, mat, steps=20):
        p, q = Vector(start), Vector(finish)
        axis = (q - p).normalized()
        tangent = axis.cross(Vector((0, 1, 0) if abs(axis.y) < .8 else (1, 0, 0))).normalized()
        bitangent = axis.cross(tangent)
        points = []
        for end in (p, q):
            for i in range(steps):
                a = math.tau * i / steps
                points.append(end + radius * (math.cos(a) * tangent + math.sin(a) * bitangent))
        faces = [tuple(range(steps)), tuple(range(steps, steps * 2))]
        faces += [(i, (i + 1) % steps, (i + 1) % steps + steps, i + steps) for i in range(steps)]
        return mesh(name, points, faces, mat, min(radius * .13, (q-p).length * .22, .024))

    def duct(name, x, y, z, radius, exterior, trim):
        profile = [(1, -.09), (1.025, -.03), (1.025, .12), (.99, .18), (.88, .18),
                   (.81, .112), (.79, -.014), (.85, -.09)]
        n = 36
        vertices = [(x + r * radius * math.cos(i * math.tau / n), y + r * radius * math.sin(i * math.tau / n), z + h)
                    for r, h in profile for i in range(n)]
        faces = []
        for j in range(len(profile)):
            other = (j + 1) % len(profile)
            faces.extend((j*n+i, j*n+(i+1)%n, other*n+(i+1)%n, other*n+i) for i in range(n))
        ob = mesh(name, vertices, faces, exterior, smooth=True)
        ob.data.materials.append(trim)
        ob.data.materials.append(graphite)
        for poly in ob.data.polygons:
            poly.material_index = 1 if poly.index // n in (2, 3) else 2 if poly.index // n in (5, 6, 7) else 0

        tube(name + " motor", (x, y, z - .14), (x, y, z + .18), radius * .24, graphite)
        tube(name + " hub", (x, y, z + .13), (x, y, z + .23), radius * .13, nickel)
        for sign in (-1, 1):
            box(name + f" support {sign}", (x + sign * radius * .47, y, z - .045),
                (radius * .80, .089, .09), graphite, .018)
        pivot = bpy.data.objects.new(name + " blade pivot", None)
        scene.collection.objects.link(pivot)
        pivot.location = (x, y, z)
        for i in range(3):
            a = math.tau * i / 3
            c, s = math.cos(a), math.sin(a)
            shape = [(radius * (f * c - w * s), radius * (f * s + w * c))
                     for f, w in [(0.06, -.12), (.27, -.15), (.75, -.052), (.73, .15), (.36, .17), (.08, .07)]]
            vane = prism(name + f" vane {i}", shape, .052, .108, blade, .018)
            vane.parent = pivot
        return pivot

    def assemble(combined, evolved):
        mount = brass if combined else olive
        cap = brass if combined else orange
        outline = [(-.60,-1.47),(.60,-1.47),(1.03,-.77),(1.02,.66),(.68,1.31),
                   (-.68,1.31),(-1.02,.66),(-1.03,-.77)]
        if combined:
            outline = [(x * 1.22, y) for x, y in outline]
        prism("Lower hull", outline, -.35, .14, graphite, .105)
        body = [(x * .94, y * .92) for x, y in outline]
        prism("Main shell", body, .04, .53, mount, .11)
        prism("Nose armor", [(-.42,-1.43),(.42,-1.43),(.77,-.84),(.71,.25),(-.71,.25),(-.77,-.84)],
              .40, .66, cap, .10)
        prism("Cockpit arch", [(-.33,-1.23),(.33,-1.23),(.5,-.74),(.34,-.30),(-.34,-.30),(-.5,-.74)],
              .63, .79, graphite, .061)
        box("Segmented projector", (0,-.994,.741), (.61,.19,.14), aqua if combined else signal, .040)
        for j in range(3):
            box(f"Rear heat vent {j}", (0,.39+j*.18,.53), (.76,.075,.084), graphite, .022)
        # Compact underslung projector. The same housing carries the evolved missile ports.
        box("Ventral mount", (0,-.71,-.34), (.88,.86,.26), graphite, .069)
        box("Ventral pulse housing", (0,-1.04,-.51), (1.03 if evolved else .87,.88,.31), cap, .089)
        box("Ventral emitter face", (0,-1.458,-.51), (.73 if evolved else .60,.10,.22), graphite, .046)
        tube("Pulse aperture rim", (0,-1.47,-.51), (0,-1.542,-.51), .108, nickel, 24)
        tube("Pulse aperture glass", (0,-1.53,-.51), (0,-1.551,-.51), .074, signal, 24)
        if evolved:
            for slot in (-.232,.232):
                tube("Recessed missile port", (slot,-1.47,-.51), (slot,-1.537,-.51), .076, olive)
                tube("Missile status cap", (slot,-1.529,-.51), (slot,-1.552,-.51), .048, signal)
        for sx in (-1, 1):
            box("Underbody skid", (sx*.68,.12,-.30), (.19,1.93,.19), graphite, .045)
            box("Lateral power pack", (sx*(.98 if combined else .76),.43,.35), (.43,.91,.44),
                teal if combined and sx<0 else orange, .095, .07*sx)
        if combined:
            tube("Searchlight collar", (0,-1.24,.18), (0,-1.51,.18), .36, teal, 28)
            tube("Searchlight glass", (0,-1.48,.18), (0,-1.56,.18), .28, aqua, 28)
            tube("Top sensor mount", (.0,.17,.49), (0,.17,.73), .37, graphite)
            tube("Top sensor dome", (.0,.17,.69), (0,.17,.84 if not evolved else .97), .26, aqua, 28)
        pivots = []
        for j, (sx, front) in enumerate([(-1,True),(1,True),(-1,False),(1,False)]):
            x = sx*(1.70 if combined else (1.57 if front else 1.46))
            y = -.88 if front else 1.04
            box("Molded rotor arm", ((x + sx*.44)/2, y*.81,.24), (abs(x-sx*.44)+.58,.37,.31),
                mount,.065, sx*(.11 if front else -.14))
            pivots.append(duct(f"Rotor {j+1}", x,y,.387,(.68 if front else .58)+(0.045 if combined else 0),
                               graphite if front else olive, teal if combined and sx<0 else orange_light))
        return pivots

    def area(name, position, energy, size, color):
        lamp = bpy.data.lights.new(name, "AREA")
        lamp.energy, lamp.shape, lamp.size, lamp.color = energy, "DISK", size, color
        ob = bpy.data.objects.new(name, lamp)
        scene.collection.objects.link(ob)
        ob.location = position
        ob.rotation_euler = (-ob.location).to_track_quat("-Z", "Y").to_euler()

    area("Warm studio key", (-3.8,-5.5,7.4), 1050, 5.2, (1,.86,.69))
    area("Cool front fill", (5,-2.5,3.8), 650, 4.8, (.83,.93,1))
    area("Rim light", (2,5.1,6), 1150, 3.8, (1,.77,.51))
    camera = bpy.data.objects.new("Sprite camera", bpy.data.cameras.new("Sprite camera"))
    scene.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera

    def render(name, direction, size, scale):
        # Camera zero looks toward the nose. The atlas packer maps views to game headings.
        camera.location = (math.sin(direction)*8.3,-math.cos(direction)*8.3,10.1)
        camera.rotation_euler = (Vector((0,0,.22))-camera.location).to_track_quat("-Z","Y").to_euler()
        camera.data.ortho_scale = scale
        scene.render.resolution_x = scene.render.resolution_y = size
        scene.render.filepath = str(output / (name + ".png"))
        bpy.ops.render.render(write_still=True)

    stage = set(bpy.data.objects)
    if qa_scripts:
        sys.path.insert(0, str(qa_scripts))
        import qa_check
        if preview:
            import review_shots
    for index, name in enumerate(VARIANTS):
        active = assemble(index >= 2, index % 2 == 1)
        created = set(bpy.data.objects) - stage
        if qa_scripts:
            geometry = [o.name for o in created if o.type == "MESH"]
            report = qa_check.run(objects=geometry,
                                  profile="render", eps=.0001, tol=.019, uv=False)
            (output / f"{name}-qa.json").write_text(json.dumps(report, indent=2))
            if not report["pass"]:
                raise RuntimeError(f"{name}: {report['errors']}")
            if preview:
                for mode in ("random", "wire"):
                    review_shots.run(objects=geometry, out=str(output / f"{name}-{mode}.png"),
                                     views=["front", "right", "three_quarter"], mode=mode, res=224)
        render(f"{name}-review", .64, 384, 5.8)
        if not preview:
            for frame in range(FRAMES):
                for i, pivot in enumerate(active):
                    pivot.rotation_euler.z = frame * math.tau / 9 + i * .68
                for direction in range(DIRECTIONS):
                    render(f"{name}-{frame}-{direction}", -math.tau * direction / DIRECTIONS, CELL, 6.6)
        for ob in created:
            bpy.data.objects.remove(ob, do_unlink=True)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--qa-scripts", type=Path)
    parser.add_argument("--pack", type=Path)
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args(argv)
    if args.pack:
        pack(args.directory, args.pack)
    else:
        bake(args.directory, args.qa_scripts, args.preview)
