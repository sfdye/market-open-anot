import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import PickerRow from '../components/PickerRow';
import { EmptyState, Text } from '../components/ui';
import { parseMarketName, type Market } from '../lib/core/market-logic';
import {
  getDisplayName,
  getMarketDistance,
  searchMarkets,
} from '../lib/markets';
import { useFavorites, useLang, useMarkets, useT } from '../lib/store';
import { space, useTheme } from '../lib/theme';
import { useLocation } from '../lib/useLocation';

export default function AddMarketsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const lang = useLang();
  const markets = useMarkets();
  const favorites = useFavorites();
  const { coords } = useLocation();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const filtered = searchMarkets(markets, query).slice();
    if (coords) {
      filtered.sort((a, b) => {
        const da = getMarketDistance(a, coords.lat, coords.lng);
        const db = getMarketDistance(b, coords.lat, coords.lng);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    } else {
      filtered.sort((a, b) => {
        const na = getDisplayName(parseMarketName(a.name), lang).toLowerCase();
        const nb = getDisplayName(parseMarketName(b.name), lang).toLowerCase();
        return na < nb ? -1 : na > nb ? 1 : 0;
      });
    }
    return filtered;
  }, [markets, query, coords, lang]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('chooseMarkets'),
          headerSearchBarOptions: {
            placeholder: t('search'),
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            // The list is long and the search bar is the point of this screen.
            hideWhenScrolling: false,
            textColor: theme.colors.text,
            hintTextColor: theme.colors.textFaint,
            headerIconColor: theme.colors.textMuted,
          },
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
              <Text variant="bodyStrong" tone="accent">
                {favorites.length > 0 ? t('doneCount', { n: favorites.length }) : t('done')}
              </Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={rows}
        keyExtractor={(m: Market) => m.name}
        renderItem={({ item }) => (
          <PickerRow
            market={item}
            lang={lang}
            distanceKm={getMarketDistance(item, coords?.lat ?? null, coords?.lng ?? null)}
          />
        )}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        style={{ backgroundColor: theme.colors.bg }}
        ListEmptyComponent={
          markets.length > 0 ? (
            <EmptyState icon="search" title={t('noResults')} />
          ) : null
        }
        contentContainerStyle={styles.content}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
});
