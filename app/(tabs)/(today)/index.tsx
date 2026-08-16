import { useEffect, useMemo, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MarketRow from '../../../components/MarketRow';
import ReminderPrompt from '../../../components/ReminderPrompt';
import { EmptyState, Notice, Text } from '../../../components/ui';
import { formatDateLong } from '../../../lib/date';
import { findMarket } from '../../../lib/markets';
import {
  refresh,
  useFavorites,
  useLang,
  useMarkets,
  useReady,
  useRefreshing,
  useStale,
  useT,
  useToday,
} from '../../../lib/store';
import { space, useTheme } from '../../../lib/theme';
import { useReminders } from '../../../lib/useReminders';

export default function TodayScreen() {
  const router = useRouter();
  const theme = useTheme();
  const ready = useReady();
  const markets = useMarkets();
  const favorites = useFavorites();
  const lang = useLang();
  const today = useToday();
  const t = useT();
  const stale = useStale();
  const refreshing = useRefreshing();
  const reminders = useReminders();

  // First run: open the picker straight away rather than showing an empty list. A push
  // rather than a redirect, so the tab and the modal do not fight over the route.
  const prompted = useRef(false);
  useEffect(() => {
    if (!ready || prompted.current || favorites.length > 0) return;
    prompted.current = true;
    router.push('/add');
  }, [ready, favorites.length, router]);

  // Rows keep their identity across refreshes by name, and a favourite the dataset has dropped
  // leaves the list rather than rendering an empty row with separators around it.
  const data = useMemo(
    () => favorites.filter((name) => findMarket(markets, name) !== null),
    [favorites, markets]
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(name) => name}
      renderItem={({ item }) => <MarketRow name={item} />}
      // Required for the large title to collapse on scroll.
      contentInsetAdjustmentBehavior="automatic"
      initialNumToRender={8}
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { backgroundColor: theme.colors.borderLight }]} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={theme.colors.textMuted}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="subhead" tone="muted">
            {formatDateLong(today, lang)}
          </Text>
          {stale && <Notice>{t('offline')}</Notice>}
          {reminders.showCard && (
            <ReminderPrompt
              busy={reminders.busy}
              onEnable={() => void reminders.toggle()}
              onDismiss={reminders.dismissCard}
            />
          )}
        </View>
      }
      ListEmptyComponent={
        ready ? (
          <EmptyState icon="stall" title={t('noFavorites')} message={t('noFavoritesHint')} />
        ) : null
      }
      // Adding lives on the header "+" alone, and attribution on Settings → About; a second Add
      // button and a repeat of the footer only made the list end look like a web page.
      ListFooterComponent={
        data.length > 0 ? (
          <Text variant="footnote" tone="faint" style={styles.hint}>
            {t('swipeDelete')}
          </Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: space.md, padding: space.lg },
  // Inset to the left so it reads as a list, and drawn by hand rather than as a row border so a
  // swiped-open row does not carry it away.
  separator: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
  hint: { textAlign: 'center', padding: space.lg },
});
