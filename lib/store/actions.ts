import { Alert, AppState, type AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MAX_FAVORITES, toggledFavorites } from '../core/favorites';
import type { MapProvider } from '../core/map-provider';
import { sgInstant, sgToday } from '../core/reminder-schedule';
import type { LangPref } from '../lang';
import { fetchMarketsFromAPI, findMarket } from '../markets';
import { isPermissionGranted, rescheduleAll } from '../notifications';
import * as storage from '../storage';
import { getState, setState, subscribe } from './state';

/**
 * How long cached NEA data is trusted before a background revalidation.
 *
 * The dataset is a planned schedule, not a live feed: quarterly cleaning and other-works closures
 * are published days to weeks ahead, so nothing worth catching arrives with sub-day notice. A daily
 * check lands any new entry with margin, and means one fetch a day per active user — the app is
 * opened once a day to answer "is it open today?". Reminders are unaffected: the schedule rebuilds
 * from the cache on every cold start regardless of when the last fetch ran. A manual refresh is
 * still available in Settings and as pull-to-refresh on Today, for when a user wants it now.
 */
const REVALIDATE_AFTER_MS = 24 * 60 * 60 * 1000;

/** Collapses the burst of updates from adding several markets in a row into one reschedule. */
const RESCHEDULE_DEBOUNCE_MS = 400;

function isStaleByAge(fetchedAt: number | null): boolean {
  return fetchedAt === null || Date.now() - fetchedAt > REVALIDATE_AFTER_MS;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * `'system'` hands the choice back to the device. Without it the first tap in Settings was
 * permanent: `lang` is only read from the device while nothing is stored, so a user who tried
 * the other language had no way back to following their phone.
 */
export function setLang(langPref: LangPref): void {
  setState({ langPref });
  void storage.saveLangPref(langPref);
}

/**
 * Leaves `'auto'` for good: a user whose phone has both apps has no other way to say "not that one".
 */
export function setMapProvider(mapProviderPref: MapProvider): void {
  setState({ mapProviderPref });
  void storage.saveMapProvider(mapProviderPref);
}

function persistFavorites(favorites: string[]): void {
  setState({ favorites });
  void storage.saveFavorites(favorites);
}

/**
 * The one door for a star tap, refusal included: an add past `MAX_FAVORITES` explains itself here
 * rather than at the call site, so a new star cannot forget to. A dead tap is the outcome to avoid
 * — the audience is seniors, and a star that stays hollow with no explanation reads as a broken app
 * rather than a limit.
 */
export function toggleFavorite(name: string): void {
  const next = toggledFavorites(getState().favorites, name);
  if (next) {
    void Haptics.selectionAsync();
    persistFavorites(next);
    return;
  }
  const { t } = getState();
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  Alert.alert(t('favLimitTitle'), t('favLimitBody', { max: MAX_FAVORITES }));
}

export function removeFavorite(name: string): void {
  persistFavorites(getState().favorites.filter((f) => f !== name));
}

export function removeAllFavorites(): void {
  persistFavorites([]);
}

export function setRemindersEnabled(remindersEnabled: boolean): void {
  setState({ remindersEnabled });
  void storage.saveRemindersEnabled(remindersEnabled);
}

export function dismissReminderCard(): void {
  setState({ reminderCardDismissed: true });
  void storage.saveReminderCardDismissed();
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function load(): Promise<void> {
  const fresh = await fetchMarketsFromAPI();
  if (!fresh) {
    setState({ stale: true });
    return;
  }

  // A market can leave the dataset; a favourite pointing at one would be undeletable.
  const kept = getState().favorites.filter((name) => findMarket(fresh, name) !== null);
  setState({ markets: fresh, stale: false, fetchedAt: Date.now() });
  if (kept.length !== getState().favorites.length) persistFavorites(kept);
}

/** Pull-to-refresh and the Settings "refresh now" row. Always fetches, however fresh. */
export async function refresh(): Promise<void> {
  if (getState().refreshing) return;
  setState({ refreshing: true });
  try {
    await load();
  } finally {
    setState({ refreshing: false });
  }
}

async function revalidateIfStale(): Promise<void> {
  if (isStaleByAge(getState().fetchedAt)) await load();
}

// ---------------------------------------------------------------------------
// Bootstrap and the long-lived effects
// ---------------------------------------------------------------------------

let midnightTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Advance `today` at Singapore midnight, not just on foreground: a phone left on the Today
 * screen overnight would otherwise still be showing yesterday's answer in the morning.
 */
function armMidnightTimer(): void {
  clearTimeout(midnightTimer);
  const today = sgToday();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const delay = Math.max(1000, sgInstant(tomorrow, 0).getTime() - Date.now());
  midnightTimer = setTimeout(() => {
    setState({ today: sgToday() });
    armMidnightTimer();
  }, delay);
}

/**
 * Keep the on-device schedule in step with favourites, language and the dataset. A store
 * subscriber rather than an effect, so it still runs when no screen is mounted.
 */
let lastScheduleKey: string | null = null;
let rescheduleTimer: ReturnType<typeof setTimeout> | undefined;

function watchSchedule(): void {
  subscribe(() => {
    const { ready, markets, favorites, lang, remindersEnabled } = getState();
    if (!ready || markets.length === 0) return;

    const key = `${lang}|${favorites.join(' ')}|${markets.length}|${remindersEnabled}`;
    if (key === lastScheduleKey) return;
    lastScheduleKey = key;

    clearTimeout(rescheduleTimer);
    rescheduleTimer = setTimeout(() => {
      void (async () => {
        if (remindersEnabled && (await isPermissionGranted())) {
          await rescheduleAll(favorites, markets, lang);
        }
      })();
    }, RESCHEDULE_DEBOUNCE_MS);
  });
}

let started = false;

/**
 * Read storage, show the app, then revalidate. Called once from the root layout; safe to call
 * twice because Fast Refresh and StrictMode both will.
 */
export function initStore(): void {
  if (started) return;
  started = true;

  watchSchedule();
  armMidnightTimer();

  AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next !== 'active') return;
    // Re-passing the preference re-resolves it: following the device means following it when the
    // user changes it, not only at first launch. Android recreates the activity on a locale
    // change but the JS context can survive it.
    setState({ today: sgToday(), langPref: getState().langPref });
    armMidnightTimer();
    void revalidateIfStale();
  });

  void (async () => {
    const [
      langPref,
      mapProviderPref,
      favorites,
      remindersEnabled,
      cached,
      fetchedAt,
      cardDismissed,
    ] = await Promise.all([
      storage.loadLangPref(),
      storage.loadMapProvider(),
      storage.loadFavorites(),
      storage.loadRemindersEnabled(),
      storage.loadCachedMarkets(),
      storage.loadFetchedAt(),
      storage.loadReminderCardDismissed(),
    ]);

    setState({
      langPref,
      mapProviderPref,
      favorites,
      remindersEnabled,
      reminderCardDismissed: cardDismissed,
      fetchedAt,
      today: sgToday(),
      ...(cached ? { markets: cached } : {}),
      ready: true,
    });

    // Hydrate first so the splash lifts on cached data; only then go to the network.
    if (cached) {
      await revalidateIfStale();
    } else {
      await load();
    }
  })();
}
