import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../components/ui';
import { useT } from '../lib/store';
import { space } from '../lib/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const t = useT();

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: space.xl }}>
      <EmptyState
        icon="info"
        title={t('notFound')}
        actionTitle={t('goHome')}
        onAction={() => router.replace('/')}
      />
    </View>
  );
}
