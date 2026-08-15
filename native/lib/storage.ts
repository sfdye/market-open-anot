import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Market } from './shared';
import type { Lang } from './i18n';

// Same key names as the web app's localStorage, so the shapes stay recognisable.
const KEYS = {
  favorites: 'moa_favorites',
  data: 'moa_data',
  fetched: 'moa_fetched',
  lang: 'moa_lang',
  reminders: 'moa_reminders_enabled',
  reminderCardDismissed: 'moa_reminder_card_dismissed',
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
  return Array.isArray(data) && data.length > 0 ? data : null;
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

export async function loadLang(): Promise<Lang | null> {
  const raw = await AsyncStorage.getItem(KEYS.lang);
  return raw === 'en' || raw === 'zh' ? raw : null;
}

export async function saveLang(lang: Lang): Promise<void> {
  await AsyncStorage.setItem(KEYS.lang, lang);
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
