"""Bake the original pirate cannon and its parrot into a 16-view animated WebP atlas."""

import argparse
import math
from pathlib import Path
from runpy import run_path

import numpy as np
from PIL import Image

shared = run_path(str(Path(__file__).with_name("build-unit-models.py")))
Mesh, render = (shared[key] for key in ("Mesh", "render"))
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "models" / "pirateCannon-2-body-v211.webp"
CELL, DIRECTIONS, COLUMNS = 192, 16, 8
IDLE, TRAVEL_A, TRAVEL_B, IGNITE, RECOIL, APPROACH = range(6)
POSES = 6
TAU = math.tau
RED = (170, 55, 42)
LACQUER = (209, 72, 53)
RED_DARK = (113, 36, 29)
IVORY = (239, 213, 169)
CREAM = (250, 223, 178)
TREAD_SHADOW = (169, 133, 90)
BRASS = (221, 159, 65)
BRONZE = (141, 84, 38)
BARREL = (74, 70, 65)
IRON = (97, 88, 81)
CHARCOAL = (44, 41, 40)
BLACK = (23, 22, 24)
TEAL = (31, 133, 137)
JADE = (43, 147, 145)
MINT = (66, 165, 153)
OCEAN = (31, 109, 122)
SHADOW_TEAL = (26, 84, 84)
SAGE = (102, 148, 109)
SAGE_LIGHT = (153, 180, 113)
VIOLET = (67, 57, 92)
VIOLET_LIGHT = (94, 79, 105)
COPPER = (191, 89, 48)
BEAK = (65, 51, 65)
BEAK_EDGE = (90, 70, 80)
AMBER = (229, 137, 33)


def mix(a, b, t):
    """Blend material colors along a molded piece."""
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_lathe(mesh, origin, axis, profile, segments=32):
    """Revolve a profile. Returning to a small radius inside the lip forms a bore."""
    origin, axis = np.array(origin), np.array(axis, dtype=float)
    axis /= np.linalg.norm(axis)
    reference = np.array((0., 0., 1.)) if abs(axis[2]) < .95 else np.array((0., 1., 0.))
    u = np.cross(axis, reference)
    u /= np.linalg.norm(u)
    v = np.cross(axis, u)
    angles = [i * TAU / segments for i in range(segments)]
    rays = [math.cos(a) * u + math.sin(a) * v for a in angles]
    rings = [[origin + travel * axis + radius * ray for ray in rays] for travel, radius, _ in profile]
    for a, b, (_, _, color) in zip(rings, rings[1:], profile):
        if np.mean(np.linalg.norm(np.array(a) - np.array(b), axis=1)) < 1e-5:
            continue
        for i in range(segments):
            j = (i + 1) % segments
            mesh.face([a[i], a[j], b[j], b[i]], color, .48)


def formed_panel(mesh, polygon, side, inner, outer, material):
    """Beveled red side plate, rebuilt as a solid piece on each side."""
    cy = sum(p[0] for p in polygon) / len(polygon)
    cz = sum(p[1] for p in polygon) / len(polygon)
    sections = [(inner, .94), (inner + .9, 1), (outer - 1.25, 1), (outer, .89)]
    rings = [[(side * x, cy + (y - cy) * size, cz + (z - cz) * size)
              for y, z in polygon] for x, size in sections]
    def face(vertices, color, inward=False):
        mesh.face(vertices if (side == 1) != inward else vertices[::-1], color, .5)
    face(rings[0], mix(material, RED_DARK, .45), True)
    for index, (a, b) in enumerate(zip(rings, rings[1:])):
        for i in range(len(polygon)):
            j = (i + 1) % len(polygon)
            face([a[i], a[j], b[j], b[i]], mix(material, LACQUER, .3 if index == 2 else 0))
    face(rings[-1], material)


