import { LogManager } from '@maplibre/maplibre-react-native';

/**
 * Silence the tile failures the coastline produces — each one is a LogBox red box for a gap the
 * map's background colour already covers. Restricting the source to `SG_BOUNDS` is not enough by
 * itself: a tile straddling the boundary still intersects the box, so it is still requested, and
 * the one in the original report (13/6457/4060, spanning 1.538°N to 1.582°N) is exactly that case.
 *
 * Dev-only, because the red box is: a release build has nothing listening to `console.error`. Worth
 * knowing while debugging a blank map — this also swallows what a dead network or a OneMap outage
 * would log, so comment it out before concluding the tiles are fine. `LogManager` keeps one
 * handler, so a second caller anywhere would replace this one rather than add to it.
 */
export function configureMapLogging(): void {
  if (!__DEV__) return;
  LogManager.onLog(
    ({ level, message }) => level === 'error' && message.includes('Failed to load tile'),
  );
}
