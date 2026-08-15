// Two palettes with identical keys. The light one is the web app's original green-on-grey, so
// the two releases stay recognisably the same product; the dark one is built on iOS's system
// greys rather than inverted light values, which would read as muddy.
//
// The status fills are deliberately the *same* in both schemes: mid-tone fills with white text
// have enough contrast on #f5f5f5 and on black, and open/closed is the one thing a user must
// never have to re-learn when the sun goes down.
export interface Palette {
  /** Screen background, behind cards. */
  bg: string;
  /** Cards and rows sitting on `bg`. */
  surface: string;
  /** Cards sitting on `surface` — in light both are white, in dark it steps up a grey. */
  surfaceRaised: string;

  text: string;
  textMuted: string;
  textFaint: string;

  border: string;
  borderLight: string;
  divider: string;

  /** Brand green, and the two supporting tones for tinted fills and outlines. */
  accent: string;
  accentPale: string;
  accentBorder: string;

  /** Destructive text and icons. Never a fill. */
  danger: string;

  statusOpen: string;
  statusWarn: string;
  statusClosed: string;
  /** Text and icons drawn on any of the status fills. */
  statusOn: string;

  noticeBg: string;
  noticeBorder: string;

  mapBg: string;
  mapPinFill: string;
  mapPinStroke: string;
  mapFavFill: string;
  mapFavStroke: string;
}

export const lightColors: Palette = {
  bg: '#f5f5f5',
  surface: '#ffffff',
  surfaceRaised: '#ffffff',

  text: '#1a1a1a',
  textMuted: '#666666',
  textFaint: '#999999',

  border: '#e0e0e0',
  borderLight: '#eeeeee',
  divider: '#dddddd',

  accent: '#2e7d32',
  accentPale: '#e8f5e9',
  accentBorder: '#2e7d32',

  danger: '#c62828',

  statusOpen: '#2e7d32',
  statusWarn: '#e65100',
  statusClosed: '#c62828',
  statusOn: '#ffffff',

  noticeBg: '#fff3e0',
  noticeBorder: '#ffcc80',

  mapBg: '#f5f5f5',
  mapPinFill: '#ffffff',
  mapPinStroke: '#666666',
  mapFavFill: '#2e7d32',
  mapFavStroke: '#1b5e20',
};

export const darkColors: Palette = {
  bg: '#000000',
  surface: '#1c1c1e',
  surfaceRaised: '#2c2c2e',

  text: '#ffffff',
  textMuted: '#a1a1a6',
  textFaint: '#8e8e93',

  border: '#38383a',
  borderLight: '#2c2c2e',
  divider: '#48484a',

  // The brand green at #2e7d32 fails contrast as text on black, so the accent lightens; the
  // pale tint becomes a dark wash of the same hue.
  accent: '#66bb6a',
  accentPale: '#16301b',
  accentBorder: '#4caf50',

  danger: '#ef5350',

  statusOpen: '#2e7d32',
  statusWarn: '#e65100',
  statusClosed: '#c62828',
  statusOn: '#ffffff',

  noticeBg: '#3a2410',
  noticeBorder: '#8a5a1e',

  mapBg: '#1c1c1e',
  mapPinFill: '#1c1c1e',
  mapPinStroke: '#a1a1a6',
  mapFavFill: '#4caf50',
  mapFavStroke: '#1b5e20',
};
