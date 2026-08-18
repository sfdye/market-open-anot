/**
 * The OneMap raster basemaps the app offers, spelled as the tile URL wants them.
 *
 * OneMap serves six. `Original` and `GreyLite` are near-duplicates of the two here, and `LandLot`
 * is a cadastral survey sheet with no roads to find a market by, so all three are left out — the
 * choice is meant to be glanceable, not exhaustive. Adding one back is this line plus its label.
 */
export const BASEMAPS = ['Default', 'Grey', 'Night'] as const;

export type Basemap = (typeof BASEMAPS)[number];

/**
 * What the user chose, which is not the same as the basemap drawn. `'system'` means they made no
 * choice and the light/dark appearance keeps deciding — including when it changes later.
 */
export type BasemapPref = Basemap | 'system';

/**
 * The one membership test, so a value stored by a build that offered a different set cannot reach
 * the tile URL. Spelling the set out at the call site is what `isLang` exists to stop.
 */
export function isBasemap(value: unknown): value is Basemap {
  return typeof value === 'string' && (BASEMAPS as readonly string[]).includes(value);
}

/**
 * The basemap actually drawn.
 *
 * `'system'` pairs `Night` with a dark appearance because that is the one combination the palette
 * cannot rescue: pin colours already switch with the scheme, but daylight-bright tiles behind them
 * do not stop being daylight-bright.
 */
export function resolveBasemap(pref: BasemapPref, scheme: 'light' | 'dark'): Basemap {
  if (pref !== 'system') return pref;
  return scheme === 'dark' ? 'Night' : 'Default';
}
