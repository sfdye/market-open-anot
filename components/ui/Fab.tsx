import { Pressable, StyleSheet } from 'react-native';
import { space, useTheme } from '../../lib/theme';
import { Icon, type IconName } from './Icon';

// The size a floating action button has settled on everywhere (Material, Todoist).
const SIZE = 56;
const INSET = space.lg;

/** Bottom padding a list needs so its last row clears the button, by the inset on either side. */
export const FAB_CLEARANCE = SIZE + INSET * 2;

export interface FabProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Positions itself: mount it as the last child of a `flex: 1` container on a tab screen. The
 * inset is measured from the tab bar's top edge, which is in the layout flow and has already
 * absorbed the bottom safe-area inset — so a screen outside `(tabs)` would float it over the
 * home indicator, and adding safe-area padding to a tab screen would double-count.
 */
export function Fab({ icon, onPress, accessibilityLabel, testID }: FabProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [
        styles.fab,
        // A filled accent circle already reads as lifted, so dark mode drops the shadow rather
        // than taking theme.shadow's hairline border, which would draw a grey ring on the fill.
        !theme.dark && theme.shadow,
        { backgroundColor: theme.colors.accent, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={32} color="statusOn" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: INSET,
    bottom: INSET,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
