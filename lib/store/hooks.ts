import { useSyncExternalStore } from 'react';
import type { Market } from '../core/market-logic';
import type { MapProviderPref } from '../core/map-provider';
import type { Lang } from '../i18n';
import type { LangPref } from '../lang';
import { getState, subscribe, type State, type Translate } from './state';

// Every hook returns either a primitive or a reference that only changes when that slice does,
// so a component re-renders for its own data and nothing else. useSyncExternalStore is a React
// built-in; the alternative was three or four contexts and the same re-render problem.
function useSelector<T>(select: (state: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(getState()));
}

export function useReady(): boolean {
  return useSelector((s) => s.ready);
}

export function useMarkets(): Market[] {
  return useSelector((s) => s.markets);
}

export function useFavorites(): string[] {
  return useSelector((s) => s.favorites);
}

export function useLang(): Lang {
  return useSelector((s) => s.lang);
}

/** The *choice*, for Settings. Symmetric with `setLang`, so a row compares one value. */
export function useLangPref(): LangPref {
  return useSelector((s) => s.langPref);
}

/** The map app *choice*, symmetric with `useLangPref`. `lib/maps.ts` turns it into an app. */
export function useMapProviderPref(): MapProviderPref {
  return useSelector((s) => s.mapProviderPref);
}

export function useT(): Translate {
  return useSelector((s) => s.t);
}

export function useToday(): Date {
  return useSelector((s) => s.today);
}

export function useRemindersEnabled(): boolean {
  return useSelector((s) => s.remindersEnabled);
}

export function useReminderCardDismissed(): boolean {
  return useSelector((s) => s.reminderCardDismissed);
}

export function useStale(): boolean {
  return useSelector((s) => s.stale);
}

export function useRefreshing(): boolean {
  return useSelector((s) => s.refreshing);
}

export function useFetchedAt(): number | null {
  return useSelector((s) => s.fetchedAt);
}

/**
 * The reason the store exists. A row subscribing to its own boolean re-renders on its own star
 * tap; subscribing to the favourites array would re-render all 123 rows of the picker.
 */
export function useIsFavorite(name: string): boolean {
  return useSelector((s) => s.favorites.includes(name));
}

/** A market by NEA name, or null once it has left the dataset. */
export function useMarket(name: string): Market | null {
  return useSelector((s) => s.markets.find((m) => m.name === name) ?? null);
}
