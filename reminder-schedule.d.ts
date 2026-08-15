/** Hand-written types for reminder-schedule.js. */

import type { ClosureReason, Market } from './market-logic';

export const HORIZON_DAYS: number;

export interface DateGroup {
  /** Civil date of the closure — local Y/M/D match Singapore's. */
  date: Date;
  /** Display names of every favourite closed on that date. */
  names: string[];
  reasons: ClosureReason[];
}

export interface ScheduleEntry {
  identifier: string;
  title: string;
  body: string;
  /** The instant to fire, as a real point in time. */
  at: Date;
  markets: string[];
}

/** Today's Singapore calendar date, as a Date whose local Y/M/D match Singapore's. */
export function sgToday(now?: Date): Date;

/** The real instant of `hour`:00 Singapore time on the given civil date. */
export function sgInstant(civil: Date, hour: number): Date;

/** Stable `YYYY-M-D` key for collapsing closures on the same civil date. */
export function civilKey(date: Date): string;

/** A market's name as it reads in a notification — the parenthesised part when present. */
export function shortName(rawName: string): string;

export function groupClosuresByDate(
  favorites: string[],
  markets: Market[],
  today: Date
): DateGroup[];

export function notificationCopy(
  group: Pick<DateGroup, 'names' | 'reasons'>,
  isToday: boolean,
  lang: 'en' | 'zh'
): { title: string; body: string };

/** Every reminder to queue: 7pm the evening before and 6am the morning of each closure. */
export function buildSchedule(
  favorites: string[],
  markets: Market[],
  lang: 'en' | 'zh',
  now?: Date
): ScheduleEntry[];
