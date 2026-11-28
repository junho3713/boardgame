"""Bake the Kraken's rolling breaker into a transparent four-view, eight-pose atlas.

Run with Python, NumPy and Pillow. Set BLENDER to the executable if it is not on PATH.
"""
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

CELL, POSES = 256, 8
SPRITE, FRAMES = 288, 16
OUTPUT = Path(__file__).resolve().parents[1] / "public/assets/models/kraken-surf-v2.webp"


def bake_painted_crest(art, models, direction):
    """Use the animated mesh silhouette to deform the four painted water views.

    Work in a common falling-water coordinate system. Two overlapping flow
    phases carry the foam around the barrel continuously across the loop seam.
    """
    import numpy as np
    from PIL import Image
    turns=(3,0,1,2)[direction]
    y,x=np.mgrid[0:SPRITE,0:SPRITE].astype(np.float32)
    u,v=x/(SPRITE-1),y/(SPRITE-1)
    rgba=np.rot90(np.asarray(art.resize((SPRITE,SPRITE),Image.Resampling.LANCZOS)),turns)/255.
    rgba=rgba.astype(np.float32)
    # Blend samples in premultiplied space to keep fine spray free of matte fringes.
    rgba[:,:,:3]*=rgba[:,:,3:]
    profile=[]
    for pose in models:
        alpha=np.rot90(np.asarray(pose.getchannel("A")),turns)
        columns=np.clip(((u[0]-.5)*CELL*6/8.6+CELL/2).astype(int),0,CELL-1)
        occupied=alpha[:,columns]>60
        rim=occupied.argmax(axis=0)
        rim[~occupied.any(axis=0)]=CELL//2
        profile.append(np.convolve(np.pad(rim,(5,5),mode="edge"),np.ones(11)/11,mode="valid"))
    profile=np.array(profile)
    profile-=profile.mean(axis=0)
    edge=np.minimum.reduce([u,1-u,v,1-v])
    margin=np.clip(edge/.032,0,1)
    margin=margin*margin*(3-2*margin)

    def sample(px,py):
        px=np.clip(px,0,SPRITE-1.001);py=np.clip(py,0,SPRITE-1.001)
        ix,iy=px.astype(int),py.astype(int)
        wx,wy=(px-ix)[:,:,None],(py-iy)[:,:,None]
        return ((rgba[iy,ix]*(1-wx)+rgba[iy,ix+1]*wx)*(1-wy)
                +(rgba[iy+1,ix]*(1-wx)+rgba[iy+1,ix+1]*wx)*wy)

    for frame in range(FRAMES):
        t=frame/FRAMES
        rig=t*POSES
        bend=(1-rig%1)*profile[int(rig)]+(rig%1)*profile[(int(rig)+1)%POSES]
        shoulder=np.maximum(0,np.sin(np.pi*u))**.75
        lift=np.exp(-((v-.38)/.36)**2)*shoulder
        px=x-6*lift*np.sin(2*np.pi*(t+.7*u)+v*2)
        py=y-lift*(.85*bend + 7*np.sin(2*np.pi*(u-t)))
        # The face climbs at the rear and folds over toward the toe.
        flow_x=6.5*np.sin(2*np.pi*(u+.24*v))*shoulder
        flow_y=(13+5*np.cos(2*np.pi*u))*np.maximum(0,np.sin(np.pi*v))**.7
        phase=(t+.23*u+.1*np.sin(v*5))%1
        weight=(.5-.5*np.cos(2*np.pi*phase))[:,:,None]
        first=sample(px-(phase-.5)*flow_x,py-(phase-.5)*flow_y)
        second=sample(px-((phase+.5)%1-.5)*flow_x,py-((phase+.5)%1-.5)*flow_y)
        out=first*weight+second*(1-weight)
        alpha=out[:,:,3:]
        rgb=out[:,:,:3]/np.maximum(alpha,.0001)
        # Fine ivory foam stays dense; the turquoise veil transmits wood grain.
        foam=np.clip((np.min(rgb,axis=2)-.40)/.46,0,1)
        out[:,:,:3]=rgb
        out[:,:,3]*=margin*(.78+.22*foam)
        yield Image.fromarray(np.rot90(np.uint8(np.clip(out,0,1)*255),-turns))