def wheel(mesh, side, phase):
    x, y, z = side * 23.2, 10.8, 14.7
    # The spokes and the tread notches rotate independently of the carriage.
    for i in range(7):
        angle = i * TAU / 7 + phase
        co, si = math.cos(angle), math.sin(angle)
        spoke = Mesh()
        spoke.box(LACQUER, (0, 7.5, 0), (4.3, 11, 2.8), .58)
        transform = np.array([[1, 0, 0], [0, co, -si], [0, si, co]])
        mesh.faces.extend((points @ transform.T + [x, y, z], color, gloss)
                          for points, color, gloss in spoke.faces)
    # Solid red felloe and shaped ivory treads surrounding seven actual open gaps.
    rounded_lathe(mesh, (x, y, z), (side, 0, 0), [
        (-3.7, 11.0, RED_DARK), (-3.7, 13.6, RED),
        (-2.9, 14.8, TREAD_SHADOW), (2.9, 14.8, RED_DARK),
        (3.7, 13.6, LACQUER), (3.7, 10.8, RED_DARK),
        (2.4, 10.8, RED_DARK), (-3.7, 11.0, RED_DARK),
    ])
    for i in range(18):
        angle = i * TAU / 18 + phase
        width = TAU / 18 - .026
        def at(sector, r, offset):
            a = angle + width * sector
            return (x + side * offset, y + math.cos(a) * r, z + math.sin(a) * r)
        strips = (
            (-3.72, 12.68, TREAD_SHADOW), (-4.0, 13.72, IVORY),
            (-3.04, 15.25, CREAM), (3.02, 15.25, CREAM),
            (4.0, 13.65, IVORY), (3.7, 12.7, TREAD_SHADOW),
        )
        for a, b in zip(strips, strips[1:]):
            for l, r in ((0, .333), (.333, .666), (.666, 1)):
                vertices = [at(l, a[1], a[0]), at(r, a[1], a[0]), at(r, b[1], b[0]), at(l, b[1], b[0])]
                mesh.face(vertices if side > 0 else vertices[::-1], a[2], .31)
    rounded_lathe(mesh, (x, y, z), (side, 0, 0), [
        (-4.12, .04, RED_DARK), (-4.12, 4.24, RED), (-3.7, 5, RED), (3.6, 5, RED),
        (4.1, 4.75, LACQUER), (4.5, 3.45, BRONZE), (5.12, 3.42, BRASS),
        (5.53, 2.85, BRASS), (5.53, .03, BRASS),
    ])


def crossed_bones(mesh, side):
    x, y, z = side * 21.15, -15.5, 25
    for sign in (-1, 1):
        low = (x, y - 5.2, z - sign * 4.35)
        high = (x, y + 5.2, z + sign * 4.35)
        mesh.tube(CREAM, low, high, 1.31, n=12, gloss=.58)
        for point, end in ((low, -1), (high, 1)):
            for bump in (-1, 1):
                mesh.ball(IVORY, (point[0], point[1] + bump * .52,
                                 point[2] + end * .37 - sign * bump * .64),
                          (.96, 1.41, 1.40), n=12, rings=7, gloss=.6)


