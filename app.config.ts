import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * `app.json` stays the base and the only place plugin config lives; this file exists solely to give
 * the dev build its own identity.
 *
 * A dev client sharing `com.sfdye.openanot` overwrites the TestFlight app — same bundle
 * identifier, same slot on the device — so installing one used to mean losing the other. Under
 * `APP_VARIANT=development` the ids, name and scheme all change, and the two apps sit side by side.
 *
 * `slug` and `extra.eas.projectId` deliberately do not change: both variants are the same EAS
 * project, so builds and credentials stay in one place.
 */

/**
 * The build number, for both stores. iOS calls it `buildNumber` and Android `versionCode`, and with
 * `appVersionSource: 'local'` in `eas.json` this constant is the only source of either — so the two
 * cannot drift apart, which is what happened while EAS kept a separate counter per platform.
 *
 * Bump it with `npm run release`, which bumps then leaves you to build — so the value here is the
 * *latest build that exists*, not the next one. EAS builds committed git state rather than the
 * working tree, so building without releasing first re-sends a number the store already has and gets
 * rejected at upload, which is the right way for that mistake to fail.
 *
 * Only ever goes up: both stores refuse a number they have seen for a version, so a number is spent
 * whether or not the build it made was any good.
 */
const BUILD = 2;

export default ({ config }: ConfigContext): ExpoConfig => {
  // Applied before the variant branch below, so the dev build carries it too — a dev client that
  // reported no build number would install over itself in confusing ways.
  const base = {
    ...config,
    ios: { ...config.ios, buildNumber: String(BUILD) },
    android: { ...config.android, versionCode: BUILD },
  } as ExpoConfig;

  if (process.env.APP_VARIANT !== 'development') return base;

  const id = `${base.ios?.bundleIdentifier}.dev`;

  return {
    ...base,
    // Truncates to "Open Anot? D…" on the home screen, which still reads as distinct from the
    // release app; every other surface that shows an app name has room for it in full.
    name: 'Open Anot? Dev',
    // Dropped so the dev build keeps that name on a Chinese phone: `app.json`'s localised label
    // would otherwise make both apps read 今天开吗？ on the home screen.
    locales: undefined,
    // Derived, so it cannot drift from `app.json`. A scheme of its own matters: sharing the release
    // one would leave iOS to pick whichever app it liked for a deep link.
    scheme: `${base.scheme}dev`,
    // Spread, not replaced, so `app.json`'s icon variants and the build number above reach the dev
    // app too.
    ios: { ...base.ios, bundleIdentifier: id },
    android: { ...base.android, package: id },
  } as ExpoConfig;
};
