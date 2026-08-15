import { Stack } from 'expo-router';
import { useT } from '../../../lib/store';

export default function SettingsLayout() {
  const t = useT();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('tabSettings'), headerLargeTitle: true }} />
    </Stack>
  );
}
