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

- `app.json` is the base config and the only place plugin config belongs. `app.config.ts` layers the dev variant over it (`.dev` ids, "Open Anot? Dev", no localised name) when `APP_VARIANT=development`, which the `npm run` scripts and the EAS `development` profile set — so a release build is the one that sets nothing. Keep `slug` and `extra.eas.projectId` out of the override.
- The build number is two keys in `app.json` — `ios.buildNumber` (a string) and `android.versionCode` (a number) — which must stay equal. Bump only with `npm run release`, which sets both from one number and refuses to run if it finds them apart; never by hand, and never by re-adding `autoIncrement`, which bumps each platform in its own sync step whatever the version source is. README's release section has the why.
- `production` is the TestFlight profile; TestFlight and the App Store take the same binary. Do not add a `testflight` profile, and do not add the `preview` variant from Expo's tutorial — TestFlight internal testing and the existing `apk` profile already cover what it would do.
- EAS Update ships JS and assets over the air, so a `zh-names` correction or a translation fix reaches users without a store release. `app.json` owns the config — `runtimeVersion` policy `appVersion` (an update targets the current `version`, so the per-release `version` bump is the OTA boundary) and `updates.url` — and the `production` profile carries `channel: "production"`, inherited by `apk` through `extends`. `development` has no channel: a dev client loads Metro and previews updates through its Extensions tab, not a channel. `eas update` bundles the **working tree**, the opposite of `eas build` uploading committed state, so publish from a clean tree. The first build containing `expo-updates` still goes through the stores — a binary without the module can never OTA, so the release already in TestFlight/Play is unreachable until users install the one that adds it — and native deps, SDK upgrades, and `app.json` native config (permissions, icons, splash, `infoPlist`) still need a build regardless. README's OTA section has the commands.
- Branch the config on `APP_VARIANT`, never on `EAS_BUILD_PROFILE`: EAS sets that one itself but a local `expo run:ios` does not, so the local build would silently take the production branch and install over the release app.
- A Debug build embeds no JS — the generated bundling phase exports `SKIP_BUNDLING=1` for it — so it fetches from Metro at launch and is a dead app without one. `--configuration` (passed through to `xcodebuild`, Debug by default) is what changes that, orthogonally to the variant: `APP_VARIANT=development npx expo run:ios --configuration Release` is a standalone dev app, no EAS and no new profile, replacing the Debug install until `npm run ios` puts it back. On EAS the same axis is `ios.buildConfiguration`, which outranks `developmentClient: true`.
- Installing a local `--local` artifact on a phone is a cable job, never AirDrop, which iOS refuses. Which phones accept it is fixed at build time by `distribution`: `internal` ad-hoc signs for the UDIDs registered on the account, while `production` provisions no devices and so is TestFlight-only, not sideloadable. README's install section has the commands and how to read the profile back out of an `.ipa`.
- Judge performance only on Release: Debug is `-O0` with an unoptimized bundle, so a list that stutters there may be fine shipped.
- Every icon raster in `assets/` is **generated**: `npm run icons` derives them from `brand/` (Pillow + librsvg, hand-run, not in CI). Edit the master in `brand/`, never the output — the same rule as editing `app.json` and never the native folders. Nothing about `assets/icon.png` reveals this, and the next regeneration silently reverts a hand-edit. The 96px notification glyph is the exception: a hand-drawn SVG, deliberately not the app-icon art scaled down, because the line work turns to mush at 24dp.

## State: an external store, not context

`lib/store/` is a hand-rolled external store read through `useSyncExternalStore`. Import from the barrel `lib/store`, which re-exports state, actions and hooks.

