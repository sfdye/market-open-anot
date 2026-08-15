import { StyleSheet, View } from 'react-native';
import { Text } from './ui';
import type { StatusTone } from '../lib/status';
import { fontCap, radius, space, useTheme } from '../lib/theme';

const FILL: Record<StatusTone, 'statusOpen' | 'statusWarn' | 'statusClosed'> = {
  open: 'statusOpen',
  warning: 'statusWarn',
  closed: 'statusClosed',
};

/**
 * The pill is one of the two places that caps font scaling: it sits next to a market name in a
 * row, and past ~1.6× it would push the name out entirely. The row reflows to a column first.
 */
export default function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.pill, { backgroundColor: theme.colors[FILL[tone]] }]}>
      <Text
        variant="callout"
        tone="onStatus"
        maxFontSizeMultiplier={fontCap.pill}
        style={styles.label}
      >
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
  label: { textTransform: 'uppercase', textAlign: 'center' },
});
