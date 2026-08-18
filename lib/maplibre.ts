import { LogManager } from '@maplibre/maplibre-react-native';

/**
 * Silence the tile failures the coastline produces. Off the edge of its coverage OneMap answers a
 * tile request with a body that is not a PNG, so MapLibre logs a decode failure per tile and the
 * bridge turns each one into a `console.error` — a LogBox red box for a gap the map's background
 * colour already covers. The camera clamp keeps those tiles off screen, but a fling still asks for
 * a few at the moment it overshoots.
 *
 * Dev-only, because the red box is: a release build has nothing listening to `console.error`. Worth
 * knowing while debugging a blank map — this also swallows what a dead network or a OneMap outage
 * would log, so comment it out before concluding the tiles are fine. `LogManager` keeps one handler,
 * so a second caller anywhere would replace this one rather than add to it.
 */
export function configureMapLogging(): void {
  if (!__DEV__) return;
  LogManager.onLog(
    ({ level, message }) => level === 'error' && message.includes('Failed to load tile'),
  );
}
