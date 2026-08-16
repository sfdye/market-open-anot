import { sgToday } from '../core/reminder-schedule';
import type { Market } from '../core/market-logic';
import { translate, type Lang, type StringKey } from '../i18n';

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export interface State {
  /** Storage has been read. Until then there is nothing worth drawing. */
  ready: boolean;
  markets: Market[];
  favorites: string[];
  /** The language in effect, whether the user picked it or the device did. */
  lang: Lang;
  /**
   * The user chose `lang` explicitly, so the device is no longer followed. False means Settings
   * shows the checkmark on "System default" and a phone-language change still moves the app.
   */
  langPinned: boolean;
  /** Bound to `lang` so its identity is stable — components memoise on it. */
  t: Translate;
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
  lang: 'en',
  langPinned: false,
  t: translators.en,
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

export function setState(patch: Partial<State>): void {
  // `t` is derived, never passed in: keeping that here makes it impossible for a caller to
  // change the language and leave the translator behind.
  state = patch.lang && patch.lang !== state.lang
    ? { ...state, ...patch, t: translators[patch.lang] }
    : { ...state, ...patch };
  for (const listener of listeners) listener();
}
