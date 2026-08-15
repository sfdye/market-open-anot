import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { buildSchedule, type Market } from './shared';
import type { Lang } from './i18n';

export const ANDROID_CHANNEL_ID = 'closures';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android 13+ wants the channel to exist before the permission prompt. */
export async function configureNotifications(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Closure reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function isPermissionGranted(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** True if reminders may be scheduled. False when the user has permanently denied. */
export async function requestPermission(): Promise<boolean> {
  await configureNotifications();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Cancels everything pending and rebuilds the schedule from scratch. Cheap enough to run on
 * every cold start, on any favourites or language change, and from the daily background task.
 * Returns how many reminders are now queued.
 */
export async function rescheduleAll(
  favorites: string[],
  markets: Market[],
  lang: Lang
): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await isPermissionGranted())) return 0;

  const entries = buildSchedule(favorites, markets, lang);

  for (const entry of entries) {
    await Notifications.scheduleNotificationAsync({
      identifier: entry.identifier,
      content: {
        title: entry.title,
        body: entry.body,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: entry.at },
    });
  }

  if (__DEV__ && entries.length > 60) {
    console.warn(
      `[notifications] ${entries.length} pending requests — iOS keeps only the ~64 soonest.`
    );
  }

  return entries.length;
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Verification aid — what is actually queued on the device right now. */
export async function listScheduled(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
