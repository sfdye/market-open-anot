import { Stack } from 'expo-router';
import { useT } from '../../../lib/store';

export default function MapLayout() {
  const t = useT();

  return (
    <Stack>
      {/* No large title: the map wants the height, and there is nothing to scroll. */}
      <Stack.Screen name="index" options={{ title: t('tabMap') }} />
    </Stack>
  );
}
