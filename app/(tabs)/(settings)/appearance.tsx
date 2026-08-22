import { StyleSheet, ScrollView } from 'react-native';
import SettingsSection from '../../../components/SettingsSection';
import { Icon, Row } from '../../../components/ui';
import { setThemePref, useThemePref, useT } from '../../../lib/store';
import { space } from '../../../lib/theme';

export default function AppearanceScreen() {
  const t = useT();
  const themePref = useThemePref();
  const check = <Icon name="check" size={20} color="accent" />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <SettingsSection title={t('appearance')}>
        <Row
          label={t('themeSystem')}
          accessory={themePref === 'system' ? check : undefined}
          onPress={() => setThemePref('system')}
          testID="theme-system"
        />
        <Row
          label={t('themeLight')}
          accessory={themePref === 'light' ? check : undefined}
          onPress={() => setThemePref('light')}
          testID="theme-light"
        />
        <Row
          label={t('themeDark')}
          accessory={themePref === 'dark' ? check : undefined}
          onPress={() => setThemePref('dark')}
          testID="theme-dark"
          last
        />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.xl, paddingBottom: space.xxxl },
});
