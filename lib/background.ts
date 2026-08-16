import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { deviceLang } from './device-lang';
import { fetchMarketsFromAPI } from './markets';
import { isPermissionGranted, rescheduleAll } from './notifications';
import * as storage from './storage';

const TASK_NAME = 'moa-refresh-reminders';

/** Once a day is plenty — closure dates are published months ahead. */
const MINIMUM_INTERVAL_MINUTES = 24 * 60;

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    if (!(await storage.loadRemindersEnabled()) || !(await isPermissionGranted())) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const [favorites, lang] = await Promise.all([storage.loadFavorites(), storage.loadLang()]);
    if (favorites.length === 0) return BackgroundTask.BackgroundTaskResult.Success;

    const markets = (await fetchMarketsFromAPI()) ?? (await storage.loadCachedMarkets());
    if (!markets) return BackgroundTask.BackgroundTaskResult.Failed;

    // No stored language means the app is following the device, so ask the device — defaulting
    // to English here sent English reminders to a phone running the app in Chinese.
    await rescheduleAll(favorites, markets, lang ?? deviceLang());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Best-effort top-up. iOS grants background refresh at its discretion, so cold-start
 * rescheduling in the store is the reliable path — this only shrinks the window in which a
 * newly published short-notice closure goes unnoticed.
 */
export async function registerBackgroundRefresh(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) return;
    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: MINIMUM_INTERVAL_MINUTES,
    });
  } catch {
    // Unavailable on this device (or restricted by the user); reminders still work.
  }
}
