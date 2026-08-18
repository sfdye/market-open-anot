import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FAVORITES, toggledFavorites } from './favorites.ts';

describe('toggledFavorites', () => {
  test('adds a market that is not on the list', () => {
    assert.deepEqual(toggledFavorites(['a'], 'b'), ['a', 'b']);
  });

  test('removes one that is', () => {
    assert.deepEqual(toggledFavorites(['a', 'b'], 'a'), ['b']);
  });

  test('does not mutate the list it was given', () => {
    const favorites = ['a'];
    toggledFavorites(favorites, 'b');
    assert.deepEqual(favorites, ['a']);
  });

  test('adds up to the limit and refuses the one past it', () => {
    const full = Array.from({ length: MAX_FAVORITES }, (_, i) => `m${i}`);
    assert.equal(toggledFavorites(full.slice(0, -1), 'new')?.length, MAX_FAVORITES);
    assert.equal(toggledFavorites(full, 'new'), null);
  });

  test('still removes from a list already over the limit', () => {
    // What an install from before the limit existed looks like: nothing prunes it, so the only
    // way down is the user removing markets, and that must keep working.
    const over = Array.from({ length: MAX_FAVORITES + 2 }, (_, i) => `m${i}`);
    assert.equal(toggledFavorites(over, 'm0')?.length, MAX_FAVORITES + 1);
  });
});
