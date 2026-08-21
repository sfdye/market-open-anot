import { memo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import StatusPill from './StatusPill';
// Pressable comes from the wrapper, not react-native — see its export.
import SwipeToDeleteRow, { Pressable } from './SwipeToDeleteRow';
import { Icon, Text } from './ui';
import { getMarketStatus, getNextOpenDate, parseMarketName } from '../lib/core/market-logic';
import { formatDate } from '../lib/date';
import { getDisplayName, getNextCleaningDate } from '../lib/markets';
import { statusLabel, statusTone } from '../lib/status';
import { removeFavorite, useLang, useMarket, useT, useToday } from '../lib/store';
import { COMPACT_FONT_SCALE, radius, space, useTheme } from '../lib/theme';

const THUMB_SIZE = 56;

/**
 * One favourite on Today. Takes a name rather than a `Market` and reads the rest from the store,
 * so a star tapped elsewhere or a midnight tick re-renders the rows that changed and nothing else.
 */
function MarketRowInner({ name }: { name: string }) {
  const router = useRouter();
  const theme = useTheme();
  const market = useMarket(name);
  const today = useToday();
  const lang = useLang();
  const t = useT();
  const { fontScale } = useWindowDimensions();

  // A market can vanish from the NEA dataset between refreshes; the store prunes it, so this is
  // only the render in between.
  if (!market) return null;

  const parsed = parseMarketName(market.name);
  const displayName = getDisplayName(parsed, lang);
  const status = getMarketStatus(market, today);
  const tone = statusTone(status);
  const label = statusLabel(tone, t);

  const nextOpen = tone === 'closed' ? getNextOpenDate(market, today) : null;
  const nextCleaning = tone === 'closed' ? null : getNextCleaningDate(market, today);
  const next = nextOpen
    ? `${t('opensAgain')} ${formatDate(nextOpen, lang)}`
    : nextCleaning
      ? `${t('nextClosure')} ${formatDate(nextCleaning, lang)}`
      : '';

  // Keep the status on the same visual row at accessibility sizes. The compact hierarchy buys the
  // pill enough width without capping anything: every label still follows its UIKit type ramp.
  const compact = fontScale > COMPACT_FONT_SCALE;
  const remove = () => removeFavorite(market.name);

  return (
    <SwipeToDeleteRow actionLabel={t('remove')} onDelete={remove}>
      <Pressable
        onPress={() => router.push({ pathname: '/market/[name]', params: { name: market.name } })}
        accessibilityRole="button"
        accessibilityLabel={[displayName, label, next].filter(Boolean).join('. ')}
        accessibilityHint={t('details')}
        accessibilityActions={[{ name: 'delete', label: t('removeFav') }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') remove();
        }}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.colors.borderLight : theme.colors.surface },
        ]}
      >
        <View style={styles.main}>
          {!!market.photourl && (
            <Image
              source={{ uri: market.photourl }}
              style={[styles.thumb, { backgroundColor: theme.colors.borderLight }]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
              accessible={false}
            />
          )}
          <View style={styles.info}>
            <Text variant={compact ? 'bodyStrong' : 'headline'}>{displayName}</Text>
            {!!next && (
              <Text variant={compact ? 'footnote' : 'subhead'} tone="muted">
                {next}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.trailing}>
          <StatusPill tone={tone} label={label} compact={compact} style={styles.pill} />
          <Icon name="chevron" size={18} color="textFaint" />
        </View>
      </Pressable>
    </SwipeToDeleteRow>
  );
}

export default memo(MarketRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    // A little extra iOS breathing room; Android retains its Material row inset.
    paddingRight: Platform.OS === 'ios' ? space.xl : space.lg,
    paddingVertical: space.md,
    // minHeight, never height: the row grows with the system font size.
    minHeight: 76,
  },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: radius.thumb },
  info: { flex: 1, gap: 2 },
  main: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1, minWidth: 0 },
  // Bound the pill, not this whole group: the chevron and its gap must fit inside the row too.
  trailing: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 0 },
  pill: { maxWidth: 132 },
});
