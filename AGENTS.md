# AGENTS.md

Invariants and conventions an agent cannot infer from a single file. `README.md` owns the product, dev setup, the generated native projects and EAS release, and is not repeated here.

## Commands

```sh
npm test                                  # node --test over lib/core/*.test.ts — no framework in the tree
node --test lib/core/market-logic.test.ts # one file
node --test --test-name-pattern="parses D/M/YYYY" lib/core/market-logic.test.ts   # one test
npm run typecheck                         # both TS programs: the app, then lib/core
```

Those two are the whole of CI (`.github/workflows/test.yml`); there is no lint step. Screens are not unit-tested — verifying them means a device build, and notifications cannot be checked in a simulator.

## Editing across the two TypeScript programs

`lib/core/` is typed against Node's globals and *not* React Native's, so an accidental `react-native` or `lib/` import fails typecheck rather than at runtime on device. That boundary constrains edits:

- Inside `lib/core/`, imports carry explicit `.ts` specifiers (`./market-logic.ts`) so `node --test` can strip types and run the files directly. Everywhere else, no extension.
- `lib/core/` must stay erasable-syntax-only: no enums, no namespaces, no parameter properties, and type-only imports marked `import type`.
- New logic worth unit-testing belongs in `lib/core/`; anything touching a device API cannot go there.
- Do not add an `include` entry to `tsconfig.json` — `expo start` rewrites that file, comments and all, when `include` names something it did not put there.

## Builds

Two profiles, two variants, and both numbers are deliberate:

- `app.json` is the base config and the only place plugin config belongs. `app.config.ts` layers the dev variant over it (`.dev` ids, "Market Dev") when `APP_VARIANT=development`, which the `npm run` scripts and the EAS `development` profile set — so a release build is the one that sets nothing. Keep `slug` and `extra.eas.projectId` out of the override.
- `production` is the TestFlight profile; TestFlight and the App Store take the same binary. Do not add a `testflight` profile, and do not add the `preview` variant from Expo's tutorial — TestFlight internal testing and the existing `apk` profile already cover what it would do.
- Branch the config on `APP_VARIANT`, never on `EAS_BUILD_PROFILE`: EAS sets that one itself but a local `expo run:ios` does not, so the local build would silently take the production branch and install over the release app.
- A Debug build embeds no JS — the generated bundling phase exports `SKIP_BUNDLING=1` for it — so it fetches from Metro at launch and is a dead app without one. `--configuration` (passed through to `xcodebuild`, Debug by default) is what changes that, orthogonally to the variant: `APP_VARIANT=development npx expo run:ios --configuration Release` is a standalone dev app, no EAS and no new profile, replacing the Debug install until `npm run ios` puts it back. On EAS the same axis is `ios.buildConfiguration`, which outranks `developmentClient: true`.
- Judge performance only on Release: Debug is `-O0` with an unoptimized bundle, so a list that stutters there may be fine shipped.

## State: an external store, not context

`lib/store/` is a hand-rolled external store read through `useSyncExternalStore`. Import from the barrel `lib/store`, which re-exports state, actions and hooks.

- `state.ts` owns the single `State` object plus `getState`/`subscribe`/`setState`. `setState` derives `lang` from `langPref` and `t` from `lang`, and excludes both from its patch type, so an inconsistent patch does not typecheck; `t` is a stable per-language reference that components memoise on.
- `hooks.ts` exposes one hook per slice. Subscribe to the narrowest one — `useIsFavorite(name)` exists so a star tap re-renders one row instead of all 123.
- `actions.ts` owns every side effect: persistence, the NEA fetch, the SGT-midnight timer, the `AppState` foreground listener, and `watchSchedule()`. `initStore()` is called once from `app/_layout.tsx` and is idempotent — Fast Refresh and StrictMode both call it twice.
- Rescheduling notifications is a **store subscriber**, not a React effect, so it still runs when no screen is mounted. It debounces and dedupes on a key of `lang|favorites|markets.length|remindersEnabled`.

Launch sequence: read AsyncStorage → `setState({ ready: true })`, which lifts the splash via `SplashGate` → revalidate over the network only if the cache is older than 6 hours.

## Timezone model

Status is a *civil date* question, so the app never mixes instants with calendar days:

- `sgToday()` returns a `Date` whose **local** Y/M/D match Singapore's. `market-logic.ts` reads dates with local getters and parses `DD/MM/YYYY` into local midnight, so status stays correct in any device timezone. Pass these civil dates around, not `new Date()`.
- `sgInstant(civil, hour)` converts a civil date plus an SGT hour into a real instant — what a notification trigger needs. SGT is a hardcoded UTC+8; no DST since 1982.
- Add days with `new Date(y, m, d + i)`, never `+ 86400000`: fixed milliseconds slip an hour across a DST boundary in the *device's* timezone and can shift the calendar day.
- `lib/date.ts` is display formatting only, hand-rolled rather than `Intl.DateTimeFormat` because Hermes on Android depends on whatever ICU data the device ships. It re-exports the SGT helpers from `lib/core/reminder-schedule.ts`.

