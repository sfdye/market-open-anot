import { useMemo } from 'react';
import { StyleSheet, useColorScheme, type ViewStyle } from 'react-native';
import { darkColors, lightColors, type Palette } from './colors';

export interface Theme {
  scheme: 'light' | 'dark';
  dark: boolean;
  colors: Palette;
  /**
   * Cards lift off the background with a shadow in light. In dark a shadow is invisible
   * against black, so elevation is expressed as a lighter surface plus a hairline border.
   */
  shadow: ViewStyle;
}

export const lightTheme: Theme = {
  scheme: 'light',
  dark: false,
  colors: lightColors,
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const darkTheme: Theme = {
  scheme: 'dark',
  dark: true,
  colors: darkColors,
  shadow: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkColors.border,
  },
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/**
 * Build a stylesheet from the active theme.
 *
 * The factory must be declared at module scope: it is a memo dependency, so one recreated per
 * render would rebuild every StyleSheet on every render.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
