"""Bake the olive support drone and its tactical quadcopter evolution."""
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
OLIVE = (109, 121, 69)
GREEN_EDGE = (143, 151, 94)
GREEN_DARK = (71, 82, 48)
HOUSING = (49, 57, 35)
NYLON = (86, 95, 60)
BRASS = (205, 185, 116)
CYAN = (55, 244, 254)


def guard(mesh, center, evolved):
    x, y, z = center
    profile = [(9.55, -2.15), (10.4, -1.55), (10.55, -.95), (10.58, -.15),
               (10.65, .85), (10.2, 1.8), (8.45, 1.8), (7.98, 1.18),
               (7.96, -.85), (8.35, -2.15)]
    steps = 24
    size = 1.15 if evolved else 1

    def point(section, i):
        radius, height = profile[section]
        angle = TAU * i / steps
        return x + math.cos(angle) * radius * size, y + math.sin(angle) * radius * size, z + height

    for section in range(len(profile)):
        next_section = (section + 1) % len(profile)
        for i in range(steps):
            color = CYAN if section == 2 else GREEN_EDGE if section in (4, 5) else OLIVE
            mesh.face([point(section, i), point(section, i + 1),
                       point(next_section, i + 1), point(next_section, i)], color, .52)


def rotor(mesh, x, y, phase, index, evolved):
    mesh.tube(GREEN_DARK, (x, y, 2), (x, y, 7.2), 3.3, 2.8, n=10)
    mesh.tube(BRASS, (x, y, 6.9), (x, y, 7.6), 2.8, 2.15, n=12)
    guard(mesh, (x, y, 7.2), evolved)
    size = 1.15 if evolved else 1
    angle = phase * math.pi / 4 + index * math.pi / 5
    for flip in (0, math.pi):
        a = angle + flip
        co, si = math.cos(a), math.sin(a)

        def blade(f, side, z):
            return x + (f * co - side * si) * size, y + (f * si + side * co) * size, z

        mesh.face([blade(1.3, -1.2, 7.85), blade(6.6, -.65, 8),
                   blade(6.05, 1.15, 7.65), blade(1.35, 1.15, 7.55)], NYLON, .6)
        mesh.face([blade(5.35, -.82, 8.15), blade(6.57, -.65, 8.15),
                   blade(6.03, 1.11, 7.8), blade(5.14, 1.12, 7.8)], GREEN_EDGE, .55)
    mesh.tube(HOUSING, (x, y, 7.5), (x, y, 9.1), 1.7, 1.1, n=10)
    mesh.tube(BRASS, (x, y, 9.1), (x, y, 9.5), .8, .55, n=8)


def control_dish(mesh):
    mesh.tube(HOUSING, (0, 4, 10), (0, 5, 15), 3.8, 2.1)
    mesh.tube(GREEN_DARK, (0, 5, 14), (0, 6, 19), 2.5, 1.55)
    # Concave tilted dish with a brighter rolled lip and a receiver above its center.
    profile = [(0, 0), (2.4, .2), (4.8, .8), (7.2, 2), (7.45, 2.3), (7.3, 2.65)]

    def point(section, i):
        r, depth = profile[section]
        a = i * TAU / 24
        return (r * math.cos(a), 7 + .62 * r * math.sin(a) - .78 * depth,
                18 + .78 * r * math.sin(a) + .62 * depth)

    for section in range(len(profile) - 1):
        for i in range(24):
            quad = [point(section, i), point(section + 1, i),
                    point(section + 1, i + 1), point(section, i + 1)]
            mesh.face(quad, GREEN_EDGE if section >= 3 else OLIVE, .63)
            mesh.face(quad[::-1], GREEN_DARK, .4)
    mesh.tube(BRASS, (0, 7, 18.1), (0, 4.1, 20.4), .42, .55, n=8)
    mesh.ball(CYAN, (0, 3.65, 20.8), (.82, .75, .72), n=8, rings=5)


