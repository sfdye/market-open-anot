import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isThemeScheme, resolveTheme } from './theme-pref.ts';

describe('resolveTheme', () => {
  test('system follows the device scheme', () => {
    assert.equal(resolveTheme('system', 'dark'), 'dark');
    assert.equal(resolveTheme('system', 'light'), 'light');
  });

  test('system falls back to light when the device scheme is unknown', () => {
    assert.equal(resolveTheme('system', null), 'light');
    assert.equal(resolveTheme('system', undefined), 'light');
  });

  test('an explicit choice wins over the device scheme', () => {
    assert.equal(resolveTheme('dark', 'light'), 'dark');
    assert.equal(resolveTheme('light', 'dark'), 'light');
  });
});

describe('isThemeScheme', () => {
  test('accepts the supported set and nothing else', () => {
    assert.ok(isThemeScheme('light'));
    assert.ok(isThemeScheme('dark'));
    assert.ok(!isThemeScheme('system'));
    assert.ok(!isThemeScheme(null));
    assert.ok(!isThemeScheme(0));
  });
});
