"""Bake reinforcement canopies with the same orthographic camera and light as the army miniatures."""
from math import cos, sin, pi, tau
from pathlib import Path
from runpy import run_path
import json

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
shared = run_path(str(Path(__file__).with_name('build-unit-models.py')))
Mesh, render = shared['Mesh'], shared['render']
OUT = ROOT / 'public/assets/models'
CELL = 176
PIVOT = (CELL / 2, round(CELL * .70, 2))
# Each frame has a real change of volume. Opening gathers at the skirt, while
# spilling vents the crown first and kinks one side of the canopy on landing.
POSES = [(0, 0), (.26, 0), (.62, 0), (1, 0), (1, .27), (1, .62), (1, 1)]
OLIVE = (103, 139, 64)
CREAM = (221, 211, 159)
CANVAS = (102, 121, 73)
WEBBING = (64, 81, 45)
BRASS = (176, 155, 91)
RED = (211, 72, 49)
YELLOW = (241, 187, 66)


def tint(color, ratio):
    return tuple(min(255, round(v * ratio)) for v in color)


def seam(mesh, color, points, radius):
    for a, b in zip(points, points[1:]):
        mesh.tube(color, a, b, radius, n=5, gloss=.17)


def insignia(mesh, point, x, y, dx, dy, color):
    # Stamp the star on the curved panel, following its surface.
    def sample(u, v):
        a, b, c = point(u, v)
        return (a, b, c + 1.4)
    tips = []
    for i in range(10):
        theta = pi / 2 + tau * i / 10
        r = 1 if i % 2 == 0 else .44
        tips.append(sample(x + dx * r * cos(theta), y + dy * r * sin(theta)))
    center = np.array(sample(x, y))
    # Small facets keep a printed mark on the skin when the painter sorts faces.
    for i in range(10):
        a, b = np.array(tips[i]), np.array(tips[(i+1) % 10])
        for j in range(4):
            for k in range(4):
                start, end = a+(b-a)*k/4, a+(b-a)*(k+1)/4
                face = [center+(p-center)*r for p, r in ((start,j/4), (start,(j+1)/4), (end,(j+1)/4), (end,j/4))]
                if j == 0:
                    face = face[:3]
                mesh.face(face, color, .16)
                mesh.face(face[::-1], color, .16)


def round_canopy(prize):
    mesh = Mesh()
    count = 12
    step = tau / count
    def point(a, t):
        latitude = .115 + t * 1.53
        bulge = sin(pi * a / step) ** 2
        radius = (59 + bulge * 5.5 * t) * sin(latitude)
        return (radius * cos(a), radius * sin(a) * .83,
                62 * cos(latitude) + bulge * (6.0 * sin(pi * t) - 3.5 * t**3))
    for panel in range(count):
        a = panel * step
        # Pairs of ivory panels leave a broad olive field for the insignia.
        base = (YELLOW if panel % 3 == 1 else RED) if prize else (CREAM if panel % 3 == 1 else OLIVE)
        for j in range(12):
            for k in range(5):
                u, v = a + k * step / 5, j / 12
                mesh.face([point(u, v), point(u, v + 1/12),
                           point(u + step/5, v + 1/12), point(u + step/5, v)],
                          base if j < 11 else tint(base, .88), .26)
        seam(mesh, tint(base, .73), [point(a, i/12) for i in range(13)], .62)
        seam(mesh, tint(base, .83), [point(a + step*i/5, 1) for i in range(6)], 1.15)
    seam(mesh, (99, 89, 59) if prize else WEBBING,
         [point(tau*i/32, 0) for i in range(33)], 1.5)
    mesh.tube((61, 52, 40) if prize else (46, 61, 40), (0, 0, 55), (0, 0, 57), 8, 8, n=24)
    insignia(mesh, point, 2.53*step, .50, step*.40, .13, (255, 226, 152) if prize else CREAM)
    ties = [point(i*step, 1) for i in (6, 4, 2, 0)]
    return mesh, ties


