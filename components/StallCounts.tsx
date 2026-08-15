import { StyleSheet, View } from 'react-native';
import { Icon, Text } from './ui';
import type { Market } from '../lib/core/market-logic';
import { useT } from '../lib/store';
import { space } from '../lib/theme';

function count(value: string | undefined): number {
  return parseInt(value ?? '', 10) || 0;
}

/** So a caller can decide whether the section that would hold the counts is worth drawing. */
export function hasStallCounts(market: Market): boolean {
  return count(market.no_of_market_stalls) > 0 || count(market.no_of_food_stalls) > 0;
}

/** Both counts are optional in the dataset and often "0", which is not worth a line. */
export default function StallCounts({ market }: { market: Market }) {
  const t = useT();

  const marketStalls = count(market.no_of_market_stalls);
  const foodStalls = count(market.no_of_food_stalls);
  if (marketStalls === 0 && foodStalls === 0) return null;

  return (
    <View style={styles.counts}>
      {marketStalls > 0 && (
        <View style={styles.item}>
          <Icon name="stall" color="textMuted" />
          <Text variant="subhead" tone="muted">
            <Text variant="callout">{marketStalls}</Text> {t('marketStalls')}
          </Text>
        </View>
      )}
      {foodStalls > 0 && (
        <View style={styles.item}>
          <Icon name="food" color="textMuted" />
          <Text variant="subhead" tone="muted">
            <Text variant="callout">{foodStalls}</Text> {t('foodStalls')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
