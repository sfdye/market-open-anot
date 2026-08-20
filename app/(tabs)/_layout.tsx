import { Tabs } from 'expo-router/js-tabs';
import { Icon } from '../../components/ui';
import { useT } from '../../lib/store';

export default function TabsLayout() {
  const t = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
