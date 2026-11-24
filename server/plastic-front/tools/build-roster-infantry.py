"""Bake the four original olive roster miniatures with the game's shared 3D renderer."""

import argparse
import math
from pathlib import Path
from runpy import run_path

import numpy as np
from PIL import Image

base = run_path(str(Path(__file__).with_name("build-unit-models.py")))
Mesh, infantry, render = (base[name] for name in ("Mesh", "infantry", "render"))
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "models"
CELL, DIRECTIONS, COLUMNS = 128, 16, 8
DARK_GREEN = (39, 69, 39)
SAGE = (125, 151, 83)
CANVAS = (128, 113, 73)
WOOD = (170, 102, 50)
STEEL = (57, 74, 63)
OILED_STEEL = (39, 49, 43)
EDGE = (115, 133, 104)
BRASS = (221, 168, 67)
SHELL = (183, 80, 36)
IVORY = (240, 228, 192)
GOLD_IVORY = (246, 200, 89)
PIP = (40, 49, 33)
VARIANTS = {"shotgun": (False, 5), "shotgunDragon": (True, 5),
            "diceTrooper": (False, 4), "diceGold": (True, 4)}


def rounded_die(mesh, size, colour):
    half = size / 2
    bevel = size * .105
    inner = half - bevel
    samples = (
        -half, -half + bevel * (1 - math.cos(math.pi / 6)),
        -half + bevel * (1 - math.cos(math.pi / 3)),
        -inner, -inner / 3, inner / 3, inner,
        half - bevel * (1 - math.cos(math.pi / 3)),
        half - bevel * (1 - math.cos(math.pi / 6)), half,
    )
    directions = [(math.cos(i * math.tau / 16), math.sin(i * math.tau / 16)) for i in range(16)]
    for axis, side, value in ((0, 1, 3), (0, -1, 4), (1, -1, 5), (1, 1, 2), (2, 1, 6), (2, -1, 1)):
        def point(u, v, depth=0):
            vec = np.zeros(3)
            vec[axis] = side * (half - depth)
            vec[(axis + 1) % 3] = u
            vec[(axis + 2) % 3] = v
            return vec

        def face(vertices, material, gloss):
            mesh.face(vertices if side > 0 else vertices[::-1], material, gloss)

        def bevel_point(u, v):
            vec = point(u, v)
            inner_point = np.clip(vec, -inner, inner)
            outward = vec - inner_point
            return inner_point + outward * bevel / np.linalg.norm(outward)

        for i, (a, b) in enumerate(zip(samples, samples[1:])):
            for j, (c, d) in enumerate(zip(samples, samples[1:])):
                corners = [bevel_point(x, y) for x, y in [(a, c), (b, c), (b, d), (a, d)]]
                is_pip = 3 <= i <= 5 and 3 <= j <= 5 and (i - 4, j - 4) in PIPS[value]
                if not is_pip:
                    face(corners, colour, .43)
                    continue

                # Build the plastic rim around a recessed dot, so side-on views never float or lose pips.
                x, y = (a + b) / 2, (c + d) / 2
                outer, edge, floor = [], [], []
                for dx, dy in directions:
                    boundary = (b - a) / 2 / max(abs(dx), abs(dy))
                    outer.append(point(x + dx * boundary, y + dy * boundary))
                    edge.append(point(x + dx * size * .083, y + dy * size * .083))
                    floor.append(point(x + dx * size * .069, y + dy * size * .069, size * .021))
                recess = tuple(round(channel * .72) for channel in colour)
                for k in range(len(directions)):
                    nxt = (k + 1) % len(directions)
                    face([outer[k], outer[nxt], edge[nxt], edge[k]], colour, .43)
                    face([edge[k], edge[nxt], floor[nxt], floor[k]], recess, .33)
                face(floor, PIP, .03)