def cargo_canopy(prize):
    mesh = Mesh()
    cells = 7
    def point(x, y, lower=False):
        # x crosses individually inflated cells. The leading edge is open.
        lobe = sin(pi*(x+1)*cells/2)**2
        arch = 22*(1-x*x) + 6*(1-y*y) - 8*x**6
        z = arch + (-8 if lower else 9) + (0 if lower else 6*lobe)
        return (60*x*(1-.10*y*y-.055*y), 33*y*(1-.22*x**4) + 5*x*x, z + 9)
    for i in range(cells):
        start = -1 + 2*i/cells
        color = ((YELLOW if i in (1, 3, 5) else RED) if prize else
                 ((137, 156, 96) if i in (1, 5) else CANVAS))
        for k in range(5):
            x = start + k*2/(cells*5)
            dx = 2/(cells*5)
            for j in range(6):
                y = -1 + j/3
                mesh.face([point(x, y), point(x+dx, y), point(x+dx, y+1/3), point(x, y+1/3)],
                          color if j < 5 else tint(color, 1.08), .32)
            # Recessed intake and thick bound leading edge. Visible from the front.
            corners = [point(x+dx, .86), point(x, .86), point(x, .86, True), point(x+dx, .86, True)]
            mesh.face(corners, tint(color, .39), .06)
            mesh.face(corners[::-1], tint(color, .39), .06)
            seam(mesh, tint(color, 1.08), [point(x, 1), point(x+dx, 1)], 1.4)
            seam(mesh, tint(color, .74), [point(x, 1, True), point(x+dx, 1, True)], 1.25)
            mesh.face([point(x, -1, True), point(x+dx, -1, True), point(x+dx, 1, True), point(x, 1, True)], tint(color, .69))
        # Two transverse reinforcement tapes curve over each inflated cell.
        for y in (-.62, .56):
            for k in range(8):
                x = start + k/8*2/cells
                verts = [point(u, v) for u, v in ((x,y-.055), (x+2/cells/8,y-.055),
                                                  (x+2/cells/8,y+.055), (x,y+.055))]
                mesh.face([(a,b,c+1.25) for a,b,c in verts], tint(color,.65), .17)
        for edge in ([start, 1] if i == cells-1 else [start]):
            seam(mesh, tint(color, .78), [point(edge, j/3-1) for j in range(7)], .90)
            seam(mesh, tint(color, .91), [point(edge, 1), point(edge, 1, True)], 1.35)
            wall = [point(edge, 1), point(edge, -1), point(edge, -1, True), point(edge, 1, True)]
            mesh.face(wall, tint(color, .68))
            mesh.face(wall[::-1], tint(color, .68))
    insignia(mesh, point, .03, .08, .15, .30, (255, 229, 151) if prize else CREAM)
    return mesh, [point(x, 1, True) for x in (-1, -3/7, 3/7, 1)]


def deform(verts, inflation, spill):
    x, y, z = verts.T
    pleats = np.cos(np.arctan2(y, x)*6)
    gather = (1-inflation) * (.80 + .11*pleats)
    fold = np.sin(x*.083 + y*.049)
    return np.stack((x*(1-gather)*(1-.16*spill) + spill*(z*.26+4*fold),
                     y*(1-gather)*(1-.57*spill) + 4*fold*spill,
                     z*(.58+.42*inflation)*(1-.88*spill)
                     + (1-inflation)*5*pleats + spill*(5*fold+6*x/65)), axis=1)


def bake():
    sheet = Image.new('RGBA', (CELL*len(POSES), CELL*4))
    rigs = []
    for row, (build, prize) in enumerate(((round_canopy, False), (cargo_canopy, False),
                                          (round_canopy, True), (cargo_canopy, True))):
        model, ties = build(prize)
        # Brass attachment eyes sit at the same vertices as the live suspension lines.
        for tie in ties:
            model.ball(BRASS, tie, (1.4, 1.4, 2), n=8, rings=4, gloss=.5)
        row_rig = []
        for col, (inflation, spill) in enumerate(POSES):
            posed = Mesh()
            posed.faces = [(deform(v, inflation, spill), c, g) for v, c, g in model.faces]
            image = render(posed, 0, CELL, shadow=False)
            sheet.paste(image, (col*CELL, row*CELL))
            if col <= 3 and row < 2:
                row_rig.append([[round(x, 2), round(y*.8-z*.6, 2)]
                                for x, y, z in deform(np.array(ties), inflation, spill)])
        if row < 2:
            rigs.append(row_rig)
    sheet.save(OUT/'summon-canopies-v2.webp', quality=94, method=6, exact=True)
    # Rigs use the same camera as the bake and are shared by both paint schemes.
    (OUT/'summon-canopies-v2.json').write_text(
        json.dumps(dict(cell=CELL, pivot=PIVOT, rigs=rigs), separators=(',', ':')) + '\n',
        encoding='utf-8', newline='\n')


if __name__ == '__main__':
    bake()

