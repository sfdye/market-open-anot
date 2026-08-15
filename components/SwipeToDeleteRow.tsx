import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Icon, Text } from './ui';
import { space, useTheme } from '../lib/theme';

const ACTION_WIDTH = 92;

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
  const commit = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  return (
    <ReanimatedSwipeable
      friction={2}
      overshootRight={false}
      rightThreshold={ACTION_WIDTH / 2}
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
