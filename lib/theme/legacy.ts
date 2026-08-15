// The flat, light-only palette the pre-rebuild screens were written against, expressed in
// terms of the new light theme so there is still one source of colour.
//
// Temporary: every screen importing this is rewritten against `useTheme()` later in the
// rebuild. Delete this file once nothing imports it — `colors.link` and `colors.userDot` are
// already gone, being dead and replaced by MapLibre's own user puck respectively.
import { lightColors } from './colors';
import { lightTheme } from './useTheme';

export const colors = {
  green: lightColors.accent,
  greenDark: lightColors.mapFavStroke,
  greenPale: lightColors.accentPale,
  red: lightColors.statusClosed,
  orange: lightColors.statusWarn,
  orangePale: lightColors.noticeBg,
  orangeBorder: lightColors.noticeBorder,
  bg: lightColors.bg,
  surface: lightColors.surface,
  text: lightColors.text,
  textMuted: lightColors.textMuted,
  textFaint: lightColors.textFaint,
  border: lightColors.border,
  borderLight: lightColors.borderLight,
  divider: lightColors.divider,
} as const;

export const shadow = { card: lightTheme.shadow } as const;