def carriage(mesh, frame):
    phase = {TRAVEL_A: .25, TRAVEL_B: .61}.get(frame, .08)
    mesh.box(RED_DARK, (0, -3.7, 10.1), (43, 58, 7.7), 2.7)
    mesh.box(RED, (0, -2.8, 15.5), (41, 58.5, 6), 2.1)
    mesh.box(LACQUER, (0, -29.6, 17.6), (42, 7.8, 8.3), 2.1)
    mesh.box(RED_DARK, (0, 19.4, 19.8), (33, 13, 12), 1.8)
    mesh.box(LACQUER, (0, 20.8, 33.6), (29, 12.3, 10.7), 2.6)
    mesh.tube(LACQUER, (-15.4, 23.1, 38.6), (15.4, 23.1, 38.6), 3.0, n=20, gloss=.54)
    mesh.tube(CHARCOAL, (-20, 10.8, 14.7), (20, 10.8, 14.7), 2.7, n=16)
    polygon = [(-32, 13), (-27, 11), (4, 11), (8, 16), (4, 28),
               (-1, 31.3), (-4.8, 37), (-14, 37), (-20, 33), (-23, 24.5), (-30, 18.8)]
    for side in (-1, 1):
        formed_panel(mesh, polygon, side, 14.8, 20.6, RED)
        mesh.path(LACQUER, [(side * 20, -30.5, 14.7), (side * 20, -23.8, 15),
                            (side * 20, -14, 15.0), (side * 20, .3, 15.3)], .59)
        crossed_bones(mesh, side)
        for y in (-26.3, -10.3, 2.1):
            mesh.tube(BRONZE, (side*20.2, y, 15), (side*21.65, y, 15), 2.13, n=16)
            mesh.ball(BRASS, (side*21.56, y, 15), (.78, 1.63, 1.63), n=16, rings=8, gloss=.7)
        mesh.box(LACQUER, (side*8.6, -6.9, 44), (3.9, 14.8, 7.4), 1.65)
        wheel(mesh, side, phase)


def cannon_barrel(mesh, frame):
    back = np.array((0., 15.0, 28.2))
    muzzle = np.array((0., -38.0, 34.0))
    if frame == RECOIL:
        back += (0, 2.6, -.3)
        muzzle = np.array((0., -34.0, 38.0))
    axis = muzzle - back
    length = np.linalg.norm(axis)
    profile = [
        (0, .03, CHARCOAL), (0, 5.3, CHARCOAL), (.8, 7.4, IRON), (2.4, 8, BARREL),
        (3.75, 7.1, CHARCOAL), (5, 10.45, BARREL), (7.3, 11, IRON),
        (11.9, 11, IRON), (13.55, 10.1, CHARCOAL), (15.1, 10.1, BARREL),
        (25.6, 10.47, BARREL), (26.5, 11.0, IRON), (29.5, 11, BARREL),
        (31.2, 10.3, BARREL), (length-9.5, 11.3, BARREL), (length-8.4, 12.3, IRON),
        (length-6.1, 13.9, IRON), (length-4.05, 14.1, IRON),
        (length-2.05, 13.25, IRON), (length-.58, 12.05, BARREL), (length, 10.72, BARREL),
        (length, 9.12, CHARCOAL), (length-2.2, 8.75, CHARCOAL), (length-4, 8.4, BLACK),
        (length-12.0, 7.75, BLACK), (length-12.0, .03, BLACK),
    ]
    rounded_lathe(mesh, back, axis, profile, 40)


def capped_feather(mesh, controls, width, thickness, root, tip=None, gloss=.45, sections=10):
    """A sculpted tapered feather with thickness, curled tip, and highlight ridge."""
    a, b, c, d = (np.array(v, dtype=float) for v in controls)
    rings, colors = [], []
    for i in range(sections + 1):
        t = i / sections
        o = 1 - t
        center = a*o**3 + 3*b*o*o*t + 3*c*o*t*t + d*t**3
        tangent = (b-a)*o*o + 2*(c-b)*o*t + (d-c)*t*t
        tangent /= max(1e-8, np.linalg.norm(tangent))
        u = np.cross(tangent, [0, 0, 1])
        if np.linalg.norm(u) < .12:
            u = np.cross(tangent, [0, 1, 0])
        u /= np.linalg.norm(u)
        v = np.cross(u, tangent)
        amount = max(.014, (math.sin(math.pi * (t*.90+.085))) ** .85 * (1-.58*t))
        if i == sections:
            amount = .012
        rings.append([center + u * (width*amount*math.cos(phi)) + v * (thickness*amount*math.sin(phi))
                      for phi in [j*TAU/12 for j in range(12)]])
        colors.append(mix(root, tip, max(0, min(1, (t-.59)/.36))) if tip else root)
    for a, b, color in zip(rings, rings[1:], colors):
        for i in range(12):
            nxt = (i + 1) % 12
            mesh.face([a[nxt], a[i], b[i], b[nxt]], color, gloss)


