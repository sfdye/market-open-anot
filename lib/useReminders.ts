import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useStore } from './store';
import { cancelAll, requestPermission, rescheduleAll } from './notifications';
import * as storage from './storage';

export function useReminders() {
  const { remindersEnabled, setRemindersEnabled, favorites, markets, lang, t } = useStore();
  const [busy, setBusy] = useState(false);
  // Assume dismissed until storage answers, so the card never flashes in.
  const [cardDismissed, setCardDismissed] = useState(true);

  useEffect(() => {
    void storage.loadReminderCardDismissed().then(setCardDismissed);
  }, []);

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
  }, [busy, remindersEnabled, setRemindersEnabled, favorites, markets, lang, t]);

  const dismissCard = useCallback(() => {
    setCardDismissed(true);
    void storage.saveReminderCardDismissed();
  }, []);

  return {
    busy,
    enabled: remindersEnabled,
    toggle,
    dismissCard,
    showCard: !remindersEnabled && !cardDismissed && favorites.length > 0,
  };
}
