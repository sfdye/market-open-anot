import { getLocales } from 'expo-localization';
import { isLang, type Lang } from './core/market-logic';

/**
 * What the user chose, which is not the same as the language in effect. `'system'` means they
 * made no choice and the device keeps deciding — including when they change it later.
 */
export type LangPref = Lang | 'system';

/**
 * The device's preferred language: the first *supported* entry in its ordered preference list.
 * Reading only `getLocales()[0]` meant a phone set to Malay first and Chinese second landed on
 * English. Any Chinese variant maps to `zh` — the strings are Simplified, which still reads far
 * better for a zh-Hant user than English does.
 *
 * Its own module rather than part of the store: `background.ts` needs it in a headless task and
 * must not drag the store, AppState and the notification layer in with it.
 */
export function deviceLang(): Lang {
  try {
    for (const locale of getLocales()) {
      if (isLang(locale.languageCode)) return locale.languageCode;
    }
  } catch {
    // The background task calls this from a headless launch, where a failure would be invisible
    // and would cost that day's reminder top-up. English is the safer of two bad answers.
  }
  return 'en';
}

/**
 * The single place a preference becomes a language. Every reader used to do this itself, and the
 * one that got it wrong — `?? 'en'` in the background task — sent English reminders to phones
 * running the app in Chinese.
 */
export function resolveLang(pref: LangPref): Lang {
  return pref === 'system' ? deviceLang() : pref;
}
