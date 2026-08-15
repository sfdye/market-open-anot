import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Linking } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import StatusPill from '../../components/StatusPill';
import { Card, EmptyState, Icon, Text } from '../../components/ui';
import { getMarketStatus, getNextOpenDate, parseMarketName } from '../../lib/core/market-logic';
import { formatDate } from '../../lib/date';
import { decodeEntities, getDisplayName, marketCoords } from '../../lib/markets';
import { reasonText, statusHeadline, statusTone } from '../../lib/status';
import { toggleFavorite, useIsFavorite, useLang, useMarket, useT, useToday } from '../../lib/store';
import { space } from '../../lib/theme';

export default function MarketDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const market = useMarket(name);
  const favorite = useIsFavorite(name);
  const today = useToday();
  const lang = useLang();
  const t = useT();

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
        <Card>
          <View style={styles.banner}>
            <StatusPill tone={tone} label={statusHeadline(tone, t)} />
            {!!reasonText(status, t) && (
              <Text variant="subhead" tone="muted" style={styles.centered}>
                {reasonText(status, t)}
              </Text>
            )}
            {!!nextOpen && (
              <Text variant="subhead" style={styles.centered}>
                {t('opensAgain')} {formatDate(nextOpen, lang)}
              </Text>
            )}
          </View>
        </Card>

        {!!address && (
          <Card>
            <Pressable
              onPress={openInMaps}
              disabled={!coords}
              accessibilityRole={coords ? 'link' : 'text'}
              accessibilityLabel={`${t('address')}: ${address}`}
              style={styles.addressRow}
            >
              <Icon name="location" color="textMuted" />
              <Text variant="subhead" tone="muted" style={styles.address}>
                {address}
              </Text>
            </Pressable>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.md },
  banner: { gap: space.sm, alignItems: 'center' },
  centered: { textAlign: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  address: { flex: 1 },
});
