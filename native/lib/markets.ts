import {
  parseDateDMY,
  stripTime,
  parseMarketName,
  zhNames,
  type Market,
  type ParsedMarketName,
} from './shared';
import { saveCachedMarkets } from './storage';
import type { Lang } from './i18n';

const API_URL =
  'https://data.gov.sg/api/action/datastore_search?resource_id=d_bda4baa634dd1cc7a6c7cad5f19e2d68&limit=200';

/** Soonest future cleaning or other-works start date, or null if none in the dataset. */
export function getNextCleaningDate(market: Market, today: Date): Date | null {
  const todayStripped = stripTime(today);
  const dates: Date[] = [];
  for (const q of ['q1', 'q2', 'q3', 'q4']) {
    const start = parseDateDMY(market[`${q}_cleaningstartdate`]);
    if (start && start > todayStripped) dates.push(start);
  }
  const owStart = parseDateDMY(market.other_works_startdate);
  if (owStart && owStart > todayStripped) dates.push(owStart);
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates.length > 0 ? dates[0] : null;
}

export function getDisplayName(parsed: ParsedMarketName, lang: Lang): string {
  if (lang === 'zh') return zhNames[parsed.friendly] || parsed.friendly;
  return parsed.friendly;
}

/** Haversine distance in km. */
export function distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function marketCoords(market: Market): { lat: number; lng: number } | null {
  const lat = parseFloat(market.latitude_hc ?? '');
  const lng = parseFloat(market.longitude_hc ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function getMarketDistance(
  market: Market,
  userLat: number | null,
  userLng: number | null
): number | null {
  if (userLat === null || userLng === null) return null;
  const coords = marketCoords(market);
  if (!coords) return null;
  return distanceBetween(userLat, userLng, coords.lat, coords.lng);
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

export function findMarket(markets: Market[], name: string): Market | null {
  return markets.find((m) => m.name === name) ?? null;
}

/** Markets matching a free-text query across English name, address and Chinese name. */
export function searchMarkets(markets: Market[], query: string): Market[] {
  const q = query.trim().toLowerCase();
  if (!q) return markets;
  return markets.filter((m) => {
    const parsed = parseMarketName(m.name);
    const zh = zhNames[parsed.friendly] ?? '';
    return (
      m.name.toLowerCase().includes(q) ||
      (m.address_myenv ?? '').toLowerCase().includes(q) ||
      zh.includes(query.trim())
    );
  });
}

export async function fetchMarketsFromAPI(): Promise<Market[] | null> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { records?: Market[] } };
    const records = json.result?.records;
    if (!Array.isArray(records) || records.length === 0) return null;
    await saveCachedMarkets(records);
    return records;
  } catch {
    return null;
  }
}

/**
 * The web app's `decodeHTML` used a throwaway `<textarea>`; there is no DOM here, and the
 * NEA remarks only ever contain these entities.
 */
export function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
