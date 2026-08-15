import { StyleSheet, View } from 'react-native';
import { Text } from './ui';
import type { MarketStatus } from '../lib/core/market-logic';
import { formatDate } from '../lib/date';
import { reasonText, statusHeadline, statusTone } from '../lib/status';
import { useLang, useT } from '../lib/store';
import { radius, space, useTheme } from '../lib/theme';

const FILL = {
  open: 'statusOpen',
  warning: 'statusWarn',
  closed: 'statusClosed',
} as const;

/** The one thing the detail screen has to answer: is it open today, and if not, why. */
export default function StatusBanner({
  status,
  nextOpen,
}: {
  status: MarketStatus;
  nextOpen: Date | null;
}) {
  const theme = useTheme();
  const lang = useLang();
  const t = useT();

  const tone = statusTone(status);
  const reason = reasonText(status, t);

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors[FILL[tone]] }]}>
      <Text variant="title" tone="onStatus" style={styles.centered}>
        {statusHeadline(tone, t)}
      </Text>
      {!!reason && (
        <Text variant="subhead" tone="onStatus" style={styles.centered}>
          {reason}
        </Text>
      )}
      {!!nextOpen && (
        <Text variant="subhead" tone="onStatus" style={[styles.centered, styles.dim]}>
          {t('opensAgain')} {formatDate(nextOpen, lang)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { gap: space.xs, padding: space.lg, borderRadius: radius.banner },
  centered: { textAlign: 'center' },
  dim: { opacity: 0.9 },
});
