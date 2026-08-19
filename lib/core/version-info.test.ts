import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, feedbackUrl, versionLabel, type BuildInfo } from './version-info.ts';

const INFO: BuildInfo = { version: '1.0.0', build: '4', os: 'ios', osVersion: '18.5' };

describe('versionLabel', () => {
  test('appends the build number in parentheses', () => {
    assert.equal(versionLabel(INFO), '1.0.0 (4)');
  });

  test('falls back to the version alone without a build', () => {
    assert.equal(versionLabel({ ...INFO, build: undefined }), '1.0.0');
  });

  test('a missing version is a dash, not a hanging parenthesis', () => {
    assert.equal(versionLabel({ ...INFO, version: null }), '—');
  });
});

describe('buildSummary', () => {
  test('is one line naming the app, build and platform', () => {
    assert.equal(buildSummary(INFO), 'Open Anot? 1.0.0 (4) · ios 18.5');
  });

  test('Android reports its API level, which is what Platform.Version gives there', () => {
    assert.equal(buildSummary({ ...INFO, os: 'android', osVersion: 35 }), 'Open Anot? 1.0.0 (4) · android 35');
  });
});

describe('feedbackUrl', () => {
  test('quotes the build summary below a blank writing area', () => {
    assert.equal(
      feedbackUrl('mailto:t@sfdye.com', INFO),
      'mailto:t@sfdye.com?subject=Open%20Anot%3F%20feedback&body=%0A%0A%E2%80%94%0AOpen%20Anot%3F%201.0.0%20(4)%20%C2%B7%20ios%2018.5'
    );
  });
});
