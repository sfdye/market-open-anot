#!/usr/bin/env python3
"""Derive every shipped icon raster from the layered SVG artwork.

Run it with `npm run icons`. See brand/README.md for the design rationale.
"""

import io
import subprocess
from pathlib import Path
from PIL import Image

LAYERS_DIR = Path('brand/layers')
GLYPH_SVG = Path('brand/notification-icon.svg')
OUT_DIR = Path('assets')
PLAY_ICON = Path('brand/open-anot-google-play-512.png')

CANVAS = 1024
WHITE = 255
SAFE_CIRCLE_DIA = 625        # Material's 66dp keyline on a 1024px/108dp canvas
SAFE_RADIUS = SAFE_CIRCLE_DIA / 2 - 1  # Leave one rendered pixel inside the keyline.
ART = 8                      # alpha above which a pixel counts as art
PLAY_SIZE = 512


def render_svg(path):
    """Render a full-canvas SVG through librsvg without introducing a second raster master."""
    try:
        png = subprocess.run(
            ['rsvg-convert', str(path), '-f', 'png', '-w', str(CANVAS), '-h', str(CANVAS)],
            check=True, capture_output=True).stdout
    except FileNotFoundError as e:
        raise SystemExit(f'{e.filename} not found — `brew install librsvg`')

    image = Image.open(io.BytesIO(png)).convert('RGBA')
    if image.size != (CANVAS, CANVAS):
        raise SystemExit(f'expected {path} to render at {CANVAS}x{CANVAS}, got {image.size}')
    return image


def alpha(image):
    return image.getchannel('A')


def require_opaque(image, name):
    if alpha(image).getextrema() != (255, 255):
        raise SystemExit(f'{name} must be fully opaque')


def art_mask(image):
    return alpha(image).point(lambda v: 255 if v > ART else 0)


def composite(*layers):
    out = Image.new('RGBA', (CANVAS, CANVAS))
    for layer in layers:
        out.alpha_composite(layer)
    return out


def recentre(image):
    """Put transparent artwork on the centre without wrapping it around the canvas."""
    box = art_mask(image).getbbox()
    if box is None:
        raise SystemExit('foreground has no visible pixels')

    out = Image.new('RGBA', image.size)
    out.alpha_composite(image, (round(CANVAS / 2 - (box[0] + box[2] - 1) / 2),
                                round(CANVAS / 2 - (box[1] + box[3] - 1) / 2)))
    return out


def max_radius(image):
    """Distance from the canvas centre to the furthest art pixel.

    Not the bounding box's half-diagonal: its corners are empty, because the awning is
    widest mid-height and the legs are narrow, so the box would waste ~11% of the radius.
    """
    art = art_mask(image)
    w, h = art.size
    c = CANVAS / 2
    best = 0.0
    for y in range(h):
        box = art.crop((0, y, w, y + 1)).getbbox()
        if box:  # the row's furthest pixel is at one end of its span
            dx = max(abs(box[0] - c), abs(box[2] - 1 - c))
            best = max(best, (dx ** 2 + (y - c) ** 2) ** 0.5)
    return best


def scaled(image, factor):
    """Scale the art about the canvas centre."""
    n = round(CANVAS * factor)
    out = Image.new('RGBA', (CANVAS, CANVAS))
    out.alpha_composite(image.resize((n, n), Image.LANCZOS), ((CANVAS - n) // 2,) * 2)
    return out


def save(image, path):
    image.save(path, optimize=True)


def on_alpha(image):
    """White art on transparency, as greyscale+alpha — every RGB channel would be 255."""
    return Image.merge('LA', (Image.new('L', image.size, 255), alpha(image)))


def main():
    background = render_svg(LAYERS_DIR / 'background.svg')
    frame = render_svg(LAYERS_DIR / 'frame.svg')
    awning = render_svg(LAYERS_DIR / 'awning.svg')
    bulb = render_svg(LAYERS_DIR / 'bulb.svg')
    foreground = composite(frame, awning, bulb)
    centred_foreground = recentre(foreground)
    mr = max_radius(centred_foreground)
    factor = min(1.0, SAFE_RADIUS / mr)
    if factor < 0.5:
        raise SystemExit(f'android scale {factor:.3f} would shrink the mark past legibility')

    # The color foreground is independent of the background so Android can mask it freely.
    adaptive_foreground = scaled(centred_foreground, factor)
    adaptive_monochrome = on_alpha(adaptive_foreground)
    flat = composite(background, frame, awning, bulb)
    require_opaque(background, 'adaptive background')
    require_opaque(flat, 'flattened icon')
    if max_radius(adaptive_foreground) > SAFE_CIRCLE_DIA / 2:
        raise SystemExit('android foreground exceeds the 66dp safe zone')

    save(flat.convert('RGB'), OUT_DIR / 'icon.png')
    save(alpha(foreground), OUT_DIR / 'icon-tinted.png')
    save(on_alpha(foreground), OUT_DIR / 'mark-white.png')
    save(adaptive_foreground, OUT_DIR / 'adaptive-icon.png')
    save(background, OUT_DIR / 'adaptive-background.png')
    save(adaptive_monochrome, OUT_DIR / 'monochrome-icon.png')
    save(flat.convert('RGBA').resize((PLAY_SIZE, PLAY_SIZE), Image.LANCZOS), PLAY_ICON)
    if PLAY_ICON.stat().st_size > 1024 * 1024:
        raise SystemExit('Google Play listing icon exceeds 1 MB')
    subprocess.run(['rsvg-convert', str(GLYPH_SVG),
                    '-o', str(OUT_DIR / 'notification-icon.png')], check=True)

    print(f'max radius {mr:.1f}px -> android scale {factor:.3f}')
    print(f'wrote 7 files to {OUT_DIR}/ and {PLAY_ICON} ({PLAY_ICON.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
