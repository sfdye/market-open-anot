import { StyleSheet, ScrollView } from 'react-native';
import SettingsSection from '../../../components/SettingsSection';
import { Icon, Row } from '../../../components/ui';
import { setLang, useLangPref, useT } from '../../../lib/store';
import { space } from '../../../lib/theme';

export default function LanguageScreen() {
  const t = useT();
  const langPref = useLangPref();
  const check = <Icon name="check" size={20} color="accent" />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      {/* The two languages stay in their own script — a reader looking for 中文 should not have
          to find it behind an English label. "System default" is the one row that translates. */}
      <SettingsSection title={t('language')}>
        <Row
          label={t('langSystem')}
          accessory={langPref === 'system' ? check : undefined}
          onPress={() => setLang('system')}
          testID="lang-system"
        />
        <Row
          label="English"
          accessory={langPref === 'en' ? check : undefined}
          onPress={() => setLang('en')}
          testID="lang-en"
        />
        <Row
          label="中文"
          accessory={langPref === 'zh' ? check : undefined}
          onPress={() => setLang('zh')}
          testID="lang-zh"
          last
        />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.xl, paddingBottom: space.xxxl },
});
