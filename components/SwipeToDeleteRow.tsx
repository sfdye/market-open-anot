import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native-gesture-handler';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Icon, Text } from './ui';
import { space, useTheme } from '../lib/theme';

// Re-exported so a tappable child reaches it through the wrapper that requires it: react-native's
// Pressable runs in its own touch system and survives a fast swipe, firing onPress as the row opens.
// Only a handler in the same gesture arena is cancelled when the pan takes over.
export { Pressable } from 'react-native-gesture-handler';

const ACTION_WIDTH = 92;

// Only one row stands open at a time, as in Mail: leaving a trail of red Delete buttons behind you
// makes it ambiguous which one a tap will hit. The rows are siblings that never see each other, so
// the open one is tracked here at module scope.
let openRow: SwipeableMethods | null = null;

/**
 * Swipe left to reveal a Delete button, tap it to commit — the iOS Mail gesture. The swipe alone
 * does not delete: a list of favourites has no undo, and there is no room for a toast under a tab
 * bar, so the second tap is the confirmation.
 *
 * Screen readers never receive the gesture, so the wrapped row is expected to publish an
 * `accessibilityActions` delete of its own.
 */
export default function SwipeToDeleteRow({
  actionLabel,
  onDelete,
  children,
}: {
  actionLabel: string;
  onDelete: () => void;
  children: ReactNode;
}) {
  const row = useRef<SwipeableMethods | null>(null);

  // A row swiped open and then deleted never fires a close, so it would keep the slot forever.
  useEffect(() => {
    return () => {
      if (openRow === row.current) openRow = null;
    };
  }, []);

  const commit = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  return (
    <ReanimatedSwipeable
      ref={row}
      friction={2}
      overshootRight={false}
      rightThreshold={ACTION_WIDTH / 2}
      onSwipeableWillOpen={() => {
        if (openRow && openRow !== row.current) openRow.close();
        openRow = row.current;
      }}
      onSwipeableWillClose={() => {
        if (openRow === row.current) openRow = null;
      }}
      renderRightActions={(_progress, translation) => (
        <DeleteAction translation={translation} label={actionLabel} onPress={commit} />
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

function DeleteAction({
  translation,
  label,
  onPress,
}: {
  translation: SharedValue<number>;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  // The action sits past the right edge of the row; following the drag by its own width keeps it
  // pinned to the finger instead of sliding in at half speed.
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translation.value + ACTION_WIDTH }],
  }));

  return (
    <Animated.View style={[styles.action, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.colors.statusClosed, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Icon name="trash" size={22} color="statusOn" />
        <Text variant="footnote" tone="onStatus">
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: { width: ACTION_WIDTH },
  button: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs },
});
