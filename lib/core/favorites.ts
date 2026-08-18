/**
 * The most markets a user may follow at once.
 *
 * Ten is well past what anyone shops at — the picker is sorted by distance and the markets within
 * walking or bus distance of one home are two or three — and it is what keeps the reminder queue
 * sane. Every closure date costs two notifications (evening before, morning of) and a cleaning
 * window runs three or four days, so a single favourite can be six to eight reminders a quarter.
 * At ten the 90-day queue stays inside `MAX_SCHEDULED_REMINDERS` — asserted in
 * `reminder-schedule.test.ts` — where the daily top-up can keep pace; at twenty it would routinely
 * be truncated, which silently drops the *latest* reminders and makes the feature unpredictable.
 */
export const MAX_FAVORITES = 10;

/**
 * `favorites` with `name` added or removed, or null when the list is full and this would be an
 * add — the caller has to say so rather than let the tap do nothing.
 *
 * A removal is never refused, even from a list already over the limit: an install from before the
 * limit existed keeps every favourite it had, and nothing prunes them. Silently deleting markets a
 * user chose would be worse than letting them sit above the cap until they remove one themselves.
 */
export function toggledFavorites(favorites: string[], name: string): string[] | null {
  if (favorites.includes(name)) return favorites.filter((f) => f !== name);
  if (favorites.length >= MAX_FAVORITES) return null;
  return [...favorites, name];
}
