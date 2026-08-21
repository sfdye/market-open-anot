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
 * The scheme each app answers to, spelled once: it is what a link is built from, and for Google
 * Maps also what `canOpenURL` probes for — the two drifting apart would read as "not installed"
 * rather than fail. Apple Maps is not probed (see `resolveMapProvider`), so its scheme is only
 * used to build URLs. `LSApplicationQueriesSchemes` in app.json holds the probed name
 * (`comgooglemaps`) and cannot import it, so a third map app is an edit here and an edit there.
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
 * Google Maps when it is installed, Apple Maps otherwise.
 *
 * `canOpenURL('maps://')` always returns `true` on iOS — deleting Apple Maps keeps the scheme
 * registered with the OS (a stock-app deletion removes the icon and user data, not the binary),
 * so the "Apple Maps is missing" state is undetectable and an auto default of Apple would route
 * those users to an App Store restore page instead of a map. Google Maps is a real third-party
 * app, so its probe tells the truth; the auto default leans on that one reliable signal. A phone
 * with both apps gets Google, which is the deliberate deviation from the old "both → Apple" rule.
 * Apple Maps answers its scheme again the moment it is reinstalled, so the neither-installed case
 * defaults to Apple.
 */
export function resolveMapProvider(pref: MapProviderPref, installed: InstalledMaps): MapProvider {
  if (pref !== 'auto') return pref;
  return installed.google ? 'google' : 'apple';
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
  env: { provider: MapProvider; platform: PlatformName; installed: InstalledMaps }
): string {
  const { lat, lng } = place;
  const label = encodeURIComponent(place.label);
  const at = `${lat},${lng}`;
  const query = encodeURIComponent(place.address ?? at);

  if (!supportsMapChoice(env.platform)) return `geo:${at}?q=${query}`;
  if (env.provider === 'google') {
    return env.installed.google
      ? `${MAP_SCHEMES.google}://?q=${query}&center=${at}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  return `${MAP_SCHEMES.apple}:0,0?q=${label}@${at}`;
}
