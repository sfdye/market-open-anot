import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLang, normalizeMarkets, type Market } from './core/market-logic';
import type { LangPref } from './lang';

// Namespaced `poa_`. Nothing migrates the `moa_` keys these were renamed from at the rebrand: the
// bundle identifier changed with them, so an install holding the old keys is a different app with
// a container this one cannot see.
const KEYS = {
  favorites: 'poa_favorites',
  data: 'poa_data',
  fetched: 'poa_fetched',
  lang: 'poa_lang',
  reminders: 'poa_reminders_enabled',
  reminderCardDismissed: 'poa_reminder_card_dismissed',
} as const;

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