def helmet_hardware(mesh, evolved, dice):
    strap = BRASS if evolved else DARK_GREEN
    badge = BRASS if evolved else SAGE
    mesh.path(strap, [(-6, -2, 65), (-4.8, -5.3, 65.4), (0, -7.15, 65.6),
                      (4.8, -5.3, 65.4), (6, -2, 65)], .55 if evolved else .38)
    mesh.box(badge, (0, -6.9, 67.2), (2.8, 1.25, 1.8), .25)
    for side in (-1, 1):
        mesh.box(DARK_GREEN, (side * 9, 0, 48.2), (3.1, 6.4, 2.4), .8)
        mesh.box(badge, (side * 8.8, -.3, 49.6), (2.2, 4.3, .7), .25)
    mesh.box(CANVAS, (0, 10, 38.2), (10.4, 3.6, 4.5), 1.2)
    mesh.tube(strap, (-4, 12.25, 38.6), (4, 12.25, 38.6), .45, n=8)
    if dice:
        for side in (-1, 1):
            mesh.tube(strap, (side * 5, 10, 43), (side * 5, 10.9, 48), .5, n=8)


def shotgun(evolved, frame):
    pump = (0, 0, 0, 4.8, 1.5)[frame]
    recoil = (0, 0, 0, 2.8, .5)[frame]
    climb = (0, 0, 0, 2, .6)[frame]
    hands = {-1: ((-11, -5, 41), (7, -24 + pump + recoil, 45 + climb)),
             1: ((12, -5, 41), (7, -13 + recoil, 45 + climb))}
    mesh = infantry("rifle", 0, min(frame, 2) if frame < 3 else 0, arms=hands, weapon=False)
    helmet_hardware(mesh, evolved, False)

    def tube(colour, start, finish, thickness, tip=None, n=14):
        a = (7, start[0] + recoil, start[1] + climb)
        b = (7, finish[0] + recoil, finish[1] + climb)
        mesh.tube(colour, a, b, thickness, tip, n=n, gloss=.48)

    def box(colour, y, z, size, bevel=.65):
        mesh.box(colour, (7, y + recoil, z + climb), size, bevel)

    finish = BRASS if evolved else EDGE
    box(WOOD, -5.3, 47, (4, 13, 5.5), 1.5)
    box(OILED_STEEL, 1.2, 47, (4.3, 1.8, 6.2), .6)
    box(DARK_GREEN, -15, 47.3, (6.4, 11, 5.9), .9)
    box(finish, -15.6, 50.45, (4.2, 8.1, .45), .45)
    box(STEEL, -16.2, 44.1, (4.5, 6.9, 1.1), .4)
    tube(WOOD, (-12.3, 44.5), (-10.4, 38.2), 1.7, 1.45)
    tube(OILED_STEEL, (-17.7, 49.4), (-38.4 if evolved else -36.8, 49.4), 2.2 if evolved else 1.95)
    tube(STEEL, (-18.9, 45.3), (-34.0, 45.3), 1.48)
    tube(finish, (-34.0, 49.4), (-38.5 if evolved else -36.8, 49.4), 2.5 if evolved else 2.2)
    tube(OILED_STEEL, (-38.5 if evolved else -36.8, 49.4),
         (-38.75 if evolved else -37.1, 49.4), 1.44 if evolved else 1.3)
    box(OILED_STEEL, -25 + pump, 44.8, (6.7, 10.4, 4.6), 1.0)
    box(WOOD, -25 + pump, 45.5, (6.5, 9.9, 5.1), .95)
    box(finish, -35.4, 51.5, (1.2, 1.3, 1.6), .18)
    for y in [-29, -27, -25, -23, -21]:
        box(BRASS if evolved and y in [-29, -21] else (208, 146, 74),
            y + pump, 47.7, (7.0, .7, .65), .18)
    if evolved:
        box(SHELL, -31, 51.1, (2.8, 5.4, .9), .26)
        for side in (-1, 1):
            mesh.tube(BRASS, (7 + side * 2.7, -13 + recoil, 46 + climb),
                      (7 + side * 2.7, -18 + recoil, 46 + climb), .52, n=8)
    mesh.box(CANVAS, (-5, -6.0, 41.2), (7.2, 2.8, 7.7), .8)
    for x in (-7.6, -5.9, -4.2, -2.5):
        mesh.tube(SHELL, (x, -7.5, 39.2), (x, -7.5, 44.2), .70, n=8)
        mesh.tube(BRASS, (x, -7.5, 43.8), (x, -7.5, 45.1), .79, .57, n=8)
    return mesh


