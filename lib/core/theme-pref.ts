/**
 * Light / dark / follow-system, mirroring the LangPref pattern: `'system'` is the absence of a
 * choice, so the device keeps deciding — including when the user changes it later.
 *
 * Pure so resolution can be unit-tested: the device layer (`lib/theme/useTheme.ts`) owns the one
 * thing this cannot see — `useColorScheme()` — and passes it in.
 */

export const THEME_SCHEMES = ['light', 'dark'] as const;

export type ThemeScheme = (typeof THEME_SCHEMES)[number];

export type ThemePref = ThemeScheme | 'system';

/** Membership of the supported set, never `=== 'light' || === 'dark'` at a call site. */
export function isThemeScheme(value: unknown): value is ThemeScheme {
  return typeof value === 'string' && (THEME_SCHEMES as readonly string[]).includes(value);
}

/**
 * The single place a preference becomes a scheme. `'system'` defers to the device; a `null` or
 * `undefined` device scheme (which `useColorScheme` can return at startup or in headless contexts)
 * falls back to light rather than rendering nothing.
 */
export function resolveTheme(pref: ThemePref, deviceScheme: ThemeScheme | null | undefined): ThemeScheme {
  if (pref !== 'system') return pref;
  return deviceScheme === 'dark' ? 'dark' : 'light';
}
