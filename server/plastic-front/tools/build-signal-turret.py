"""Bake the Signalman's original turret meshes using the unit sprite renderer."""

import math
from pathlib import Path
from runpy import run_path

import numpy as np
from PIL import Image

SHARED = run_path(str(Path(__file__).with_name("build-unit-models.py")))
Mesh, render = SHARED["Mesh"], SHARED["render"]
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "models"
CELL, VIEWS, COLUMNS = 144, 24, 8
GUNMETAL, STEEL, RUBBER = (63, 76, 73), (107, 125, 121), (30, 39, 34)
BORE, BRASS, CREAM = (18, 25, 23), (220, 155, 61), (245, 225, 158)
GREEN = ((119, 155, 74), (154, 182, 101), (53, 85, 47))
BLUE = ((83, 137, 177), (129, 177, 199), (42, 73, 103))


def rail(mesh, outline, profiles, colors):
    """Stack convex outlines to model a chamfered shell."""
    rings = [[(x * scale_x, y * scale_y, z) for x, y in outline]
             for z, scale_x, scale_y in profiles]
    mesh.face(rings[0][::-1], colors[0])
    for index, (lower, upper) in enumerate(zip(rings, rings[1:])):
        for i in range(len(outline)):
            j = (i + 1) % len(outline)
            mesh.face([lower[i], lower[j], upper[j], upper[i]], colors[index], .48)
    mesh.face(rings[-1], colors[-1], .56)


def append_in_pose(mesh, part, x, y, heading):
    co, si = math.cos(heading), math.sin(heading)
    rotation = np.array([[co, -si, 0], [si, co, 0], [0, 0, 1]])
    mesh.faces.extend((points @ rotation.T + [x, y, 0], color, gloss)
                      for points, color, gloss in part.faces)


def chassis(palette):
    plastic, trim, dark = palette
    mesh = Mesh()
    foot = Mesh()
    foot_outline = [(1, -5), (8, -6), (15, -4.7), (19, -3),
                    (19, 3), (15, 4.7), (8, 6), (1, 5)]
    rail(foot, foot_outline, [(0, .94, .89), (3, 1, 1), (5, .92, .89)],
         [RUBBER, GUNMETAL, GUNMETAL])
    rail(foot, foot_outline, [(4, .91, .94), (7, .90, .87), (10, .65, .60)],
         [dark, plastic, trim])
    foot.box(BRASS, (13.8, 0, 7), (2.8, 4, 1.2), .35)
    for angle in (.69, math.pi - .69, math.pi + .69, -.69):
        append_in_pose(mesh, foot, 12 * math.cos(angle), 12 * math.sin(angle), angle)
    mesh.tube(RUBBER, (0, 0, 2), (0, 0, 5), 18, 19, n=12)
    mesh.tube(dark, (0, 0, 5), (0, 0, 10), 19, 16, n=12)
    mesh.tube(STEEL, (0, 0, 10), (0, 0, 11.7), 15, n=20)
    mesh.tube(GUNMETAL, (0, 0, 11.7), (0, 0, 14), 12.7, n=20)
    return mesh


def bored_barrel(mesh, side, height, start, end, radius):
    # Actual recessed bore, fluted tube and molded muzzle collar.
    profile = [
        (start, radius * 1.23, GUNMETAL),
        (start + 6, radius * 1.23, GUNMETAL),
        (start + 8, radius * .79, STEEL),
        (end - 7, radius * .79, GUNMETAL),
        (end - 5, radius * 1.12, STEEL),
        (end - 1.35, radius * 1.12, GUNMETAL),
        (end, radius * .94, STEEL),
        (end, radius * .59, STEEL),
        (end - 2.2, radius * .51, BORE),
        (end - 2.2, .06, BORE),
    ]
    count = 16
    rings = [[(x, side + math.cos(i * math.tau / count) * r,
               height + math.sin(i * math.tau / count) * r) for i in range(count)]
             for x, r, _ in profile]
    for k, (back, front) in enumerate(zip(rings, rings[1:])):
        for i in range(count):
            j = (i + 1) % count
            mesh.face([back[i], back[j], front[j], front[i]], profile[k + 1][2], .62)


