import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Icon, Text } from './ui';
import { getUpcomingClosures, type Market } from '../lib/core/market-logic';
import { formatDate } from '../lib/date';
import { closureReasonShort } from '../lib/status';
import { useLang, useT, useToday } from '../lib/store';
import { radius, space, useTheme } from '../lib/theme';

const HORIZON_DAYS = 30;
const COLLAPSED_COUNT = 3;

/** The next month of closures. Three are enough to plan around; the rest are one tap away. */
export default function UpcomingClosures({ market }: { market: Market }) {
  const theme = useTheme();
  const today = useToday();
  const lang = useLang();
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const closures = useMemo(
    () => getUpcomingClosures(market, HORIZON_DAYS, today),
    [market, today]
  );
  if (closures.length === 0) return null;

  const shown = expanded ? closures : closures.slice(0, COLLAPSED_COUNT);

  return (
    // The card is what animates, so expanding the list grows the card rather than snapping it.
    <Animated.View
      layout={LinearTransition}
      style={[styles.section, { backgroundColor: theme.colors.surface }, theme.shadow]}
    >
      <Text variant="overline" tone="muted">
        {t('upcoming').toUpperCase()}
      </Text>
      {shown.map((closure) => (
        <View
          key={closure.date.getTime()}
          style={[styles.row, { borderTopColor: theme.colors.borderLight }]}
        >
          <Text variant="subhead">{formatDate(closure.date, lang)}</Text>
          <Text variant="subhead" tone="muted" style={styles.reason}>
            {closureReasonShort(closure.reason, closure.remarks, t)}
          </Text>
        </View>
      ))}
      {closures.length > COLLAPSED_COUNT && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.more}
        >
          <Text variant="callout" tone="accent">
            {expanded ? t('showLess') : t('showMore')}
          </Text>
          <Icon
            name="chevron"
            size={16}
            color="accent"
            style={{ transform: [{ rotate: expanded ? '-90deg' : '90deg' }] }}
          />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, padding: space.lg, borderRadius: radius.card },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reason: { flexShrink: 1, textAlign: 'right' },
  more: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.sm },
});