def pack():
    from PIL import Image
    blender = os.environ.get("BLENDER") or shutil.which("blender")
    if not blender:
        raise SystemExit("Set BLENDER to a Blender 5.x executable")
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([blender, "-b", "--factory-startup", "--python-exit-code", "1",
                        "-P", str(Path(__file__).resolve()), "--", tmp], check=True)
        atlas = Image.new("RGBA", (SPRITE*8, SPRITE*8))
        with Image.open(Path(__file__).with_name("kraken-breaker-art.webp")) as master:
            width,height=master.width//2,master.height//2
            views=[master.crop((x*width,y*height,(x+1)*width,(y+1)*height)).convert("RGBA")
                   for x,y in [(1,0),(0,0),(1,1),(0,1)]]
        for direction in range(4):
            poses=[]
            for frame in range(POSES):
                with Image.open(Path(tmp) / f"{direction}-{frame}.png") as tile:
                    poses.append(tile.convert("RGBA"))
            for frame,tile in enumerate(bake_painted_crest(views[direction],poses,direction)):
                atlas.paste(tile, (SPRITE*(frame%8),SPRITE*(2*direction+frame//8)))
        with tempfile.NamedTemporaryFile(dir=OUTPUT.parent, suffix=".webp", delete=False) as staged:
            staged_path = Path(staged.name)
        try:
            atlas.save(staged_path, "WEBP", method=4, quality=86, alpha_quality=85)
            staged_path.replace(OUTPUT)
        finally:
            staged_path.unlink(missing_ok=True)


if __name__ == "__main__" and "--" not in sys.argv:
    pack()
    sys.exit(0)

import bpy
from mathutils import Vector
from math import cos, sin, exp, pi, tau

# Closed forward/elevation section: trailing wash, steep back, overhanging lip,
# recessed barrel, thin leading wash, then the submerged underside.
SECTION = [(-2.6,.06),(-2.22,.19),(-1.61,.42),(-1.18,.82),(-.98,1.40),
           (-.70,1.89),(-.34,2.12),(.10,2.14),(.45,1.98),(.62,1.68),
           (.56,1.48),(.40,1.47),(.27,1.66),(.01,1.70),(-.21,1.54),
           (-.36,1.16),(-.38,.83),(-.27,.51),(-.04,.30),(.39,.19),
           (.85,.13),(1.03,.05),(.65,.008),(-.32,.003),(-1.55,.004),(-2.42,.014)]
RINGS, STEPS = 92, len(SECTION)*3


def section(i):
    k, t = divmod(i, 3)
    t /= 3
    points = [SECTION[(k+j) % len(SECTION)] for j in (-1,0,1,2)]
    return [0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t**3)
            for a,b,c,d in zip(*points)]


def mix(a,b,t):
    t = max(0, min(1,t))
    return tuple(x+(y-x)*t for x,y in zip(a,b))


def painted_surface(u, frame, direction):
    phase = tau*frame/POSES
    end = max(0, 1-u*u)
    # Three breaking shoulders move out of phase along the same continuous sheet.
    shoulder = (.72+.24*sin(5*u+.66*sin(phase))+.13*cos(9*u-phase)
                +.12*sin(14*u+phase))
    height = end**.66 * shoulder
    taper = end**.48
    sweep = .22*sin(5*u-phase)+.14*cos(10*u+phase)
    across = u * 3 * (1.35 if direction%2==0 else 1)
    coords, colors = [], []
    for j, (forward,z) in enumerate(PROFILE):
        upper = max(0,z/2.14)
        p = j/3
        ripple = .078*sin(20*u+upper*2-phase)+.045*cos(29*u+phase)
        curl = upper**2*(.15*sin(phase+u*7)+ripple)
        x = across + .21*height*upper**2*sin(7*u+phase)
        # Narrow tongues peel off the lip and hang in front of the barrel.
        lip_end = exp(-((p-10.4)/2.5)**2)
        finger = max(0,cos(20*u+phase+.9*sin(6*u-phase)))**3 * lip_end*height
        y = -(forward*taper + sweep*taper + curl*taper + .25*finger)
        elevation = max(0,z*height + upper**3*ripple*taper - .43*finger)
        coords.append((x,y,elevation))
        # Pale broken foam on the lip, dark teal inside the hollow, glints
        # following the slope of the back instead of a flat white outline.
        base = mix((.002,.13,.32),(.012,.57,.77),upper*.94+.11*sin(p*.5+u*3))
        if 10<p<18:
            base = mix(base,(.001,.12,.32),.73*sin(pi*(p-10)/8))
        vein = sin(25*u + 3.8*upper + 1.5*sin(8*u-phase) - phase)
        if p<6:
            base = mix(base,(.22,.87,.87),max(0,vein-.55)*1.4*upper)
        lip = abs(p-(8.2+.65*sin(12*u+phase)+.4*sin(26*u-phase)))
        foam = min(1,max(0,(1.45-lip)*1.25))
        base = mix(base,(.65,.94,1),foam)
        base = mix(base,(.98,1,1),foam*max(0,(1.45-lip)*.85))
        if 18<p<22:
            base = mix(base,(.28,.79,.86),max(0,vein)*.35)
        # The thin leading and trailing sheets must transmit the real game floor.
        # The rolled-over lip is the only part with a dense white-water core.
        alpha=(.09+.48*upper+.10*max(0,vein)*upper+.40*foam)*end**.23
        colors.append((*base,alpha))
    return coords,colors


def make_mesh(frame, direction):
    verts, colors, faces = [], [], []
    for ring in range(1,RINGS):
        v, c = painted_surface(-1+2*ring/RINGS,frame,direction)
        verts.extend(v)
        colors.extend(c)
    for ring in range(RINGS-2):
        for j in range(STEPS):
            a = ring*STEPS+j
            b = ring*STEPS+(j+1)%STEPS
            faces.append((a,b,b+STEPS,a+STEPS))
    for side in (0,1):
        tip = len(verts)
        verts.append(((1 if side else -1)*3*(1.35 if direction%2==0 else 1),0,.008))
        colors.append((.11,.52,.63,.04))
        off = (RINGS-2)*STEPS if side else 0
        for j in range(STEPS):
            a,b = off+j,off+(j+1)%STEPS
            faces.append((tip,a,b) if side else (tip,b,a))
    # Jets tear away from the outer shoulder. They curve over, thin out and
    # split unevenly, leaving air visible between the fingers of spray.
    phase=tau*frame/POSES
    for jet in range(13):
        u=-.85+jet*.138+.028*sin(jet*3.6)
        root=Vector(painted_surface(u,frame,direction)[0][21])
        strength=(.32+.68*(.5+.5*cos(jet*2.6+phase))) * (1-.48*u*u)
        lean=.35*sin(jet*7.3+phase)+.10
        reach=.40+.74*strength
        lift=.31+.88*strength
        origin=len(verts)
        root.z-=.065
        root.y+=.085
        count=10
        for k in range(count):
            t=k/count
            path=root+Vector((lean*t+.075*sin(t*pi),-reach*t*t,lift*(sin(t*2.4)-.32*t)))
            tangent=Vector((lean+.075*pi*cos(t*pi),-2*reach*t,lift*(2.4*cos(t*2.4)-.32))).normalized()
            wide=tangent.cross(Vector((0,1,0))).normalized()
            thick=tangent.cross(wide)
            radius=(.12+.105*strength)*(1-t)**1.1
            for j in range(8):
                angle=tau*j/8
                verts.append(tuple(path+radius*(1.3*cos(angle)*wide+.59*sin(angle)*thick)))
                colors.append((*mix((.07,.63,.74),(.85,.98,1),t**.7),.48+.34*t))
                if k:
                    a=origin+(k-1)*8+j
                    b=origin+(k-1)*8+(j+1)%8
                    faces.append((a,b,b+8,a+8))
        faces.append(tuple(origin+j for j in reversed(range(8))))
        tip=len(verts)
        verts.append(tuple(root+Vector((lean,-reach,lift*(sin(2.4)-.32)))))
        colors.append((.94,1,1,.80))
        for j in range(8):
            faces.append((origin+(count-1)*8+j,origin+(count-1)*8+(j+1)%8,tip))
    mesh=bpy.data.meshes.new("Breaker surface")
    mesh.from_pydata(verts,[],faces)
    mesh.polygons.foreach_set("use_smooth",[True]*len(faces))
    attr=mesh.color_attributes.new(name="Pigment",type="FLOAT_COLOR",domain="POINT")
    attr.data.foreach_set("color",[v for color in colors for v in color])
    mesh.materials.append(water)
    mesh.update()
    return mesh


def area(name, pos, watts, size, color):
    data=bpy.data.lights.new(name,"AREA")
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(-Vector(pos)).to_track_quat("-Z","Y").to_euler()
    data.energy,data.shape,data.size,data.color=watts,"DISK",size,color


def bake(directory):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    global water,scene
    scene=bpy.context.scene
    scene.render.engine="CYCLES"
    scene.cycles.samples=24
    scene.cycles.max_bounces=3
    scene.cycles.use_denoising=True
    scene.render.film_transparent=True
    scene.render.resolution_x=scene.render.resolution_y=CELL
    scene.render.resolution_percentage=100
    scene.view_settings.view_transform="Standard"
    world=bpy.data.worlds.new("Cool studio")
    world.color=(.38,.45,.53)
    scene.world=world
    area("Softbox",(-4,-3,7),360,4.1,(.87,.97,1))
    area("Foam rim",(2.5,3.8,5),510,2.5,(.70,.92,1))
    area("Front fill",(3,-4,3),130,3,(.57,.85,1))
    camera=bpy.data.cameras.new("Game orthographic")
    obj=bpy.data.objects.new("Camera",camera)
    scene.collection.objects.link(obj)
    scene.camera=obj
    obj.location=(0,-9,10)
    obj.rotation_euler=(-obj.location).to_track_quat("-Z","Y").to_euler()
    camera.type,camera.ortho_scale="ORTHO",8.6
    water=bpy.data.materials.new("Pigmented surf")
    water.use_nodes=True
    bsdf=next(n for n in water.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
    pigment=water.node_tree.nodes.new("ShaderNodeVertexColor")
    pigment.layer_name="Pigment"
    # Distorted cellular edges form thin foam lace. Pigment masks it to the
    # breaking shoulder, with a few separated patches of foam on the back.
    nodes,link=water.node_tree.nodes,water.node_tree.links.new
    uvw=nodes.new("ShaderNodeTexCoord").outputs["Generated"]
    noise=nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value=7
    noise.inputs["Detail"].default_value=2.5
    link(uvw,noise.inputs["Vector"])
    warp=nodes.new("ShaderNodeVectorMath")
    warp.operation="SCALE"
    warp.inputs["Scale"].default_value=.145
    link(noise.outputs["Color"],warp.inputs[0])
    add=nodes.new("ShaderNodeVectorMath")
    add.operation="ADD"
    link(uvw,add.inputs[0])
    link(warp.outputs["Vector"],add.inputs[1])
    cells=nodes.new("ShaderNodeTexVoronoi")
    cells.feature="DISTANCE_TO_EDGE"
    cells.inputs["Scale"].default_value=23
    link(add.outputs[0],cells.inputs["Vector"])
    foam_edge=nodes.new("ShaderNodeValToRGB")
    foam_edge.color_ramp.elements[0].color=(1,1,1,1)
    foam_edge.color_ramp.elements[1].position=.16
    foam_edge.color_ramp.elements[1].color=(0,0,0,1)
    link(cells.outputs["Distance"],foam_edge.inputs[0])
    coverage=nodes.new("ShaderNodeMath")
    coverage.operation="MULTIPLY_ADD"
    coverage.inputs[1].default_value=1.6
    coverage.inputs[2].default_value=-.33
    coverage.use_clamp=True
    link(pigment.outputs["Color"],coverage.inputs[0])
    mask=nodes.new("ShaderNodeMath")
    mask.operation="MULTIPLY"
    link(coverage.outputs[0],mask.inputs[0])
    link(foam_edge.outputs[0],mask.inputs[1])
    color=nodes.new("ShaderNodeMixRGB")
    link(mask.outputs[0],color.inputs[0])
    link(pigment.outputs["Color"],color.inputs[1])
    color.inputs[2].default_value=(.86,.98,1,1)
    link(color.outputs[0],bsdf.inputs["Base Color"])
    link(color.outputs[0],bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value=.18
    bump=nodes.new("ShaderNodeBump")
    bump.inputs["Distance"].default_value=.028
    bump.inputs["Strength"].default_value=.4
    link(noise.outputs["Fac"],bump.inputs["Height"])
    link(bump.outputs["Normal"],bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value=.16
    bsdf.inputs["Coat Weight"].default_value=.48
    # Compositing the real floor through the RGBA sprite avoids a baked
    # studio backdrop. Add opacity at grazing angles and on the foam lace.
    fresnel=nodes.new("ShaderNodeFresnel")
    fresnel.inputs["IOR"].default_value=1.333
    opacity=nodes.new("ShaderNodeMath")
    opacity.operation="MULTIPLY_ADD"
    link(fresnel.outputs[0],opacity.inputs[0])
    opacity.inputs[1].default_value=.42
    link(pigment.outputs["Alpha"],opacity.inputs[2])
    laced=nodes.new("ShaderNodeMath")
    laced.operation="MULTIPLY_ADD"
    laced.use_clamp=True
    link(mask.outputs[0],laced.inputs[0])
    laced.inputs[1].default_value=.50
    link(opacity.outputs[0],laced.inputs[2])
    geometry=nodes.new("ShaderNodeNewGeometry")
    front=nodes.new("ShaderNodeMath")
    front.operation="LESS_THAN"
    link(geometry.outputs["Backfacing"],front.inputs[0])
    front.inputs[1].default_value=.5
    surface=nodes.new("ShaderNodeMath")
    surface.operation="MULTIPLY"
    link(laced.outputs[0],surface.inputs[0])
    link(front.outputs[0],surface.inputs[1])
    clear=nodes.new("ShaderNodeBsdfTransparent")
    blend=nodes.new("ShaderNodeMixShader")
    link(surface.outputs[0],blend.inputs[0])
    link(clear.outputs[0],blend.inputs[1])
    link(bsdf.outputs[0],blend.inputs[2])
    output=next(n for n in nodes if n.type=="OUTPUT_MATERIAL")
    link(blend.outputs[0],output.inputs["Surface"])
    # A mesh object keeps the same transform and camera pivot in all poses.
    breaker=bpy.data.objects.new("Kraken breaker",bpy.data.meshes.new("Initial surface"))
    scene.collection.objects.link(breaker)
    for direction in (1,0,2,3):
        breaker.rotation_euler.z=(pi/2,0,-pi/2,pi)[direction]
        for frame in range(POSES):
            old=breaker.data
            breaker.data=make_mesh(frame,direction)
            bpy.data.meshes.remove(old)
            if direction==1 and frame==0 and os.environ.get("KRAKEN_REVIEW_BLEND"):
                bpy.ops.wm.save_as_mainfile(filepath=os.environ["KRAKEN_REVIEW_BLEND"],copy=True)
            scene.render.filepath=str(directory/f"{direction}-{frame}.png")
            bpy.ops.render.render(write_still=True)


PROFILE=[section(i) for i in range(STEPS)]
if __name__ == "__main__":
    bake(Path(sys.argv[sys.argv.index("--")+1]))
