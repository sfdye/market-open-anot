import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getMarketStatus,
  getNextOpenDate,
  getUpcomingClosures,
  parseMarketName,
  type ClosureReason,
  type Market,
  type MarketStatus,
} from '../lib/core/market-logic';
import { decodeEntities, getDisplayName, getNextCleaningDate } from '../lib/markets';
import { formatDate } from '../lib/date';
import { colors, radius, shadow } from '../lib/theme';
import { useLang, useT, useToday, type Translate } from '../lib/store';

const UPCOMING_SHOWN = 3;

export default function MarketCard({
  market,
  editing,
  onRemove,
}: {
  market: Market;
  editing: boolean;
  onRemove: () => void;
}) {
  const lang = useLang();
  const today = useToday();
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const view = useMemo(() => {
    const status = getMarketStatus(market, today);
    const upcoming = getUpcomingClosures(market, 30, today);
    const nextOpen = status.status === 'closed' ? getNextOpenDate(market, today) : null;
    const nextCleaning =
      status.status === 'closed' ? null : getNextCleaningDate(market, today);
    return {
      status,
      upcoming,
      nextOpen,
      nextCleaning,
      name: getDisplayName(parseMarketName(market.name), lang),
      marketStalls: parseInt(market.no_of_market_stalls ?? '', 10) || 0,
      foodStalls: parseInt(market.no_of_food_stalls ?? '', 10) || 0,
    };
  }, [market, today, lang]);

  const { status, upcoming, nextOpen, nextCleaning } = view;
  const tone = status.status === 'open' ? 'open' : status.status === 'warning' ? 'warning' : 'closed';

  const statusLabel = tone === 'open' ? t('open') : tone === 'warning' ? t('warning') : t('closed');

  let nextText = '';
  if (tone === 'closed' && nextOpen) {
    nextText = `${t('opensAgain')} ${formatDate(nextOpen, lang)}`;
  } else if (tone !== 'closed' && nextCleaning) {
    nextText = `${t('nextClosure')} ${formatDate(nextCleaning, lang)}`;
  }

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.summary}
        onPress={() => !editing && setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${view.name}. ${statusLabel}. ${nextText}`}
      >
        {editing && (
          <Pressable
            onPress={onRemove}
            hitSlop={10}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('removeFav')}
          >
            <Text style={styles.removeBtnText}>−</Text>
          </Pressable>
        )}
        {!!market.photourl && (
          <Image source={{ uri: market.photourl }} style={styles.thumb} accessibilityIgnoresInvertColors />
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {view.name}
          </Text>
          {!!nextText && <Text style={styles.next}>{nextText}</Text>}
        </View>
        <View style={[styles.pill, styles[`pill_${tone}`]]}>
          <Text style={[styles.pillText, tone === 'warning' && styles.pillTextWarning]}>
            {statusLabel}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.details}>
          {(!!market.address_myenv || view.marketStalls > 0 || view.foodStalls > 0) && (
            <View style={styles.section}>
              {!!market.address_myenv && (
                <Text style={styles.address}>📍 {decodeEntities(market.address_myenv)}</Text>
              )}
              {(view.marketStalls > 0 || view.foodStalls > 0) && (
                <View style={styles.stalls}>
                  {view.marketStalls > 0 && (
                    <Text style={styles.stallItem}>
                      🛒 <Text style={styles.stallCount}>{view.marketStalls}</Text>{' '}
                      {t('marketStalls')}
                    </Text>
                  )}
                  {view.foodStalls > 0 && (
                    <Text style={styles.stallItem}>
                      🍜 <Text style={styles.stallCount}>{view.foodStalls}</Text> {t('foodStalls')}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {status.status === 'closed' && (
            <View style={styles.section}>
              <View style={styles.banner}>
                <Text style={styles.bannerStatus}>{t('closedToday')}</Text>
                <Text style={styles.bannerReason}>{reasonText(status, t)}</Text>
                {!!nextOpen && (
                  <Text style={styles.bannerOpens}>
                    {t('opensAgain')} {formatDate(nextOpen, lang)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {upcoming.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.upcomingTitle}>{t('upcoming')}</Text>
              {upcoming.slice(0, UPCOMING_SHOWN).map((closure) => (
                <View key={closure.date.getTime()} style={styles.upcomingRow}>
                  <Text style={styles.upcomingDate}>{formatDate(closure.date, lang)}</Text>
                  <Text style={styles.upcomingReason} numberOfLines={2}>
                    {closureReasonShort(closure.reason, closure.remarks, t)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function reasonText(status: MarketStatus, t: Translate): string {
  if (status.status === 'warning') return t('reasonMonday');
  if (status.status === 'closed') {
    if (status.reason === 'cleaning') return t('reasonCleaning');
    return status.remarks ? decodeEntities(status.remarks) : t('otherWorks');
  }
  return '';
}

function closureReasonShort(
  reason: ClosureReason,
  remarks: string | undefined,
  t: Translate
): string {
  if (reason === 'monday') return t('weeklyRest');
  if (reason === 'cleaning') return t('cleaning');
  return remarks ? decodeEntities(remarks) : t('otherWorks');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadow.card,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: colors.surface,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 19, fontWeight: '600', color: colors.text },
  next: { fontSize: 14, color: colors.textMuted },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  pill_open: { backgroundColor: colors.green },
  pill_warning: { backgroundColor: colors.orange, maxWidth: 108 },
  pill_closed: { backgroundColor: colors.red },
  pillText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  pillTextWarning: { fontSize: 12, textAlign: 'center', lineHeight: 15 },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: { paddingTop: 12, gap: 8 },
  address: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  stalls: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stallItem: { fontSize: 15, color: colors.textMuted },
  stallCount: { fontWeight: '700', color: colors.text },
  banner: {
    backgroundColor: colors.red,
    borderRadius: radius.banner,
    padding: 16,
    gap: 4,
  },
  bannerStatus: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  bannerReason: { color: colors.surface, fontSize: 15, textAlign: 'center' },
  bannerOpens: { color: colors.surface, fontSize: 15, textAlign: 'center', opacity: 0.9 },
  upcomingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upcomingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  upcomingDate: { fontSize: 15, color: colors.text, fontWeight: '500' },
  upcomingReason: { fontSize: 15, color: colors.textMuted, flexShrink: 1, textAlign: 'right' },
});
