"""Build the two-star pixel map atlases with SpriteFusion Pixel Snapper 1.0.0 and Pillow."""
import argparse
import hashlib
import json
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parents[1] / "public"
ASSETS = PUBLIC / "assets"
OUT = ASSETS / "pixel-room"
PALETTE = (
    "202526,343436,4d4844,68645c,8c887b,b2b3a1,dedcc5,fff4d9,"
    "352738,624556,956377,c78b97,e6b8ad,482e2b,77443a,9e5441,"
    "c06947,e49260,f7b477,694738,936345,b98256,d6a16d,e5bd86,"
    "4a452d,736838,9a8743,c3aa55,f0d782,142d27,29432c,3f5a34,"
    "59763c,7f9850,a5b96e,c9cf93,234341,38635c,598278,7ea397,"
    "a7c3ac,25394a,385971,517e95,79aaba,b3ced1,51476c,88749b,"
    "662f32,9d3939,c65043,e77450,f3a15e,f3d15d,8b5ca3,c89bc7"
)


def sources():
    specs = {}
    def add(group, filename, cell=0, scale=.25):
        path = (ASSETS / group / filename).resolve()
        specs[path] = (cell, scale)

    models = json.loads((ASSETS / "models/manifest.json").read_text())["models"]
    for layers in models.values():
        for layer in layers.values():
            add("models", layer["file"], layer["cell"], .375)
    add("models", "blizzardMage-walk-v20261106.webp", models["blizzardMage-1"]["body"]["cell"], .375)
    for group in ["room", "field"]:
        for spec in json.loads((ASSETS / group / "manifest.json").read_text())["models"].values():
            add(group, spec["file"], spec.get("cell", 0))
    medic = json.loads((ASSETS / "rina/manifest-v2.json").read_text())
    for state in medic["states"].values():
        add("rina", state["file"], medic["cellWidth"], .20)
    for group in ["sword-boss", "support-toys", "front-portal", "fences"]:
        for path in (ASSETS / group).iterdir():
            if path.suffix in (".webp", ".png"):
                add(group, path.name, scale=.25)
    return specs


def convert(item, binary, temp):
    path, (cell, scale) = item
    name = path.relative_to(ASSETS).as_posix()
    stem = name.replace("/", "_")
    with Image.open(path) as source:
        rgba = source.convert("RGBA")
    w, h = rgba.size
    if cell and w % cell == 0 and h % cell == 0:
        target_cell = max(1, round(cell * scale))
        size = (w // cell * target_cell, h // cell * target_cell)
    else:
        factor = min(scale, 320 / max(w, h)) if name.startswith("room/") else scale
        size = tuple(max(2, round(value * factor)) for value in (w, h))
    small = rgba.resize(size, Image.Resampling.BOX)
    # A four-pixel pitch keeps the walker's two-pixel edge search within one
    # logical cell across every orientation and transparent frame gutter.
    inp, out = temp / (stem + ".png"), temp / (stem + ".snapped.png")
    small.resize((size[0]*4, size[1]*4), Image.Resampling.NEAREST).save(inp, compress_level=1)
    subprocess.run([binary, str(inp), str(out), "24", "--pixel-size", "4", "--palette", PALETTE],
                   capture_output=True, text=True, check=True)
    with Image.open(out) as result:
        # A final one-source-pixel interval can produce one trailing row/column.
        if any(actual not in (wanted, wanted+1) for actual, wanted in zip(result.size, size)):
            raise ValueError(f"{name}: grid {result.size} does not match the animation cells {size}")
        snapped = result.crop((0, 0, *size)).convert("RGBA")
    if snapped.getchannel("A").getbbox() != small.getchannel("A").getbbox():
        raise ValueError(f"{name}: changed transparent bounds")
    return name, snapped


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapper", default="spritefusion-pixel-snapper")
    args = parser.parse_args()
    specs = sources()
    with tempfile.TemporaryDirectory() as directory, ThreadPoolExecutor(max_workers=4) as pool:
        images = list(pool.map(lambda item: convert(item, args.snapper, Path(directory)), sorted(specs.items())))
    OUT.mkdir(exist_ok=True)
    pages, entries = [], {}
    canvas = Image.new("RGBA", (1536, 2048))
    x = y = row = 0

    def finish():
        content = canvas.crop((0, 0, canvas.width, y+row))
        scratch = OUT / "page.tmp"
        content.save(scratch, format="WEBP", lossless=True, method=6, exact=True)
        filename = "sheet-" + hashlib.sha256(scratch.read_bytes()).hexdigest()[:12] + ".webp"
        scratch.replace(OUT / filename)
        pages.append(filename)

    for name, image in sorted(images, key=lambda pair: (-pair[1].height, pair[0])):
        w, h = image.size
        if w > canvas.width or h > canvas.height:
            raise ValueError(f"{name}: sheet exceeds page")
        if x+w > canvas.width:
            x, y, row = 0, y+row, 0
        if y+h > canvas.height:
            finish()
            canvas = Image.new("RGBA", canvas.size)
            x = y = row = 0
        entries[name] = [len(pages), x, y, w, h]
        canvas.paste(image, (x, y))
        x += w
        row = max(row, h)
    finish()
    (OUT / "manifest.json").write_text(json.dumps({"tool":"spritefusion-pixel-snapper 1.0.0",
        "pages":pages,"sprites":entries}, separators=(",", ":")), encoding="utf-8")
    print(f"{len(entries)} snapped sprite sheets and props in {len(pages)} pages")


if __name__ == "__main__":
    main()
