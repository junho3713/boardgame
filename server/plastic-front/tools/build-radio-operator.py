"""Bake the radio infantry's five poses and two recruitment portraits.

Run with Python, NumPy and Pillow from any directory.
"""
import math
from pathlib import Path
from runpy import run_path

import numpy as np
from PIL import Image

TOOLS = Path(__file__).resolve().parent
ASSETS = TOOLS.parent / "public/assets"
BASE = run_path(str(TOOLS / "build-unit-models.py"))
infantry, render = BASE["infantry"], BASE["render"]
CELL = 128
OLIVE = (105, 135, 64)
SAGE = (160, 177, 109)
RUBBER = (40, 52, 44)
DARK = (54, 74, 54)
BRASS = (222, 180, 84)
STEEL = (154, 178, 160)
LENS = (107, 224, 183)
AMBER = (255, 216, 115)


def radio_pack(mesh, officer, frame):
    trim = BRASS if officer else SAGE
    mesh.box(RUBBER, (0, 10, 44), (22, 10, 24), 2.4)
    mesh.box(OLIVE, (0, 14, 44.6), (20, 5, 21), 1.8)
    mesh.box(DARK, (0, 17.1, 48.4), (15.2, 1.7, 7.6), 1.0)
    mesh.box(LENS if officer else SAGE, (-2.8, 18.0, 48.8), (6.4, .8, 3.6), .45)
    for x in (2.3, 5.5):
        mesh.tube(trim, (x, 17.9, 48.5), (x, 19, 48.5), 1.3, n=8)
    for z in (38.2, 40.4, 42.6):
        mesh.box(DARK, (0, 17.0, z), (11, .9, .85), .25)
    for x in (-8.8, 8.8):
        mesh.box(trim, (x, 16.7, 44.5), (1.3, 1.2, 16), .3)
        mesh.path(DARK, [(x, 11, 54.8), (x * .75, 2, 54),
                         (x * .79, -5.6, 48), (x * .67, -6.3, 36.5)], 1.05)
    for side in (-1, 1):
        x = side * 11.2
        mesh.box(OLIVE, (x, 10.7, 44.5), (1.6, 7.4, 18.8), .65)
        for z in (40.3, 42.9, 45.5):
            mesh.box(SAGE, (x + side * .95, 10.7, z), (.8, 4.8, .85), .23)
        mesh.tube(trim, (x, 10.7, 49.8), (x + side * 1.5, 10.7, 49.8), 1.35, n=8)
    # A chunky telescopic whip remains legible even on a moving 1x canvas.
    sway = (0, .9, -.9, -.45, .65)[frame]
    for side in ([-1, 1] if officer else [-1]):
        x = side * 8.3
        z = 74 if side > 0 else 91
        tip = (x + side * 6 + sway, 14.6, z)
        joint = (x + side * 2.4, 13.5, 66)
        mesh.tube(DARK, (x, 13, 54), (x, 13, 59), 2.3, 1.7, n=10)
        mesh.tube(trim, (x, 13, 58), joint, 1.43, 1.24, n=10)
        mesh.tube(STEEL, joint, tip, 1.17, .82, n=8)
        mesh.ball(AMBER if officer else SAGE, tip, (1.45, 1.45, 1.55), n=8, rings=4)
    for side in (-1, 1):
        x = side * 6.7
        mesh.tube(DARK, (x, -.7, 60.5), (x + side * 1.7, -.7, 60.5), 3.6, n=12)
        mesh.tube(trim, (x + side * 1.7, -.7, 60.5),
                  (x + side * 2.5, -.7, 60.5), 2.65, n=12)
    if officer:
        for side in (-1, 1):
            mesh.box(BRASS, (side * 8.3, -.3, 52.1), (5.4, 6, 1.4), .6)
        mesh.path(BRASS, [(-6.5, -1.2, 65.3), (-5.0, -5.2, 65.6), (0, -7, 65.8),
                          (5.0, -5.2, 65.6), (6.5, -1.2, 65.3)], .85)
        mesh.box(DARK, (-3.1, -7.2, 45), (7.1, 2.3, 8.1), .65)
        mesh.box(LENS, (-3.1, -8.4, 46.5), (5.0, .5, 3.1), .4)


