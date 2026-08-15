import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
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
        Alert.alert(t('reminderCardTitle'), t('reminderBlocked'));
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
