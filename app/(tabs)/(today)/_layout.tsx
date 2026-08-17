import { Stack } from 'expo-router';
import { useT } from '../../../lib/store';

export default function TodayLayout() {
  const t = useT();

  return (
    <Stack>
      {/* No headerRight: adding is the screen's Fab, within thumb reach of the bottom right. */}
      <Stack.Screen name="index" options={{ title: t('appTitle'), headerLargeTitle: true }} />
    </Stack>
  );
}
