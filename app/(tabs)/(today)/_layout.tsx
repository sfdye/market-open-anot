import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Icon } from '../../../components/ui';
import { useT } from '../../../lib/store';

export default function TodayLayout() {
  const router = useRouter();
  const t = useT();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('appTitle'),
          headerLargeTitle: true,
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/add')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('addMarkets')}
            >
              <Icon name="add" size={28} color="accent" />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
