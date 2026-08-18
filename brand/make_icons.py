#!/usr/bin/env python3
"""Derive the app icon masters from the one approved master.

    python3 brand/make_icons.py brand/icon-master-1024.png assets

Every raster is cut from a single extracted alpha matte, which is what keeps them
consistent with each other. See brand/README.md for the whole picture; the checks
in here are what stop a bad master shipping quietly.
"""

import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

CANVAS = 1024
GROUND = (30, 104, 43)        # the master's flat ground; luma is exactly 75
EDGE_FLOOR = 87               # drop anti-aliased pixels dimmer than this, for a crisp edge
BRAND_GREEN = (46, 125, 50)   # #2e7d32 — the ground the shipped icon uses, not the master's
BLACK = (0, 0, 0)             # iOS maps the tinted variant's luminance through the tint
WHITE = (255, 255, 255)
DILATE_RADIUS = 3             # 27px stroke -> 33px, i.e. 2.6% -> 3.2% of the canvas
SAFE_CIRCLE_DIA = 625         # Material's 66dp keyline on a 1024px/108dp canvas
ART = 8                       # alpha above which a pixel counts as art
HOLE = 64                     # alpha below which a pixel counts as background


def corner_radius(src):
    """Row 0 crosses the white surround, then the green rect: that x is the radius."""
    for x in range(src.size[0]):
        r, g, b = src.getpixel((x, 0))
        if g > 70 and r < 110 and b < 110:
            return x
    raise SystemExit('no green rounded rect on row 0 — is this the right master?')


def extract_matte(src):
    """White art -> anti-aliased alpha matte, with the white surround discarded."""
    # Inset the rect: the anti-aliased green/white boundary would read as art.
    rect = Image.new('L', src.size, 0)
    ImageDraw.Draw(rect).rounded_rectangle(
        [6, 6, src.size[0] - 7, src.size[1] - 7], radius=corner_radius(src), fill=255)

    span = 255 - EDGE_FLOOR
    matte = src.convert('L').point(
        lambda v: 0 if v <= EDGE_FLOOR else min(255, int((v - EDGE_FLOOR) / span * 255 + 0.5)))
    matte.paste(0, mask=ImageChops.invert(rect))
    return matte


def dilate(matte, radius):
    """Grow by a disc, preserving anti-aliasing (max of shifted copies).

    ImageFilter.MaxFilter is the call a reader expects and is deliberately not it:
    its kernel is square, which blunts the mark's diagonals differently.
    """
    out = matte
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy > radius * radius or (dx == 0 and dy == 0):
                continue
            out = ImageChops.lighter(out, ImageChops.offset(matte, dx, dy))
    return out


def recentre(matte):
    """Put the art's bounding box on the canvas centre."""
    box = matte.point(lambda v: 255 if v > ART else 0).getbbox()
    out = Image.new('L', matte.size, 0)
    # paste clips; ImageChops.offset would wrap the art around the edge
    out.paste(matte, (round(CANVAS / 2 - (box[0] + box[2] - 1) / 2),
                      round(CANVAS / 2 - (box[1] + box[3] - 1) / 2)))
    return out


def max_radius(matte):
    """Distance from the canvas centre to the furthest art pixel.

    Not the bounding box's half-diagonal: its corners are empty, because the awning
    is widest mid-height and the legs are narrow. Using the box would waste ~10% of
    the Android keyline circle.
    """
    art = matte.point(lambda v: 255 if v > ART else 0)
    w, h = art.size
    c = CANVAS / 2
    best = 0.0
    for y in range(h):
        box = art.crop((0, y, w, y + 1)).getbbox()
        if box:  # the row's furthest pixel is at one end of its span
            dx = max(abs(box[0] - c), abs(box[2] - 1 - c))
            best = max(best, (dx ** 2 + (y - c) ** 2) ** 0.5)
    return best


def enclosed_area(matte):
    """Background area the border cannot reach — the mark's counters."""
    bg = matte.point(lambda v: 255 if v <= HOLE else 0)
    ImageDraw.floodfill(bg, (0, 0), 0)
    return bg.histogram()[255]


def scaled(matte, factor):
    """Scale the art about the canvas centre."""
    n = round(CANVAS * factor)
    out = Image.new('L', (CANVAS, CANVAS), 0)
    out.paste(matte.resize((n, n), Image.LANCZOS), ((CANVAS - n) // 2,) * 2)
    return out


def on_alpha(matte):
    im = Image.new('RGBA', matte.size, WHITE + (0,))
    im.putalpha(matte)
    return im


def on_ground(rgb, matte):
    return Image.composite(Image.new('RGB', matte.size, WHITE),
                           Image.new('RGB', matte.size, rgb), matte)


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    src_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    src = Image.open(src_path).convert('RGB')
    if src.size != (CANVAS, CANVAS):
        raise SystemExit(f'expected {CANVAS}x{CANVAS}, got {src.size}')
    # The whole pipeline is calibrated on this one colour: EDGE_FLOOR sits 12 above its
    # luma, so a re-export that shifts the green would silently restroke the mark.
    ground = src.getpixel((CANVAS // 8, CANVAS // 2))
    if ground != GROUND:
        raise SystemExit(f'ground is {ground}, expected {GROUND} — '
                         'a re-exported master must be re-flattened, see brand/README.md')

    raw = extract_matte(src)
    before = enclosed_area(raw)
    grown = dilate(raw, DILATE_RADIUS)
    after = enclosed_area(grown)
    # Dilating for legibility must not fill the bulb interior or the valance scallops.
    # They are ~⅓ of the counter area between them, so losing one shows up well below 0.7.
    if after < before * 0.7:
        raise SystemExit(f'dilation closed a counter: enclosed area {before} -> {after}')

    matte = recentre(grown)
    mr = max_radius(matte)
    factor = min(1.0, (SAFE_CIRCLE_DIA / 2) / mr)
    if factor < 0.5:
        raise SystemExit(f'android scale {factor:.3f} would shrink the mark past legibility')

    on_ground(BRAND_GREEN, matte).save(out_dir / 'icon.png')
    on_ground(BLACK, matte).save(out_dir / 'icon-tinted.png')
    on_alpha(matte).save(out_dir / 'mark-white.png')
    on_alpha(scaled(matte, factor)).save(out_dir / 'adaptive-icon.png')

    print(f'counter area {before} -> {after} after dilating')
    print(f'max radius {mr:.1f}px -> android scale {factor:.3f}')
    print(f'wrote 4 masters to {out_dir}/ (notification-icon.png comes from the SVG)')


if __name__ == '__main__':
    main()
