import { Linking, Platform, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import SettingsSection from '../../../components/SettingsSection';
import { Icon, Row } from '../../../components/ui';
import { DATA_SOURCE_URL, FEEDBACK_URL, ONEMAP_URL, OPEN_DATA_LICENCE_URL, REPO_URL } from '../../../lib/constants';
import { feedbackUrl, versionLabel, type BuildInfo } from '../../../lib/core/version-info';
import { formatDate } from '../../../lib/date';
import { useFetchedAt, useLang, useT } from '../../../lib/store';
import { space } from '../../../lib/theme';

export default function AboutScreen() {
  const t = useT();
  const lang = useLang();
  const fetchedAt = useFetchedAt();

  const buildInfo: BuildInfo = {
    version: Constants.expoConfig?.version ?? null,
    build: Platform.select({
      ios: Constants.expoConfig?.ios?.buildNumber,
      default: Constants.expoConfig?.android?.versionCode?.toString(),
    }),
    os: Platform.OS,
    osVersion: Platform.Version,
  };

  const external = <Icon name="external" size={18} color="textFaint" />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
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

      <SettingsSection
        title={t('attribution')}
        footer={t('attributionFooter', {
          date: fetchedAt ? formatDate(new Date(fetchedAt), lang) : '—',
        })}
      >
        <Row
          label={t('openDataLicence')}
          accessory={external}
          onPress={() => void Linking.openURL(OPEN_DATA_LICENCE_URL)}
        />
        <Row
          label={t('onemapCredit')}
          accessory={external}
          onPress={() => void Linking.openURL(ONEMAP_URL)}
        />
        <Row
          label={t('dataSource')}
          detail={t('dataSourceLink')}
          accessory={external}
          onPress={() => void Linking.openURL(DATA_SOURCE_URL)}
          last
        />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.xl, paddingBottom: space.xxxl },
});
