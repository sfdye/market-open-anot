import { Stack } from 'expo-router';
import { useT } from '../../../lib/store';

export default function SettingsLayout() {
  const t = useT();

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: t('tabSettings'), headerLargeTitle: true }} />
      <Stack.Screen name="language" options={{ title: t('language') }} />
      <Stack.Screen name="appearance" options={{ title: t('appearance') }} />
      <Stack.Screen name="maps" options={{ title: t('mapsSection') }} />
      <Stack.Screen name="about" options={{ title: t('about') }} />
    </Stack>
  );
}
