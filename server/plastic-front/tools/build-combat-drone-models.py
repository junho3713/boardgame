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
        sheet.save(output / f"{name}-body-v2.webp", quality=91, method=4)
        portrait = Image.open(source / f"{name}-review.png").convert("RGBA")
        portrait = portrait.crop(portrait.getbbox())
        portrait.thumbnail((145, 133), Image.Resampling.LANCZOS)
        portraits.alpha_composite(portrait, (k * 160 + (160 - portrait.width) // 2, (160 - portrait.height) // 2))
    (output.parent / "ui").mkdir(exist_ok=True)
    portraits.save(output.parent / "ui" / "combat-drone-portraits-v2.webp", quality=94, method=4)


def bake(output, qa_scripts, preview):
    import bpy
    import bmesh
    from mathutils import Vector

    output = output.resolve()
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
    scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (.23, .25, .27, 1)
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

    graphite = material("Graphite nylon", (.025, .026, .028), .43)
    olive = material("Olive ABS", (.157, .184, .048))
    visor = material("Smoked canopy", (.014, .014, .018), .18)
    brass = material("Gold docking frame", (.67, .38, .056), .30, .32)
    teal = material("Teal polymer", (.015, .30, .31), .31)
    aqua = material("Aqua status lens", (.024, .67, .78), .26, .12, .34)
    blade = material("Black rotor blades", (.018, .020, .023), .40)
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

    def shell(name, center, width, length, height, mat):
        # Rounded moulded shell with a narrower leading end.
        x, y, z = center
        n, bands = 32, 12
        verts = [(x, y, z-height)]
        for j in range(1, bands):
            lat = math.pi*j/bands-math.pi/2
            for i in range(n):
                angle = math.tau*i/n
                f = math.sin(angle)*math.cos(lat)
                verts.append((x+width*math.cos(lat)*math.cos(angle)*(1+.20*f),
                              y+length*f, z+height*math.sin(lat)))
        verts.append((x, y, z+height))
        faces = [(0,1+(i+1)%n,1+i) for i in range(n)]
        for j in range(bands-2):
            t = 1+j*n
            faces.extend((t+i,t+(i+1)%n,t+n+(i+1)%n,t+n+i) for i in range(n))
        top = 1+(bands-1)*n
        faces.extend((top-n+i,top-n+(i+1)%n,top) for i in range(n))
        return mesh(name, verts, faces, mat, smooth=True)

    def muzzle(x, front, radius):
        # Dark recessed opening, with a rounded lip that catches the studio light.
        n = 24
        profile = [(radius*.91,.78),(radius,.70),(radius,.05),(radius*.91,0),
                   (radius*.68,0),(radius*.63,.045),(radius*.63,.23)]
        verts = [(x+r*math.cos(i*math.tau/n),front+y,-.46+r*math.sin(i*math.tau/n))
                 for r,y in profile for i in range(n)]
        faces = [tuple(range(n))]
        for j in range(len(profile)-1):
            faces.extend((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for i in range(n))
        faces.append(tuple(range(len(verts)-n,len(verts))))
        barrel = mesh("Recessed twin cannon", verts, faces, graphite, smooth=True)
        barrel.data.materials.append(visor)
        barrel.data.polygons[-1].material_index = 1

    def rotor(name, x, y, z, radius):
        tube(name+" casing",(x,y,z-.22),(x,y,z+.12),.215,olive)
        tube(name+" motor",(x,y,z+.10),(x,y,z+.19),.145,graphite)
        pivot = bpy.data.objects.new(name+" rotor", None)
        scene.collection.objects.link(pivot)
        pivot.location = (x,y,z+.17)
        for sign in (-1,1):
            shape = [(sign*radius*f,sign*w) for f,w in
                     [(0,-.065),(.42,-.145),(.85,-.12),(1,-.045),(.98,.058),(.60,.12),(.12,.08)]]
            vane = prism(name+" blade",shape,0,.055,blade,.026)
            vane.parent = pivot
        tube(name+" hub",(x,y,z+.18),(x,y,z+.26),.097,graphite)
        return pivot

    def assemble(combined, evolved):
        width = 1.03 if combined else .86
        # Layered moulding follows the long canopy profile of the approved concept.
        nose = [(-.36,-1.48),(.36,-1.48),(.66,-1.12),(.94,-.40),
                (1,.44),(.76,1.04),(.47,1.29),(-.47,1.29),(-.76,1.04),
                (-1,.44),(-.94,-.40),(-.66,-1.12)]
        rim = [(x*width,y) for x,y in nose]
        prism("Lower olive chin",[(x*.98,y*.97) for x,y in rim],-.18,.23,olive,.15)
        prism("Olive bonnet",rim,.08,.49,olive,.18)
        def canopy(name, size, levels, mat):
            # Sloped cap, the leading tip sits nearly flush with the bonnet.
            n=32
            verts=[]
            for k,h in levels:
                for i in range(n):
                    t=i*math.tau/n
                    f=math.sin(t)
                    x=size*k*math.cos(t)*(.60+.16*f)*width
                    y=-.38+size*k*.92*f
                    verts.append((x,y,h+.125*(y+.38)))
            faces=[tuple(range(n-1,-1,-1))]
            for j in range(len(levels)-1):
                faces.extend((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for i in range(n))
            faces.append(tuple(range(len(verts)-n,len(verts))))
            return mesh(name,verts,faces,mat,smooth=True)
        canopy("Raised olive canopy rim",1.15,[(1,.36),(1,.52),(.93,.59),(.5,.59)],olive)
        canopy("Unbroken smoked window",1.04,[(1,.49),(1,.565),(.93,.62),(.64,.691),(.23,.72)],visor)
        # The combat saddle is below the mass centre, with just the lips visible at the nose.
        front = -1.66 if combined else -1.26
        box("Ventral saddle",(0,-.28,-.23),(.64,1.05,.35),graphite,.09)
        box("Cannon breech",(0,front+.72,-.44),(.90,.73,.38),graphite,.10)
        for side in (-1,1):
            muzzle(side*.226,front,.215)
            if combined:
                x = side*.98
                for y in (-.72,.72):
                    tube("Skid strut",(side*.75,y,.15),(x,y-.18,-.78),.13,olive)
                box("Landing runner",(x,-.03,-.79),(.25,2.45,.19),olive,.09)
        if combined:
            # Raise the support head above the canopy crest on a separate toy saddle.
            box("Olive rear deck",(0,.78,.52),(1.38,.99,.26),olive,.10)
            box("Graphite docking socket",(0,.78,.68),(1.12,.84,.25),graphite,.085)
            for sx in (-1,1):
                box("Turquoise saddle foot",(sx*.54,.80,.79),(.29,1.18,.29),teal,.075)
            box("Raised teal saddle",(0,.82,.915),(1.37,1.23,.23),teal,.10)
            prism("Gold front catch",[(-.21,-.025),(.21,-.025),(.19,.43),(-.19,.43)],
                  .72,1.01,brass,.060)
            box("Support head",(0,.98,1.39),(1.31,1.07,.96),teal,.19)
            for sx in (-1,1):
                tube("Gold pivot",(sx*.617,.99,1.31),(sx*.719,.99,1.31),.195,brass,28)
                box("Raised side stripe",(sx*.637,.99,1.58),(.070,.59,.095),teal,.014)
            tube("Top gold cap",(0,1.06,1.831),(0,1.06,1.96),.182,brass,28)
            # The optic projects beyond the flat front panel with a visible gold surround.
            tube("Gold optic housing",(0,.56,1.40),(0,.255,1.45),.460,brass,36)
            tube("Teal lens gasket",(0,.281,1.446),(0,.222,1.456),.379,teal,36)
            shell("Convex cyan optic",(0,.237,1.46),.353,.142,.352,aqua)
        else:
            box("Rear spine",(0,.66,.45),(.83,.71,.16),olive,.07)
        if evolved:
            for side in (-1,1):
                box("Gatling shroud",(side*.62,.27,.38),(.28,.93,.25),graphite,.09)
                box("Silver trim",(side*.64,.32,.50),(.12,.49,.055),nickel,.02)
        pivots = []
        for j,(side,fwd) in enumerate([(-1,-1),(1,-1),(-1,1),(1,1)]):
            x,y = side*(1.76 if combined else 1.45),fwd*(1.12 if combined else 1.03)
            # Broad, swept solid arms blend into each side of the shell.
            start = (side*width*.52,fwd*.47)
            length=math.hypot(x-start[0],y-start[1])
            turn=math.atan2(y-start[1],x-start[0])
            box("Swept olive arm",((x+start[0])/2,(y+start[1])/2,.28),
                (length+.29,.34 if combined else .265,.235),olive,.092,turn)
            pivots.append(rotor(f"Rotor {j+1}",x,y,.49,.69 if combined else .63))
        return pivots

    def area(name, position, energy, size, color):
        lamp = bpy.data.lights.new(name, "AREA")
        lamp.energy, lamp.shape, lamp.size, lamp.color = energy, "DISK", size, color
        ob = bpy.data.objects.new(name, lamp)
        scene.collection.objects.link(ob)
        ob.location = position
        ob.rotation_euler = (-ob.location).to_track_quat("-Z", "Y").to_euler()

    area("Warm studio key", (-3.8,-5.5,7.4), 760, 4.7, (1,.86,.69))
    area("Cool front fill", (5,-2.5,3.8), 360, 4.3, (.83,.93,1))
    area("Rim light", (2,5.1,6), 680, 3.8, (1,.77,.51))
    camera = bpy.data.objects.new("Sprite camera", bpy.data.cameras.new("Sprite camera"))
    scene.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera

    def render(name, direction, size, scale):
        # Camera zero looks toward the nose. The atlas packer maps views to game headings.
        camera.location = (math.sin(direction)*8.3,-math.cos(direction)*8.3,7.0)
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
                    pivot.rotation_euler.z = frame * math.pi / FRAMES + i * .68
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
