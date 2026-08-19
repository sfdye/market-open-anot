import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Switch } from 'react-native';
import Constants from 'expo-constants';
import SettingsSection from '../../../components/SettingsSection';
import { Icon, Row } from '../../../components/ui';
import { DATA_SOURCE_URL, FEEDBACK_URL, REPO_URL } from '../../../lib/constants';
import { MAX_FAVORITES } from '../../../lib/core/favorites';
import { feedbackUrl, versionLabel, type BuildInfo } from '../../../lib/core/version-info';
import { formatDate, formatDateTime } from '../../../lib/date';
import { MAP_CHOICE_SUPPORTED, MAP_PROVIDERS, useMapProvider } from '../../../lib/maps';
import { listScheduled, sendTestReminder } from '../../../lib/notifications';
import type { ScheduledReminder } from '../../../lib/notifications';
import type { Lang } from '../../../lib/i18n';
import {
  refresh,
  removeAllFavorites,
  setLang,
  setMapProvider,
  useFavorites,
  useFetchedAt,
  useLang,
  useLangPref,
  useMapProviderPref,
  useMarkets,
  useRefreshing,
  useStale,
  useT,
} from '../../../lib/store';
import { space, useTheme } from '../../../lib/theme';
import { useReminders } from '../../../lib/useReminders';

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();
  const lang = useLang();
  const langPref = useLangPref();
  const mapPref = useMapProviderPref();
  const { provider: mapProvider, availableProviders: mapsAvailable } = useMapProvider(mapPref);
  const favorites = useFavorites();
  const markets = useMarkets();
  const fetchedAt = useFetchedAt();
  const refreshing = useRefreshing();
  const stale = useStale();
  const reminders = useReminders();
  const [scheduled, setScheduled] = useState<ScheduledReminder[] | null>(null);

  // The build number lives under different keys per platform (app.json) but is one number —
  // `npm run release` sets both. Version alone is useless for "what build are you on?" feedback.
  const buildInfo: BuildInfo = {
    version: Constants.expoConfig?.version ?? null,
    build: Platform.select({
      ios: Constants.expoConfig?.ios?.buildNumber,
      default: Constants.expoConfig?.android?.versionCode?.toString(),
    }),
    os: Platform.OS,
    osVersion: Platform.Version,
  };

  const confirmRemoveAll = () => {
    Alert.alert(t('removeAllTitle'), t('removeAllConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('remove'), style: 'destructive', onPress: removeAllFavorites },
    ]);
  };

  const check = <Icon name="check" size={20} color="accent" />;
  const external = <Icon name="external" size={18} color="textFaint" />;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {/* The two languages stay in their own script — a reader looking for 中文 should not have
          to find it behind an English label. "System default" is the one row that translates. */}
      <SettingsSection title={t('language')}>
        <Row
          label={t('langSystem')}
          accessory={langPref === 'system' ? check : undefined}
          onPress={() => setLang('system')}
        />
        <Row
          label="English"
          accessory={langPref === 'en' ? check : undefined}
          onPress={() => setLang('en')}
        />
        <Row
          label="中文"
          accessory={langPref === 'zh' ? check : undefined}
          onPress={() => setLang('zh')}
          last
        />
      </SettingsSection>

      <SettingsSection title={t('reminders')} footer={t('reminderSchedule')}>
        <Row
          label={t('enableReminders')}
          last
          accessory={
            <Switch
              value={reminders.enabled}
              disabled={reminders.busy}
              onValueChange={() => void reminders.toggle()}
              trackColor={{ true: theme.colors.accent, false: theme.colors.divider }}
            />
          }
        />
      </SettingsSection>

      {/* iOS only: Android's `geo:` hand-off already goes to whichever map app is default there.
          Rows are shown optimistically before the probe lands, then filtered to installed apps. */}
      {MAP_CHOICE_SUPPORTED && (mapsAvailable === null || mapsAvailable.length > 0) && (
        <SettingsSection title={t('mapsSection')} footer={t('addressOpensIn')}>
          {(mapsAvailable ?? MAP_PROVIDERS).map((p, i, arr) => (
            <Row
              key={p}
              label={p === 'apple' ? t('appleMaps') : t('googleMaps')}
              accessory={mapProvider === p ? check : undefined}
              onPress={() => setMapProvider(p)}
              last={i === arr.length - 1}
            />
          ))}
        </SettingsSection>
      )}

      <SettingsSection title={t('myMarkets')} footer={t('swipeDelete')}>
        <Row
          label={t('removeAll')}
          detail={`${favorites.length}/${MAX_FAVORITES}`}
          icon="trash"
          destructive
          onPress={favorites.length > 0 ? confirmRemoveAll : undefined}
          last
        />
      </SettingsSection>

      {/* The clock in "Last updated" is the proof the refresh landed — without it a same-day
          refresh changes nothing on screen, and the row reads as a dead button. */}
      <SettingsSection title={t('dataSection')} footer={stale ? t('offline') : undefined}>
        <Row
          label={t('lastUpdated')}
          detail={fetchedAt ? formatDateTime(new Date(fetchedAt), lang) : '—'}
        />
        <Row
          label={t('refreshNow')}
          icon="refresh"
          accessory={refreshing ? <ActivityIndicator size="small" /> : undefined}
          onPress={() => void refresh()}
        />
        <Row
          label={t('dataSource')}
          detail={t('dataSourceLink')}
          accessory={external}
          onPress={() => void Linking.openURL(DATA_SOURCE_URL)}
          last
        />
      </SettingsSection>

      <SettingsSection title={t('about')}>
        <Row
          label={t('source')}
          accessory={external}
          onPress={() => void Linking.openURL(REPO_URL)}
        />
        <Row
          label={t('feedback')}
          accessory={external}
          onPress={() => void Linking.openURL(feedbackUrl(FEEDBACK_URL, buildInfo))}
        />
        <Row label={t('version')} detail={versionLabel(buildInfo)} last />
      </SettingsSection>

      {__DEV__ && (
        <SettingsSection title="Debug">
          <Row
            label={t('scheduledReminders')}
            icon="bell"
            detail={scheduled ? `${scheduled.length} armed — tap to hide` : undefined}
            onPress={() => {
              if (scheduled) {
                setScheduled(null);
                return;
              }
              void listScheduled(favorites, markets, lang).then(setScheduled);
            }}
          />
          {scheduled?.length === 0 && <Row label="Nothing armed" />}
          {scheduled?.map((reminder) => {
            const { label, detail } = describeScheduled(reminder, lang);
            return <Row key={reminder.identifier} label={label} detail={detail} />;
          })}
          <Row
            label={t('sendTestReminder')}
            icon="bell"
            last
            onPress={() => {
              void sendTestReminder(favorites, markets, lang).then((sent) => {
                if (!sent) Alert.alert(t('sendTestReminder'), t('reminderBlocked'));
              });
            }}
          />
        </SettingsSection>
      )}
    </ScrollView>
  );
}

/**
 * One armed reminder, as the two things a count cannot tell you: which markets it names, and when
 * it fires against which closure. Times are on the device clock, not SGT. Dev-only, so it is not
 * translated — only the market names follow the app's language, because the notification's do.
 */
function describeScheduled(
  reminder: ScheduledReminder,
  lang: Lang
): { label: string; detail: string } {
  const { entry } = reminder;
  if (!entry) {
    return {
      label: reminder.title || reminder.identifier,
      detail: `${reminder.identifier} · stale, no longer in the schedule`,
    };
  }
  return {
    label: entry.markets.join(', '),
    detail: `fires ${formatDateTime(entry.at, lang)} · closes ${formatDate(entry.date, lang)} · ${entry.reasons.join(', ')}`,
  };
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.xl, paddingBottom: space.xxxl },
});
