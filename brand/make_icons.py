#!/usr/bin/env python3
"""Derive every shipped icon raster from the one approved master.

Run it with `npm run icons`. See brand/README.md for the design rationale.
"""

import subprocess
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

MASTER = Path('brand/icon-master-1024.png')
GLYPH_SVG = Path('brand/notification-icon.svg')
OUT_DIR = Path('assets')

CANVAS = 1024
EDGE_MARGIN = 12             # how far above the ground's luma a pixel must be to count as art
BRAND_GREEN = (46, 125, 50)  # #2e7d32 — the shipped icon's ground, not the master's
WHITE = (255, 255, 255)
DILATE_RADIUS = 3            # 27px stroke -> 33px, i.e. 2.6% -> 3.2% of the canvas
SAFE_CIRCLE_DIA = 625        # Material's 66dp keyline on a 1024px/108dp canvas
ART = 8                      # alpha above which a pixel counts as art
HOLE = 64                    # alpha below which a pixel counts as background
# Spread across the ground, all clear of the art's bounding box.
GROUND_PROBES = [(128, 512), (896, 512), (512, 64), (512, 960)]


def read_ground(src):
    """The master's flat background colour, asserting it really is flat.

    A gradient, a stray colour profile or an export over the wrong backdrop all show up
    as probes that disagree — and any of them would make the matte threshold below
    meaningless, so this is the one property of the master worth checking.
    """
    seen = {src.getpixel(p) for p in GROUND_PROBES}
    if len(seen) != 1:
        raise SystemExit(f'master ground is not flat: probes gave {sorted(seen)}')
    return seen.pop()


def luma(rgb):
    """Pillow's own RGB->L coefficients, so the threshold matches what convert('L') gives."""
    r, g, b = rgb
    return (r * 19595 + g * 38470 + b * 7471 + 0x8000) >> 16


def corner_radius(src, ground):
    """Row 0 crosses the white surround, then the rounded rect: that x is the radius."""
    for x in range(src.size[0]):
        if src.getpixel((x, 0)) == ground:
            return x
    raise SystemExit('no rounded rect on row 0 — is this the right master?')


def extract_matte(src, ground):
    """White art -> anti-aliased alpha matte, with the white surround discarded."""
    # Inset the rect: the anti-aliased ground/white boundary would read as art.
    rect = Image.new('L', src.size, 0)
    ImageDraw.Draw(rect).rounded_rectangle(
        [6, 6, src.size[0] - 7, src.size[1] - 7], radius=corner_radius(src, ground), fill=255)

    floor = luma(ground) + EDGE_MARGIN
    span = 255 - floor
    matte = src.convert('L').point(
        lambda v: 0 if v <= floor else min(255, int((v - floor) / span * 255 + 0.5)))
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
            if dx * dx + dy * dy <= radius * radius:
                out = ImageChops.lighter(out, ImageChops.offset(matte, dx, dy))
    return out


def recentre(matte):
    """Put the art's bounding box on the canvas centre."""
    box = art_mask(matte).getbbox()
    out = Image.new('L', matte.size, 0)
    # paste clips; ImageChops.offset would wrap the art around the edge
    out.paste(matte, (round(CANVAS / 2 - (box[0] + box[2] - 1) / 2),
                      round(CANVAS / 2 - (box[1] + box[3] - 1) / 2)))
    return out


def art_mask(matte):
    return matte.point(lambda v: 255 if v > ART else 0)


def max_radius(matte):
    """Distance from the canvas centre to the furthest art pixel.

    Not the bounding box's half-diagonal: its corners are empty, because the awning is
    widest mid-height and the legs are narrow, so the box would waste ~11% of the radius.
    """
    art = art_mask(matte)
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


def save(im, name):
    im.save(OUT_DIR / name, optimize=True)


def on_alpha(matte):
    """White art on transparency, as greyscale+alpha — every RGB channel would be 255."""
    return Image.merge('LA', (Image.new('L', matte.size, 255), matte))


def on_ground(rgb, matte):
    """White art on a flat colour. Two colours plus the edge ramp, so a palette fits."""
    flat = Image.composite(Image.new('RGB', matte.size, WHITE),
                           Image.new('RGB', matte.size, rgb), matte)
    return flat.convert('P', palette=Image.ADAPTIVE, colors=256)


def main():
    if not MASTER.exists():
        raise SystemExit(f'{MASTER} not found — run this from the repo root, or use `npm run icons`')

    src = Image.open(MASTER).convert('RGB')
    if src.size != (CANVAS, CANVAS):
        raise SystemExit(f'expected {CANVAS}x{CANVAS}, got {src.size}')
    ground = read_ground(src)

    raw = extract_matte(src, ground)
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

    # Which config key each file feeds is in brand/README.md — two of them serve two
    # consumers each, so the framing here is not free to change.
    save(on_ground(BRAND_GREEN, matte), 'icon.png')       # ios.icon.light + Android legacy
    save(matte, 'icon-tinted.png')                        # ios.icon.tinted: iOS maps L through the tint
    save(on_alpha(matte), 'mark-white.png')               # ios.icon.dark + the splash
    save(on_alpha(scaled(matte, factor)), 'adaptive-icon.png')  # Android foreground + monochrome
    subprocess.run(['rsvg-convert', str(GLYPH_SVG),
                    '-o', str(OUT_DIR / 'notification-icon.png')], check=True)

    print(f'ground {ground}, luma {luma(ground)} -> edge floor {luma(ground) + EDGE_MARGIN}')
    print(f'counter area {before} -> {after} after dilating')
    print(f'max radius {mr:.1f}px -> android scale {factor:.3f}')
    print(f'wrote 5 files to {OUT_DIR}/')


if __name__ == '__main__':
    try:
        main()
    except FileNotFoundError as e:
        raise SystemExit(f'{e.filename} not found — `brew install librsvg`')
