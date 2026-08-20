# brand/

Design sources for the app icon. Edit these, never `assets/` — everything in there is
derived and gets overwritten. Nothing here ships: `assetBundlePatterns` only decides
which *resolved* assets get bundled, so what keeps the 135 KB master out of the app is
simply that no code `require`s it.

`layers/` is the approved source artwork: a market-stall awning, its supporting frame,
and a lit bulb on an emerald ground. The stall still reads as *the place* rather than as
a product, so it covers cooked-food centres and wet markets alike. Separating the
foreground forms adds depth without baking in fake glass effects or shadows.

## Regenerating `assets/`

```sh
npm run icons
```

Needs Pillow and librsvg (`pip install pillow`, `brew install librsvg`) — neither is a
repo dependency, because this runs by hand when the mark changes, not in CI. The script
renders the SVG layers, composites platform-specific variants, and verifies that the
Android foreground fits the Material safe zone.

The generated outputs feed distinct consumers, so their framing is not free to change:

| file | consumers |
|---|---|
| `icon.png` | `ios.icon.light`, and Android's legacy `ic_launcher` via the root `icon` |
| `icon-tinted.png` | `ios.icon.tinted` — must be opaque, see below |
| `mark-white.png` | `ios.icon.dark` **and** the splash image |
| `adaptive-icon.png` | Android's color `foregroundImage` |
| `adaptive-background.png` | Android's full-bleed adaptive-icon background |
| `monochrome-icon.png` | Android 13+ `monochromeImage` |
| `notification-icon.png` | the `expo-notifications` status-bar glyph |
| `open-anot-google-play-512.png` | Google Play listing upload, not bundled into the app |

The Android foreground is centered and scaled to the `66dp` safe zone inside its `108dp`
canvas. The Play listing export is a full, unmasked 512px square: Google Play supplies
its own rounding and shadow. The tinted variant has to be authored opaque because
`@expo/prebuild-config` flattens everything except `dark` onto white — a transparent
tinted master would render as a white rectangle.

The notification glyph is the one asset that is *not* mechanically derived. Downscaling
the app-icon art turns the line work to mush at 24dp, so `notification-icon.svg` is a
hand-drawn solid silhouette — and it drops the bulb, for a reason worth not
rediscovering: a solid bulb above a solid canopy fuses at 24dp and the pair reads as
head-and-shoulders. Shrinking the bulb far enough to separate just leaves a head-shaped
dot. The awning alone is unambiguous, and it is the app icon's dominant shape, so the two
still look like the same app. The deep scallop fringe is what makes it a canopy at that
size; it is the first thing to lose if the lobes are flattened.

## iOS Liquid Glass

The SVG layers are deliberately ready for Icon Composer: opaque full-bleed background,
and crisp foreground edges with no pre-applied bevel, glow, shadow, or mask. Import them
in this order: `background.svg`, `frame.svg`, `awning.svg`, `bulb.svg`; then tune the
default, dark, and mono appearances in Icon Composer and commit the resulting `.icon`
bundle. Expo SDK 57 accepts that bundle as a direct string at `ios.icon`, replacing the
raster icon object in `app.json`. Keep the raster pipeline until the Composer bundle has
been inspected on device; Icon Composer has no supported document-authoring CLI.

The app-facing icon outputs are 1024px; `expo prebuild` generates the whole native size
matrix from them, every `mipmap-*dpi` density for Android and a single 1024 per
appearance for iOS. The only smaller committed export is the 512px Google Play listing
asset, which is uploaded separately and never bundled into the app.
