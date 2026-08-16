import { getLocales } from 'expo-localization';
import type { Lang } from './i18n';

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
      if (locale.languageCode === 'zh') return 'zh';
      if (locale.languageCode === 'en') return 'en';
    }
  } catch {
    // The background task calls this from a headless launch, where a failure would be invisible
    // and would cost that day's reminder top-up. English is the safer of two bad answers.
  }
  return 'en';
}
