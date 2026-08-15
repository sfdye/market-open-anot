import { Tabs } from 'expo-router/js-tabs';
import { Icon, Text } from '../../components/ui';
import { useT } from '../../lib/store';
import { fontCap } from '../../lib/theme';

export default function TabsLayout() {
  const t = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // The tab label is one of the two places in the app that caps font scaling: it sits in
        // a bar of fixed height, so past a point it can only truncate.
        tabBarLabel: ({ color, children }) => (
          <Text
            variant="footnote"
            numberOfLines={1}
            maxFontSizeMultiplier={fontCap.tabLabel}
            style={{ color: color as string, fontSize: 12, fontWeight: '500' }}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="(today)"
        options={{
          title: t('tabToday'),
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'today' : 'todayOutline'} size={26} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="(map)"
        options={{
          title: t('tabMap'),
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'map' : 'mapOutline'} size={26} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name={focused ? 'settings' : 'settingsOutline'}
              size={26}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
