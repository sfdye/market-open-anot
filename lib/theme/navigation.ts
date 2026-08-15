import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';
import { darkTheme, lightTheme, type Theme } from './useTheme';

// One provider at the root drives everything the app does not draw itself: native headers and
// their large titles, the search bar chrome in the add-markets modal, the tab bar, and the
// background behind a screen during a push transition. Without it those stay in react-
// navigation's own blue-and-grey and the app looks like two products stitched together.
//
// expo-router 57 vendors react-navigation, so these come from expo-router rather than from an
// @react-navigation/* package — there is none in the tree.
function build(theme: Theme, base: NavigationTheme): NavigationTheme {
  return {
    ...base,
    dark: theme.dark,
    colors: {
      ...base.colors,
      primary: theme.colors.accent,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };
}

export const lightNavigationTheme = build(lightTheme, DefaultTheme);
export const darkNavigationTheme = build(darkTheme, DarkTheme);

export function navigationTheme(theme: Theme): NavigationTheme {
  return theme.dark ? darkNavigationTheme : lightNavigationTheme;
}