- `state.ts` owns the single `State` object plus `getState`/`subscribe`/`setState`. `setState` derives `lang` from `langPref` and `t` from `lang`, and excludes both from its patch type, so an inconsistent patch does not typecheck; `t` is a stable per-language reference that components memoise on.
- `hooks.ts` exposes one hook per slice. Subscribe to the narrowest one — `useIsFavorite(name)` exists so a star tap re-renders one row instead of all 123.
- `actions.ts` owns every side effect: persistence, the NEA fetch, the SGT-midnight timer, the `AppState` foreground listener, and `watchSchedule()`. `initStore()` is called once from `app/_layout.tsx` and is idempotent — Fast Refresh and StrictMode both call it twice.
- Rescheduling notifications is a **store subscriber**, not a React effect, so it still runs when no screen is mounted. It debounces and dedupes on a key of `lang|favorites|markets.length|remindersEnabled`.
- `mapView` is the last camera position (centre + zoom) the map was left at, persisted after user-initiated region settles via `saveMapView`. `MarketMap` retains the in-progress user viewport and writes it as the app backgrounds, so an interrupted pan is not lost. A user settle waits 500ms: a normal pan is then saved as-is, while a following non-user `ConstrainedCamera` correction saves the final camera instead. It must otherwise ignore MapLibre's non-user initialisation and constraint events: those can report a default camera and overwrite the restored view. The two programmatic location moves save their intended view explicitly. Storage writes are queued, preventing an earlier event from overwriting the latest view. `null` (a first-ever visit) is what makes `MarketMap` default to the user's current location instead of restoring a view. It is read once at mount, not subscribed — a re-render on every save would re-serialise the tile style and all ~123 features.

Launch sequence: read AsyncStorage → `setState({ ready: true })`, which lifts the splash via `SplashGate` → revalidate over the network only if the cache is older than 24 hours.

## Timezone model

Status is a *civil date* question, so the app never mixes instants with calendar days:

- `sgToday()` returns a `Date` whose **local** Y/M/D match Singapore's. `market-logic.ts` reads dates with local getters and parses `DD/MM/YYYY` into local midnight, so status stays correct in any device timezone. Pass these civil dates around, not `new Date()`.
- `sgInstant(civil, hour)` converts a civil date plus an SGT hour into a real instant — what a notification trigger needs. SGT is a hardcoded UTC+8; no DST since 1982.
- Add days with `new Date(y, m, d + i)`, never `+ 86400000`: fixed milliseconds slip an hour across a DST boundary in the *device's* timezone and can shift the calendar day.
- `lib/date.ts` is display formatting only, hand-rolled rather than `Intl.DateTimeFormat` because Hermes on Android depends on whatever ICU data the device ships. It re-exports the SGT helpers from `lib/core/reminder-schedule.ts`.

## Notifications

`lib/core/reminder-schedule.ts` builds the schedule purely (`buildSchedule` → `ScheduleEntry[]`); `lib/notifications.ts` hands it to expo-notifications. Closures are grouped one entry per date, so five favourites closing the same day become one notification, and Mondays are excluded deliberately — 52+ per market per year would get reminders switched off. Two reminders per date: 7pm the evening before, 6am the morning of.

iOS silently keeps only the ~64 soonest pending requests, so `rescheduleAll` caps at 56 and cancels-then-rebuilds from scratch every time; the daily background task (`lib/background.ts`) tops the queue back up as near ones fire. Background refresh is best-effort — iOS grants it at its discretion — so cold-start rescheduling in the store is the reliable path, not the task.

## Handing a market to a map app

Tapping the address on the detail screen opens Apple Maps or Google Maps, and the setting is iOS-only — Android has no Apple Maps to choose between and its `geo:` hand-off is already the user's own default app.

- `lib/core/map-provider.ts` is pure and owns both halves: `resolveMapProvider(pref, installed)` and `mapUrl`. The device half is `lib/maps.ts`, which supplies `Platform.OS` and the `canOpenURL` probes core cannot see.
- The stored preference is `MapProvider | 'auto'`, same shape as `langPref`: `'auto'` is the absence of a choice, and it resolves to Apple Maps *unless* Apple Maps is the missing one, because Apple Maps is deletable since iOS 14 and its default would otherwise be a dead tap. The store holds only that choice (`useMapProviderPref`); which apps are installed is not app state, because the only moment the answer cannot be stale is the tap, and `openInMaps` probes there. Settings is the one caller needing it earlier; it gets both from `useMapProvider(pref)` in `lib/maps.ts`: `provider` is `null` while the probe is in flight so no stale tick is drawn, and `availableProviders` is `null` pre-probe (rows shown optimistically) then the filtered list of installed apps. That is also why there is no "automatic" row: the tick already shows what `'auto'` chose.
- `canOpenURL` answers false for any scheme not in `LSApplicationQueriesSchemes` (`app.json`, `ios.infoPlist`), so `maps` and `comgooglemaps` are listed there. Dropping either turns "installed" into "missing" silently, and adding a third map app means adding its scheme too.

## UI conventions

