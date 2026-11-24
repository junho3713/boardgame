"""Bake the RC drone and its evolution with the army miniatures' mesh renderer."""
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
import math
import sys

mesh_spec = spec_from_file_location("miniature_mesh", Path(__file__).with_name("build-unit-models.py"))
miniatures = module_from_spec(mesh_spec)
mesh_spec.loader.exec_module(miniatures)
Mesh, render = miniatures.Mesh, miniatures.render
Image = miniatures.Image
TAU = math.tau
OLIVE = (83, 125, 54)
GREEN_EDGE = (126, 159, 71)
GREEN_DARK = (54, 79, 43)
HOUSING = (42, 58, 37)
NYLON = (35, 47, 35)
BRASS = (174, 148, 81)


def guard(mesh, center, color):
    x, y, z = center
    profile = [(8.7, -.8), (9.1, -.35), (9.1, .45), (8.65, 1), (7.45, 1),
               (7.05, .5), (7.05, -.4), (7.48, -.8)]
    steps = 20

    def point(section, i):
        radius, height = profile[section]
        angle = TAU * i / steps
        return x + math.cos(angle) * radius, y + math.sin(angle) * radius, z + height

    for section in range(len(profile)):
        next_section = (section + 1) % len(profile)
        for i in range(steps):
            mesh.face([point(section, i), point(section, i + 1),
                       point(next_section, i + 1), point(next_section, i)],
                      color, .48)


def rotor(mesh, x, y, phase, index, evolved):
    mesh.tube(GREEN_DARK, (x, y, 2), (x, y, 7.2), 3.3, 2.8, n=10)
    mesh.tube(BRASS, (x, y, 6.9), (x, y, 7.6), 2.8, 2.15, n=12)
    guard(mesh, (x, y, 7.2), GREEN_EDGE if evolved else OLIVE)
    angle = phase * math.pi / 4 + index * math.pi / 5
    for flip in (0, math.pi):
        a = angle + flip
        co, si = math.cos(a), math.sin(a)

        def blade(f, side, z):
            return x + f * co - side * si, y + f * si + side * co, z

        mesh.face([blade(1.3, -1.2, 7.85), blade(6.6, -.65, 8),
                   blade(6.05, 1.15, 7.65), blade(1.35, 1.15, 7.55)], NYLON, .6)
        mesh.face([blade(5.35, -.82, 8.15), blade(6.57, -.65, 8.15),
                   blade(6.03, 1.11, 7.8), blade(5.14, 1.12, 7.8)], GREEN_EDGE, .55)
    mesh.tube(HOUSING, (x, y, 7.5), (x, y, 9.1), 1.7, 1.1, n=10)
    mesh.tube(BRASS, (x, y, 9.1), (x, y, 9.5), .8, .55, n=8)


def chassis(phase, evolved):
    mesh = Mesh()
    spread = 1.13 if evolved else 1
    mesh.box(HOUSING, (0, .2, 2), (15, 21, 6), 3.5)
    mesh.box(OLIVE, (0, .6, 5.7), (21, 25, 7.4), 4)
    mesh.box(GREEN_EDGE, (0, 1.5, 9.4), (16, 20, 2.8), 3)
    mesh.box(GREEN_DARK, (0, 5.1, 10.8), (10, 11, 1.5), 1.6)
    mesh.box(OLIVE, (0, 5.1, 11.65), (8.4, 9.2, .6), 1.4)
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        x, y = sx * 18 * spread, sy * 15 * spread
        mount = (sx * 6.5, sy * 7.5, 5.25)
        mesh.tube(GREEN_DARK, mount, (x, y, 4.3), 2.8, 2, n=8)
        mesh.tube(OLIVE, (mount[0], mount[1], 6.9), (x, y, 6.25), 1.35, 1.15, n=8)
        mesh.box(HOUSING, (sx * 6, sy * 7.6, .1), (2.1, 5.7, 2.4), .42)
        lamp = (159, 207, 139) if sy < 0 else (210, 103, 49)
        mesh.ball(lamp, (x, y + sy * 3, 4.2), (1.15, 1, .8), n=8, rings=4)
        rotor(mesh, x, y, phase, i, evolved)

    for sx in (-1, 1):
        for y in (-3, 0, 3):
            mesh.box(NYLON, (sx * 9.85, y, 6.65), (.75, 1.05, 1.9), .15)
        mesh.box(GREEN_EDGE, (sx * 6.1, -8, 9.5), (2.3, 5.2, 1.4), .7)
        mesh.tube(BRASS, (sx * 6.1, -8.2, 10.2), (sx * 6.1, -8.2, 10.5), .65, .55, n=8)
    mesh.box(BRASS, (0, 8, 12), (3.9, 1.5, .65), .24)
    mesh.tube(OLIVE, (4.9, 9.3, 9.4), (5.8, 10.8, 15.4), .65, .32, n=7)
    mesh.ball(BRASS, (5.8, 10.8, 15.4), (.7, .7, .8), n=8, rings=4)

    lens_r = 4.7 if evolved else 3.5
    mesh.box(GREEN_DARK, (0, -11.3, 4), (13, 7, 8.2), 2)
    mesh.tube(BRASS if evolved else HOUSING, (0, -13.7, 4.7), (0, -16, 4.7),
              lens_r, lens_r * .93, n=20)
    mesh.tube((38, 67, 59), (0, -16, 4.7), (0, -16.65, 4.7), lens_r * .76,
              lens_r * .64, n=20, gloss=.72)
    mesh.ball((105, 222, 173) if evolved else (116, 162, 134),
              (0, -16.75, 4.7), (lens_r * .55, .65, lens_r * .55), n=16, rings=6, gloss=.95)
    if evolved:
        for sx in (-1, 1):
            mesh.box(GREEN_EDGE, (sx * 10.6, -4.8, 5.3), (3.2, 11.5, 3.6), .92)
            mesh.box(BRASS, (sx * 10.7, -9.5, 6.3), (2.5, 2, .8), .35)
        mesh.box((135, 195, 127), (0, 3.4, 12), (5.6, 2.2, .6), .33)
    return mesh


def bake(output, evolved):
    cell, directions, columns, frames = 128, 16, 8, 4
    atlas = Image.new("RGBA", (columns * cell, directions // columns * frames * cell))
    for frame in range(frames):
        mesh = chassis(frame, evolved)
        for direction in range(directions):
            image = render(mesh, TAU * direction / directions, cell, shadow=False)
            atlas.paste(image, ((direction % columns) * cell,
                                (frame * (directions // columns) + direction // columns) * cell))
    name = "droneLaser" if evolved else "droneScout"
    output.mkdir(parents=True, exist_ok=True)
    path = output / f"{name}-0-body-v211.webp"
    atlas.save(path, "WEBP", quality=92, method=5, exact=True)
    print(path, path.stat().st_size, flush=True)


if __name__ == "__main__":
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parents[1] / "public/assets/models"
    for evolved in (False, True):
        bake(destination, evolved)
