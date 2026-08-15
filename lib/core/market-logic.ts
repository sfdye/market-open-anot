/** One record from the NEA "Dates of Hawker Centres Closure" dataset. */
export interface Market {
  name: string;
  address_myenv?: string;
  photourl?: string;
  latitude_hc?: string;
  longitude_hc?: string;
  no_of_market_stalls?: string;
  no_of_food_stalls?: string;
  q1_cleaningstartdate?: string;
  q1_cleaningenddate?: string;
  q2_cleaningstartdate?: string;
  q2_cleaningenddate?: string;
  q3_cleaningstartdate?: string;
  q3_cleaningenddate?: string;
  q4_cleaningstartdate?: string;
  q4_cleaningenddate?: string;
  other_works_startdate?: string;
  other_works_enddate?: string;
  remarks_other_works?: string;
}

export type Lang = 'en' | 'zh';

export type ClosureReason = 'cleaning' | 'other_works' | 'monday';

export type MarketStatus =
  | { status: 'open' }
  | { status: 'warning'; reason: 'monday' }
  | { status: 'closed'; reason: 'cleaning'; start: Date; end: Date }
  | { status: 'closed'; reason: 'other_works'; remarks: string; start: Date; end: Date };

export interface Closure {
  date: Date;
  reason: ClosureReason;
  remarks?: string;
}

export interface ParsedMarketName {
  /** Street address portion, or '' when the raw name has no parenthesised part. */
  street: string;
  /** Human-facing name — the parenthesised part when present. */
  friendly: string;
}

/** Exported so callers building `${q}_cleaningstartdate` keys resolve to declared fields. */
export const QUARTERS = ['q1', 'q2', 'q3', 'q4'] as const;

/** Parses a `DD/MM/YYYY` string. Returns null for blank or malformed input. */
export function parseDateDMY(str: string | null | undefined): Date | null {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m - 1, d);
}

/** Midnight of `date` in the local timezone. */
export function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getMarketStatus(market: Market, date: Date): MarketStatus {
  const today = stripTime(date);

  for (const q of QUARTERS) {
    const start = parseDateDMY(market[`${q}_cleaningstartdate`]);
    const end = parseDateDMY(market[`${q}_cleaningenddate`]);
    if (start && end && today >= start && today <= end) {
      return { status: 'closed', reason: 'cleaning', start, end };
    }
  }

  const owStart = parseDateDMY(market.other_works_startdate);
  const owEnd = parseDateDMY(market.other_works_enddate);
  if (owStart && owEnd && today >= owStart && today <= owEnd) {
    return {
      status: 'closed',
      reason: 'other_works',
      remarks: market.remarks_other_works || '',
      start: owStart,
      end: owEnd,
    };
  }

  if (today.getDay() === 1) {
    return { status: 'warning', reason: 'monday' };
  }

  return { status: 'open' };
}

/** Closures and warnings over the next `days` days, starting the day after `fromDate`. */
export function getUpcomingClosures(market: Market, days: number, fromDate: Date): Closure[] {
  const closures: Closure[] = [];
  const today = stripTime(fromDate);
  for (let i = 1; i <= days; i++) {
    // Calendar arithmetic, not +86400000: adding fixed milliseconds slips an hour either
    // way across a DST boundary in the device's timezone, which can shift the calendar day.
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const result = getMarketStatus(market, date);
    if (result.status === 'open') continue;
    closures.push({
      date,
      reason: result.reason,
      remarks: 'remarks' in result ? result.remarks : undefined,
    });
  }
  return closures;
}

/** Next day the market is open or on weekly rest, searching up to 60 days out. */
export function getNextOpenDate(market: Market, fromDate: Date): Date | null {
  const start = stripTime(fromDate);
  for (let i = 1; i <= 60; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const s = getMarketStatus(market, date).status;
    if (s === 'open' || s === 'warning') {
      return date;
    }
  }
  return null;
}

/** Splits `"Blk 1 Foo Rd (Bar Market)"` into street + friendly name, decoding HTML entities. */
export function parseMarketName(rawName: string | null | undefined): ParsedMarketName {
  const name = (rawName || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const match = name.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (match) {
    return { street: match[1].trim(), friendly: match[2].trim() };
  }
  return { street: '', friendly: name };
}

/**
 * The market's photo, or null when it has none.
 *
 * NEA stores most of these URLs — 88 of the 123 — as plain `http://`, and App Transport Security
 * blocks those outright, so the image never arrives and the app just shows no photo. The same
 * paths serve fine over TLS, so upgrade the scheme rather than punch a hole in ATS.
 */
export function marketPhotoUrl(market: Market): string | null {
  const url = (market.photourl || '').trim();
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://');
}
