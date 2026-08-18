import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BASEMAPS, isBasemap, resolveBasemap } from './basemap.ts';

describe('isBasemap', () => {
  test('accepts every offered basemap', () => {
    for (const basemap of BASEMAPS) assert.equal(isBasemap(basemap), true);
  });

  test('rejects a OneMap style the app does not offer', () => {
    // What an install that had picked `LandLot` from a build offering all six would have on disk.
    assert.equal(isBasemap('LandLot'), false);
  });

  test('rejects a missing key and the wrong case', () => {
    assert.equal(isBasemap(null), false);
    assert.equal(isBasemap('default'), false);
  });
});

describe('resolveBasemap', () => {
  test('follows the appearance when the user chose nothing', () => {
    assert.equal(resolveBasemap('system', 'light'), 'Default');
    assert.equal(resolveBasemap('system', 'dark'), 'Night');
  });

  test('an explicit choice outranks the appearance, in both directions', () => {
    assert.equal(resolveBasemap('Grey', 'dark'), 'Grey');
    assert.equal(resolveBasemap('Night', 'light'), 'Night');
  });
});
