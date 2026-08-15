import type { TextStyle } from 'react-native';

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = { card: 12, pill: 8, banner: 10, thumb: 8 } as const;

/** Anything a finger has to hit. */
export const HIT_SIZE = 44;

// Sizes are unscaled; every Text scales them with the system font setting. Nothing
// content-bearing goes below 15 — the audience is seniors — and 13 is reserved for
// attribution and metadata.
//
// lineHeight is set only where a real paragraph needs it: React Native scales a numeric
// lineHeight inconsistently across platforms, so a fixed one clips text at large font sizes.
export const typeScale = {
  display: { fontSize: 28, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700' },
  headline: { fontSize: 19, fontWeight: '600' },
  body: { fontSize: 17, fontWeight: '400' },
  bodyStrong: { fontSize: 17, fontWeight: '600' },
  callout: { fontSize: 16, fontWeight: '600' },
  subhead: { fontSize: 15, fontWeight: '400' },
  footnote: { fontSize: 13, fontWeight: '400' },
  overline: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typeScale;

/**
 * Font-scale threshold past which rows stop trying to fit a name and a status pill on one
 * line and stack instead. Above roughly 1.4 the pill wins the squeeze and the name truncates
 * to nothing, which is exactly backwards.
 */
export const REFLOW_FONT_SCALE = 1.4;

/** Caps for text that shares a fixed-height native container. Never cap body copy. */
export const fontCap = { pill: 1.6, tabLabel: 1.4 } as const;
