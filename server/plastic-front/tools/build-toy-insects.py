"""Original rounded plastic insect meshes; keep the pre-v082 meshes/atlases intact.

Python / numpy / Pillow only. --review makes one pose; default bakes all directions.
The combat collision shapes and stats are intentionally independent of these meshes.
"""
import importlib.util
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('room', Path(__file__).with_name('build-room-models.py'))
room = importlib.util.module_from_spec(spec)
spec.loader.exec_module(room)
shade = room.shade


class Mesh(room.Mesh):
    """Ellipsoid vertex normals make the broad molded plastic surfaces smooth."""
    def __init__(self):
        super().__init__()
        self.normals = {}

    def ball(self, c, p, r, n=24, rings=12, gloss=.65):
        p, r = np.array(p), np.array(r)
        for j in range(rings):
            v0 = -math.pi/2+j*math.pi/rings
            v1 = v0+math.pi/rings
            for i in range(n):
                u0, u1 = i*math.tau/n, (i+1)*math.tau/n
                unit = np.array([[math.cos(v)*math.cos(u), math.cos(v)*math.sin(u), math.sin(v)]
                                 for u,v in [(u0,v0),(u1,v0),(u1,v1),(u0,v1)]])
                normals = unit/r
                normals /= np.linalg.norm(normals, axis=1)[:,None]
                self.normals[len(self.faces)] = normals
                self.face(p+unit*r, c, gloss)
KINDS = ['ant', 'soldierAnt', 'beetle', 'bruteBeetle', 'stagBeetle', 'rhinoBeetle']
COLORS = {'ant': (207, 94, 45), 'soldierAnt': (173, 63, 36), 'beetle': (132, 149, 76),
          'bruteBeetle': (86, 113, 88), 'stagBeetle': (58, 111, 134), 'rhinoBeetle': (145, 77, 53)}
SCALES = dict(zip(KINDS, [.72, .95, 1.05, 1.35, 1.2, 1.4]))


def ball(m, c, p, r, n=24, rings=12, gloss=.65):
    m.ball(c, p, r, n=n, rings=rings, gloss=gloss)


def sweep(m, c, points, radii, flatten=1, sides=16):
    """Continuous rounded molded piece: no spindly tubes or open horn ends."""
    points = np.array(points, dtype=float)
    rings = []
    for i, p in enumerate(points):
        tangent = points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]
        tangent /= np.linalg.norm(tangent)
        u = np.cross(tangent, [0, 0, 1] if abs(tangent[2]) < .9 else [0, 1, 0])
        u /= np.linalg.norm(u)
        v = np.cross(tangent, u)
        rings.append([p + radii[i] * (math.cos(a) * u + math.sin(a) * v * flatten)
                      for a in np.arange(sides) * math.tau / sides])
    m.face(rings[0][::-1], c, .6)
    for a, b in zip(rings, rings[1:]):
        for i in range(sides):
            j = (i + 1) % sides
            m.face([a[i], a[j], b[j], b[i]], c, .7)
    m.face(rings[-1], c, .6)
    ball(m, c, points[-1], (radii[-1],) * 3, n=12, rings=6)


