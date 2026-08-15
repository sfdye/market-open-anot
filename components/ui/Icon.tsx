import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { type Palette, useTheme } from '../../lib/theme';

// Semantic names, so a screen asks for "the favourite icon" and this file decides what that
// looks like. Replaces the emoji the ported web app used as iconography (📍🛒🍜🔔🔕★☆☰🗺️),
// which rendered at the mercy of the system emoji font and could not take a colour.
//
// Ionicons ships with @expo/vector-icons and has a matched filled/outline pair for everything
// here, which is what tab bars need. expo-symbols would be sharper on iOS but has no Android
// equivalent, i.e. two icon sets to keep in step.
const GLYPHS = {
  today: 'today',
  todayOutline: 'today-outline',
  map: 'map',
  mapOutline: 'map-outline',
  settings: 'settings',
  settingsOutline: 'settings-outline',

  favorite: 'star',
  favoriteOutline: 'star-outline',

  add: 'add',
  close: 'close',
  check: 'checkmark',
  chevron: 'chevron-forward',
  trash: 'trash-outline',
  refresh: 'refresh',
  search: 'search',
  external: 'open-outline',
  locate: 'locate',

  location: 'location-outline',
  stall: 'basket-outline',
  food: 'restaurant-outline',
  bell: 'notifications',
  bellOff: 'notifications-off',
  warning: 'warning',
  info: 'information-circle-outline',
  cleaning: 'water-outline',
} as const satisfies Record<string, ComponentProps<typeof Ionicons>['name']>;

export type IconName = keyof typeof GLYPHS;

export interface IconProps {
  name: IconName;
  size?: number;
  /** A palette key, or an explicit colour for cases like text drawn on a status fill. */
  color?: keyof Palette | (string & {});
  style?: ComponentProps<typeof Ionicons>['style'];
}

export function Icon({ name, size = 20, color = 'text', style }: IconProps) {
  const theme = useTheme();
  const resolved = color in theme.colors ? theme.colors[color as keyof Palette] : (color as string);
  return <Ionicons name={GLYPHS[name]} size={size} color={resolved} style={style} />;
}
