"""Pack built-in ImageGen output into registered atlases; preserve generated alpha.

No drawing, background extraction or frame warping is performed here.
Usage: python pack-rina-v2.py SOURCE_DIRECTORY OUTPUT_DIRECTORY REVIEW_PATH
Requires Pillow and NumPy. SOURCE_DIRECTORY contains sources.json and generated PNGs.
"""
from pathlib import Path
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

source, out, review = map(Path, sys.argv[1:4])
out.mkdir(parents=True, exist_ok=True)
files = json.loads((source / 'sources.json').read_text())
states, diagnostics, tiles = {}, {}, {}
configs = [('directions', 'directions', 4, 2, list(range(8)))]
configs += [(key, key, 4, 2, list(range(8))) for key in
            ['walkFront', 'walkFrontLeft', 'walkSide', 'walkBackLeft', 'walkBack']]
configs += [('heal', 'heals', 4, 3, list(range(4))),
            ('healSide', 'heals', 4, 3, list(range(4, 8))),
            ('healBack', 'heals', 4, 3, list(range(8, 12))),
            ('hit', 'reactions', 4, 2, list(range(4))),
            ('death', 'reactions', 4, 2, list(range(4, 8)))]

for state, key, columns, rows, indexes in configs:
    sheet = Image.open(source / files[key]).convert('RGBA')
    cells, boxes = [], []
    for index in indexes:
        x, y = index % columns, index // columns
        cell = sheet.crop((round(x * sheet.width / columns), round(y * sheet.height / rows),
                           round((x + 1) * sheet.width / columns), round((y + 1) * sheet.height / rows)))
        alpha = np.array(cell.getchannel('A'))
        # Select the character's contiguous horizontal crop, excluding an
        # occasional sliver from the neighboring generated sheet cell.
        occupied = np.flatnonzero((alpha > 24).sum(axis=0) > 2)
        groups = np.split(occupied, np.where(np.diff(occupied) > 8)[0] + 1)
        main = max(groups, key=lambda g: int((alpha[:, g] > 24).sum()))
        left, right = int(main[0]), int(main[-1] + 1)
        ys, xs = np.where(alpha[:, left:right] > 24)
        xs = xs + left
        assert len(xs), (state, index, 'empty generated frame')
        box = (int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1))
        cells.append(cell)
        boxes.append(box)
    if state == 'death':
        # A fallen body keeps its physical size; do not normalize prone height.
        scale = diagnostics['hit']['scale']
    else:
        scale = 280 / float(np.median([b[3] - b[1] for b in boxes]))
    width = 448 if state == 'death' else 320
    atlas = Image.new('RGBA', (width * len(cells), 320))
    baseline = float(np.median([b[3] for b in boxes]))
    packed = []
    for index, (cell, box) in enumerate(zip(cells, boxes)):
        if state == 'death':
            pelvis = (box[0] + box[2]) / 2
        else:
            a = np.array(cell.getchannel('A'))
            y0 = round(box[1] + (box[3] - box[1]) * .60)
            y1 = round(box[1] + (box[3] - box[1]) * .68)
            centers = []
            for row in a[y0:y1]:
                xs = np.flatnonzero(row > 64)
                if len(xs): centers.append((float(xs.min()) + float(xs.max())) / 2)
            pelvis = float(np.median(centers)) if centers else (box[0] + box[2]) / 2
        ground = box[3] if state == 'directions' else baseline
        w, h = round((box[2] - box[0]) * scale), round((box[3] - box[1]) * scale)
        x, y = round(width / 2 + (box[0] - pelvis) * scale), round(306 + (box[1] - ground) * scale)
        assert x >= 0 and y >= 0 and x + w <= width and y + h <= 320, (state, index, x, y, w, h)
        crop = cell.crop(box).resize((w, h), Image.Resampling.LANCZOS)
        atlas.alpha_composite(crop, (index * width + x, y))
        packed.append({'sourceFrame': indexes[index], 'bounds': list(box), 'placed': [x, y, w, h]})
    filename = 'v2-' + state + '.webp'
    atlas.save(out / filename, 'WEBP', lossless=True, method=6)
    states[state] = {'file': filename, 'bakedMotion': True,
                     'frames': [{'rect': [i * width, 0, width, 320], 'anchor': [width // 2, 306]}
                                for i in range(len(cells))]}
    diagnostics[state] = {'scale': scale, 'size': list(atlas.size), 'alpha': list(atlas.getchannel('A').getextrema()),
                          'frames': packed, 'bytes': (out / filename).stat().st_size}
    tiles[state] = atlas

# Keep the old loader's idle/walk keys, now pointing at the refined model.
states['idle'] = {**states['directions'], 'frames': [states['directions']['frames'][0]] * 4}
states['walk'] = states['walkFront']
manifest = {'version': 20261105, 'height': 84, 'cellHeight': 320, 'cellWidth': 320,
            'walkStride': 56, 'directionalIdle': True, 'volumetric': True, 'states': states}
(out / 'manifest-v2.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
(source / 'packing.json').write_text(json.dumps(diagnostics, indent=2), encoding='utf-8')

front = tiles['directions'].crop((0, 0, 320, 320))
box = front.getchannel('A').getbbox()
portrait = front.crop((box[0], box[1], box[2], round(box[1] + (box[3] - box[1]) * .67)))
portrait = ImageOps.contain(portrait, (180, 220), Image.Resampling.LANCZOS)
p = Image.new('RGBA', (180, 220)); p.alpha_composite(portrait, ((180 - portrait.width) // 2, 220 - portrait.height))
p.save(out / 'v2-portrait.webp', 'WEBP', lossless=True)

review.parent.mkdir(parents=True, exist_ok=True)
canvas = Image.new('RGB', (1120, 770), '#273d34'); draw = ImageDraw.Draw(canvas)
font_path = Path('C:/Windows/Fonts/malgun.ttf')
font = ImageFont.truetype(str(font_path), 22) if font_path.exists() else ImageFont.load_default()
draw.text((28, 18), '리나 의무병 · 입체감 / 8방향 걷기 / 치료 모션', font=font, fill='#efe8ce')
for i in range(8):
    cell = tiles['directions'].crop((i * 320, 0, (i + 1) * 320, 320)).resize((128, 160), Image.Resampling.LANCZOS)
    canvas.paste(cell, (40 + i * 132, 64), cell)
for row, key in enumerate(['walkFront', 'walkFrontLeft', 'walkSide', 'walkBackLeft', 'walkBack']):
    draw.text((24, 248 + row * 96), ['정면', '앞 대각선', '측면', '뒤 대각선', '후면'][row], font=font, fill='#c1d9bd')
    for i in range(8):
        cell = tiles[key].crop((i * 320, 0, (i + 1) * 320, 320)).resize((72, 90), Image.Resampling.LANCZOS)
        canvas.paste(cell, (180 + i * 112, 240 + row * 96), cell)
canvas.save(review)
print(json.dumps({'states': len(states), 'runtimeBytes': sum(d['bytes'] for d in diagnostics.values()), 'review': str(review)}))