def operator(officer, frame):
    # Raise the receiver at roll time, then signal an accepted call with the free arm.
    calling = frame >= 3
    right = (10.4, -6.6, 56.9) if calling else (8.5, -13.5, 45.5)
    left = (-17, -15.5, 56.0) if frame == 4 else (-7.4, -8.9, 41.4)
    arms = {1: ((14, -3, 47) if calling else (12, -6, 40), right),
            -1: ((-15, -6.8, 51) if frame == 4 else (-11.5, -2.9, 40.8), left)}
    mesh = infantry("rifle", 0, frame if frame < 3 else 0, arms=arms, weapon=False)
    radio_pack(mesh, officer, frame)
    x, y, z = right
    # A curved receiver with flared ear and mouth cups, not a straight bar.
    ear = (x - 1.6, y + 2.8, z + 5.7)
    mouth = (x - 3.6, y - 3.1, z - 4.0)
    back = (x + 1.4, y + 1.4, z + 2.8)
    mesh.path(RUBBER, [ear, back, (x + 1, y - 2, z - 2.7), mouth], 1.8)
    for cx, cy, cz in (ear, mouth):
        mesh.tube(DARK, (cx + 1.8, cy, cz), (cx - 1.1, cy, cz), 2.7, 3.25, n=12)
        mesh.tube(SAGE if not officer else BRASS, (cx - 1.1, cy, cz),
                  (cx - 1.5, cy, cz), 2.45, n=12)
        mesh.tube(SAGE if not officer else BRASS, (cx + 1.8, cy, cz),
                  (cx + 2.2, cy, cz), 2.35, n=12)
        mesh.tube(DARK, (cx + 2.2, cy, cz), (cx + 2.4, cy, cz), 1.25, n=10)
    mesh.box(AMBER if frame == 4 else LENS, (x + 2.5, y, z + 1.6), (1.0, 1.8, 3.4), .3)
    # Give the signal lead a visible hanging loop with a coiled lower section.
    start = np.array([mouth[0] + 1, mouth[1], mouth[2] - 1], dtype=float)
    end = np.array([11.1, 12.3, 48.1])
    cable = []
    for i in range(23):
        t = i / 22
        point = (1 - t) * start + t * end
        arc = math.sin(t * math.pi)
        point[0] += arc * (6.7 + .65 * math.cos(t * math.tau * 5))
        point[2] -= arc * (15.8 + .8 * math.sin(t * math.tau * 5))
        cable.append(point)
    mesh.path(RUBBER, cable, .87)
    return mesh


def portrait(officer):
    width, height = 360, 328
    mesh = operator(officer, 3)
    mesh.faces = [(points * 9, color, gloss) for points, color, gloss in mesh.faces]
    image = render(mesh, math.tau * .34, 1152, shadow=False)
    image = image.crop(image.getbbox())
    # A bust crop makes the receiver, headset and tuning panel legible on small cards.
    image = image.crop((0, round(image.height * .21), image.width, round(image.height * .78)))
    image.thumbnail((width - 16, height), Image.Resampling.LANCZOS)
    yy, xx = np.mgrid[:height, :width]
    light = np.exp(-((xx - width * .44) / (width * .62)) ** 2
                   - ((yy - height * .38) / (height * .76)) ** 2)
    rgb = np.array([24, 38, 27]) + light[..., None] * [43, 51, 31]
    panel = Image.fromarray(rgb.astype("uint8")).convert("RGBA")
    panel.alpha_composite(image, ((width - image.width) // 2, (height - image.height) // 2))
    return panel


def main():
    sheet = Image.new("RGB", (720, 328))
    for index, name in enumerate(("radioOperator", "radioOfficer")):
        officer = bool(index)
        atlas = Image.new("RGBA", (CELL * 8, CELL * 5))
        for frame in range(5):
            mesh = operator(officer, frame)
            for direction in range(8):
                tile = render(mesh, direction * math.tau / 8, CELL)
                atlas.paste(tile, (direction * CELL, frame * CELL))
        atlas.save(ASSETS / "models" / f"{name}-0-body-v213.webp", quality=94, method=6)
        sheet.paste(portrait(officer).convert("RGB"), (index * 360, 0))
    sheet.save(ASSETS / "ui/radio-portraits-v213.webp", quality=94, method=6)


if __name__ == "__main__":
    main()
