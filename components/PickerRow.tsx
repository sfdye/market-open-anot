import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from './ui';
import { parseMarketName, type Market } from '../lib/core/market-logic';
import type { Lang } from '../lib/i18n';
import { formatDistance, getDisplayName } from '../lib/markets';
import { toggleFavorite, useIsFavorite, useT } from '../lib/store';
import { HIT_SIZE, space, useTheme } from '../lib/theme';

/**
 * One row of the add-markets list. Memoized and subscribed to its own favourite flag, so tapping
 * a star re-renders one row out of 123 rather than the whole list.
 */
function PickerRowInner({
  market,
  lang,
  distanceKm,
}: {
  market: Market;
  lang: Lang;
  distanceKm: number | null;
}) {
  const theme = useTheme();
  const t = useT();
  const favorite = useIsFavorite(market.name);

  const parsed = parseMarketName(market.name);
  const zhName = getDisplayName(parsed, 'zh');
  // Distance if we have it, else the English name under a Chinese one, else the street.
  const secondary =
    distanceKm !== null
      ? formatDistance(distanceKm)
      : lang === 'zh' && zhName !== parsed.friendly
        ? parsed.friendly
        : parsed.street;

  return (
    <Pressable
      onPress={() => toggleFavorite(market.name)}
      accessibilityRole="checkbox"
      testID="picker-row"
      accessibilityState={{ checked: favorite }}
      accessibilityLabel={getDisplayName(parsed, lang)}
      accessibilityHint={favorite ? t('removeFav') : t('addFav')}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: favorite
            ? theme.colors.accentPale
            : pressed
              ? theme.colors.borderLight
              : theme.colors.surface,
          borderBottomColor: theme.colors.borderLight,
        },
      ]}
    >
      <Icon
        name={favorite ? 'favorite' : 'favoriteOutline'}
        size={24}
        color={favorite ? 'accent' : 'textFaint'}
      />
      <View style={styles.info}>
        <Text variant="bodyStrong">{getDisplayName(parsed, lang)}</Text>
        {!!secondary && (
          <Text variant="subhead" tone="muted">
            {secondary}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default memo(PickerRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: HIT_SIZE + space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: 2 },
});
