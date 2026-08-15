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
npx expo start                  # Metro, then open the app on a device
npx expo start --clear          # same, ignoring the Metro cache
npm run ios                     # expo run:ios: build and install, then start Metro
npm run android
npx expo run:ios --device       # pick from connected devices interactively
npx expo run:ios --no-bundler   # build and install only, leaving Metro alone
```

Expo Go cannot run this app. `@maplibre/maplibre-react-native` is a third-party native module and is not compiled into Expo Go, so the map fails there no matter which Expo Go version is installed — the error is usually a misleading "download the latest version of Expo Go". Use a dev build, which the commands above produce. A local iOS build also needs CocoaPods once (`brew install cocoapods`) and a device on an iOS version Xcode supports.

## Native project

`ios/` and `android/` are generated from `app.json` and gitignored, so nothing in them is a source of truth — edit `app.json` and regenerate.

```sh
npx expo prebuild -p ios        # regenerate ios/ from scratch; pods install automatically
npx expo prebuild --no-clean    # apply changes to the existing folders instead
npx expo install expo-foo       # install at the version matching the SDK
npx expo install --check        # list dependencies that do not match the SDK (--fix to correct)
npx expo-doctor                 # check the project for known problems
npx expo config --type public   # print the resolved config, plugins applied
xcrun xctrace list devices      # device UDIDs, and whether a device is offline
```

## Build and release

```sh
npm i -g eas-cli
eas whoami
eas init                                              # one-time, writes extra.eas.projectId
eas build --profile development -p ios                # dev client, installs over the air
eas build --profile production -p ios --auto-submit   # .ipa straight to TestFlight
eas submit -p ios --latest                            # or submit an existing build
eas build --profile production -p android             # .aab for Play
eas build --profile apk -p android                    # standalone universal .apk
eas build:list                                        # recent builds and their status
eas device:create                                     # register an iPhone for internal builds
eas credentials                                       # inspect or rotate signing credentials
```

EAS builds from committed git state, not the working tree, so commit before building — uncommitted files are silently absent in the cloud. That also means the gitignored `ios/` is never uploaded and EAS prebuilds from `app.json` instead, which is what you want.

`appVersionSource` is `remote`, so EAS owns the build number and `production` auto-increments it. Bump the user-facing `version` in `app.json` by hand per release — it is the only version string a user ever sees.

TestFlight needs a paid Apple Developer account; the certificate a local `expo run:ios` uses is development-only and expires. EAS stores signing credentials on its servers rather than on disk, so none of it belongs in this repo — and because the repo is public, leave `appleId` out of `eas.json` and let `eas submit` prompt, or pass `EXPO_APPLE_ID`.

## History

This started as a plain HTML/CSS/TypeScript PWA at openanot.com, with a Cloudflare Worker for web push. The native app replaced it: reminders are scheduled on-device, so there is nothing left to host. The web app, its service worker and the Worker were removed — `git log` has them if you want to look.

## License

MIT