def bezier(points, count=17):
    a, b, c, d = np.array(points, dtype=float)
    return [(1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d
            for t in np.linspace(0, 1, count)]


def toy_insect(kind, frame=0):
    m = Mesh()
    c = COLORS[kind]
    ant = kind in ['ant', 'soldierAnt']
    dark = shade(c, .71)
    step = [0, 1, -1][frame]
    # Six short articulated legs. Opposite tripods alternate, not independent wriggles.
    for side in [-1, 1]:
        for i in range(3):
            y = -12 + i * 11
            stride = step * side * (1 if i % 2 == 0 else -1) * 3
            a = (side * (6 if ant else 10), y, 13)
            b = (side * (17 if ant else 21), y + [-7, 0, 6][i] + stride, 11)
            foot = (side * (24 if ant else 29), b[1] + 4, 3)
            m.tube(dark, a, b, 3.2, 2.8, n=14, gloss=.65)
            ball(m, c, b, (3.4, 3.4, 3.4), n=16, rings=8)
            m.tube(c, b, foot, 2.8, 2.4, n=14, gloss=.6)
            ball(m, c, foot, (4, 5, 2.7), n=16, rings=8)
    if ant:
        ball(m, c, (0, 18, 17), (13, 18, 12))
        ball(m, dark, (0, 0, 15), (6, 7, 7))
        ball(m, c, (0, -8, 17), (8.5, 10, 9))
        ball(m, c, (0, -26, 18), (11.5, 11.5, 11))
        # The paired bent antennae are separate, mirror-symmetric molded pieces.
        for side in [-1, 1]:
            pts = [(side*6, -32, 25), (side*10, -39, 29), (side*16, -43, 31)]
            sweep(m, c, pts, [1.7, 1.6, 1.4], sides=12)
            ball(m, shade(c, 1.04), pts[-1], (2.1, 2.8, 2.1), n=16, rings=8)
        seam = [(0, 18 + 17.6*math.sin(t), 17 + 12*math.cos(t) + .15)
                for t in np.linspace(-1.1, 1.3, 24)]
        m.path(shade(c, .79), seam, .36)
        eye_y, eye_z, eye_x = -32, 22, 8.9
    else:
        # A thick smooth thorax, domed split wing covers, and a small round head.
        ball(m, c, (0, 12, 20), (17.5, 23, 16))
        ball(m, shade(c, .91), (0, -10, 20), (16.5, 13, 13.5))
        ball(m, c, (0, -26, 16), (11.5, 10.5, 10))
        seam = [(0, 12 + 22.6*math.sin(t), 20 + 16*math.cos(t) + .18)
                for t in np.linspace(-1.2, 1.35, 28)]
        m.path(shade(c, .58), seam, .44)
        # A fine assembly seam follows the curved front of the shell, not painted stripes.
        seam = [(16.4*math.sin(t), -10-12.8*math.cos(t), 20+13.5*math.sin(math.acos(.35)))
                for t in np.linspace(-.9, .9, 18)]
        # Neck joins remain solid; no holes or hollow ring around the horn.
        eye_y, eye_z, eye_x = -31, 19, 9
        if kind == 'stagBeetle':
            for side in [-1, 1]:
                pts = bezier([(side*6.8, -32, 15), (side*25, -37, 17),
                              (side*24, -56, 19), (side*6.5, -60, 20)])
                radii = [1.3 + 3.5*math.sin(math.pi*(.20+.80*t))**.7
                         for t in np.linspace(0, 1, len(pts))]
                sweep(m, shade(c, 1.03), pts, radii, .8, sides=18)
                q = pts[8]
                sweep(m, c, [q, (side*12, q[1]-1.5, q[2]+.2)], [2.5, 1.4], sides=14)
        elif kind == 'rhinoBeetle':
            # One forward-curving main horn ending in two visibly separated blunt prongs.
            sweep(m, c, [(0,-30,21), (0,-35,26), (0,-40,32), (0,-45,35)],
                  [4.5, 4, 3, 2.8], sides=20)
            for side in [-1, 1]:
                sweep(m, c, [(0,-45,35), (side*3.2,-49,38), (side*5.5,-52,39)],
                      [2.7, 2.1, 1.5], sides=16)
            sweep(m, dark, [(0,-16,31), (0,-23,34), (0,-27,32)], [3.1, 2.3, 1], sides=16)
        else:
            # Generic and giant beetles share the same rounded toy family, without spikes.
            for side in [-1, 1]:
                sweep(m, c, [(side*6,-32,22), (side*10,-38,26), (side*13,-40,27)],
                      [1.5, 1.3, 1.1], sides=12)
                ball(m, c, (side*13,-40,27), (1.8,2.4,1.8), n=12, rings=6)
    # Smooth dark bead eyes and small, restrained catchlights; no teeth or compound eyes.
    for side in [-1, 1]:
        ball(m, shade(c, .61), (side*eye_x, eye_y, eye_z), (3.1,3.5,3.3), n=18, rings=9)
        ball(m, (22,31,31), (side*(eye_x+.35), eye_y-1.2, eye_z+.2), (2.5,2.6,2.6), n=20, rings=10, gloss=.85)
        ball(m, (230,238,216), (side*eye_x-.45, eye_y-2.9, eye_z+1.55), (.65,.55,.65), n=8, rings=4, gloss=.2)
    scale = SCALES[kind]
    m.faces = [(p*scale, col, gloss) for p,col,gloss in m.faces]
    return m


def render(model, angle, cell, ambient=.43, diffuse_gain=.7):
    co, si = math.cos(angle), math.sin(angle)
    rot = np.array([[co,-si,0],[si,co,0],[0,0,1]])
    # Same projection / triangle depth as the room baker, with interpolated lighting.
    ss = 2
    size, anchor = cell*ss, (cell/2,cell*.7)
    rgba = np.zeros((size,size,4), dtype=np.uint8)
    depth = np.full((size,size), -np.inf, dtype=np.float32)
    shadow = Image.new('L',(size,size))
    sd = ImageDraw.Draw(shadow)
    for fi,(points,c,g) in enumerate(model.faces):
        pts = points@rot.T
        sd.polygon([((v[0]+v[2]*.5+anchor[0])*ss,(v[1]*.8+v[2]*.28+anchor[1])*ss)
                    for v in pts], fill=66)
        normal = np.cross(pts[1]-pts[0],pts[2]-pts[0])
        length = np.linalg.norm(normal)
        if length < 1e-7:
            continue
        normal /= length
        if normal@room.models.VIEW < -.03:
            continue
        normals = model.normals.get(fi)
        normals = normals@rot.T if normals is not None else np.tile(normal,(len(pts),1))
        diffuse = np.maximum(0,normals@room.models.LIGHT)
        specular = np.maximum(0,normals@room.models.HALF)**22*g
        colors = np.clip(np.array(c)[None,:]*(ambient+diffuse_gain*diffuse[:,None])+specular[:,None]*135,0,255)
        screen = np.column_stack(((pts[:,0]+anchor[0])*ss,
                                  (pts[:,1]*.8-pts[:,2]*.6+anchor[1])*ss,pts@room.models.VIEW))
        for i in range(1,len(pts)-1):
            idx = [0,i,i+1]
            a,b,c1 = screen[idx]
            den = (b[1]-c1[1])*(a[0]-c1[0])+(c1[0]-b[0])*(a[1]-c1[1])
            if abs(den) < 1e-7:
                continue
            lo = np.maximum(0,np.floor(np.minimum(np.minimum(a[:2],b[:2]),c1[:2]))).astype(int)
            hi = np.minimum(size-1,np.ceil(np.maximum(np.maximum(a[:2],b[:2]),c1[:2]))).astype(int)
            if (hi < lo).any():
                continue
            xs = np.arange(lo[0],hi[0]+1)[None,:]+.5
            ys = np.arange(lo[1],hi[1]+1)[:,None]+.5
            wa = ((b[1]-c1[1])*(xs-c1[0])+(c1[0]-b[0])*(ys-c1[1]))/den
            wb = ((c1[1]-a[1])*(xs-c1[0])+(a[0]-c1[0])*(ys-c1[1]))/den
            wc = 1-wa-wb
            z = wa*a[2]+wb*b[2]+wc*c1[2]
            view = depth[lo[1]:hi[1]+1,lo[0]:hi[0]+1]
            mask = (wa>=-1e-7)&(wb>=-1e-7)&(wc>=-1e-7)&(z>view)
            view[mask] = z[mask]
            ca,cb,cc = colors[idx]
            rgb = wa[:,:,None]*ca+wb[:,:,None]*cb+wc[:,:,None]*cc
            patch = rgba[lo[1]:hi[1]+1,lo[0]:hi[0]+1]
            patch[mask,:3] = np.clip(rgb[mask],0,255).astype(np.uint8)
            patch[mask,3] = 255
    shadow = shadow.filter(ImageFilter.GaussianBlur(4))
    im = Image.new('RGBA',(size,size))
    im.paste((24,34,25,255),(0,0,size,size),shadow)
    return Image.alpha_composite(im,Image.fromarray(rgba)).resize((cell,cell),Image.Resampling.LANCZOS)


def main():
    out = ROOT/'dist/assets/models'
    review_only = '--review' in sys.argv
    # Review is the actual mesh render, rather than the earlier generated concept image.
    review = Image.new('RGB', (1440, 720), (224,217,198))
    d = ImageDraw.Draw(review)
    for i, kind in enumerate(KINDS):
        m = toy_insect(kind)
        for j, a in enumerate([-math.pi/4, 0, math.pi*3/4]):
            tile = render(m, a, 192).resize((240,240), Image.Resampling.LANCZOS)
            review.paste(tile, (i*240, j*220), tile)
        d.text((i*240+12, 690), kind, fill=(37,55,44))
    review.save(ROOT/'art/toy-insects-v082-review.webp', 'WEBP', quality=94)
    if review_only:
        print('actual mesh review ready', flush=True)
        return
    p = out/'manifest.json'
    manifest = json.loads(p.read_text())
    for kind in KINDS:
        cell = 192 if kind in ['bruteBeetle','stagBeetle','rhinoBeetle'] else 128
        sheet = Image.new('RGBA', (cell*8,cell*6))
        for frame in range(3):
            m = toy_insect(kind, frame)
            for a in range(16):
                tile = render(m, a*math.tau/16, cell)
                sheet.paste(tile, ((a%8)*cell,(frame*2+a//8)*cell))
            print(kind, 'pose', frame, flush=True)
        name = f'{kind}-2-toy-v082.webp'
        sheet.save(out/name, 'WEBP', quality=92, method=6, exact=True)
        manifest['models'][kind+'-2'] = {'body': {'file':name,'cell':cell,'frames':3,
            'anchorX':cell/2,'anchorY':cell*.7,'design':'toy-v082'}}
    manifest['version'] += 1
    manifest['insectDesign'] = 'toy-v082'
    p.write_text(json.dumps(manifest,separators=(',',':')))
    (ROOT/'art/toy-insects-v082-manifest.json').write_text(json.dumps({
        'models': {k+'-2':manifest['models'][k+'-2'] for k in KINDS}},indent=2))
    print('six toy insect atlases: 16 directions x idle / two tripod poses', flush=True)


if __name__ == '__main__':
    main()
