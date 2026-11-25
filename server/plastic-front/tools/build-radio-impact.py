"""Bake animated relief and emission for the three radio strikes. NumPy + Pillow."""
from math import sin, cos, tau, exp
from pathlib import Path

import numpy as np
from PIL import Image


CELL, FRAMES, COLUMNS = 192, 24, 6
ROWS = FRAMES // COLUMNS
FLOOR = 151
Y, X = np.mgrid[:CELL, :CELL].astype(np.float32)
FIELD = np.random.default_rng(407).uniform(-1, 1, (192, 192)).astype(np.float32)
OUT = Path(__file__).resolve().parents[1] / "public/assets/effects/radio-impact-volume-v1.webp"


def noise(x, y):
    ix, iy = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    ix, iy = ix % 192, iy % 192
    ax, ay = (ix + 1) % 192, (iy + 1) % 192
    return ((1-fx)*FIELD[iy, ix] + fx*FIELD[iy, ax])*(1-fy) + ((1-fx)*FIELD[ay, ix] + fx*FIELD[ay, ax])*fy


def shape(kind, t):
    """Ellipsoids share a smooth density surface. The last component is local heat."""
    swell = 1 - exp(-7*t)
    if kind == "nuke":
        h = 15 + 77*(1-exp(-3.5*t)) + 12*t
        cap = 11 + 40*swell + 4*t
        # Dust gathers underneath a narrow trunk and rolls out along the board.
        for i in range(10):
            a = tau*i/10
            d = 7 + 45*swell
            yield cos(a)*d, -sin(a)*d*.24-3, 10+13*swell, 6+10*swell, .13
        for i in range(9):
            q = i/8
            w = (7+9*swell)*(1+.55*(2*q-1)**2)
            yield 3*sin(i*2.4+t*3)*swell, h*q, w, (7 if i == 0 else 13)+7*swell, .82-.32*q
        for i in range(8):
            a = tau*i/8
            yield cos(a)*(7+15*swell), h*(.25+.25*t)+sin(a)*3, 5+7*swell, 4+3*swell, .80-.20*t
        drift = 7*t
        yield drift, h+4, cap*1.10, cap*.48, .73
        for i in range(13):
            a = tau*i/13
            w = cap*(.25+.06*cos(i*2.6))
            yield drift+cos(a)*cap*.91, h+sin(a)*cap*.24, w, w*.85, .68-.26*sin(a)
        for i in range(8):
            a = tau*i/8+.31
            yield drift+cos(a)*cap*.59, h+cap*(.23+.20*sin(a)), cap*.32, cap*.31, .52
    elif kind == "missile":
        for i in range(7):
            a = tau*i/7+.32
            d = (15+8*sin(i*1.8))*swell
            yield cos(a)*d, 8+sin(a)*d*.54+9*t, 8+10*swell, 9+11*swell, .99
        # One oblique jet and two shorter side jets break the silhouette of each hit.
        for i, (dx, dy) in enumerate([(-32, 82), (41, 51), (-47, 29)]):
            for j in range(1, 8):
                q = j/7
                w = 2 + (1-q)**1.4*14 + t*(3+2*cos(j*2+i))
                yield dx*q*swell + sin(j*1.9+i)*3, (8+dy*q)*swell+11*t, w, w*1.15, 1.07-.50*q
    else:
        for i in range(10):
            a = tau*i/10+.4
            d = (30+13*cos(i*2.1))*swell
            w = 7+11*swell
            yield cos(a)*d, 8+sin(a)*d*.53+7*t, w, w*(1.05+.24*sin(i)), 1.04
        for i in range(5):
            d = (i-2)*11*swell
            for j in range(4):
                q = j/3
                w = 8+9*(1-q)*swell
                yield d*(1+q*.54)+3*sin(2*i+q*4), 9+(17+17*cos(i*2.1))*swell*q+10*t, w, w*1.4, .96-.20*q


