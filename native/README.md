# Market Open Anot? — native app

Expo (React Native) app for iOS and Android. The web app at [openanot.com](https://openanot.com) keeps running from the repo root.

## Shared logic

`../src/market-logic.ts` and `../src/zh-names.ts` are the single source of truth. This app imports them through `lib/shared.ts`; the web app gets the same files compiled to plain JS at the repo root by `npm run build`. Metro reaches them via `watchFolders` in `metro.config.js`.

`../src/reminder-schedule.ts` turns favourites into a list of notifications to schedule. It lives outside `native/` so `node --test` can cover it without a React Native runtime — run it with `npm test` from the repo root.

## Reminders

There is no backend. Closure dates are a published forward-looking schedule, so the app schedules local notifications on-device: two per closure date, 7pm the evening before and 6am the morning of, matching the Cloudflare Worker's crons. Rescheduling happens on cold start, whenever favourites or language change, and from a best-effort daily background task.

Because it is all local, notifications need a real device — they cannot be verified in Expo Go or a simulator.

## Develop

Run every `expo` command from `native/`. The repo root is the web app; starting Expo there makes the CLI install itself into the root `package.json` and serve nothing useful.

```sh
npm install
npx expo start                  # Metro, then open the app on a device
npx expo start --clear          # same, ignoring the Metro cache
npm run ios                     # expo run:ios: build and install, then start Metro
npm run android
npx expo run:ios --device       # pick from connected devices interactively
npx expo run:ios --no-bundler   # build and install only, leaving Metro alone
npm run typecheck
```

Expo Go cannot run this app. `@maplibre/maplibre-react-native` is a third-party native module and is not compiled into Expo Go, so the map fails there no matter which Expo Go version is installed — the error is usually a misleading "download the latest version of Expo Go". Use a dev build, which the commands above produce. A local iOS build also needs CocoaPods once (`brew install cocoapods`) and a device on iOS whose version Xcode supports.

## Native project

`ios/` and `android/` are generated from `app.json` and gitignored, so nothing here is a source of truth — edit `app.json` and regenerate.

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

`appVersionSource` is `remote`, so EAS owns the build number and `production` auto-increments it. Bump the user-facing `version` in `app.json` by hand per release.

TestFlight needs a paid Apple Developer account; the certificate a local `expo run:ios` uses is development-only and expires. EAS stores signing credentials on its servers rather than on disk, so none of it belongs in this repo — and because the repo is public, leave `appleId` out of `eas.json` and let `eas submit` prompt, or pass `EXPO_APPLE_ID`.
