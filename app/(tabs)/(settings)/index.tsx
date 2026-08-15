import { Alert, Linking, ScrollView, StyleSheet, Switch } from 'react-native';
import Constants from 'expo-constants';
import SettingsSection from '../../../components/SettingsSection';
import { Icon, Row } from '../../../components/ui';
import { AUTHOR_URL, DATA_SOURCE_URL, FEEDBACK_URL, REPO_URL } from '../../../lib/constants';
import { formatDate } from '../../../lib/date';
import { listScheduled, sendTestReminder } from '../../../lib/notifications';
import {
  refresh,
  removeAllFavorites,
  setLang,
  useFavorites,
  useFetchedAt,
  useLang,
  useMarkets,
  useT,
} from '../../../lib/store';
import { space, useTheme } from '../../../lib/theme';
import { useReminders } from '../../../lib/useReminders';

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();
  const lang = useLang();
  const favorites = useFavorites();
  const markets = useMarkets();
  const fetchedAt = useFetchedAt();
  const reminders = useReminders();

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
      <SettingsSection title={t('language')}>
        <Row label="English" accessory={lang === 'en' ? check : undefined} onPress={() => setLang('en')} />
        <Row label="中文" accessory={lang === 'zh' ? check : undefined} onPress={() => setLang('zh')} last />
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

      <SettingsSection title={t('myMarkets')} footer={t('swipeDelete')}>
        <Row
          label={t('removeAll')}
          detail={String(favorites.length)}
          icon="trash"
          destructive
          onPress={favorites.length > 0 ? confirmRemoveAll : undefined}
          last
        />
      </SettingsSection>

      <SettingsSection title={t('dataSection')}>
        <Row
          label={t('lastUpdated')}
          detail={fetchedAt ? formatDate(new Date(fetchedAt), lang) : '—'}
        />
        <Row label={t('refreshNow')} icon="refresh" onPress={() => void refresh()} />
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
          label={t('madeBy')}
          accessory={external}
          onPress={() => void Linking.openURL(AUTHOR_URL)}
        />
        <Row
          label={t('source')}
          accessory={external}
          onPress={() => void Linking.openURL(REPO_URL)}
        />
        <Row
          label={t('feedback')}
          accessory={external}
          onPress={() => void Linking.openURL(FEEDBACK_URL)}
        />
        <Row label={t('version')} detail={Constants.expoConfig?.version ?? '—'} last />
      </SettingsSection>

      {__DEV__ && (
        <SettingsSection title="Debug">
          <Row
            label={t('scheduledReminders')}
            icon="bell"
            onPress={() => {
              void listScheduled().then((requests) => {
                for (const request of requests) console.log(request.identifier, request.trigger);
                Alert.alert(t('scheduledReminders'), String(requests.length));
              });
            }}
          />
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

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.xl, paddingBottom: space.xxxl },
});