- `components/ui/` is the primitive layer (`Text`, `Button`, `Card`, `Row`, `Notice`, `Segmented`, `EmptyState`, `Fab`, `Icon`), imported from `components/ui`.
- `Fab` is the one primitive that places itself, and it places itself against the *tab bar*: mount it as the last child of a `flex: 1` container on a tab screen, and add `FAB_CLEARANCE` to the scrolling child's `contentContainerStyle` so the last row can be read clear of it. The tab bar is in the layout flow — `expo-router/js-tabs` positions it absolutely only while a keyboard hides it — so the screen box ends at its top edge and the bottom safe-area inset is already spent there. `useSafeAreaInsets` or `useBottomTabBarHeight` would double-count it, and a root-Stack screen outside `(tabs)` would float the button over the home indicator. `MarketMap`'s locate control is deliberately not this: squarer, on a surface fill, and placed by the animated wrapper it fades in with.
- Use `Text` from `components/ui`, never `react-native`'s. Pick a `variant` from `typeScale` and a `tone`, not raw `fontSize`/`color`. Each variant carries an iOS `dynamicTypeRamp` that maps to the matching `UIFontTextStyle`, so the native text layer measures with `UIFontMetrics` through the real accessibility curve rather than the generic `fontSizeMultiplier` — **never cap `maxFontSizeMultiplier`** on body copy, the audience is seniors and Dynamic Type must work at every size. Android ignores `dynamicTypeRamp` and scales by `fontScale` as before.
- Colours and spacing come from `lib/theme` (`space`, `radius`, `HIT_SIZE`, `useTheme`). Dark mode is not a colour swap: `theme.shadow` becomes a hairline border, because a shadow is invisible against black.
- `useThemedStyles(factory)` memoises on the factory, so **declare the factory at module scope** — one created per render rebuilds every StyleSheet on every render.
- Today rows switch to a compact Dynamic Type hierarchy past `COMPACT_FONT_SCALE` (1.4): the market name moves from `headline` to `bodyStrong`, its secondary text from `subhead` to `footnote`, and the status pill from `callout` to a bold `footnote`, keeping the daily status beside the market without capping text. Read the scale reactively with `useWindowDimensions().fontScale`, never `PixelRatio.getFontScale()` at render — the latter is a snapshot, so the row keeps a stale layout when the system text size changes in either direction. The thumbnail stays in the same element tree at every scale, so its native view and image cache survive a layout change rather than flashing the `borderLight` placeholder.
- Anything tappable inside a gesture takes `Pressable` from the gesture wrapper — `SwipeToDeleteRow` re-exports it — never from `react-native`, whose press survives a fast swipe and fires as the row opens.
- The back button is a bare chevron everywhere, from `headerBackButtonDisplayMode: 'minimal'` on the root `<Stack>` in `app/_layout.tsx`. The labelled modes shrink to that chevron whenever the centre title wants the width, so a label is only ever intermittent — `headerBackTitle` plus `headerBackButtonMenuEnabled: false` was tried and iOS shrank it anyway. `screenOptions` do not reach a nested navigator, so a new `Stack` that pushes a screen has to repeat it.
- One `ThemeProvider` at the root themes the native chrome — headers, large titles, search bar, tab bar. react-navigation is vendored inside expo-router 57, so import from `expo-router`; there is no `@react-navigation/*` package in the tree. The tab bar's labels are left to React Navigation's default, which on iOS 13+ disables font scaling and shows the system Large Content Viewer on long-press instead — the right behaviour for a fixed-height bar that cannot grow with accessibility text. A custom `tabBarLabel` that rendered the app's own `<Text>` bypassed that, scaling labels past the bar's height.
- The map ends where OneMap's tiles do, `SG_BOUNDS` in `lib/core/map-bounds.ts`, and the two mechanisms enforcing that buy different things. The raster source's `bounds` only stops *requests*, and only for tiles wholly outside — one straddling the boundary is still fetched, and OneMap answers it with something that is not a PNG, which MapLibre logs at error level and the bridge turns into a `console.error`. That red box is silenced in dev only, by `configureMapLogging()` in `lib/maplibre.ts`, called at module scope from `MarketMap` rather than the root layout so the MapLibre module graph stays out of cold start (`LogManager` holds one handler, so a second caller replaces it rather than adding to it).
- What keeps empty background *unreachable* is `ConstrainedCamera` alone: `maxBounds` constrains the camera centre and not the viewport, so it is handed `SG_BOUNDS` inset by half the span the map last reported (`centerLimit`), and `constrain()` eases the centre back in after a zoom-out that outgrew the tightened box, which the native clamp will not do — it only refuses the next move. A reported centre outside `SG_BOUNDS` is ignored outright: the native clamp makes one unreachable, so it is startup garbage (the map reports `[0, 0]` before applying `initialViewState`), and clamping it would ease a restored view to a corner of the box. That holds while the viewport fits inside the box; at `minZoom` 11 a tablet's is about 0.41° tall against the box's 0.40°, so latitude pins to the middle with a few points of background top and bottom. Its state lives in that component deliberately, because a settle in `MarketMap` would re-serialise the tile style and all ~123 features.
- The map's initial view is the saved `mapView` if one exists, else the user's current location on a first-ever visit (arming `awaitingFix` at mount so the fix, when it lands, eases the camera there), else the Singapore overview. User-initiated `onRegionDidChange` settles defer their save briefly: a following `ConstrainedCamera` correction replaces the pre-correction view, while an ordinary pan saves unchanged. `onRegionIsChanging` retains an in-progress user viewport for app background/unmount. Other non-user MapLibre events are deliberately ignored because setup callbacks can report a default camera after a restored one. The programmatic location moves save their target before easing. Validation of a persisted view — centre inside `SG_BOUNDS`, zoom within `MIN_MAP_ZOOM`/`MAX_MAP_ZOOM` — is `parseMapView` in `lib/core/map-view.ts`, the single source of those zoom bounds.