def bomb(mesh):
    center = (0, -7, 46)
    mesh.ball((67, 59, 56), center, (7.55, 7.55, 7.56), n=24, rings=12, gloss=.5)
    seam = [(math.cos(a)*7.56, -7+math.sin(a)*7.56, 45.9) for a in (i*TAU/20 for i in range(21))]
    mesh.path(BLACK, seam, .15)
    mesh.tube(CHARCOAL, (0, -7, 51.8), (0, -7, 54.15), 2.75, 2.4, n=14)
    cord = [(0, -7, 53.9), (0, -6.6, 55.8), (0, -5.95, 57.0),
            (0, -4.6, 58.0), (0, -3.25, 58.8), (0, -2.0, 59.1), (0, -1, 59)]
    mesh.path(AMBER, cord, .84)
    for x, y, z in cord[1:]:
        mesh.ball((239, 162, 61), (x, y, z), (.98, .85, .81), n=12, rings=7, gloss=.53)


def parrot(mesh, frame):
    first_face = len(mesh.faces)
    travel = frame in (TRAVEL_A, TRAVEL_B)
    ignition, approach, recoil = frame == IGNITE, frame == APPROACH, frame == RECOIL
    body_y, body_z = (21, 45.6) if travel else (21, 51.5)
    if recoil:
        body_y, body_z = 24, 53.3
    head_y, head_z = (14.6, 56.1) if travel else (13.7, 68.5)
    if approach:
        body_y, body_z = 20, 50.0
        head_y, head_z = 11.9, 64.0
    if ignition:
        body_y, body_z = 19.9, 49.1
        head_y, head_z = 10.3, 61.8
    if recoil:
        head_y, head_z = 18, 71.3

    for side in (-1, 1):
        xi = 4.9 * side
        mesh.ball(AMBER, (xi, 22.7, 39.7), (2.95, 3.4, 1.92), n=16, rings=8, gloss=.54)
        for toe in (-1.6, -.12, 1.45):
            mesh.path(BRASS, [(xi+toe,24,40.3),(xi+toe,21.7,40.5),
                             (xi+toe,20.36,39.25),(xi+toe,20.5,37.74)], .62)
    tail_height = body_z - (3.5 if travel else 6)
    for i in range(5):
        x = (i-2)*2.3
        start = (x*.63, body_y+3, body_z-3.9)
        end = (x*1.42, body_y+22-abs(i-2)*1.07, tail_height-5.3+abs(i-2)*1.85)
        capped_feather(mesh, [start,(x,body_y+11,tail_height-3),(x*1.4,body_y+17,tail_height-7),end],
                       3.15, 1.38, VIOLET if i%2 else VIOLET_LIGHT, COPPER)
    mesh.ball(SHADOW_TEAL, (0, body_y, body_z), (8.65, 9.45, 10.95 if travel else 12.18), n=24, rings=14)
    mesh.ball(TEAL, (0, body_y-1.8, body_z+4.1), (8.55, 8.35, 9 if travel else 11.95), n=24, rings=14)
    mesh.ball(JADE, (0, (head_y+body_y-.5)/2, (head_z+body_z)/2), (6.6, 7.1, 10.2), n=24, rings=12)
    for slot in (-2,-1,0,1,2):
        x = slot*2.13
        capped_feather(mesh, [(x*.57,head_y-3.5,head_z-3.35),(x,head_y-5,head_z-6.9),
                              (x,body_y-9.1,body_z+2.5),(x*.8,body_y-7.5,body_z-4.1+abs(slot)*1.37)],
                       1.96, .99, CREAM, IVORY, .53)
    for side in (-1, 1):
        x = side*7.0
        if recoil:
            for i in range(7):
                root_pos=(x,body_y+1.1,body_z+2.6)
                end=(side*(36.0-i*1.56),body_y+1.6+i*.72,body_z+21.7-i*4.7)
                capped_feather(mesh,[root_pos,(side*(14+i*.7),body_y-1,body_z+9.3-i*1.6),
                                     (side*(26-i*.5),body_y+i*.8,body_z+11.5-i*3.1),end],
                               4.4,1.45,VIOLET if i%2 else VIOLET_LIGHT,COPPER)
            for i in range(5):
                capped_feather(mesh, [(x,body_y,body_z+4.9),(side*(15-i*.55),body_y-2,body_z+9-i*2.9),
                                     (side*(21-i*.15),body_y,body_z+12-i*3.1),
                                     (side*(25-i*.85),body_y+1+i,body_z+15-i*4.4)],
                               3.9,1.8,TEAL if i%2 else OCEAN,MINT)
        else:
            for i in range(6):
                end=(side*(10.5-i*.8),body_y+23-i*2.1,body_z-7.6+i*3.35)
                capped_feather(mesh,[(x,body_y-1,body_z+4),(side*(10+i*.2),body_y+7,body_z+2),
                                    (side*10,body_y+14,body_z-4+i*2.0),end],
                               3.9,1.38,VIOLET if i%2==0 else VIOLET_LIGHT,COPPER)
            mesh.ball(TEAL,(side*7.5,body_y+.5,body_z+4.0),(4.15,8.0,5.4),n=18,rings=11,gloss=.54)
            for i in range(5):
                d=abs(i-2)
                capped_feather(mesh,[(side*(7.0+d*.3),body_y-5+i*.54,body_z+4.6-d*.24),
                                    (side*(10.6+i*.1),body_y+1,body_z+8-i*.73),
                                    (side*(11.4+i*.1),body_y+5,body_z+4.5-i*1.95),
                                    (side*(10.1+i*.38),body_y+13+i*.6,body_z+3.9-i*2.73)],
                               3.2,1.58,JADE if i%2==0 else OCEAN,TEAL)

    mesh.ball(TEAL,(0,head_y,head_z),(6.96,7.36,8.31),n=26,rings=16,gloss=.58)
    mesh.ball(MINT,(0,head_y-.5,head_z+4.15),(5.25,6.17,5.85),n=24,rings=14,gloss=.54)
    fletching = [
        (-3.8, 17.4, -.36, 2.0), (3.4, 19.0, .65, 3.9),
        (-2.1, 23.0, 1.22, 6.0), (1.85, 21.9, 1.90, 7.7),
        (0, 25.5, 2.5, 9.2)
    ]
    for index, (x, reach, rise, curl) in enumerate(fletching):
        z = head_z+5.1+rise
        capped_feather(mesh,[(x*.68,head_y-2.25,z),
                            (x*.78,head_y+5.8,z+7.6),
                            (x*1.21,head_y+reach-6.2,z+curl-4.0),
                            (x*1.53,head_y+reach,z+curl)],
                       3.15,1.55,SAGE if index%2 else SAGE_LIGHT,CREAM,.55)
    for side in (-1,1):
        mesh.ball(CREAM,(side*5.2,head_y-3.88,head_z+.05),(2.09,4.86,4.03),n=24,rings=14,gloss=.57)
        normal = np.array((side*.79,-.614,0.))
        normal /= np.linalg.norm(normal)
        horizontal = np.array((-normal[1],normal[0],0.))
        transform = np.column_stack((normal,horizontal,[0.,0.,1.]))
        eye_center = np.array((side*5.8,head_y-4.82,head_z+2.05))
        for center,radius,material,gloss in [
            ((.05,0,0),(1.45,4.05,3.56),IVORY,.53),
            ((1.19,-side*.43,.04),(.68,2.54,2.65),(86,184,170),.66),
            ((1.76,-side*.57,.08),(.39,1.75,1.94),BLACK,.82),
            ((2.11,-side*.96,.96),(.25,.61,.58),(255,246,218),.84),
        ]:
            eye = Mesh()
            eye.ball(material,center,radius,n=24,rings=12,gloss=gloss)
            mesh.faces.extend((points @ transform.T + eye_center, color, sheen)
                              for points,color,sheen in eye.faces)
        capped_feather(mesh,[(side*4,head_y-3,head_z+6.5),(side*6.7,head_y-1.7,head_z+5.8),
                            (side*7.45,head_y-4.65,head_z+5.3),(side*7.2,head_y-6.7,head_z+3.2)],
                       1.73,1.12,SAGE,JADE,.56)
    # Lower jaw and cavity separate so the silhouette still reads in the open recoil pose.
    jaw_drop = 2.9 if recoil else 0
    mesh.ball(BLACK,(0,head_y-8.8,head_z-2.7-jaw_drop*.30),(3.55,4,2.0+jaw_drop*.24),n=20,rings=12,gloss=.18)
    mesh.ball(BEAK,(0,head_y-8.4,head_z-3.45-jaw_drop),(3.56,4.15,1.86),n=24,rings=13,gloss=.48)
    if recoil:
        mesh.ball((173,66,48),(0,head_y-10.95,head_z-4.48),(2.13,1.52,1.2),n=18,rings=10)
    mesh.ball(BEAK_EDGE,(0,head_y-7.8,head_z+.57),(4.14,4.26,3.57),n=24,rings=14,gloss=.68)
    mesh.ball(BEAK,(0,head_y-10.6,head_z-.55),(3.6,3.76,2.93),n=24,rings=14,gloss=.63)
    capped_feather(mesh,[(0,head_y-8.8,head_z+.9),(0,head_y-14.9,head_z+1.45),
                        (0,head_y-15.6,head_z-3.6),(0,head_y-13.6,head_z-6.6)],
                   4.86,3.6,BEAK,CHARCOAL,.66,12)
    for side in (-1,1):
        mesh.ball(BLACK,(side*3.42,head_y-8.8,head_z+1.38),(.68,.59,.47),n=10,rings=6)
    pivot = np.array((0,22.7,39.7))
    stretch = np.array((1.13,1.04,1.16))
    def scaled(points):
        return pivot+(points-pivot)*stretch
    mesh.faces[first_face:] = [(scaled(points),material,gloss)
                               for points,material,gloss in mesh.faces[first_face:]]
    if ignition or approach:
        bite = scaled(np.array((2.6,head_y-7.7,head_z-3.15)))
        tip = (0,-1,59) if ignition else (1.8,.5,65.5)
        mesh.tube((172,106,52),bite,tip,.7,n=12,gloss=.33)
        mesh.ball((255,188,41) if ignition else (204,72,44),tip,
                  (.69,.86,.71),n=14,rings=8,gloss=.67)


def model(frame):
    mesh = Mesh()
    carriage(mesh, frame)
    cannon_barrel(mesh, frame)
    bomb(mesh)
    parrot(mesh, frame)
    return mesh


def bake(preview=None):
    if preview:
        directions = (0, 3, 6, 9, 12, 15)
        output = Image.new("RGBA", (CELL * len(directions), CELL * POSES))
        for frame in range(POSES):
            mesh = model(frame)
            for col, direction in enumerate(directions):
                output.paste(render(mesh, direction*TAU/DIRECTIONS, CELL), (col*CELL, frame*CELL))
        output.save(preview)
        return
    output = Image.new("RGBA", (CELL*COLUMNS,CELL*2*POSES))
    for frame in range(POSES):
        mesh = model(frame)
        for direction in range(DIRECTIONS):
            output.paste(render(mesh, direction*TAU/DIRECTIONS, CELL),
                         (direction%COLUMNS*CELL,(frame*2+direction//COLUMNS)*CELL))
        print(f"pose {frame+1}/{POSES}", flush=True)
    output.save(OUTPUT, "WEBP", quality=90, method=6, exact=True)
    print(f"{OUTPUT.name}: {OUTPUT.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", type=Path)
    bake(parser.parse_args().preview)
