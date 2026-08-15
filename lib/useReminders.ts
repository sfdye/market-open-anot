import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { cancelAll, requestPermission, rescheduleAll } from './notifications';
import {
  dismissReminderCard,
  setRemindersEnabled,
  useFavorites,
  useLang,
  useMarkets,
  useReminderCardDismissed,
  useRemindersEnabled,
  useT,
} from './store';

export function useReminders() {
  const remindersEnabled = useRemindersEnabled();
  const cardDismissed = useReminderCardDismissed();
  const favorites = useFavorites();
  const markets = useMarkets();
  const lang = useLang();
  const t = useT();
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (remindersEnabled) {
        await cancelAll();
        setRemindersEnabled(false);
        return;
      }
      if (!(await requestPermission())) {
        // A dead-end alert is no use once the OS refuses to ask again — the only way out is the
        // system settings page.
        Alert.alert(t('reminderCardTitle'), t('reminderBlocked'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('openSettings'), onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      await rescheduleAll(favorites, markets, lang);
      setRemindersEnabled(true);
    } finally {
      setBusy(false);
    }
  }, [busy, remindersEnabled, favorites, markets, lang, t]);

  return {
    busy,
    enabled: remindersEnabled,
    toggle,
    dismissCard: dismissReminderCard,
    showCard: !remindersEnabled && !cardDismissed && favorites.length > 0,
  };
}
