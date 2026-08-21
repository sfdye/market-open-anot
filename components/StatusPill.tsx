import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './ui';
import type { StatusTone } from '../lib/status';
import { radius, space, useTheme } from '../lib/theme';

const FILL: Record<StatusTone, 'statusOpen' | 'statusWarn' | 'statusClosed'> = {
  open: 'statusOpen',
  warning: 'statusWarn',
  closed: 'statusClosed',
};

/**
 * The pill grows freely with Dynamic Type. Today uses the compact variant at accessibility sizes
 * so the daily status remains alongside the market rather than becoming its own row.
 */
export default function StatusPill({
  tone,
  label,
  compact = false,
  style,
}: {
  tone: StatusTone;
  label: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.pill, { backgroundColor: theme.colors[FILL[tone]] }, style]}>
      <Text variant={compact ? 'footnote' : 'callout'} tone="onStatus" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  label: { fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },
});
