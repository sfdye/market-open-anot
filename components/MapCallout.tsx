import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import StatusPill from './StatusPill';
import { Button, Icon, Text } from './ui';
import { getMarketStatus, parseMarketName, type Market } from '../lib/core/market-logic';
import { formatDistance, getDisplayName } from '../lib/markets';
import { statusLabel, statusTone } from '../lib/status';
import { toggleFavorite, useIsFavorite, useLang, useT, useToday } from '../lib/store';
import { HIT_SIZE, radius, space, useTheme } from '../lib/theme';

/** The card that slides up when a pin is tapped: what it is, whether it is open, and two actions. */
export default function MapCallout({
  market,
  distanceKm,
  onClose,
}: {
  market: Market;
  distanceKm: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const theme = useTheme();
  const lang = useLang();
  const today = useToday();
  const t = useT();
  const favorite = useIsFavorite(market.name);

  const displayName = getDisplayName(parseMarketName(market.name), lang);
  const tone = statusTone(getMarketStatus(market, today));

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      // No safe-area or tab-bar maths: the tab bar is a layout sibling of the screen, so the map
      // view already ends above it and above the home indicator.
      style={[styles.card, { backgroundColor: theme.colors.surface }, theme.shadow]}
    >
      <View style={styles.heading}>
        <View style={styles.title}>
          <Text variant="headline" numberOfLines={2}>
            {displayName}
          </Text>
          {distanceKm !== null && (
            <Text variant="footnote" tone="muted">
              {formatDistance(distanceKm)}
            </Text>
          )}
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('close')}
        >
          <Icon name="close" size={24} color="textMuted" />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <StatusPill tone={tone} label={statusLabel(tone, t)} />
        <View style={styles.spacer} />
        <Pressable
          onPress={() => toggleFavorite(market.name)}
          style={styles.star}
          accessibilityRole="checkbox"
          testID="favorite-toggle"
          accessibilityState={{ checked: favorite }}
          accessibilityLabel={favorite ? t('removeFav') : t('addFav')}
        >
          <Icon
            name={favorite ? 'favorite' : 'favoriteOutline'}
            size={26}
            color={favorite ? 'accent' : 'textMuted'}
          />
        </Pressable>
        <Button
          title={t('details')}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/market/[name]', params: { name: market.name } })
          }
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.card,
  },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  title: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  spacer: { flex: 1 },
  star: {
    minWidth: HIT_SIZE,
    minHeight: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
