import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReminderCard from '../components/ReminderCard';
import MarketCard from '../components/MarketCard';
import { findMarket } from '../lib/markets';
import { formatDate, formatDateLong } from '../lib/date';
import { DATA_SOURCE_URL } from '../lib/i18n';
import { useReminders } from '../lib/useReminders';
import {
  removeAllFavorites,
  removeFavorite,
  setLang,
  useFavorites,
  useFetchedAt,
  useLang,
  useMarkets,
  useReady,
  useStale,
  useT,
  useToday,
} from '../lib/store';
import { colors, radius, shadow } from '../lib/theme';

const REPO_URL = 'https://github.com/sfdye/market-open-anot';
const AUTHOR_URL = 'https://github.com/sfdye';
const FEEDBACK_URL = 'mailto:t@sfdye.com';

export default function StatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ready = useReady();
  const markets = useMarkets();
  const stale = useStale();
  const favorites = useFavorites();
  const lang = useLang();
  const today = useToday();
  const t = useT();
  const fetchedAt = useFetchedAt();
  const reminders = useReminders();
  const [editing, setEditing] = useState(false);

  const hasFavorites = favorites.length > 0;
  // Edit mode cannot outlive the last favourite.
  const isEditing = editing && hasFavorites;
  useEffect(() => {
    if (editing && !hasFavorites) setEditing(false);
  }, [editing, hasFavorites]);

  const confirmRemoveAll = () => {
    Alert.alert(t('removeAllTitle'), t('removeAllConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: () => {
          removeAllFavorites();
          setEditing(false);
        },
      },
    ]);
  };

  const cards = favorites
    .map((name) => findMarket(markets, name))
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>{t('appTitle')}</Text>
            <Text style={styles.date}>{formatDateLong(today, lang)}</Text>
          </View>
          <View style={styles.headerActions}>
            {hasFavorites && (
              <Pressable
                style={styles.iconBtn}
                onPress={() => setEditing((v) => !v)}
                accessibilityRole="button"
              >
                <Text style={styles.iconBtnText}>{isEditing ? t('doneEditing') : t('edit')}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.iconBtn, reminders.enabled && styles.iconBtnActive, reminders.busy && styles.disabled]}
              onPress={() => void reminders.toggle()}
              disabled={reminders.busy}
              accessibilityRole="switch"
              accessibilityState={{ checked: reminders.enabled }}
              accessibilityLabel={reminders.enabled ? t('remindersOn') : t('enableReminders')}
            >
              <Text style={styles.iconBtnText}>{reminders.enabled ? '🔔' : '🔕'}</Text>
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() => setLang(lang === 'en' ? 'zh' : 'en')}
              accessibilityRole="button"
              accessibilityLabel={t('langToggle')}
            >
              <Text style={styles.iconBtnText}>{lang === 'en' ? '中文' : 'EN'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {reminders.showCard && (
        <ReminderCard
          busy={reminders.busy}
          onEnable={() => void reminders.toggle()}
          onDismiss={reminders.dismissCard}
        />
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {stale && <Text style={styles.notice}>{t('offline')}</Text>}

        {!hasFavorites ? (
          ready && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('noFavorites')}</Text>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => router.push('/picker')}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>{t('addMarkets')}</Text>
              </Pressable>
            </View>
          )
        ) : (
          cards.map((market) => (
            <MarketCard
              key={market.name}
              market={market}
              editing={isEditing}
              onRemove={() => removeFavorite(market.name)}
            />
          ))
        )}

        <View style={styles.footerText}>
          <Text style={styles.muted}>
            {t('dataSourcePrefix')}
            <Text style={styles.link} onPress={() => void Linking.openURL(DATA_SOURCE_URL)}>
              {t('dataSourceLink')}
            </Text>
            {fetchedAt ? ` · ${t('lastUpdated')} ${formatDate(new Date(fetchedAt), lang)}` : ''}
          </Text>
          <Text style={styles.muted}>
            <Text style={styles.link} onPress={() => void Linking.openURL(AUTHOR_URL)}>
              {t('madeBy')}
            </Text>
            {' · '}
            <Text style={styles.link} onPress={() => void Linking.openURL(REPO_URL)}>
              {t('source')}
            </Text>
            {' · '}
            <Text style={styles.link} onPress={() => void Linking.openURL(FEEDBACK_URL)}>
              {t('feedback')}
            </Text>
          </Text>
        </View>
      </ScrollView>

      {hasFavorites && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          {isEditing ? (
            <Pressable style={styles.dangerBtn} onPress={confirmRemoveAll} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>
                {t('removeAllCount', { n: favorites.length })}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push('/picker')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{t('addMarkets')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  headerTitles: { flex: 1, gap: 2 },
  title: { fontSize: 24, fontWeight: '700', color: colors.green },
  date: { fontSize: 14, color: colors.textMuted },
  headerActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  iconBtn: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    minWidth: 44,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.pill,
  },
  iconBtnActive: { backgroundColor: colors.greenPale, borderColor: colors.green },
  iconBtnText: { fontSize: 15, fontWeight: '500', color: colors.text },
  disabled: { opacity: 0.5 },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 12 },
  notice: {
    backgroundColor: colors.orangePale,
    borderWidth: 1,
    borderColor: colors.orangeBorder,
    borderRadius: radius.pill,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  empty: { alignItems: 'center', gap: 20, paddingVertical: 48, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, color: colors.textMuted, textAlign: 'center', lineHeight: 26 },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  primaryBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.banner,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow.card,
  },
  dangerBtn: {
    backgroundColor: colors.red,
    borderRadius: radius.banner,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.surface, fontSize: 18, fontWeight: '700' },
  footerText: { gap: 6, paddingVertical: 16, paddingHorizontal: 4 },
  muted: { fontSize: 13, color: colors.textFaint, textAlign: 'center', lineHeight: 19 },
  link: { color: colors.green, textDecorationLine: 'underline' },
});
