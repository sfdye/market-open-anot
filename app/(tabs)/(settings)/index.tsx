import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import SettingsSection from '../../../components/SettingsSection';
import { Icon, Row } from '../../../components/ui';
import { MAX_FAVORITES } from '../../../lib/core/favorites';
import { versionLabel, type BuildInfo } from '../../../lib/core/version-info';
import { formatDate, formatDateTime } from '../../../lib/date';
import { MAP_CHOICE_SUPPORTED, useMapProvider } from '../../../lib/maps';
import { listScheduled, sendTestReminder } from '../../../lib/notifications';
import type { ScheduledReminder } from '../../../lib/notifications';
import type { Lang } from '../../../lib/i18n';
import {
  refresh,
  removeAllFavorites,
  useFavorites,
  useFetchedAt,
  useLang,
  useLangPref,
  useMapProviderPref,
  useMarkets,
  useRefreshing,
  useStale,
  useT,
  useThemePref,
} from '../../../lib/store';
import { space, useTheme } from '../../../lib/theme';
import { useReminders } from '../../../lib/useReminders';

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const lang = useLang();
  const langPref = useLangPref();
  const themePref = useThemePref();
  const mapPref = useMapProviderPref();
  const { provider: mapProvider, availableProviders: mapsAvailable } = useMapProvider(mapPref);
  const favorites = useFavorites();
  const markets = useMarkets();
  const fetchedAt = useFetchedAt();
  const refreshing = useRefreshing();
  const stale = useStale();
  const reminders = useReminders();
  const [scheduled, setScheduled] = useState<ScheduledReminder[] | null>(null);

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

  const langDetail = langPref === 'system' ? t('langSystem') : langPref === 'en' ? 'English' : '中文';
  const themeDetail = themePref === 'system' ? t('themeSystem') : themePref === 'light' ? t('themeLight') : t('themeDark');
  const mapsDetail = mapProvider === 'apple' ? t('appleMaps') : t('googleMaps');
  const showMapsRow = MAP_CHOICE_SUPPORTED && (mapsAvailable === null || mapsAvailable.length > 0);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <SettingsSection title={t('general')} icon="general">
        <Row
          label={t('language')}
          detail={langDetail}
          chevron
          onPress={() => router.push('/language')}
          testID="row-language"
        />
        <Row
          label={t('appearance')}
          detail={themeDetail}
          chevron
          onPress={() => router.push('/appearance')}
          testID="row-appearance"
          last={!showMapsRow}
        />
        {showMapsRow && (
          <Row
            label={t('mapsSection')}
            detail={mapsDetail}
            chevron
            onPress={() => router.push('/maps')}
            testID="row-maps"
            last
          />
        )}
      </SettingsSection>

      <SettingsSection title={t('reminders')} icon="bellOutline" footer={t('reminderSchedule')}>
        <Row
          label={t('enableReminders')}
          last
          testID="settings-reminders"
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

      <SettingsSection title={t('myMarkets')} icon="market" footer={t('swipeDelete')}>
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
      <SettingsSection title={t('dataSection')} icon="sync" footer={stale ? t('offline') : undefined}>
        <Row
          label={t('lastUpdated')}
          detail={fetchedAt ? formatDateTime(new Date(fetchedAt), lang) : '—'}
        />
        <Row
          label={t('refreshNow')}
          icon="refresh"
          accessory={refreshing ? <ActivityIndicator size="small" /> : undefined}
          onPress={() => void refresh()}
          last
        />
      </SettingsSection>

      <SettingsSection title={t('about')} icon="info">
        <Row
          label={t('about')}
          detail={versionLabel(buildInfo)}
          chevron
          onPress={() => router.push('/about')}
          testID="row-about"
          last
        />
      </SettingsSection>

      {__DEV__ && (
        <SettingsSection title="Debug" icon="bug">
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
