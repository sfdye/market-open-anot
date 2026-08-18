import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import PickerRow from '../components/PickerRow';
import { EmptyState, Row, Segmented, Text } from '../components/ui';
import { MAX_FAVORITES } from '../lib/core/favorites';
import { parseMarketName, type Market } from '../lib/core/market-logic';
import { getDisplayName, getMarketDistance, searchMarkets } from '../lib/markets';
import { useFavorites, useLang, useMarkets, useT } from '../lib/store';
import { space, useTheme } from '../lib/theme';
import { useLocation } from '../lib/useLocation';

type Sort = 'distance' | 'alpha';

export default function AddMarketsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const lang = useLang();
  const markets = useMarkets();
  const favorites = useFavorites();
  const { coords, status } = useLocation();
  const [query, setQuery] = useState('');
  // The search bar stays at the finger's speed; the 123-row list catches up.
  const deferredQuery = useDeferredValue(query);
  const [chosenSort, setChosenSort] = useState<Sort | null>(null);

  // Distance until the user says otherwise, and only while there is a fix to measure from — so a
  // location arriving late reorders the list, and a denied one never leaves the list stuck.
  const sort: Sort = coords ? (chosenSort ?? 'distance') : 'alpha';

  const rows = useMemo(() => {
    const filtered = searchMarkets(markets, deferredQuery).slice();
    if (sort === 'distance' && coords) {
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
  }, [markets, deferredQuery, sort, coords, lang]);

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
                {favorites.length > 0
                  ? t('doneCount', { n: favorites.length, max: MAX_FAVORITES })
                  : t('done')}
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
        // The sort control stays reachable however far down the list you are.
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: theme.colors.bg }]}>
            <Segmented<Sort>
              options={[
                { value: 'distance', label: t('sortDistance'), disabled: !coords },
                { value: 'alpha', label: t('sortAlpha') },
              ]}
              value={sort}
              onChange={setChosenSort}
            />
            {status === 'denied' && (
              <Row
                label={t('enableLocation')}
                icon="locate"
                chevron
                onPress={() => void Linking.openSettings()}
                last
              />
            )}
          </View>
        }
        ListEmptyComponent={
          markets.length > 0 ? <EmptyState icon="search" title={t('noResults')} /> : null
        }
        contentContainerStyle={styles.content}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  header: { gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
});
