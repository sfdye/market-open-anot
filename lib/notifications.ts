import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  buildSchedule,
  displayName,
  notificationCopy,
  MAX_SCHEDULED_REMINDERS,
} from './core/reminder-schedule';
import type { ScheduleEntry } from './core/reminder-schedule';
import type { Market } from './core/market-logic';
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

  const all = buildSchedule(favorites, markets, lang).sort(
    (a, b) => a.at.getTime() - b.at.getTime()
  );
  const entries = all.slice(0, MAX_SCHEDULED_REMINDERS);

  for (const entry of entries) {
    await Notifications.scheduleNotificationAsync({
      identifier: entry.identifier,
      content: {
        title: entry.title,
        body: entry.body,
        // Only deep-link when the reminder is about a single market; otherwise it opens the app.
        data: entry.rawNames.length === 1 ? { market: entry.rawNames[0] } : {},
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: entry.at },
    });
  }

  if (__DEV__ && all.length > entries.length) {
    console.warn(
      `[notifications] capped at ${entries.length} of ${all.length} reminders; the rest queue up later.`
    );
  }

  return entries.length;
}

/**
 * Dev aid: fires the next real reminder (or a synthetic one for the first favourite) 10 seconds
 * from now, which exercises the Android channel, the foreground handler and the tap-to-detail
 * deep link without waiting for a closure. Returns false if there is nothing to send.
 */
export async function sendTestReminder(
  favorites: string[],
  markets: Market[],
  lang: Lang
): Promise<boolean> {
  if (!(await isPermissionGranted())) return false;

  const next = buildSchedule(favorites, markets, lang)[0];
  const rawName = next?.rawNames[0] ?? favorites[0];
  if (!rawName) return false;

  const copy = next
    ? { title: next.title, body: next.body }
    : notificationCopy({ names: [displayName(rawName, lang)], reasons: ['cleaning'] }, true, lang);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      data: { market: rawName },
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
  });
  return true;
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export interface ScheduledReminder {
  identifier: string;
  /** Only needed when `entry` is null: with no entry to describe, this is all there is to show. */
  title: string;
  /** The entry the request was built from, rebuilt now. Null once it has left the schedule. */
  entry: ScheduleEntry | null;
}

/**
 * Verification aid — what is actually queued on the device right now, paired with the market names,
 * closure date and reasons behind each one. The detail has to come from rebuilding the schedule and
 * matching identifiers, because the pending request itself is nearly opaque: iOS turns our date
 * trigger into a `UNTimeIntervalNotificationTrigger` counted from the moment it was scheduled, so
 * not even the fire time survives the round trip. A request with no entry is a stale one that the
 * last `rescheduleAll` should have cleared — worth seeing rather than hiding.
 */
export async function listScheduled(
  favorites: string[],
  markets: Market[],
  lang: Lang
): Promise<ScheduledReminder[]> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const entries = new Map(
    buildSchedule(favorites, markets, lang).map((entry) => [entry.identifier, entry])
  );

  return requests
    .map((request) => ({
      identifier: request.identifier,
      title: request.content.title ?? '',
      entry: entries.get(request.identifier) ?? null,
    }))
    .sort((a, b) => (a.entry?.at.getTime() ?? Infinity) - (b.entry?.at.getTime() ?? Infinity));
}