def frame(kind, t):
    seed = {"incendiary": 7, "missile": 43, "nuke": 81}[kind]
    scale = .065 if kind == "nuke" else .091
    sx, sy = X*scale+seed, Y*scale+3*t
    broad = noise(sx, sy)
    fold = noise(sx*2.1+broad, sy*2.1-broad*.7)
    grain = noise(sx*5, sy*5+fold)
    warp = 3.4*broad + 2.7*fold + .95*grain
    depth = np.full_like(X, -16)
    thermal = np.zeros_like(X)
    for x, h, w, ry, heat in shape(kind, t):
        u, v = (X-CELL/2-x)/w, (Y-FLOOR+h)/ry
        dist = u*u + v*v
        relief = np.sqrt(np.maximum(0, 1-dist))*min(w, ry) - np.maximum(dist-1, 0)*w*.72 + warp
        # Round the trough between overlapping billows; avoid cutout outlines.
        join = np.maximum(0, 1 - np.abs(relief-depth)/4)
        thermal = np.where(relief > depth, heat, thermal)
        depth = np.maximum(depth, relief) + join*join
    alpha = np.clip(.23+depth*.19, 0, 1)
    height = depth + 1.3*fold + .58*grain
    dy, dx = np.gradient(height)
    lit = np.clip((.57-.6*dx-.78*dy)/np.sqrt(1+dx*dx+dy*dy), -1, 1)
    # The cap cools first. Creases in rolling soot keep glowing from underneath.
    cooling = (.64 if kind == "nuke" else .87)*t
    fuel = thermal + .24*broad + .19*fold + .07*grain - cooling
    if kind == "nuke":
        fuel += np.clip((Y-78)/130, -.15, .21)
    heat = np.clip((fuel-.26)/.78, 0, 1)
    soot = np.stack([67+44*lit, 60+42*lit, 60+40*lit], -1)
    soot += (10*broad+5*grain)[..., None]
    keys = [0, .2, .42, .64, .80, 1]
    colors = [(79,44,39), (139,51,29), (220,68,21), (255,140,35), (255,204,77), (255,248,202)]
    fire = np.stack([np.interp(heat, keys, c) for c in zip(*colors)], -1)
    emission = np.clip((fuel-.20)*3.2, 0, 1)[..., None]
    rgb = soot*(1-emission) + fire*emission
    if kind == "nuke":
        dust = thermal < .15
        alpha = np.where(dust, alpha*(.42+.14*lit), alpha)
        rgb += dust[..., None]*np.array([30, 21, 7])
    alpha *= np.clip(.82+.16*heat+.16*lit+.18*(1-t), .40, 1)
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha*255]).astype(np.uint8)
    return Image.fromarray(rgba)


def flame_tile(t):
    """A seamless ribbon of fire; the upper tips curl sideways as the fuel burns."""
    phase = tau*t
    h = (FLOOR-Y)/112
    grain = noise(X*.09+2*cos(phase), Y*.08+2*sin(phase))
    flow = noise(X*.035+2.5*sin(phase), Y*.033+2.5*cos(phase))
    shape = np.full_like(X, -5)
    for i, (pos, height, width) in enumerate([(-43,.55,20),(-23,.79,18),(0,1.02,24),(24,.72,22),(45,.50,15)]):
        q = h/(height+.11*sin(phase+i*2))
        tip = np.clip(q, 0, 1)
        bend = tip*(9*np.sin(phase+tip*4+i)+tip*18*flow)
        breadth = width*np.maximum(.08, 1-tip**1.35)**.70
        inside = 1-np.abs(X-CELL/2-pos-bend)/breadth
        shape = np.maximum(shape, np.minimum(inside, (1-q)*4))
    density = shape + flow*.40 + grain*.17
    foot = np.clip(1+h*18, 0, 1)
    alpha = np.clip(density*2.0, 0, 1)*foot
    hot = np.clip(.15+.74*density-.37*h+.18*flow, 0, 1)
    keys = [0, .23, .47, .73, 1]
    palette = [(181,39,10),(255,68,15),(255,137,25),(255,207,71),(255,250,194)]
    rgb = [np.interp(hot, keys, ch) for ch in zip(*palette)]
    return Image.fromarray(np.dstack([*rgb, alpha*255]).astype(np.uint8))


def main():
    sheet = Image.new("RGBA", (COLUMNS*CELL, 4*ROWS*CELL))
    for band, kind in enumerate(("incendiary", "missile", "nuke")):
        for i in range(FRAMES):
            tile = frame(kind, i/(FRAMES-1))
            sheet.paste(tile, (i%COLUMNS*CELL, (band*ROWS+i//COLUMNS)*CELL))
    for i in range(FRAMES):
        sheet.paste(flame_tile(i/FRAMES), (i%COLUMNS*CELL, (3*ROWS+i//COLUMNS)*CELL))
    sheet.save(OUT, quality=86, method=6)


if __name__ == "__main__":
    main()
