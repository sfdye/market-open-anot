import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HIT_SIZE, space, useTheme } from '../../lib/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface RowProps {
  label: string;
  /** Second line under the label, for the things a settings row has to explain. */
  detail?: string;
  icon?: IconName;
  /** Right-hand side: a Switch, a value, a checkmark. */
  accessory?: ReactNode;
  /** Show a chevron and treat the row as navigation. */
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  testID?: string;
  /** Last row in its group: no divider. */
  last?: boolean;
}

export function Row({
  label,
  detail,
  icon,
  accessory,
  chevron,
  destructive,
  onPress,
  accessibilityHint,
  testID,
  last,
}: RowProps) {
  const theme = useTheme();
  const tone = destructive ? 'danger' : 'default';

  const body = (
    <View
      style={[
        styles.row,
        {
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderLight,
        },
      ]}
    >
      {!!icon && <Icon name={icon} color={destructive ? 'danger' : 'textMuted'} />}
      <View style={styles.labels}>
        <Text variant="body" tone={tone}>
          {label}
        </Text>
        {!!detail && (
          <Text variant="footnote" tone="muted">
            {detail}
          </Text>
        )}
      </View>
      {accessory}
      {!!chevron && <Icon name="chevron" size={18} color="textFaint" />}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.borderLight : 'transparent',
      })}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // minHeight rather than height: the row has to grow with the system font size.
  row: {
    minHeight: HIT_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  labels: { flex: 1, gap: 2 },
});
