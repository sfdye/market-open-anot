import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { MAP_SCHEMES, mapUrl, resolveMapProvider, supportsMapChoice } from './core/map-provider';
import type { InstalledMaps, MapPlace, MapProvider, MapProviderPref } from './core/map-provider';

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
 * Each scheme is only visible to `canOpenURL` while it is listed in `LSApplicationQueriesSchemes`
 * (app.json): an undeclared one reads as "not installed" rather than failing.
 */
export async function probeInstalledMaps(): Promise<InstalledMaps> {
  if (!MAP_CHOICE_SUPPORTED) return { apple: false, google: false };
  const [apple, google] = await Promise.all([
    canOpen(`${MAP_SCHEMES.apple}://`),
    canOpen(`${MAP_SCHEMES.google}://`),
  ]);
  return { apple, google };
}

/**
 * The provider in effect, for the one caller that needs it *before* a tap: the Settings tick, which
 * has to sit on the app that would actually open. `null` until the probe lands, so a stale guess is
 * never drawn — an explicit choice needs no probe and answers in the first frame.
 *
 * Probing on mount rather than in the store keeps the answer fresher than a foreground listener
 * could, and keeps a device capability out of app state: nothing else needs it, because
 * `openInMaps` measures at the moment it matters.
 */
export function useMapProvider(pref: MapProviderPref): MapProvider | null {
  const [installed, setInstalled] = useState<InstalledMaps | null>(null);

  useEffect(() => {
    if (pref !== 'auto') return;
    let alive = true;
    void probeInstalledMaps().then((next) => {
      if (alive) setInstalled(next);
    });
    return () => {
      alive = false;
    };
  }, [pref]);

  if (pref !== 'auto') return pref;
  return installed && resolveMapProvider(pref, installed);
}

/**
 * Open a market in the map app the preference resolves to.
 *
 * One probe answers both halves — which app to use, and whether Google Maps is there to take its
 * own scheme — at the moment of the tap, which is the only moment the answer cannot be stale. It
 * costs two `canOpenURL` calls on iOS, on a gesture that is about to leave the app anyway, and
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
