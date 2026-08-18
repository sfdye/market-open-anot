import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { centerLimit, clampCenter, sameBounds, SG_BOUNDS } from './map-bounds.ts';
import type { Bounds } from './map-bounds.ts';

// A viewport 0.1° wide and 0.2° tall, positioned wherever the test needs it.
function viewport(lng: number, lat: number): Bounds {
  return [lng - 0.05, lat - 0.1, lng + 0.05, lat + 0.1];
}

// Every corner `centerLimit` returns is a sum or midpoint of decimal degrees, so floats leave dust.
// `clampCenter` needs no tolerance: min/max hand back one of their inputs unchanged.
function assertClose(actual: number[], expected: number[]): void {
  actual.forEach((value, i) =>
    assert.ok(
      Math.abs(value - expected[i]!) < 1e-9,
      `index ${i}: ${value} is not within 1e-9 of ${expected[i]}`,
    ),
  );
}

describe('centerLimit', () => {
  test('insets the limit by half the visible span', () => {
    assertClose(centerLimit(viewport(103.8, 1.35), [103.6, 1.16, 104.1, 1.56]), [
      103.65, 1.26, 104.05, 1.46,
    ]);
  });

  test('is independent of where the viewport sits, only how big it is', () => {
    const limit: Bounds = [103.6, 1.16, 104.1, 1.56];
    assert.deepEqual(centerLimit(viewport(103.8, 1.35), limit), centerLimit(viewport(0, 0), limit));
  });

  test('collapses to the midpoint on an axis the viewport cannot fit', () => {
    // 1° wide against a 0.5°-wide limit: no centre keeps that viewport inside.
    const wide: Bounds = [0, 1.3, 1, 1.4];
    assertClose(centerLimit(wide, [103.6, 1.16, 104.1, 1.56]), [103.85, 1.21, 103.85, 1.51]);
  });

  test('collapses each axis on its own', () => {
    // Fits east-west, too tall north-south.
    const tall: Bounds = [0, 0, 0.1, 1];
    const [west, south, east, north] = centerLimit(tall, [103.6, 1.16, 104.1, 1.56]);
    assert.notEqual(west, east, 'longitude still has room to move');
    assert.equal(south, north, 'latitude is pinned to the middle');
  });

  test('a viewport exactly the size of the limit pins the centre', () => {
    const limit: Bounds = [103.6, 1.16, 104.1, 1.56];
    assertClose(centerLimit(limit, limit), [103.85, 1.36, 103.85, 1.36]);
  });
});

describe('clampCenter', () => {
  const limit: Bounds = [103.65, 1.26, 104.05, 1.46];

  test('returns null for a centre already inside', () => {
    assert.equal(clampCenter([103.8, 1.35], limit), null);
  });

  test('treats the edge as inside', () => {
    assert.equal(clampCenter([103.65, 1.46], limit), null);
  });

  test('pulls a centre north of the limit back to the edge, keeping its longitude', () => {
    assert.deepEqual(clampCenter([103.8, 1.6], limit), [103.8, 1.46]);
  });

  test('corrects both axes at once', () => {
    // Roughly Cupertino: what an iOS simulator reports before you set a location.
    assert.deepEqual(clampCenter([-122.03, 37.33], limit), [103.65, 1.46]);
  });
});

describe('sameBounds', () => {
  test('is true for equal values in equal order', () => {
    assert.equal(sameBounds(SG_BOUNDS, [...SG_BOUNDS]), true);
  });

  test('is false when any corner differs', () => {
    const [west, south, east, north] = SG_BOUNDS;
    assert.equal(sameBounds(SG_BOUNDS, [west, south, east, north + 0.001]), false);
  });

  test('ignores a difference too small to see, which is what a pan produces', () => {
    const [west, south, east, north] = SG_BOUNDS;
    assert.equal(sameBounds(SG_BOUNDS, [west, south + 1e-9, east, north - 1e-9]), true);
  });
});