## i18n

`lib/i18n.ts` holds two flat objects. `en` is the source of truth (`StringKey = keyof typeof en`) and `zh` is typed `Record<keyof typeof en, string>`, so adding a key without its Chinese translation fails typecheck. Get `t` from `useT()`; interpolate with `{name}` placeholders. Market names have a separate Chinese lookup in `lib/core/zh-names.ts`, keyed by the *friendly* (parenthesised) part of the NEA name — reach it through `getDisplayName`/`displayName` so notifications don't end up half-translated.

Closure reasons are worded once, in `lib/core/reason-words.ts` — in core because `notificationCopy` is there and core cannot import `lib/`, and read back by `i18n.ts` for the status pill. Word a new reason there, not at the call site that needs it.

Language resolution separates the choice from the result: `state.langPref` (`Lang | 'system'`) is what the user picked, and `lang` follows from it. `'system'` resolves through `lib/lang.ts`, a separate module so the headless `background.ts` can reach it without importing the store. Three things a caller must not re-derive for itself: a missing `oa_lang` means `'system'`, which is why `loadLangPref` returns that rather than `null` — `background.ts` used `?? 'en'` and sent English reminders to phones running the app in Chinese; membership of the supported set is `isLang()` in core, never `=== 'en' || === 'zh'`, which no typecheck would catch when the set grows; and re-passing an unchanged `langPref` to `setState` re-resolves deliberately, which is how the foreground picks up a device-language change.

## Dataset handling

- Market identity is the raw NEA `name` string, and favourites are stored as those strings. `parseMarketName` splits `"Blk 1 Foo Rd (Bar Market)"` into street plus friendly name and decodes HTML entities.
- `normalizeMarkets` runs at every ingress — network fetch *and* cache read — so no screen has to remember it. Dataset quirk fixes belong there.
- A market can leave the dataset: favourites pointing at a missing market are pruned on load, and `useMarket` returns `null`. Handle that in any new screen.
- `MAX_FAVORITES` (`lib/core/favorites.ts`) caps the list, and it is a reminder-queue bound as much as a product one: it sits with `HORIZON_DAYS` and `MAX_SCHEDULED_REMINDERS` as the three numbers sharing that budget, and `reminder-schedule.test.ts` asserts a full list still fits. Enforcement is at the add only — an over-limit list from an older install is never pruned, and removal from one always works. `toggleFavorite` raises the Alert itself, so a new star needs nothing but the action.
- `fetchMarketsFromAPI` returns `null` rather than throwing (10s timeout, one retry); the caller falls back to the cache and sets `stale`.
- AsyncStorage keys are namespaced `oa_`, renamed from `moa_` and then `poa_` across two rebrands. Nothing migrates the old keys and nothing should: the bundle identifier changed with them each time, so an install holding older keys is a different app whose container this one cannot reach.
