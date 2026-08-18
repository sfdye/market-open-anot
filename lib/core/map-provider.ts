/**
 * Which map app an address opens in, and the URL that gets it there.
 *
 * Pure so the URL shapes can be unit-tested: the device layer (`lib/maps.ts`) owns the two things
 * this cannot see — the platform and whether an app is installed — and passes them in.
 */

export const MAP_PROVIDERS = ['apple', 'google'] as const;

export type MapProvider = (typeof MAP_PROVIDERS)[number];

/**
 * What the user chose. `'auto'` is the absence of a choice, not a third provider: the installed
 * apps decide, and keep deciding, until a Settings row is tapped.
 */
export type MapProviderPref = MapProvider | 'auto';

/**
 * The scheme each app answers to, spelled once: it is both what a link is built from and what
 * `canOpenURL` probes for, and the two drifting apart would read as "not installed" rather than
 * fail. `LSApplicationQueriesSchemes` in app.json holds the same two names and cannot import them,
 * so a third map app is an edit here and an edit there.
 */
export const MAP_SCHEMES: Record<MapProvider, string> = {
  apple: 'maps',
  google: 'comgooglemaps',
};

/** Membership of the supported set, never `=== 'apple' || === 'google'` at a call site. */
export function isMapProvider(value: unknown): value is MapProvider {
  return typeof value === 'string' && (MAP_PROVIDERS as readonly string[]).includes(value);
}

/** What a `canOpenURL` probe found. Keyed off the provider set, so a third app fails typecheck. */
export type InstalledMaps = Record<MapProvider, boolean>;

/** The platform names `Platform.OS` reports, since core cannot import it for the type. */
export type PlatformName = 'ios' | 'android' | 'web' | 'macos' | 'windows';

/**
 * Whether choosing a map app is a question worth asking here at all.
 *
 * iOS only, and named once rather than tested in the Settings screen, in the probe and in `mapUrl`:
 * Android has no Apple Maps to choose between, and its `geo:` hand-off already goes to whichever
 * app the user made default there — the same choice this setting exists to make.
 */
export function supportsMapChoice(platform: PlatformName): boolean {
  return platform === 'ios';
}

/**
 * Apple Maps unless it is the one that is missing.
 *
 * Apple Maps is deletable since iOS 14, and on a phone without it the default would open a URL
 * nothing handles — a dead tap, which is the outcome this app avoids hardest. Google Maps only
 * wins the toss-up when it is installed *and* Apple Maps is not; a phone with both, or with
 * neither, gets Apple Maps, whose scheme the OS answers again the moment it is reinstalled.
 */
export function resolveMapProvider(pref: MapProviderPref, installed: InstalledMaps): MapProvider {
  if (pref !== 'auto') return pref;
  return !installed.apple && installed.google ? 'google' : 'apple';
}

export interface MapPlace {
  lat: number;
  lng: number;
  /** The market's friendly name, for the pin label on the schemes that take one. */
  label: string;
  /** The postal address, for map apps that search by text rather than dropping a pin by coordinate. */
  address?: string;
}

/**
 * The URL to hand `Linking.openURL`.
 *
 * Three shapes, for three different reasons:
 *
 * - Apple's scheme takes a label with the coordinates, so the pin reads as the market rather than
 *   as a latitude.
 * - Google's own scheme is used when its app is there, and its documented `https` search URL when
 *   it is not: a user who picked Google Maps and then deleted it lands in a browser showing the
 *   right place, not on an error. Both use the address string when available — searching by text
 *   shows a readable label, while coordinates appear as a pin with no name.
 * - Where there is no choice to make, `geo:` hands the place to the platform's own default.
 */
export function mapUrl(
  place: MapPlace,
  env: { provider: MapProvider; platform: PlatformName; googleAppInstalled: boolean }
): string {
  const { lat, lng } = place;
  const label = encodeURIComponent(place.label);
  const at = `${lat},${lng}`;
  const googleQuery = encodeURIComponent(place.address ?? at);

  if (!supportsMapChoice(env.platform)) return `geo:0,0?q=${at}(${label})`;
  if (env.provider === 'google') {
    return env.googleAppInstalled
      ? `${MAP_SCHEMES.google}://?q=${googleQuery}&center=${at}`
      : `https://www.google.com/maps/search/?api=1&query=${googleQuery}`;
  }
  return `${MAP_SCHEMES.apple}:0,0?q=${label}@${at}`;
}
