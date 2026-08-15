import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useReady } from './store';

function marketOf(response: Notifications.NotificationResponse | null): string | null {
  const name = response?.notification.request.content.data?.market;
  return typeof name === 'string' && name.length > 0 ? name : null;
}

/**
 * Opens the market a reminder is about when the user taps it. Two paths are needed: the listener
 * catches taps while the app is running, and getLastNotificationResponseAsync catches the tap
 * that launched it — deferred until the store is hydrated, or the detail screen would have no
 * dataset to look the name up in. Both dedupe on the request identifier, since a cold-start tap
 * can arrive down either path and the "last response" survives for the whole session.
 */
export function useNotificationRouting(): void {
  const router = useRouter();
  const ready = useReady();
  const handled = useRef<string | null>(null);

  const open = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      const name = marketOf(response);
      if (name) router.push({ pathname: '/market/[name]', params: { name } });
    },
    [router]
  );

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [open]);

  useEffect(() => {
    if (!ready) return;
    void Notifications.getLastNotificationResponseAsync().then(open);
  }, [ready, open]);
}
