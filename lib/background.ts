import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { resolveLang } from './lang';
import { fetchMarketsFromAPI } from './markets';
import { isPermissionGranted, rescheduleAll } from './notifications';
import * as storage from './storage';

const TASK_NAME = 'oa-refresh-reminders';

/** Once a day is plenty — closure dates are published months ahead. */
const MINIMUM_INTERVAL_MINUTES = 24 * 60;

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    if (!(await storage.loadRemindersEnabled()) || !(await isPermissionGranted())) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const [favorites, langPref] = await Promise.all([
      storage.loadFavorites(),
      storage.loadLangPref(),
    ]);
    if (favorites.length === 0) return BackgroundTask.BackgroundTaskResult.Success;

    const markets = (await fetchMarketsFromAPI()) ?? (await storage.loadCachedMarkets());
    if (!markets) return BackgroundTask.BackgroundTaskResult.Failed;

    await rescheduleAll(favorites, markets, resolveLang(langPref));
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
