# brand/

Design sources for the app icon. Edit these, never `assets/` — everything in there is
derived and gets overwritten. Nothing here ships: `assetBundlePatterns` only decides
which *resolved* assets get bundled, so what keeps the master out of the app is simply
that no code `require`s it.

`icon-master-1024.png` is the approved mark: a market-stall awning with a lit bulb
above it, white line art on green. It reads as *the place* rather than as a product,
which is what makes it cover cooked-food centres and wet markets alike, and the bulb
carries the "open" idea in pure shape — so the mark survives Android's themed-icon
layer and iOS's tinted variant, both of which throw colour away.

The master is flattened to one exact green, `rgb(30, 104, 43)`, whose luma is exactly
75. `make_icons.py` calibrates its edge threshold on that number and refuses to run on
anything else, because a re-export that shifted the green by a shade would silently
restroke the whole mark. Re-flatten a new export before committing it.

## Regenerating `assets/`

```sh
npm run icons
```

Needs Pillow and librsvg (`pip install pillow`, `brew install librsvg`) — neither is a
repo dependency, because this runs by hand when the mark changes, not in CI.

`make_icons.py` extracts one alpha matte from the master and derives all four rasters
from it, which is what keeps them consistent. Two of the numbers it prints are
assertions in disguise, and both now exit non-zero rather than warn:

- **enclosed counter area** before and after dilation. The stroke is thickened for
  legibility, and closing the bulb interior or a valance scallop would collapse this.
- **android scale**, recomputed from the art's true max pixel radius rather than its
  bbox corners (which are empty — the awning is widest mid-height and the legs are
  narrow), so the foreground lands just inside Material's 66dp keyline circle.

The 96px notification glyph is the one asset that is *not* mechanically derived.
Downscaling the app-icon art turns the line work to mush at 24dp, so
`notification-icon.svg` is a hand-drawn solid silhouette — and it drops the bulb, for a
reason worth not rediscovering: a solid bulb above a solid canopy fuses at 24dp and the
pair reads as head-and-shoulders. Shrinking the bulb far enough to separate just leaves
a head-shaped dot. The awning alone is unambiguous, and it is the app icon's dominant
shape, so the two still look like the same app. The deep scallop fringe is what makes
it a canopy at that size; it is the first thing to lose if the lobes are flattened.

## Where the sizes come from

Only 1024px masters are committed. `expo prebuild` generates the whole native matrix
from them via `@expo/prebuild-config`: every `mipmap-*dpi` density for Android, and a
single 1024 per appearance for iOS, which is all Xcode 16+ wants. Do not hand-write
anything under `ios/` or `android/`; both are generated and gitignored.