def chassis(phase, evolved):
    mesh = Mesh()
    spread = 1.21 if evolved else 1
    mesh.box(HOUSING, (0, 0, 3.2), (13, 18, 5.8), 3.1)
    mesh.ball(OLIVE, (0, .7, 6.8), (9.8, 14.1, 5.3), n=18, rings=8)
    mesh.box(GREEN_EDGE, (0, .7, 10.85), (12.6, 16, 1.4), 3)
    mesh.box(OLIVE, (0, 1, 11.6), (10.6, 14, .85), 2.8)
    for i, (sx, sy) in enumerate(((-1, -.16), (1, -.16), (0, -1), (0, 1))):
        x, y = sx * 22.5 * spread, sy * 22.0 * spread
        mount = (sx * 5.4, sy * 7.5, 6.55)
        mesh.tube(OLIVE, mount, (.8 * x, .8 * y, 6.1), 4.2, 3, n=12)
        mesh.tube(CYAN, (sx * 6, sy * 7.8, 5.0), (.77 * x, .77 * y, 5.0), .76, .54, n=8)
        rotor(mesh, x, y, phase, i, evolved)

    for sx in (-1, 1):
        for y in (-7.4, 7.5):
            mesh.tube(GREEN_DARK, (sx * 6, y, 3.9), (sx * 9.5, y + 1.7, -.9), 1.13, .95, n=9)
        mesh.tube(HOUSING, (sx * 9.5, -7, -.9), (sx * 9.5, 11, -.9), 1.12, 1.12, n=9)
        mesh.ball(CYAN, (sx * 7.5, -7.8, 6.1), (.64, 2.1, .75), n=8, rings=5)

    lens_r = 4.55 if evolved else 3.7
    mesh.box(GREEN_DARK, (0, -9.4, 3.3), (11, 7, 6.2), 2)
    mesh.tube(BRASS, (0, -10.6, 3.8), (0, -13, 3.0),
              lens_r, lens_r * .93, n=20)
    mesh.tube((107, 97, 51), (0, -13.15, 2.93), (0, -13.55, 2.8), lens_r * .76,
              lens_r * .64, n=20, gloss=.72)
    mesh.ball((255, 243, 162), (0, -13.75, 2.75),
              (lens_r * .58, .9, lens_r * .56), n=16, rings=6, gloss=.95)
    if evolved:
        mesh.tube(HOUSING, (0, -3.7, 11.5), (0, -3.7, 12.7), 5.2, 4.65, n=20)
        mesh.tube(CYAN, (0, -3.7, 12.6), (0, -3.7, 13.15), 4.05, 3.6, n=20)
        mesh.ball((180, 253, 255), (0, -3.7, 13.2), (2.46, 2.4, 1), n=12, rings=6)
        control_dish(mesh)
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
    name = "droneControl" if evolved else "droneSupport"
    output.mkdir(parents=True, exist_ok=True)
    path = output / f"{name}-0-body.webp"
    atlas.save(path, "WEBP", quality=92, method=5, exact=True)
    print(path, path.stat().st_size, flush=True)


def portraits(output):
    sheet = Image.new("RGBA", (320, 160))
    for i, evolved in enumerate((False, True)):
        unit = render(chassis(0, evolved), -math.pi * .72, 128, shadow=True)
        unit = unit.crop(unit.getbbox())
        unit.thumbnail((142, 120), Image.Resampling.LANCZOS)
        if unit.width < 130:
            height = round(unit.height * 130 / unit.width)
            unit = unit.resize((130, height), Image.Resampling.LANCZOS)
        sheet.alpha_composite(unit, (i * 160 + (160 - unit.width) // 2, (160 - unit.height) // 2))
    output.mkdir(parents=True, exist_ok=True)
    sheet.save(output / "support-drone-portraits.webp", "WEBP", quality=94, method=5)


if __name__ == "__main__":
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parents[1] / "public/assets/models"
    for evolved in (False, True):
        bake(destination, evolved)
    portraits(destination.parent / "ui")
