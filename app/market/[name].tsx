import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import MarketPhoto from '../../components/MarketPhoto';
import StallCounts, { hasStallCounts } from '../../components/StallCounts';
import StatusBanner from '../../components/StatusBanner';
import UpcomingClosures from '../../components/UpcomingClosures';
import { Card, EmptyState, Icon, Text } from '../../components/ui';
import { getMarketStatus, getNextOpenDate, parseMarketName } from '../../lib/core/market-logic';
import { decodeEntities, getDisplayName, marketCoords } from '../../lib/markets';
import { statusTone } from '../../lib/status';
import { toggleFavorite, useIsFavorite, useLang, useMarket, useT, useToday } from '../../lib/store';
import { space, useTheme } from '../../lib/theme';

export default function MarketDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const theme = useTheme();
  const market = useMarket(name);
  const favorite = useIsFavorite(name);
  const today = useToday();
  const lang = useLang();
  const t = useT();

  // Reachable by deep link from a notification, so the market may have left the dataset since.
  if (!market) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon="info" title={t('marketNotFound')} />
      </>
    );
  }

  const parsed = parseMarketName(market.name);
  const displayName = getDisplayName(parsed, lang);
  const status = getMarketStatus(market, today);
  const tone = statusTone(status);
  const nextOpen = tone === 'closed' ? getNextOpenDate(market, today) : null;
  const address = market.address_myenv ? decodeEntities(market.address_myenv) : '';
  const coords = marketCoords(market);
  const showPlaceCard = !!address || hasStallCounts(market);

  const openInMaps = () => {
    if (!coords) return;
    const label = encodeURIComponent(parsed.friendly);
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${label}@${coords.lat},${coords.lng}`
        : `geo:0,0?q=${coords.lat},${coords.lng}(${label})`;
    void Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: displayName,
          headerRight: () => (
            <Pressable
              onPress={() => toggleFavorite(market.name)}
              hitSlop={12}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: favorite }}
              accessibilityLabel={favorite ? t('removeFav') : t('addFav')}
            >
              <Icon
                name={favorite ? 'favorite' : 'favoriteOutline'}
                size={26}
                color={favorite ? 'accent' : 'textMuted'}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {!!market.photourl && <MarketPhoto uri={market.photourl} />}

        <StatusBanner status={status} nextOpen={nextOpen} />

        {/* Detail only, and only under an open banner: that is the claim a reader can mistake for
            "serving now", and this is the screen they came to to find out. A pill on Today or on a
            map callout is a glance, and carrying the caveat there would drown it. */}
        {tone !== 'closed' && (
          <Text variant="footnote" tone="faint" style={styles.hoursNote}>
            {t('hoursNote')}
          </Text>
        )}

        {showPlaceCard && (
          <Card padded={false} style={styles.place}>
            {!!address && (
              <Pressable
                onPress={openInMaps}
                disabled={!coords}
                accessibilityRole={coords ? 'link' : 'text'}
                accessibilityLabel={`${t('address')}: ${address}`}
                style={({ pressed }) => [
                  styles.addressRow,
                  pressed && { backgroundColor: theme.colors.borderLight },
                ]}
              >
                <Icon name="location" color="textMuted" />
                <Text variant="subhead" tone="muted" style={styles.address}>
                  {address}
                </Text>
                {!!coords && <Icon name="chevron" size={16} color="textFaint" />}
              </Pressable>
            )}
            {hasStallCounts(market) && (
              <View
                style={[
                  styles.stalls,
                  !!address && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.colors.borderLight,
                  },
                ]}
              >
                <StallCounts market={market} />
              </View>
            )}
          </Card>
        )}

        <UpcomingClosures market={market} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.md },
  hoursNote: { paddingHorizontal: space.sm },
  place: { overflow: 'hidden' },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
  },
  address: { flex: 1 },
  stalls: { padding: space.lg },
});
