import { useEffect } from 'react';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initStore, useReady, useT } from '../lib/store';
import { configureNotifications } from '../lib/notifications';
import { registerBackgroundRefresh } from '../lib/background';
import { navigationTheme, useTheme } from '../lib/theme';
import { useNotificationRouting } from '../lib/useNotificationRouting';

// Hold the splash until the store has hydrated, so the first frame is the real list
// rather than an empty screen.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 200 });

export default function RootLayout() {
  const theme = useTheme();
  const t = useT();
  useNotificationRouting();

  useEffect(() => {
    initStore();
    void configureNotifications();
    void registerBackgroundRefresh();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* One theme for the native chrome — headers, large titles, search bar, tab bar. */}
        <ThemeProvider value={navigationTheme(theme)}>
          <SplashGate />
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Detail and the add modal sit above the tabs, so a notification tap, the map
                callout and the Today list can all reach them the same way. */}
            <Stack.Screen name="market/[name]" options={{ title: '' }} />
            <Stack.Screen name="add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="+not-found" options={{ title: t('notFound') }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function SplashGate() {
  const ready = useReady();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  return null;
}
