/** `[west, south, east, north]` — the order MapLibre's own `LngLatBounds` uses. */
export type Bounds = [west: number, south: number, east: number, north: number];
/** Matching MapLibre's `LngLat`. */
export type Center = [lng: number, lat: number];

/**
 * The extent OneMap serves tiles for, the box its own docs put on a Leaflet map. Doubles as where
 * the camera may go: every market is inside it, and outside it there is nothing to draw.
 */
export const SG_BOUNDS: Bounds = [103.6, 1.16, 104.1147, 1.56073];

/**
 * The box the camera *centre* may occupy for the whole viewport to stay inside `limit`.
 *
 * MapLibre constrains the centre and not the viewport, so handing it `limit` directly still lets a
 * pan bring half a screen of empty space in from the coastline. Insetting by half the visible span
 * is what turns that centre clamp into a viewport clamp. A viewport wider or taller than `limit`
 * cannot fit on that axis at all, so it collapses to the midpoint and stops moving there.
 */
export function centerLimit(visible: Bounds, limit: Bounds): Bounds {
  const [visWest, visSouth, visEast, visNorth] = visible;
  const [west, south, east, north] = limit;
  const padLng = (visEast - visWest) / 2;
  const padLat = (visNorth - visSouth) / 2;
  const midLng = (west + east) / 2;
  const midLat = (south + north) / 2;
  return [
    Math.min(west + padLng, midLng),
    Math.min(south + padLat, midLat),
    Math.max(east - padLng, midLng),
    Math.max(north - padLat, midLat),
  ];
}

/** `center` moved the least it can to sit inside `limit`, or `null` when it is already inside. */
export function clampCenter(center: Center, limit: Bounds): Center | null {
  const [lng, lat] = center;
  const [west, south, east, north] = limit;
  const clampedLng = Math.min(Math.max(lng, west), east);
  const clampedLat = Math.min(Math.max(lat, south), north);
  return clampedLng === lng && clampedLat === lat ? null : [clampedLng, clampedLat];
}

/** About 0.1m — under the precision a viewport is reported to, let alone a visible difference. */
const SAME_BOUNDS_EPSILON = 1e-6;

/**
 * Equal to within `SAME_BOUNDS_EPSILON`, so an unchanged limit can skip pushing a camera update.
 *
 * The tolerance is what makes the check worth having. Exact equality would almost never hold across
 * a pan at one zoom: the reported box comes from pixel positions, and its latitude span widens with
 * `cos(lat)` on the way north, so `===` would call every gesture a change.
 */
export function sameBounds(a: Bounds, b: Bounds): boolean {
  return a.every((value, i) => Math.abs(value - b[i]!) < SAME_BOUNDS_EPSILON);
}