PIPS = {
    1: [(0, 0)],
    2: [(-1, -1), (1, 1)],
    3: [(-1, -1), (0, 0), (1, 1)],
    4: [(-1, -1), (-1, 1), (1, -1), (1, 1)],
    5: [(-1, -1), (-1, 1), (0, 0), (1, -1), (1, 1)],
    6: [(-1, -1), (-1, 0), (-1, 1), (1, -1), (1, 0), (1, 1)],
}


def die(mesh, center, size, evolved, yaw, tip):
    piece = Mesh()
    rounded_die(piece, size, GOLD_IVORY if evolved else IVORY)

    co, si = math.cos(yaw), math.sin(yaw)
    ct, st = math.cos(tip), math.sin(tip)
    z_turn = np.array([[co, -si, 0], [si, co, 0], [0, 0, 1]])
    x_tip = np.array([[1, 0, 0], [0, ct, -st], [0, st, ct]])
    transform = z_turn @ x_tip
    mesh.faces.extend((points @ transform.T + center, colour, gloss)
                      for points, colour, gloss in piece.faces)


def dice_trooper(evolved, frame):
    tossing = frame == 3
    elbows = {-1: (-10.5, -8.0, 40.8), 1: (12.1, -6.3, 43.0)}
    hands = {-1: (-3.4, -16.2, 46.5), 1: (9.4, -12.8, 48.5)}
    if tossing:
        elbows[1] = (12.5, -3.4, 54.6)
        hands[1] = (8, -14.2, 62.1)
    mesh = infantry("rifle", 0, frame if frame < 3 else 0,
                    arms={side: (elbows[side], hands[side]) for side in (-1, 1)}, weapon=False)
    helmet_hardware(mesh, evolved, True)
    mesh.box(CANVAS, (-8.5, 2.8, 33.1), (5.4, 7.1, 7.6), .85)
    mesh.box(DARK_GREEN, (8.8, 4.2, 33.6), (5.3, 8.4, 7.9), .9)
    for y in (1.3, 4.3, 7.3):
        mesh.tube(BRASS if evolved else SAGE, (11.5, y, 35), (11.5, y, 36.2), .60, n=8)
    if evolved:
        die(mesh, (-6.0, 11.8, 47.2), 8.0, True, -.32, -.16)
        die(mesh, (5.6, 11.6, 46.8), 8.0, True, .28, .18)
        mesh.tube(BRASS, (-8.4, 11.0, 40.3), (8.0, 11.0, 40.3), .63, n=10)
    else:
        die(mesh, (0, 11.7, 45.3), 9.0, False, -.3, .14)
        mesh.tube(CANVAS, (-6, 11.5, 40.4), (6, 11.5, 40.4), .55, n=10)
    die(mesh, (8.4, -15.4, 69.7) if tossing else (3, -16.1, 51.8),
        16.0 if evolved else 15.4, evolved, .36 if tossing else -.38, -.23 if tossing else .21)
    return mesh


def build(name, preview=None):
    evolved, frames = VARIANTS[name]
    if preview is None:
        sheet = Image.new("RGBA", (CELL * COLUMNS, CELL * 2 * frames))
    else:
        sheet = Image.new("RGBA", (CELL * 4, CELL))
    make = shotgun if name.startswith("shotgun") else dice_trooper
    for frame in range(frames if preview is None else 1):
        mesh = make(evolved, frame)
        angles = range(DIRECTIONS) if preview is None else (0, 5, 8, 13)
        for column, direction in enumerate(angles):
            image = render(mesh, direction * math.tau / DIRECTIONS, CELL)
            x = column if preview is not None else direction % COLUMNS
            y = 0 if preview is not None else frame * 2 + direction // COLUMNS
            sheet.paste(image, (CELL * x, CELL * y))
    if preview is not None:
        sheet.save(preview / f"{name}.png")
    else:
        out = OUTPUT / f"{name}-0-body-v211.webp"
        sheet.save(out, "WEBP", quality=91, method=6, exact=True)
        print(f"{out.name}  {out.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("variants", nargs="*", choices=list(VARIANTS))
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    for variant in args.variants or VARIANTS:
        build(variant, args.preview)
