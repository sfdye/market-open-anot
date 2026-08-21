import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseMapView, MIN_MAP_ZOOM, MAX_MAP_ZOOM } from './map-view.ts';

describe('parseMapView', () => {
  test('accepts a centre inside Singapore and a zoom in range', () => {
    assert.deepEqual(parseMapView({ center: [103.8198, 1.3521], zoom: 15 }), {
      center: [103.8198, 1.3521],
      zoom: 15,
    });
  });

  test('accepts the boundary corners and exact zoom limits', () => {
    assert.deepEqual(
      parseMapView({ center: [103.6, 1.16], zoom: MIN_MAP_ZOOM }),
      { center: [103.6, 1.16], zoom: MIN_MAP_ZOOM },
    );
    assert.deepEqual(
      parseMapView({ center: [104.1147, 1.56073], zoom: MAX_MAP_ZOOM }),
      { center: [104.1147, 1.56073], zoom: MAX_MAP_ZOOM },
    );
  });

  test('rejects a centre outside Singapore', () => {
    // Roughly Cupertino: what an iOS simulator reports before a location is set.
    assert.equal(parseMapView({ center: [-122.03, 37.33], zoom: 15 }), null);
  });

  test('rejects a zoom outside the map range', () => {
    assert.equal(parseMapView({ center: [103.8198, 1.3521], zoom: 10 }), null);
    assert.equal(parseMapView({ center: [103.8198, 1.3521], zoom: 20 }), null);
  });

  test('rejects non-finite numbers', () => {
    assert.equal(parseMapView({ center: [103.8198, NaN], zoom: 15 }), null);
    assert.equal(parseMapView({ center: [103.8198, 1.3521], zoom: Infinity }), null);
  });

  test('rejects malformed shapes', () => {
    assert.equal(parseMapView(null), null);
    assert.equal(parseMapView('{"center":[103.8,1.35],"zoom":15}'), null);
    assert.equal(parseMapView({}), null);
    assert.equal(parseMapView({ center: [103.8], zoom: 15 }), null);
    assert.equal(parseMapView({ center: [103.8, 1.35] }), null);
    assert.equal(parseMapView({ center: '103.8,1.35', zoom: 15 }), null);
  });
});
