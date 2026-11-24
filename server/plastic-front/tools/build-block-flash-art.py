"""Bake snap-block charges and flash canisters using the game's molded miniature lighting."""
import math
from pathlib import Path
from runpy import run_path

from PIL import Image

HERE = Path(__file__).resolve().parent
base = run_path(str(HERE / "build-unit-models.py"))
Mesh, render = base["Mesh"], base["render"]
OLIVE, SAGE, DARK = (82, 122, 52), (148, 173, 89), (44, 62, 42)
BRASS, IVORY, METAL = (198, 153, 62), (224, 225, 193), (134, 148, 133)


def peg(m, x, y, z, radius, depth, color):
    m.tube(color, (x, y, z), (x, y, z + depth), radius, n=24)
    m.tube(tuple(int(c * .62) for c in color), (x, y, z + depth), (x, y, z + depth + .08), radius * .52, n=20)


def block(evolved):
    m = Mesh()
    m.box(DARK, (0, 0, 2), (27, 16, 4), 2.5)
    m.box(BRASS if evolved else (87, 102, 57), (0, 0, 4.1), (28, 16.8, 2), 3)
    m.box(OLIVE, (0, 0, 7.7), (27.5, 16.8, 6), 3)
    m.box(SAGE if evolved else (122, 147, 75), (0, 0, 11), (26.8, 16.1, 1.8), 3)
    for side in (-1, 1):
        peg(m, side * 6.6, 0, 11.7, 4.9, 2.9, SAGE if evolved else (102, 151, 63))
        for x in (-9.7, 9.7):
            m.tube(METAL, (x, side * 7.3, 7), (x, side * 8.45, 7), .95, n=12)
        m.box(DARK, (0, side * 8.1, 7.1), (6.6, .9, 2.7), .2)
        m.box(BRASS if evolved else (142, 167, 109), (0, side * 8.6, 7.1), (4.1, .4, 1.1))
    return m


def flash(evolved):
    m = Mesh()
    m.tube(DARK, (0, 0, 1), (0, 0, 1.7), 5.8, 7, n=22)
    m.tube(METAL, (0, 0, 1.7), (0, 0, 18.1), 7, 6.7, n=22)
    for z in (2, 5.6, 12.8, 17):
        m.tube(BRASS if evolved else OLIVE, (0, 0, z), (0, 0, z + 1.6), 7.5, n=22)
    for i in range(8):
        a = math.tau * i / 8
        px, py = 6.9 * math.cos(a), 6.9 * math.sin(a)
        m.tube(DARK, (px, py, 7.5), (px, py, 12), 1.1, n=10)
    m.tube(IVORY, (0, 0, 18.1), (0, 0, 20.6), 6.6, 5, n=22)
    m.ball((196, 151, 223) if evolved else (235, 206, 112), (0, 0, 20.6), (3.6, 3.6, 1.4))
    m.path(DARK, [(2, 0, 21), (5.1, 0, 21.7), (8, 0, 17.5), (8.7, 0, 13)], 1.1)
    return m


def main():
    cell, directions, scale = 96, 8, 2
    atlas = Image.new("RGBA", (directions * cell, 4 * cell))
    for row, m in enumerate([block(False), block(True), flash(False), flash(True)]):
        m.faces = [(p * scale, c, gloss) for p, c, gloss in m.faces]
        for i in range(directions):
            frame = render(m, math.tau * (i + .58) / directions, cell, shadow=False)
            atlas.paste(frame, (cell * i, cell * row))
    atlas.save(HERE.parent / "public/assets/effects/block-flash-toys-v212.webp", "WEBP", quality=96, method=6, exact=True)


if __name__ == "__main__":
    main()

