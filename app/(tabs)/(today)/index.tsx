import { useEffect, useRef } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MarketCard from '../../../components/MarketCard';
import ReminderCard from '../../../components/ReminderCard';
import { Button, EmptyState, Notice, Text } from '../../../components/ui';
import { AUTHOR_URL, DATA_SOURCE_URL, FEEDBACK_URL, REPO_URL } from '../../../lib/constants';
import { formatDate, formatDateLong } from '../../../lib/date';
import { findMarket } from '../../../lib/markets';
import {
  refresh,
  removeFavorite,
  useFavorites,
  useFetchedAt,
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
  const fetchedAt = useFetchedAt();
  const reminders = useReminders();

  // First run: open the picker straight away rather than showing an empty list. A push
  // rather than a redirect, so the tab and the modal do not fight over the route.
  const prompted = useRef(false);
  useEffect(() => {
    if (!ready || prompted.current || favorites.length > 0) return;
    prompted.current = true;
    router.push('/add');
  }, [ready, favorites.length, router]);

  const cards = favorites
    .map((name) => findMarket(markets, name))
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <ScrollView
      // Required for the large title to collapse on scroll.
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={theme.colors.textMuted}
        />
      }
    >
      <Text variant="subhead" tone="muted">
        {formatDateLong(today, lang)}
      </Text>

      {stale && <Notice>{t('offline')}</Notice>}

      {reminders.showCard && (
        <ReminderCard
          busy={reminders.busy}
          onEnable={() => void reminders.toggle()}
          onDismiss={reminders.dismissCard}
        />
      )}

      {cards.length === 0
        ? ready && (
            <EmptyState
              icon="stall"
              title={t('noFavorites')}
              actionTitle={t('addMarkets')}
              actionIcon="add"
              onAction={() => router.push('/add')}
            />
          )
        : cards.map((market) => (
            <MarketCard
              key={market.name}
              market={market}
              editing={false}
              onRemove={() => removeFavorite(market.name)}
            />
          ))}

      {cards.length > 0 && (
        <Button title={t('addMarkets')} icon="add" onPress={() => router.push('/add')} />
      )}

      <View style={styles.footer}>
        <Text variant="footnote" tone="faint" style={styles.centered}>
          {t('dataSourcePrefix')}
          <Text
            variant="footnote"
            tone="accent"
            onPress={() => void Linking.openURL(DATA_SOURCE_URL)}
          >
            {t('dataSourceLink')}
          </Text>
          {fetchedAt ? ` · ${t('lastUpdated')} ${formatDate(new Date(fetchedAt), lang)}` : ''}
        </Text>
        <Text variant="footnote" tone="faint" style={styles.centered}>
          <Text variant="footnote" tone="accent" onPress={() => void Linking.openURL(AUTHOR_URL)}>
            {t('madeBy')}
          </Text>
          {' · '}
          <Text variant="footnote" tone="accent" onPress={() => void Linking.openURL(REPO_URL)}>
            {t('source')}
          </Text>
          {' · '}
          <Text variant="footnote" tone="accent" onPress={() => void Linking.openURL(FEEDBACK_URL)}>
            {t('feedback')}
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.md },
  footer: { gap: space.xs, paddingTop: space.lg },
  centered: { textAlign: 'center' },
});
