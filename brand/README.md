# brand/

Design sources for the app icon. Edit these, never `assets/` — everything in there is
derived and gets overwritten. Nothing here ships: `assetBundlePatterns` only decides
which *resolved* assets get bundled, so what keeps the 135 KB master out of the app is
simply that no code `require`s it.

`icon-master-1024.png` is the approved mark: a market-stall awning with a lit bulb
above it, white line art on green. It reads as *the place* rather than as a product,
which is what makes it cover cooked-food centres and wet markets alike, and the bulb
carries the "open" idea in pure shape — so the mark survives Android's themed-icon
layer and iOS's tinted variant, both of which throw colour away.

## Regenerating `assets/`

```sh
npm run icons
```

Needs Pillow and librsvg (`pip install pillow`, `brew install librsvg`) — neither is a
repo dependency, because this runs by hand when the mark changes, not in CI. The script
cuts one alpha matte from the master and derives every raster from it; it prints its
measurements and exits non-zero on a master it cannot trust. Why each threshold is what
it is lives next to that threshold in `make_icons.py`.

Two of the five outputs feed two consumers each, so their framing is not free to change:

| file | consumers |
|---|---|
| `icon.png` | `ios.icon.light`, and Android's legacy `ic_launcher` via the root `icon` |
| `icon-tinted.png` | `ios.icon.tinted` — must be opaque, see below |
| `mark-white.png` | `ios.icon.dark` **and** the splash image |
| `adaptive-icon.png` | Android's `foregroundImage` **and** `monochromeImage` |
| `notification-icon.png` | the `expo-notifications` status-bar glyph |

So padding the splash art would quietly reframe the App Store dark icon, and the Android
keyline scale governs the themed icon too. The tinted variant has to be authored opaque
because `@expo/prebuild-config` flattens everything except `dark` onto white — a
transparent tinted master would render as a white rectangle.

The notification glyph is the one asset that is *not* mechanically derived. Downscaling
the app-icon art turns the line work to mush at 24dp, so `notification-icon.svg` is a
hand-drawn solid silhouette — and it drops the bulb, for a reason worth not
rediscovering: a solid bulb above a solid canopy fuses at 24dp and the pair reads as
head-and-shoulders. Shrinking the bulb far enough to separate just leaves a head-shaped
dot. The awning alone is unambiguous, and it is the app icon's dominant shape, so the two
still look like the same app. The deep scallop fringe is what makes it a canopy at that
size; it is the first thing to lose if the lobes are flattened.

## If the mark is ever revised

Author the new version as **SVG**, not as a raster. About a third of `make_icons.py` —
finding the rounded rect, thresholding luminance into a matte, probing that the ground is
flat, and hand-rolling a disc dilation because Pillow's `MaxFilter` is square — exists
only because the master is pixels rather than paths. From an SVG, `rsvg-convert` (already
a prerequisite here) plus a `stroke-width` change replaces all of it, and the master
becomes text-diffable. The current raster master stays because it is the approved,
pixel-verified artwork and re-tracing it would change it — that is a reason to keep this
one, not a reason to produce the next one the same way.

Only 1024px masters are committed; `expo prebuild` generates the whole native size matrix
from them, every `mipmap-*dpi` density for Android and a single 1024 per appearance for
iOS, which is all Xcode 16+ wants.