def weapon(rank, palette):
    plastic, trim, dark = palette
    mesh = Mesh()
    width = (11, 14, 15)[rank - 1]
    # A low turntable, center receiver and two flared armor cheeks.
    mesh.tube(dark, (0, 0, 12.4), (0, 0, 17), 12, 10.6, n=16)
    mesh.box(GUNMETAL, (-2, 0, 22), (28, 18, 16), 3)
    mesh.box(dark, (-9, 0, 26), (16, 17, 13), 2.6)
    mesh.box(plastic, (-11, 0, 32), (15, 14, 5), 1.5)
    mesh.box(RUBBER, (-10, 0, 34.8), (10, 10, 1.3), .7)
    for offset in (-3.3, 0, 3.3):
        mesh.box(BRASS, (-10, offset, 35.5), (7.4, 1.6, .85), .3)

    cheek_outline = [(-16, -6), (7, -6), (15, -3), (14, 3),
                     (8, 7), (-12, 7), (-17, 2)]
    for sign in (-1, 1):
        cheek = Mesh()
        rail(cheek, cheek_outline, [(15, .93, .86), (19, 1, 1), (29, .95, .92),
                                     (33, .72, .71)], [dark, plastic, plastic, trim])
        mesh.faces.extend((points + [0, sign * width, 0], color, gloss)
                          for points, color, gloss in cheek.faces)
        mesh.tube(STEEL, (-4, sign * (width + 6.1), 23.2),
                  (-4, sign * (width + 7.3), 23.2), 4.0, 3.15, n=12)
        mesh.tube(dark, (-4, sign * (width + 7.3), 23.2),
                  (-4, sign * (width + 7.7), 23.2), 2.25, n=10)
        for offset in (-5.4, -1.8, 1.8):
            mesh.box(dark, (offset, sign * width, 33.08), (1.7, 5.5, .64), .26)
        mesh.box(CREAM, (8.4, sign * width, 31.3), (2.2, 5.3, 1.1), .3)

    if rank == 1:
        bored_barrel(mesh, 0, 25, 7, 38, 5.2)
    elif rank == 2:
        for side in (-6.1, 6.1):
            bored_barrel(mesh, side, 25, 8, 40, 3.9)
    else:
        # Three bores around the rotor leave a distinct, triangular nose.
        mesh.tube(GUNMETAL, (9, 0, 25.3), (22, 0, 25.3), 11.1, 9.9, n=18)
        mesh.tube(STEEL, (28.7, 0, 25.3), (31, 0, 25.3), 9.3, 9.8, n=18)
        mesh.tube(BRASS, (31, 0, 25.3), (32.9, 0, 25.3), 9.8, 9.2, n=18)
        for side, height in ((-5.9, 22.1), (5.9, 22.1), (0, 31.6)):
            bored_barrel(mesh, side, height, 15, 42, 3.3)
        mesh.tube(STEEL, (28, 0, 25.7), (37, 0, 25.7), 2, 1.4, n=12)
    return mesh


def bake(team, palette):
    rows = VIEWS // COLUMNS
    sheet = Image.new("RGBA", (CELL * COLUMNS, CELL * (rows * 3 + 1)))
    sheet.paste(render(chassis(palette), 0, CELL, shadow=False), (0, CELL * rows * 3))
    for rank in range(1, 4):
        top = weapon(rank, palette)
        for view in range(VIEWS):
            image = render(top, view * math.tau / VIEWS, CELL, shadow=False)
            sheet.paste(image, (view % COLUMNS * CELL, ((rank - 1) * rows + view // COLUMNS) * CELL))
    file = OUTPUT / f"signal-turret-{team}-v1.webp"
    sheet.save(file, quality=91, method=6, exact=True)
    print(f"{file.name} · {file.stat().st_size:,} bytes", flush=True)


if __name__ == "__main__":
    bake("green", GREEN)
    bake("blue", BLUE)
