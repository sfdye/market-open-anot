import { getUpcomingClosures, parseMarketName } from './market-logic.ts';
import type { ClosureReason, Lang, Market } from './market-logic.ts';
import { zhNames } from './zh-names.ts';

export type { Lang };

export interface DateGroup {
  /** Civil date of the closure — local Y/M/D match Singapore's. */
  date: Date;
  /** Display names of every favourite closed on that date, in the user's language. */
  names: string[];
  /** The same markets by their raw NEA name, which is what a lookup needs. */
  rawNames: string[];
  reasons: ClosureReason[];
}

export interface ScheduleEntry {
  identifier: string;
  title: string;
  body: string;
  /** The instant to fire, as a real point in time. */
  at: Date;
  markets: string[];
  /** Raw NEA names, so a notification tap can open the market it is about. */
  rawNames: string[];
}

// Singapore has been a fixed UTC+8 with no DST since 1982, so a constant offset is exact.
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

// Far enough ahead to cover the next quarterly cleaning window, short enough that
// per-date grouping keeps us clear of iOS's ~64 pending-request ceiling.
export const HORIZON_DAYS = 90;

// Two reminders per closure date, in SGT: after dinner the evening before, and early enough
// the next morning to catch someone before they set out.
const EVENING_BEFORE_HOUR = 19;
const MORNING_OF_HOUR = 6;

/**
 * Today's Singapore calendar date as a Date whose *local* Y/M/D match Singapore's.
 * market-logic.ts reads dates with local getters and parses DD/MM/YYYY into local
 * midnight, so feeding it these "civil" dates keeps status correct in any device timezone.
 */
export function sgToday(now?: Date): Date {
  const sgt = new Date((now || new Date()).getTime() + SGT_OFFSET_MS);
  return new Date(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate());
}

/** The real instant of `hour`:00 Singapore time on the given civil date. */
export function sgInstant(civil: Date, hour: number): Date {
  const utc = Date.UTC(civil.getFullYear(), civil.getMonth(), civil.getDate(), hour);
  return new Date(utc - SGT_OFFSET_MS);
}

/** Stable `YYYY-M-D` key for collapsing closures that fall on the same civil date. */
export function civilKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * A market's name as it reads in a notification: the parenthesised part when present, and its
 * Chinese name when the app is in Chinese. Notifications used to be half-translated — the copy
 * was Chinese but the names stayed English — because this went through the raw name.
 */
export function displayName(rawName: string, lang: Lang): string {
  const { friendly } = parseMarketName(rawName);
  return lang === 'zh' ? (zhNames[friendly] ?? friendly) : friendly;
}

function findMarket(markets: Market[], name: string): Market | null {
  for (const market of markets) {
    if (market.name === name) return market;
  }
  return null;
}

/**
 * Closures across all favourites over the next HORIZON_DAYS days, collapsed to one entry
 * per date so five favourites closing the same day become one notification.
 *
 * Mondays are excluded: the weekly rest day is predictable, and reminding about it would be
 * 52+ notifications per market per year — enough for the user to turn reminders off entirely.
 */
export function groupClosuresByDate(
  favorites: string[],
  markets: Market[],
  today: Date,
  lang: Lang
): DateGroup[] {
  const groups = new Map<string, DateGroup>();

  for (const favorite of favorites) {
    const market = findMarket(markets, favorite);
    if (!market) continue;

    for (const closure of getUpcomingClosures(market, HORIZON_DAYS, today)) {
      if (closure.reason === 'monday') continue;

      const key = civilKey(closure.date);
      let group = groups.get(key);
      if (!group) {
        group = { date: closure.date, names: [], rawNames: [], reasons: [] };
        groups.set(key, group);
      }
      if (!group.rawNames.includes(favorite)) {
        group.rawNames.push(favorite);
        group.names.push(displayName(favorite, lang));
      }
      if (!group.reasons.includes(closure.reason)) group.reasons.push(closure.reason);
    }
  }

  return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Bilingual notification copy, with a separate variant for maintenance closures. */
export function notificationCopy(
  group: Pick<DateGroup, 'names' | 'reasons'>,
  isToday: boolean,
  lang: Lang
): { title: string; body: string } {
  const names = group.names.join(', ');
  const cleaningOnly = group.reasons.length === 1 && group.reasons[0] === 'cleaning';

  if (lang === 'zh') {
    const zhWhy = cleaningOnly ? '清洁' : '维修';
    return {
      title: isToday ? `🚫 今天关门（${zhWhy}）` : `⚠️ 明天关门（${zhWhy}）`,
      body: isToday
        ? `${names} 今天关闭${zhWhy} — 别白跑一趟！`
        : `${names} 明天关闭${zhWhy} — 请改天再去。`,
    };
  }

  const why = cleaningOnly ? 'for cleaning' : 'for maintenance';
  return {
    title: isToday ? `🚫 Closed today ${why}` : `⚠️ Closed tomorrow ${why}`,
    body: isToday
      ? `${names} is closed — don't make the trip!`
      : `${names} is closed tomorrow — plan another day.`,
  };
}

/**
 * The full set of reminders to queue: two per closure date, 7pm the evening before and
 * 6am the morning of, skipping any instant already in the past. Pure — the caller hands
 * these to expo-notifications.
 */
export function buildSchedule(
  favorites: string[],
  markets: Market[],
  lang: Lang,
  now?: Date
): ScheduleEntry[] {
  const at = now || new Date();
  const groups = groupClosuresByDate(favorites, markets, sgToday(at), lang);
  const entries: ScheduleEntry[] = [];

  for (const group of groups) {
    const d = group.date;
    const dayBefore = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    const slots = [
      { slot: 'eve', when: sgInstant(dayBefore, EVENING_BEFORE_HOUR), isToday: false },
      { slot: 'morn', when: sgInstant(d, MORNING_OF_HOUR), isToday: true },
    ];

    for (const { slot, when, isToday } of slots) {
      if (when.getTime() <= at.getTime()) continue;
      const copy = notificationCopy(group, isToday, lang);
      entries.push({
        identifier: `moa-${civilKey(d)}-${slot}`,
        title: copy.title,
        body: copy.body,
        at: when,
        markets: group.names.slice(),
        rawNames: group.rawNames.slice(),
      });
    }
  }

  return entries;
}
