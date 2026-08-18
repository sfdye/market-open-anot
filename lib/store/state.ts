import { sgToday } from '../core/reminder-schedule';
import type { Market } from '../core/market-logic';
import type { MapProviderPref } from '../core/map-provider';
import { translate, type Lang, type StringKey } from '../i18n';
import { resolveLang, type LangPref } from '../lang';

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export interface State {
  /** Storage has been read. Until then there is nothing worth drawing. */
  ready: boolean;
  markets: Market[];
  favorites: string[];
  /** What the user chose. `'system'` means the device decides, and keeps deciding. */
  langPref: LangPref;
  /** Derived from `langPref`: the language actually in effect. */
  lang: Lang;
  /** Bound to `lang` so its identity is stable — components memoise on it. */
  t: Translate;
  /**
   * Which map app an address opens in. The *choice*, like `langPref`: `'auto'` leaves it to the
   * installed apps, and `lib/maps.ts` resolves that where it can measure them.
   */
  mapProviderPref: MapProviderPref;
  /** Today in Singapore. Advances on foreground and at SGT midnight. */
  today: Date;
  remindersEnabled: boolean;
  reminderCardDismissed: boolean;
  /** The last fetch failed and what is on screen came from the cache. */
  stale: boolean;
  /** A user-initiated refresh is in flight, for the pull-to-refresh spinner. */
  refreshing: boolean;
  fetchedAt: number | null;
}

// One translator per language rather than a closure per render, so `t` is a stable reference.
const translators: Record<Lang, Translate> = {
  en: (key, vars) => translate('en', key, vars),
  zh: (key, vars) => translate('zh', key, vars),
};

let state: State = {
  ready: false,
  markets: [],
  favorites: [],
  langPref: 'system',
  lang: 'en',
  t: translators.en,
  mapProviderPref: 'auto',
  today: sgToday(),
  remindersEnabled: false,
  // Assume dismissed until storage says otherwise, so the prompt never flashes in.
  reminderCardDismissed: true,
  stale: false,
  refreshing: false,
  fetchedAt: null,
};

const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * `lang` and `t` are derived here and are not in the patch type, so no caller can change the
 * preference and leave the language — or the translator — behind. Passing `langPref` re-resolves
 * even when it has not changed, which is how a foreground picks up a new device language.
 */
export function setState(patch: Partial<Omit<State, 'lang' | 't'>>): void {
  const lang = patch.langPref ? resolveLang(patch.langPref) : state.lang;
  state = { ...state, ...patch, lang, t: lang === state.lang ? state.t : translators[lang] };
  for (const listener of listeners) listener();
}
