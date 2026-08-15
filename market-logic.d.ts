/** Hand-written types for market-logic.js. Keep in sync by hand — market-logic.js
 *  stays plain JS so the web app keeps its no-build-step property. */

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
  [field: string]: string | undefined;
}

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

/** Parses a `DD/MM/YYYY` string. Returns null for blank or malformed input. */
export function parseDateDMY(str: string | null | undefined): Date | null;

/** Midnight of `date` in the local timezone. */
export function stripTime(date: Date): Date;

export function getMarketStatus(market: Market, date: Date): MarketStatus;

/** Closures and warnings over the next `days` days, starting the day after `fromDate`. */
export function getUpcomingClosures(market: Market, days: number, fromDate: Date): Closure[];

/** Next day the market is open or on weekly rest, searching up to 60 days out. */
export function getNextOpenDate(market: Market, fromDate: Date): Date | null;

/** Splits `"Blk 1 Foo Rd (Bar Market)"` into street + friendly name, decoding HTML entities. */
export function parseMarketName(rawName: string | null | undefined): ParsedMarketName;
