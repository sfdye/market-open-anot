import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { MAP_PROVIDERS, MAP_SCHEMES, mapUrl, resolveMapProvider, supportsMapChoice } from './core/map-provider';
import type { InstalledMaps, MapPlace, MapProvider, MapProviderPref } from './core/map-provider';

export { MAP_PROVIDERS };

/** The predicate bound to this device, for the Settings section that only iOS has a choice on. */
export const MAP_CHOICE_SUPPORTED = supportsMapChoice(Platform.OS);

async function canOpen(url: string): Promise<boolean> {
  try {
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
}

/**
 * Which map apps this phone has. Off iOS it answers without touching the bridge — there is nothing
 * to choose between, so nothing to ask about.
 *
 * Apple Maps is hardcoded `true`: `canOpenURL('maps://')` always answers yes on iOS, because
 * deleting a stock app keeps its URL scheme registered with the OS (the binary stays). That makes
 * the "Apple Maps is missing" state undetectable, so the probe is dead and not worth the bridge
 * call — `resolveMapProvider` treats Apple as always present and leans on the Google probe alone.
 * A scheme is only visible to `canOpenURL` while it is listed in `LSApplicationQueriesSchemes`
 * (app.json); `comgooglemaps` is the one that matters now.
 */
export async function probeInstalledMaps(): Promise<InstalledMaps> {
  if (!MAP_CHOICE_SUPPORTED) return { apple: false, google: false };
  const google = await canOpen(`${MAP_SCHEMES.google}://`);
  return { apple: true, google };
}

/**
 * Which apps are installed and which would open for the current preference.
 *
 * `installed` is null until the probe lands — the Google Maps row should be hidden if the probe
 * finds it missing, but shown optimistically before it does so the section doesn't flicker. Apple
 * Maps always reports installed (see `probeInstalledMaps`). `provider` is null while auto is still
 * resolving; an explicit choice answers immediately.
 *
 * Always probes on mount so the caller has `installed` to filter rows regardless of `pref`.
 */
export function useMapProvider(pref: MapProviderPref): {
  provider: MapProvider | null;
  availableProviders: MapProvider[] | null;
} {
  const [installed, setInstalled] = useState<InstalledMaps | null>(null);

  useEffect(() => {
    let alive = true;
    void probeInstalledMaps().then((next) => {
      if (alive) setInstalled(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const provider = pref !== 'auto' ? pref : installed && resolveMapProvider(pref, installed);
  const availableProviders: MapProvider[] | null = installed
    ? MAP_PROVIDERS.filter((p) => installed[p])
    : null;
  return { provider, availableProviders };
}

/**
 * Open a market in the map app the preference resolves to.
 *
 * One probe answers both halves — which app to use, and whether Google Maps is there to take its
 * own scheme — at the moment of the tap, which is the only moment the answer cannot be stale. It
 * costs one `canOpenURL` call on iOS, on a gesture that is about to leave the app anyway, and
 * none at all on Android.
 */
export async function openInMaps(place: MapPlace, pref: MapProviderPref): Promise<void> {
  const installed = await probeInstalledMaps();
  const url = mapUrl(place, {
    provider: resolveMapProvider(pref, installed),
    platform: Platform.OS,
    installed,
  });
  try {
    await Linking.openURL(url);
  } catch {
    // Nothing useful to say: the provider is the user's own setting, and the web fallback above is
    // already the app's answer to "the chosen one is not installed".
  }
}
