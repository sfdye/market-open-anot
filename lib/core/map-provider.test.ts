import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isMapProvider, mapUrl, resolveMapProvider } from './map-provider.ts';

const PLACE = { lat: 1.3521, lng: 103.8198, label: 'Tekka Market', address: 'Blk 665 Buffalo Rd' };

describe('resolveMapProvider', () => {
  test('defaults to Apple Maps when both are installed', () => {
    assert.equal(resolveMapProvider('auto', { apple: true, google: true }), 'apple');
  });

  test('defaults to Google Maps only when Apple Maps is the missing one', () => {
    assert.equal(resolveMapProvider('auto', { apple: false, google: true }), 'google');
  });

  test('defaults to Apple Maps when neither is installed', () => {
    // Nothing to open either way, and Apple Maps answers its scheme again once reinstalled.
    assert.equal(resolveMapProvider('auto', { apple: false, google: false }), 'apple');
  });

  test('an explicit choice wins over what is installed', () => {
    assert.equal(resolveMapProvider('google', { apple: true, google: false }), 'google');
    assert.equal(resolveMapProvider('apple', { apple: false, google: true }), 'apple');
  });
});

describe('mapUrl', () => {
  test('Apple Maps carries the label so the pin reads as the market', () => {
    const url = mapUrl(PLACE, { provider: 'apple', platform: 'ios', googleAppInstalled: false });
    assert.equal(url, 'maps:0,0?q=Tekka%20Market@1.3521,103.8198');
  });

  test('Google Maps uses the address string so the pin has a readable label', () => {
    const url = mapUrl(PLACE, { provider: 'google', platform: 'ios', googleAppInstalled: true });
    assert.equal(url, 'comgooglemaps://?q=Blk%20665%20Buffalo%20Rd&center=1.3521,103.8198');
  });

  test('Google Maps web fallback also uses the address string', () => {
    const url = mapUrl(PLACE, { provider: 'google', platform: 'ios', googleAppInstalled: false });
    assert.equal(url, 'https://www.google.com/maps/search/?api=1&query=Blk%20665%20Buffalo%20Rd');
  });

  test('Google Maps falls back to coordinates when no address is supplied', () => {
    const noAddr = { lat: 1.3521, lng: 103.8198, label: 'Tekka Market' };
    const url = mapUrl(noAddr, { provider: 'google', platform: 'ios', googleAppInstalled: true });
    assert.equal(url, 'comgooglemaps://?q=1.3521%2C103.8198&center=1.3521,103.8198');
  });

  test('Android hands off to the default map app whatever the provider says', () => {
    // There is no Apple Maps to prefer, and `geo:` is already the user's own choice of app.
    const geo = 'geo:0,0?q=1.3521,103.8198(Tekka%20Market)';
    const android = { platform: 'android', googleAppInstalled: true } as const;
    assert.equal(mapUrl(PLACE, { ...android, provider: 'apple' }), geo);
    assert.equal(mapUrl(PLACE, { ...android, provider: 'google' }), geo);
  });

  test('escapes a name that would otherwise break the query', () => {
    const place = { ...PLACE, label: 'Blk 1 & 2 (Market)' };
    const url = mapUrl(place, { provider: 'apple', platform: 'ios', googleAppInstalled: false });
    assert.ok(url.includes('%20%26%20'), url);
  });
});

describe('isMapProvider', () => {
  test('accepts the supported set and nothing else', () => {
    assert.ok(isMapProvider('apple'));
    assert.ok(isMapProvider('google'));
    assert.ok(!isMapProvider('auto'));
    assert.ok(!isMapProvider(null));
  });
});
