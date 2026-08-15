# Market Open Anot? — native app

Expo (React Native) app for iOS and Android. The web app at [openanot.com](https://openanot.com) keeps running from the repo root.

## Shared logic

`../src/market-logic.ts` and `../src/zh-names.ts` are the single source of truth. This app imports them through `lib/shared.ts`; the web app gets the same files compiled to plain JS at the repo root by `npm run build`. Metro reaches them via `watchFolders` in `metro.config.js`.

`../src/reminder-schedule.ts` turns favourites into a list of notifications to schedule. It lives outside `native/` so `node --test` can cover it without a React Native runtime — run it with `npm test` from the repo root.

## Reminders

There is no backend. Closure dates are a published forward-looking schedule, so the app schedules local notifications on-device: two per closure date, 7pm the evening before and 6am the morning of, matching the Cloudflare Worker's crons. Rescheduling happens on cold start, whenever favourites or language change, and from a best-effort daily background task.

Because it is all local, notifications need a real device — they cannot be verified in Expo Go or a simulator.

## Develop

```sh
npm install
npx expo start                       # then open in a dev build
eas build --profile development -p android   # or -p ios, installs a dev client
```

## Build

```sh
eas build --profile production -p android    # .aab for Play
eas build --profile production -p ios        # .ipa for TestFlight / App Store
eas build --profile apk -p android           # standalone universal .apk
```

`appVersionSource` is `remote`, so EAS owns the build number and `production` auto-increments it. Bump the user-facing `version` in `app.json` by hand per release.
