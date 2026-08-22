import { StyleSheet, ScrollView } from 'react-native';
import SettingsSection from '../../../components/SettingsSection';
import { Icon, Row } from '../../../components/ui';
import { setMapProvider, useMapProviderPref, useT } from '../../../lib/store';
import { MAP_PROVIDERS, MAP_CHOICE_SUPPORTED, useMapProvider } from '../../../lib/maps';
import { space } from '../../../lib/theme';

export default function MapsScreen() {
  const t = useT();
  const mapPref = useMapProviderPref();
  const { provider: mapProvider, availableProviders: mapsAvailable } = useMapProvider(mapPref);
  const check = <Icon name="check" size={20} color="accent" />;

  // Rows are shown optimistically before the probe lands, then filtered to installed apps.
  const providers = mapsAvailable ?? MAP_PROVIDERS;

  if (!MAP_CHOICE_SUPPORTED || providers.length === 0) return null;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <SettingsSection title={t('mapsSection')} footer={t('addressOpensIn')}>
        {providers.map((p, i, arr) => (
          <Row
            key={p}
            label={p === 'apple' ? t('appleMaps') : t('googleMaps')}
            accessory={mapProvider === p ? check : undefined}
            onPress={() => setMapProvider(p)}
            testID={`map-provider-${p}`}
            last={i === arr.length - 1}
          />
        ))}
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, gap: space.xl, paddingBottom: space.xxxl },
});