## Notifications

`lib/core/reminder-schedule.ts` builds the schedule purely (`buildSchedule` → `ScheduleEntry[]`); `lib/notifications.ts` hands it to expo-notifications. Closures are grouped one entry per date, so five favourites closing the same day become one notification, and Mondays are excluded deliberately — 52+ per market per year would get reminders switched off. Two reminders per date: 7pm the evening before, 6am the morning of.

iOS silently keeps only the ~64 soonest pending requests, so `rescheduleAll` caps at 56 and cancels-then-rebuilds from scratch every time; the daily background task (`lib/background.ts`) tops the queue back up as near ones fire. Background refresh is best-effort — iOS grants it at its discretion — so cold-start rescheduling in the store is the reliable path, not the task.

## UI conventions

- `components/ui/` is the primitive layer (`Text`, `Button`, `Card`, `Row`, `Notice`, `Segmented`, `EmptyState`, `Icon`), imported from `components/ui`.
- Use `Text` from `components/ui`, never `react-native`'s. Pick a `variant` from `typeScale` and a `tone`, not raw `fontSize`/`color`. **Never cap `maxFontSizeMultiplier` on body copy** — the audience is seniors and Dynamic Type must work at every size. Only text in a fixed-height native container passes a cap, and it comes from `fontCap`.
- Colours and spacing come from `lib/theme` (`space`, `radius`, `HIT_SIZE`, `useTheme`). Dark mode is not a colour swap: `theme.shadow` becomes a hairline border, because a shadow is invisible against black.
- `useThemedStyles(factory)` memoises on the factory, so **declare the factory at module scope** — one created per render rebuilds every StyleSheet on every render.
- Rows stack instead of truncating past `REFLOW_FONT_SCALE` (1.4); follow that for any new name-plus-pill layout.
- Anything tappable inside a gesture takes `Pressable` from the gesture wrapper — `SwipeToDeleteRow` re-exports it — never from `react-native`, whose press survives a fast swipe and fires as the row opens.
- Back-button labelling lives on the root `<Stack>` in `app/_layout.tsx`: `headerBackTitle` names the label because the screen below has no title, and `headerBackButtonMenuEnabled: false` is what stops iOS shrinking that label to a bare chevron behind a long title. `screenOptions` do not reach a nested navigator, so a new `Stack` that pushes a screen has to repeat both.
- One `ThemeProvider` at the root themes the native chrome — headers, large titles, search bar, tab bar. react-navigation is vendored inside expo-router 57, so import from `expo-router`; there is no `@react-navigation/*` package in the tree.

## i18n

`lib/i18n.ts` holds two flat objects. `en` is the source of truth (`StringKey = keyof typeof en`) and `zh` is typed `Record<keyof typeof en, string>`, so adding a key without its Chinese translation fails typecheck. Get `t` from `useT()`; interpolate with `{name}` placeholders. Market names have a separate Chinese lookup in `lib/core/zh-names.ts`, keyed by the *friendly* (parenthesised) part of the NEA name — reach it through `getDisplayName`/`displayName` so notifications don't end up half-translated.

Closure reasons are worded once, in `lib/core/reason-words.ts` — in core because `notificationCopy` is there and core cannot import `lib/`, and read back by `i18n.ts` for the status pill. Word a new reason there, not at the call site that needs it.

Language resolution separates the choice from the result: `state.langPref` (`Lang | 'system'`) is what the user picked, and `lang` follows from it. `'system'` resolves through `lib/lang.ts`, a separate module so the headless `background.ts` can reach it without importing the store. Three things a caller must not re-derive for itself: a missing `moa_lang` means `'system'`, which is why `loadLangPref` returns that rather than `null` — `background.ts` used `?? 'en'` and sent English reminders to phones running the app in Chinese; membership of the supported set is `isLang()` in core, never `=== 'en' || === 'zh'`, which no typecheck would catch when the set grows; and re-passing an unchanged `langPref` to `setState` re-resolves deliberately, which is how the foreground picks up a device-language change.

## Dataset handling

- Market identity is the raw NEA `name` string, and favourites are stored as those strings. `parseMarketName` splits `"Blk 1 Foo Rd (Bar Market)"` into street plus friendly name and decodes HTML entities.
- `normalizeMarkets` runs at every ingress — network fetch *and* cache read — so no screen has to remember it. Dataset quirk fixes belong there.
- A market can leave the dataset: favourites pointing at a missing market are pruned on load, and `useMarket` returns `null`. Handle that in any new screen.
- `fetchMarketsFromAPI` returns `null` rather than throwing (10s timeout, one retry); the caller falls back to the cache and sets `stale`.
- AsyncStorage keys keep their `moa_` prefix from the old web app so existing installs still find their favourites — don't rename them.
