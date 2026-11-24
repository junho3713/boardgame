"""Bake the allied block engineer with the shared olive toy miniature renderer.

Each 128-pixel atlas has eight directions across and five animation rows.
Rows are idle, left stride, right stride, throwing wind-up, and release.
Run with Python, numpy and Pillow. The enemy rocket soldier is a separate asset.
"""

import argparse
import math
from pathlib import Path
from runpy import run_path

import numpy as np
from PIL import Image

base = run_path(str(Path(__file__).with_name("build-unit-models.py")))
Mesh, infantry, render = (base[name] for name in ("Mesh", "infantry", "render"))
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "models"
CELL, DIRECTIONS, FRAMES = 128, 8, 5
DARK = (39, 65, 35)
STRAP = (55, 78, 42)
SAGE = (140, 163, 90)
MINE = (102, 148, 56)
MINE_TOP = (134, 173, 78)
GOLD = (222, 176, 65)
GOLD_LIGHT = (243, 209, 119)
METAL = (59, 72, 52)


def subdivide_caps(mesh):
    # Small cap polygons keep the shared painter's renderer from hiding rear studs.
    faces = []
    for points, colour, gloss in mesh.faces:
        if len(points) <= 4 or np.ptp(points[:, 2]) > .0001:
            faces.append((points, colour, gloss))
            continue
        center = points.mean(axis=0)
        for index, point in enumerate(points):
            triangles = [(center, point, points[(index + 1) % len(points)])]
            for _ in range(2):
                pieces = []
                for a, b, c in triangles:
                    ab, bc, ca = (a + b) / 2, (b + c) / 2, (c + a) / 2
                    pieces.extend([(a, ab, ca), (ab, b, bc), (ca, bc, c), (ab, bc, ca)])
                triangles = pieces
            faces.extend((np.array(triangle), colour, gloss) for triangle in triangles)
    mesh.faces = faces


def block(mesh, center, size, evolved=False, tilt=0, yaw=0):
    """A bevelled 2-by-2 toy brick with four solid, separately lit studs."""
    piece = Mesh()
    width, depth, height = size
    piece.box(DARK, (0, 0, -height * .40), (width, depth, height * .22), .9)
    piece.box(MINE, (0, 0, 0), (width, depth, height), 1.1)
    subdivide_caps(piece)
    if evolved:
        for side in (-1, 1):
            piece.box(GOLD, (side * width * .493, 0, height * .21),
                      (.5, depth * .87, 1.3), .15)
            piece.box(GOLD, (0, side * depth * .493, height * .21),
                      (width * .87, .5, 1.3), .15)
    for x in (-width * .25, width * .25):
        for y in (-depth * .25, depth * .25):
            piece.tube(MINE_TOP, (x, y, height * .48),
                       (x, y, height * .48 + height * .34), width * .16,
                       width * .151, n=16, gloss=.6)
    # A small flush latch gives the block an equipment detail without a barrel.
    piece.box(METAL, (0, -depth * .5, -.1), (width * .28, .65, height * .46), .2)
    piece.box(GOLD_LIGHT if evolved else SAGE, (0, -depth * .54, .25),
              (width * .13, .3, height * .16), .1)
    co, si = math.cos(tilt), math.sin(tilt)
    cy, sy = math.cos(yaw), math.sin(yaw)
    rotate = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]]) @ np.array(
        [[1, 0, 0], [0, co, -si], [0, si, co]])
    mesh.faces.extend((points @ rotate.T + center, colour, gloss)
                      for points, colour, gloss in piece.faces)


def make_engineer(evolved, frame):
    elbows = {-1: (-11, -7, 40.5), 1: (11.5, -6.5, 41)}
    hands = {-1: (-7, -18.4, 43.8), 1: (7.5, -18.4, 43.8)}
    carried = (0, -19.3, 47.0)
    tilt, yaw = .15, -.07
    if frame == 3:
        elbows[1], hands[1] = (12.5, -2, 53), (11, -5, 59)
        elbows[-1], hands[-1] = (-11, -7, 42), (-3, -15, 48)
        carried, tilt, yaw = (11, -6, 63), -.22, -.22
    elif frame == 4:
        elbows[1], hands[1] = (12, -15, 50), (8, -29, 51)
        elbows[-1], hands[-1] = (-10, -6, 40), (-7, -12, 35)
    mesh = infantry("rifle", 0, frame if frame < 3 else 0,
                    arms={side: (elbows[side], hands[side]) for side in (-1, 1)},
                    weapon=False)

    # Slim chest plate and two utility straps retain the shared soldier proportions.
    mesh.box(DARK, (0, -5.9, 45.4), (12.9, 2.1, 11.8), 1.2)
    mesh.box(SAGE if evolved else MINE, (0, -7.1, 46), (9.8, .8, 8.8), .8)
    for side in (-1, 1):
        trim = GOLD if evolved else STRAP
        mesh.path(trim, [(side * 5.9, -6.8, 35), (side * 6.4, -6.8, 47),
                         (side * 6.5, -2.5, 52), (side * 6.4, 8.0, 49)], .65)
        mesh.box(GOLD_LIGHT if evolved else SAGE, (side * 5.8, -7.6, 39.5),
                 (2.4, .65, 2.6), .3)
        mesh.box(DARK, (side * 9.2, 3.8, 33), (4.5, 6.8, 7.8), .85)
    if evolved:
        mesh.path(GOLD, [(-6.8, -1, 65.2), (-5.7, -5.1, 65.4), (0, -7.2, 65.8),
                        (5.7, -5.1, 65.4), (6.8, -1, 65.2)], .62)
        mesh.box(GOLD_LIGHT, (0, -7.0, 67.3), (3.1, 1.1, 2.0), .3)
        for x in (-2.8, 0, 2.8):
            mesh.box(GOLD, (x, -7.8, 48.5), (1.3, .45, 3.9), .18)

    # Rear rack exposes the spare blocks' studs from rear and oblique directions.
    mesh.box(DARK, (0, 10.5, 44.5), (17, 6, 23.3), 1.4)
    for x in (-7.6, 7.6):
        mesh.tube(GOLD if evolved else SAGE, (x, 13.7, 34.4),
                  (x, 13.7, 54.5), .65, n=8)
    for z in (39.3, 50.3):
        block(mesh, (0, 13.1, z), (12.2, 9.3, 5.3), evolved, -math.pi / 2)
    mesh.tube(STRAP, (-5.1, 11.3, 57.0), (5.1, 11.3, 57.0), .8, n=10)
    if frame != 4:
        block(mesh, carried, (17.2, 14.5, 7.3), evolved, tilt, yaw)
    return mesh


def build(evolved, output=OUTPUT):
    sheet = Image.new("RGBA", (CELL * DIRECTIONS, CELL * FRAMES))
    for frame in range(FRAMES):
        mesh = make_engineer(evolved, frame)
        for direction in range(DIRECTIONS):
            tile = render(mesh, direction * math.tau / DIRECTIONS, CELL)
            sheet.paste(tile, (direction * CELL, frame * CELL))
    output.mkdir(parents=True, exist_ok=True)
    name = "blockEngineerElite" if evolved else "blockEngineer"
    path = output / f"{name}-0-body-v212.webp"
    sheet.save(path, "WEBP", quality=93, method=6, exact=True)
    print(f"{path.name}  {path.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    for evolved in (False, True):
        build(evolved, args.output)
