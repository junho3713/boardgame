"""Bake four axial views of the three toy airstrike props into one transparent atlas."""
from math import cos, sin, tau
from pathlib import Path
from runpy import run_path

from PIL import Image

TOOLS = Path(__file__).resolve().parent
Mesh, render = (base := run_path(str(TOOLS / "build-unit-models.py")))["Mesh"], base["render"]
OUT = TOOLS.parent / "public/assets/effects/radio-strike-models-v214.webp"
CELL = (144, 216)
GUNMETAL = (54, 67, 65)
AMBER = (255, 189, 65)
PALE = (234, 222, 173)


def body(mesh, rings, sides=32):
    """Join a series of colored rings along the downward-pointing projectile axis."""
    for (low, r0, _), (high, r1, color) in zip(rings, rings[1:]):
        mesh.tube(color, (0, 0, low), (0, 0, high), r0, r1, n=sides, gloss=.76)


def fins(mesh, count, radius, tip, front, wing_low, high, color, edge):
    """Mold a shallow beveled trapezoid at each tail position."""
    for i in range(count):
        a = tau * i / count + .35
        d, cross = (cos(a), sin(a)), (-sin(a), cos(a))
        profile = [(radius - 1, front), (tip, wing_low), (tip + .55, high - 2), (radius - 1, high)]
        inner, outer = [[(r*d[0]+cross[0]*side, r*d[1]+cross[1]*side, z)
                         for r,z in profile] for side in (-1, 1)]
        mesh.face(inner, color, .45)
        mesh.face(outer[::-1], color, .48)
        for j in range(4):
            k = (j + 1) % 4
            mesh.face([inner[k], inner[j], outer[j], outer[k]], edge, .65)


def incendiary():
    m = Mesh()
    charcoal, orange, brass = (88, 60, 41), (244, 135, 67), (227, 162, 83)
    body(m, [(1, .6, orange), (4, 7, brass), (10, 13, brass), (17, 17, orange),
             (27, 18, orange), (28, 18.6, AMBER), (33, 18.6, AMBER),
             (34, 17.8, charcoal), (50, 17.8, orange), (51, 18.4, brass),
             (61, 15.8, brass), (66, 11, GUNMETAL), (75, 9, GUNMETAL)])
    for i in range(6):
        a = i*tau/6+.12
        x, y = cos(a)*17.5, sin(a)*17.5
        m.tube(charcoal, (x,y,36), (x,y,46), 1.85, n=12)
        m.ball(AMBER, (x,y,46), (1.5,1.5,1.5), n=10,rings=5)
    fins(m, 4, 10, 23, 60, 65, 75, brass, PALE)
    return m


def missile():
    m = Mesh()
    teal, silver, aqua = (102, 158, 167), (191, 219, 216), (137, 248, 253)
    body(m, [(1, .7, silver), (7, 3, silver), (17, 5.5, silver), (30, 10, silver),
             (33, 10.2, aqua), (36.5, 10.2, aqua), (38, 9.9, GUNMETAL),
             (81, 9.9, teal), (83, 10.45, aqua), (87, 10.45, aqua), (89, 9.9, silver),
             (102, 9.9, teal), (109, 8, GUNMETAL), (114, 8.6, silver)])
    for i in range(4):
        a=i*tau/4+.35
        x,y=cos(a)*9.8,sin(a)*9.8
        m.tube(GUNMETAL, (x,y,46), (x,y,75), 1.1, n=10)
        m.tube(silver, (x,y,52), (x,y,69), .8, n=8)
    fins(m, 4, 10, 19, 81, 104, 113, teal, aqua)
    return m


def nuclear():
    m = Mesh()
    maroon, red, gold, steel = (140, 75, 71), (205, 98, 77), (255, 200, 96), (172, 165, 135)
    body(m, [(1, 3, steel), (4, 11.5, steel), (8, 17, steel), (18, 23.4, red),
             (30, 26.5, maroon), (38, 27.1, maroon), (38.6, 27.6, gold),
             (43.3, 27.6, gold), (44, 27, maroon), (77, 27, maroon),
             (77.8, 27.6, gold), (82.4, 27.6, gold), (83.2, 26.6, red),
             (101, 24.7, maroon), (115, 20, maroon), (132, 15.5, steel),
             (135, 16, GUNMETAL), (143, 15.7, GUNMETAL)])
    for i in range(8):
        a=i*tau/8+.1
        x,y=cos(a)*26.7,sin(a)*26.7
        m.tube(maroon, (x,y,50), (x,y,72), 1.55, n=10)
        for z in (49,73):
            m.ball(steel, (x,y,z), (2.0,2.0,2.0), n=10,rings=5)
    for i in range(4):
        a=i*tau/4
        x,y=cos(a)*26.6,sin(a)*26.6
        m.ball(AMBER, (x,y,61), (2.9,2.9,3.2), n=12,rings=6)
    fins(m, 4, 20, 33, 113, 126, 144, maroon, gold)
    return m


def main():
    atlas = Image.new("RGBA", (CELL[0]*3, CELL[1]*4))
    for column, make in enumerate((incendiary, missile, nuclear)):
        model = make()
        model.faces = [(points*2, color, gloss) for points,color,gloss in model.faces]
        frames = [render(model, i*tau/16+.24, 452, shadow=False) for i in range(4)]
        left = min(frame.getbbox()[0] for frame in frames)
        top = min(frame.getbbox()[1] for frame in frames)
        right = max(frame.getbbox()[2] for frame in frames)
        bottom = max(frame.getbbox()[3] for frame in frames)
        for row, frame in enumerate(frames):
            tile = frame.crop((left, top, right, bottom))
            tile.thumbnail((CELL[0]-8, CELL[1]-8), Image.Resampling.LANCZOS)
            atlas.alpha_composite(tile, (column*CELL[0]+(CELL[0]-tile.width)//2,
                                         (row+1)*CELL[1]-tile.height-4))
    atlas.save(OUT, quality=94, method=6, exact=True)


if __name__ == "__main__":
    main()
