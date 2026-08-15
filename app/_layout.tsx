import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../lib/store';
import { configureNotifications } from '../lib/notifications';
import { registerBackgroundRefresh } from '../lib/background';
import { colors } from '../lib/theme';

export default function RootLayout() {
  useEffect(() => {
    void configureNotifications();
    void registerBackgroundRefresh();
  }, []);

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="picker" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
