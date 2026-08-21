import type { Center } from './map-bounds.ts';
import { SG_BOUNDS } from './map-bounds.ts';

/** A persisted camera position: where the map was last left. */
export interface MapView {
  center: Center;
  zoom: number;
}

/** Match the `minZoom`/`maxZoom` the map actually clamps to. */
export const MIN_MAP_ZOOM = 11;
export const MAX_MAP_ZOOM = 19;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function insideBounds(center: Center): boolean {
  const [lng, lat] = center;
  const [west, south, east, north] = SG_BOUNDS;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/**
 * Recover a `MapView` from whatever `JSON.parse` handed back, or `null`.
 *
 * The camera is constrained to `SG_BOUNDS`, so a persisted centre outside it is corruption, not a
 * saved position — treat it as absent so the map falls back to the first-visit path rather than
 * stranding the camera on a value the clamp would refuse anyway.
 */
export function parseMapView(raw: unknown): MapView | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { center, zoom } = raw as Record<string, unknown>;
  if (!Array.isArray(center) || center.length !== 2) return null;
  if (!isFiniteNumber(center[0]) || !isFiniteNumber(center[1])) return null;
  if (!isFiniteNumber(zoom)) return null;
  const view: MapView = { center: [center[0], center[1]], zoom };
  if (!insideBounds(view.center)) return null;
  if (view.zoom < MIN_MAP_ZOOM || view.zoom > MAX_MAP_ZOOM) return null;
  return view;
}
