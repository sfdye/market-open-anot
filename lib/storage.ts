import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLang, normalizeMarkets, type Market } from './core/market-logic';
import { isMapProvider, type MapProvider, type MapProviderPref } from './core/map-provider';
import { parseMapView, type MapView } from './core/map-view';
import { isThemeScheme, type ThemePref } from './core/theme-pref';
import type { LangPref } from './lang';

// Namespaced `oa_`. Nothing migrates the `moa_`/`poa_` keys these were renamed from across two
// rebrands: the bundle identifier changed with them each time, so an install holding the old keys
// is a different app with a container this one cannot see.
const KEYS = {
  favorites: 'oa_favorites',
  data: 'oa_data',
  fetched: 'oa_fetched',
  lang: 'oa_lang',
  mapProvider: 'oa_map_provider',
  mapView: 'oa_map_view',
  reminders: 'oa_reminders_enabled',
  reminderCardDismissed: 'oa_reminder_card_dismissed',
  theme: 'oa_theme',
} as const;

// Region events can arrive close together; queue writes so an older view can never finish after a
// newer one and become the next launch's starting point.
let mapViewWrite = Promise.resolve();

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadFavorites(): Promise<string[]> {
  const favs = await readJSON<string[]>(KEYS.favorites, []);
  return Array.isArray(favs) ? favs.filter((f) => typeof f === 'string') : [];
}

export async function saveFavorites(favorites: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.favorites, JSON.stringify(favorites));
}

export async function loadCachedMarkets(): Promise<Market[] | null> {
  const data = await readJSON<Market[] | null>(KEYS.data, null);
  if (!Array.isArray(data) || data.length === 0) return null;
  // Normalised on the way out as well as in: an install that cached the dataset before this
  // existed still has the raw records on disk.
  return normalizeMarkets(data);
}

export async function saveCachedMarkets(markets: Market[]): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.data, JSON.stringify(markets)],
    [KEYS.fetched, String(Date.now())],
  ]);
}

export async function loadFetchedAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEYS.fetched);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads the preference, never a bare `null`: the key's absence *is* `'system'`, and returning it
 * that way is what stops a caller inventing its own default. One did, with `?? 'en'`.
 */
export async function loadLangPref(): Promise<LangPref> {
  const raw = await AsyncStorage.getItem(KEYS.lang);
  return isLang(raw) ? raw : 'system';
}

/**
 * Following the device again is stored as the *absence* of the key — the same state a fresh
 * install is in — rather than as a sentinel value.
 */
export async function saveLangPref(pref: LangPref): Promise<void> {
  if (pref === 'system') await AsyncStorage.removeItem(KEYS.lang);
  else await AsyncStorage.setItem(KEYS.lang, pref);
}

/** A missing key is `'auto'` — the installed apps decide — as `loadLangPref` returns `'system'`. */
export async function loadMapProvider(): Promise<MapProviderPref> {
  const raw = await AsyncStorage.getItem(KEYS.mapProvider);
  return isMapProvider(raw) ? raw : 'auto';
}

export async function saveMapProvider(provider: MapProvider): Promise<void> {
  await AsyncStorage.setItem(KEYS.mapProvider, provider);
}

export async function loadRemindersEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.reminders)) === '1';
}

export async function saveRemindersEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.reminders, enabled ? '1' : '0');
}

export async function loadReminderCardDismissed(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.reminderCardDismissed)) === 'true';
}

export async function saveReminderCardDismissed(): Promise<void> {
  await AsyncStorage.setItem(KEYS.reminderCardDismissed, 'true');
}

export async function loadMapView(): Promise<MapView | null> {
  const raw = await readJSON<unknown>(KEYS.mapView, null);
  const view = parseMapView(raw);
  return view;
}

export async function saveMapView(view: MapView): Promise<void> {
  const value = JSON.stringify(view);
  mapViewWrite = mapViewWrite
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(KEYS.mapView, value));
  await mapViewWrite;
}

/** A missing key is `'system'` — the device decides — as `loadLangPref` returns `'system'`. */
export async function loadThemePref(): Promise<ThemePref> {
  const raw = await AsyncStorage.getItem(KEYS.theme);
  return isThemeScheme(raw) ? raw : 'system';
}

/**
 * Following the device again is stored as the *absence* of the key — the same state a fresh
 * install is in — rather than as a sentinel value, matching `saveLangPref`.
 */
export async function saveThemePref(pref: ThemePref): Promise<void> {
  if (pref === 'system') await AsyncStorage.removeItem(KEYS.theme);
  else await AsyncStorage.setItem(KEYS.theme, pref);
}
