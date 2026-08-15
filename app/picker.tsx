import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MarketMap from '../components/MarketMap';
import { parseMarketName, type Market } from '../lib/core/market-logic';
import {
  formatDistance,
  getDisplayName,
  getMarketDistance,
  searchMarkets,
} from '../lib/markets';
import { useLocation } from '../lib/useLocation';
import { toggleFavorite, useFavorites, useLang, useMarkets, useT } from '../lib/store';
import { colors, radius, shadow } from '../lib/theme';

export default function PickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const markets = useMarkets();
  const favorites = useFavorites();
  const lang = useLang();
  const t = useT();
  const user = useLocation();
  const [query, setQuery] = useState('');
  const [showMap, setShowMap] = useState(false);

  const rows = useMemo(() => {
    const filtered = searchMarkets(markets, query).slice();
    if (user) {
      filtered.sort((a, b) => {
        const da = getMarketDistance(a, user.lat, user.lng);
        const db = getMarketDistance(b, user.lat, user.lng);
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
  }, [markets, query, user, lang]);

  const renderRow = ({ item }: { item: Market }) => {
    const parsed = parseMarketName(item.name);
    const fav = favorites.includes(item.name);
    const distance = getMarketDistance(item, user?.lat ?? null, user?.lng ?? null);
    const zhName = getDisplayName(parsed, 'zh');
    // Distance if we have it, else the English name under a Chinese one, else the street.
    const secondary =
      distance !== null
        ? formatDistance(distance)
        : lang === 'zh' && zhName !== parsed.friendly
          ? parsed.friendly
          : parsed.street;

    return (
      <Pressable
        style={[styles.row, fav && styles.rowFav]}
        onPress={() => toggleFavorite(item.name)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: fav }}
        accessibilityLabel={fav ? t('removeFav') : t('addFav')}
      >
        <Text style={[styles.star, fav && styles.starFav]}>{fav ? '★' : '☆'}</Text>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{getDisplayName(parsed, lang)}</Text>
          {!!secondary && <Text style={styles.rowSecondary}>{secondary}</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>{t('chooseMarkets')}</Text>
            <Text style={styles.subtitle}>{t('tapToAdd')}</Text>
          </View>
          <Pressable
            style={[styles.viewBtn, showMap && styles.viewBtnActive]}
            onPress={() => setShowMap((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showMap ? t('listView') : t('mapView')}
          >
            <Text style={styles.viewBtnText}>{showMap ? '☰' : '🗺️'}</Text>
          </Pressable>
        </View>

        {!showMap && (
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={t('search')}
            placeholderTextColor={colors.textFaint}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        )}
      </View>

      {showMap ? (
        <MarketMap markets={markets} user={user} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(m) => m.name}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            markets.length > 0 ? <Text style={styles.empty}>{t('noResults')}</Text> : null
          }
        />
      )}

      {/* Always visible, matching the web app: a clear confirm-and-return action even
          after the back button has scrolled away. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.doneBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.doneText}>
            {favorites.length > 0 ? t('doneCount', { n: favorites.length }) : t('done')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, lineHeight: 38, color: colors.green },
  headerTitles: { flex: 1, gap: 2 },
  title: { fontSize: 21, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  viewBtn: {
    minWidth: 44,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.pill,
  },
  viewBtnActive: { backgroundColor: colors.greenPale, borderColor: colors.green },
  viewBtnText: { fontSize: 19 },
  search: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
  },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  rowFav: { backgroundColor: colors.greenPale },
  star: { fontSize: 24, color: colors.textFaint, width: 28, textAlign: 'center' },
  starFav: { color: colors.green },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 17, fontWeight: '600', color: colors.text },
  rowSecondary: { fontSize: 14, color: colors.textMuted },
  empty: { padding: 32, fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  doneBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.banner,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow.card,
  },
  doneText: { color: colors.surface, fontSize: 18, fontWeight: '700' },
});
