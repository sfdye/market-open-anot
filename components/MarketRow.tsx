import { memo } from 'react';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import StatusPill from './StatusPill';
import SwipeToDeleteRow from './SwipeToDeleteRow';
import { Icon, Text } from './ui';
import { getMarketStatus, getNextOpenDate, parseMarketName } from '../lib/core/market-logic';
import { formatDate } from '../lib/date';
import { getDisplayName, getNextCleaningDate } from '../lib/markets';
import { statusLabel, statusTone } from '../lib/status';
import { removeFavorite, useLang, useMarket, useT, useToday } from '../lib/store';
import { radius, REFLOW_FONT_SCALE, space, useTheme } from '../lib/theme';

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

  // Past this font scale the pill wins the horizontal squeeze and truncates the name, so the row
  // becomes a column and drops the thumbnail to buy the text its width back.
  const stacked = PixelRatio.getFontScale() > REFLOW_FONT_SCALE;
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
          stacked && styles.rowStacked,
          { backgroundColor: pressed ? theme.colors.borderLight : theme.colors.surface },
        ]}
      >
        {!!market.photourl && !stacked && (
          <Image
            source={{ uri: market.photourl }}
            style={[styles.thumb, { backgroundColor: theme.colors.borderLight }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            accessible={false}
          />
        )}
        <View style={[styles.info, stacked && styles.infoStacked]}>
          <Text variant="headline">{displayName}</Text>
          {!!next && (
            <Text variant="subhead" tone="muted">
              {next}
            </Text>
          )}
        </View>
        <View style={[styles.trailing, stacked && styles.trailingStacked]}>
          <StatusPill tone={tone} label={label} />
          {!stacked && <Icon name="chevron" size={18} color="textFaint" />}
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
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    // minHeight, never height: the row grows with the system font size.
    minHeight: 76,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: radius.thumb },
  info: { flex: 1, gap: 2 },
  infoStacked: { flex: 0, alignSelf: 'stretch' },
  // Bounded so "MOST STALLS CLOSED" wraps inside the pill rather than eating the name's width.
  trailing: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: 132 },
  trailingStacked: { maxWidth: undefined },
});
