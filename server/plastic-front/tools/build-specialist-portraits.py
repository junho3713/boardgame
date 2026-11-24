"""Bake support-card portraits from the same geometry and camera used in battle."""
import math
from pathlib import Path
from runpy import run_path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
INFANTRY = run_path(str(HERE / "build-roster-infantry.py"))
DRONE = run_path(str(HERE / "build-drone-models.py"))
WIDTH, HEIGHT = 180, 164


def portrait(mesh, drone=False):
    # Render at the card's resolution; never enlarge the tiny gameplay sprite.
    mesh.faces = [(points * 4, color, gloss) for points, color, gloss in mesh.faces]
    image = INFANTRY["render"](mesh, math.tau * 6 / 16, 512, shadow=False)
    image = image.crop(image.getbbox())
    if not drone:
        image = image.crop((0, 0, image.width, round(image.height * .82)))
    image.thumbnail((WIDTH - 12, HEIGHT - 14), Image.Resampling.LANCZOS)
    cx, cy = (WIDTH - image.width) // 2, (HEIGHT - image.height) // 2 + 2
    yy, xx = np.mgrid[:HEIGHT, :WIDTH]
    light = np.exp(-((xx - WIDTH * .43) / (WIDTH * .59)) ** 2 - ((yy - HEIGHT * .41) / (HEIGHT * .63)) ** 2)
    bg = np.array([23, 37, 24]) + light[..., None] * np.array([59, 65, 46])
    board = Image.fromarray(bg.astype("uint8"), "RGB").convert("RGBA")
    shadow = Image.new("RGBA", board.size)
    shadow.paste((10, 20, 15, 120), (cx + 2, cy + 4, cx + image.width + 2, cy + image.height + 4), image.getchannel("A"))
    board.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(3)))
    board.alpha_composite(image, (cx, cy))
    return board


def main():
    images = [portrait(INFANTRY["shotgun"](False, 0)), portrait(INFANTRY["dice_trooper"](False, 0)),
              portrait(DRONE["chassis"](0, False), drone=True)]
    atlas = Image.new("RGB", (len(images) * WIDTH, HEIGHT))
    for column, image in enumerate(images):
        atlas.paste(image.convert("RGB"), (column * WIDTH, 0))
    atlas.save(HERE.parent / "public/assets/ui/specialist-portraits-v211.webp", "WEBP", quality=93, method=6)


if __name__ == "__main__":
    main()

