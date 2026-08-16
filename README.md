# Market Open Anot?

Check if your Singapore wet market / hawker centre is open or closed today. iOS and Android, built with Expo.

## Why

Wet markets in Singapore close every Monday and have quarterly cleaning closures. The schedule is publicly available on [data.gov.sg](https://data.gov.sg/datasets/d_bda4baa634dd1cc7a6c7cad5f19e2d68/view) but not easy to check quickly. This app gives you the answer at a glance.

## Features

- Instant open/closed status for the markets you follow
- Covers all 123 NEA-managed hawker centres and wet markets
- Detects Monday rest days, quarterly cleaning, and other maintenance closures
- Upcoming closures list, and the next date each market reopens
- Map of every market, sorted-by-distance search when you allow location
- Local closure reminders: 7pm the evening before and 6am the morning of
- Bilingual: English and Chinese
- Works offline — the dataset is cached and revalidated in the background
- Senior-friendly: honours Dynamic Type at every size, high contrast, light and dark

## Data Source

[Dates of Hawker Centre Closure](https://data.gov.sg/datasets/d_bda4baa634dd1cc7a6c7cad5f19e2d68/view) from Singapore's National Environment Agency via data.gov.sg. There is no backend of any kind: the app fetches that dataset directly and does everything else on device.

## Layout

```
app/          expo-router routes: a tab shell, plus a detail screen and an add-markets modal
components/   screen components; components/ui/ is the shared primitives and theme consumers
lib/core/     pure closure + reminder logic, no React and no React Native — see Testing
lib/theme/    light and dark tokens, and the matching react-navigation theme
lib/store/    app state as an external store read through useSyncExternalStore
lib/          storage, the NEA fetch, i18n, date formatting, notifications, background refresh
```

`lib/core/` is the one directory with no dependency on React Native. Its files import each other with explicit `.ts` specifiers so Node can run them directly; everything outside imports without the extension.

## Testing

Unit tests cover the closure logic (date parsing, open/closed detection, boundary conditions) and the notification schedule. Node's built-in runner executes the `.ts` files directly by stripping types, so there is nothing to install and no test framework in the tree.

```sh
npm test
npm run typecheck   # the app program, then lib/core against Node's globals
```

Both run on push and PR via GitHub Actions. `tsconfig.test.json` deliberately gives `lib/core/` Node's globals and not React Native's, so an accidental import from `lib/` fails typecheck rather than at runtime.

The screens are not unit-tested; verifying them means a device build. Notifications especially cannot be checked in a simulator.

## Develop

```sh
npm install
npm run ios       # build, install on a device, then start Metro
npm run android
npm start         # Metro alone, once the app is already installed
```

Those install a separate app called "Market Dev": `app.config.ts` gives the dev build its own name and bundle identifier when `APP_VARIANT=development` is set, which the scripts above do, so it sits alongside a TestFlight build instead of replacing it. Build it once and leave it there — a JS change only needs `npm start` and a reload, and only a change to `app.json`, a native dependency or a config plugin needs another build. With no Metro running the dev app has nothing to load, because a debug build fetches its JS at launch rather than embedding it.

Expo Go cannot run this app. `@maplibre/maplibre-react-native` is a third-party native module and is not compiled into Expo Go, so the map fails there no matter which Expo Go version is installed — the error is usually a misleading "download the latest version of Expo Go". Use a dev build, which the commands above produce. A local iOS build also needs CocoaPods once (`brew install cocoapods`) and a device on an iOS version Xcode supports.

## Native project

`ios/` and `android/` are generated from `app.json` (through `app.config.ts`) and gitignored, so nothing in them is a source of truth — edit `app.json`, never the native folders. `npm run ios` and EAS both regenerate them, so there is no prebuild step to run by hand.

Install native dependencies with `npx expo install expo-foo` rather than npm, so the version matches the SDK.

## Build and release

```sh
npm i -g eas-cli
eas build --profile production -p ios --auto-submit   # .ipa straight to TestFlight
eas build --profile production -p android             # .aab for Play
eas build:list                                        # recent builds and their status
```

`production` is the TestFlight profile too — TestFlight and the App Store take the same binary. `eas submit -p ios --latest` submits a build that was made without `--auto-submit`. `eas.json` also carries an `apk` profile for a standalone Android `.apk` and a `development` profile for installing a dev client over the air, neither of which a release needs.

EAS builds from committed git state, not the working tree, so commit before building — uncommitted files are silently absent in the cloud. That also means the gitignored `ios/` is never uploaded and EAS prebuilds from `app.json` instead, which is what you want.

`appVersionSource` is `remote`, so EAS owns the build number and `production` auto-increments it. Bump the user-facing `version` in `app.json` by hand per release — it is the only version string a user ever sees.

TestFlight needs a paid Apple Developer account; the certificate a local `expo run:ios` uses is development-only and expires. EAS stores signing credentials on its servers rather than on disk, so none of it belongs in this repo — and because the repo is public, leave `appleId` out of `eas.json` and let `eas submit` prompt, or pass `EXPO_APPLE_ID`.

## History

This started as a plain HTML/CSS/TypeScript PWA at openanot.com, with a Cloudflare Worker for web push. The native app replaced it: reminders are scheduled on-device, so there is nothing left to host. The web app, its service worker and the Worker were removed — `git log` has them if you want to look.

## License

MIT
