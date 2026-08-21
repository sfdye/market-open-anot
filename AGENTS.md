# AGENTS.md

Invariants and conventions an agent cannot infer from a single file. `README.md` owns the product, dev setup, the generated native projects and EAS release, and is not repeated here.

## Commands

```sh
npm test                                  # node --test over lib/core/*.test.ts — no framework in the tree
node --test lib/core/market-logic.test.ts # one file
node --test --test-name-pattern="parses D/M/YYYY" lib/core/market-logic.test.ts   # one test
npm run typecheck                         # both TS programs: the app, then lib/core
npm run e2e                               # maestro test against a running dev build
```

Those two are the whole of CI (`.github/workflows/test.yml`); there is no lint step. Screens are not unit-tested — verifying them means a device build, and notifications cannot be checked in a simulator.

## E2E (Maestro)

`e2e/flows/` holds Maestro YAML; `e2e/utils/` holds shared subflows. Local-only — not in CI.

- Install the CLI standalone (`brew tap mobile-dev-inc/tap && brew install maestro`); nothing goes in `package.json` dependencies. Requires Java 17+.
- Run against the standalone dev build (`com.sfdye.openanot.dev`): `APP_VARIANT=development npx expo run:ios --configuration Release` then `npm run e2e:ios`. Android: `--variant release` on an API ≤ 34 emulator.
- Flows target elements by `testID` (Maestro's `id:` selector), not by text — accessibility labels are localized. Add a `testID` to any new interactive element a flow needs to address.
- Notifications, deep-link routing, and background refresh remain untestable in simulators.
- Before marking a PR ready for review, prompt the user to run `npm run e2e:ios` and `npm run e2e:android` locally against a fresh dev build.

## Editing across the two TypeScript programs

`lib/core/` is typed against Node's globals and *not* React Native's, so an accidental `react-native` or `lib/` import fails typecheck rather than at runtime on device. That boundary constrains edits:

- Inside `lib/core/`, imports carry explicit `.ts` specifiers (`./market-logic.ts`) so `node --test` can strip types and run the files directly. Everywhere else, no extension.
- `lib/core/` must stay erasable-syntax-only: no enums, no namespaces, no parameter properties, and type-only imports marked `import type`.
- New logic worth unit-testing belongs in `lib/core/`; anything touching a device API cannot go there.
- Do not add an `include` entry to `tsconfig.json` — `expo start` rewrites that file, comments and all, when `include` names something it did not put there.

## Builds

- `app.json` is the base config and the only place plugin config belongs. `app.config.ts` layers the dev variant over it (`.dev` ids, "Open Anot? Dev") when `APP_VARIANT=development`, which the `npm run` scripts and the EAS `development` profile set — so a release build is the one that sets nothing. Keep `slug` and `extra.eas.projectId` out of the override.
- The build number is two keys in `app.json` — `ios.buildNumber` (a string) and `android.versionCode` (a number) — which must stay equal. Bump only with `npm run release`; never by hand, and never re-add `autoIncrement`.
- `production` is the TestFlight profile; TestFlight and the App Store take the same binary. Do not add a `testflight` profile or Expo's `preview` variant — the `apk` profile already covers internal testing.
- EAS Update ships JS/assets over the air (translations, `zh-names` fixes). `runtimeVersion` policy `appVersion` makes the per-release `version` bump the OTA boundary; `production` carries `channel: "production"`, inherited by `apk`. `eas update` bundles the **working tree** (unlike `eas build`), so publish from a clean tree. Native deps, SDK upgrades, and `app.json` native config still need a store build. README's OTA section has the commands.
- Branch config on `APP_VARIANT`, never `EAS_BUILD_PROFILE` — a local `expo run:ios` doesn't set the latter and would silently take the production branch.
- A Debug build embeds no JS (`SKIP_BUNDLING=1`) and is dead without Metro. `APP_VARIANT=development npx expo run:ios --configuration Release` gives a standalone dev app with no new EAS profile. Judge performance only on Release builds.
- `distribution: internal` ad-hoc signs for registered UDIDs; `production` provisions no devices and is TestFlight-only, not sideloadable.
- Every icon raster in `assets/` is **generated**: `npm run icons` derives them from `brand/` (Pillow + librsvg, hand-run). Edit the master in `brand/`, never the output. The 96px notification glyph is the exception — a hand-drawn SVG.

## State: an external store, not context

`lib/store/` is a hand-rolled external store read through `useSyncExternalStore`. Import from the barrel `lib/store`.

- `state.ts` owns the single `State` object plus `getState`/`subscribe`/`setState`. `setState` derives `lang` from `langPref` and `t` from `lang`, excluding both from its patch type; `t` is a stable per-language reference components memoise on.
- `hooks.ts` exposes one hook per slice. Subscribe to the narrowest one — `useIsFavorite(name)` exists so a star tap re-renders one row instead of all 123.
- `actions.ts` owns every side effect: persistence, the NEA fetch, the SGT-midnight timer, the `AppState` foreground listener, and `watchSchedule()`. `initStore()` is called once from `app/_layout.tsx` and is idempotent (Fast Refresh and StrictMode both call it twice).
- Rescheduling notifications is a **store subscriber**, not a React effect, so it runs when no screen is mounted. It debounces and dedupes on `lang|favorites|markets.length|remindersEnabled`.
- `mapView` is the persisted last camera position. `MarketMap` reads it once at mount (never subscribes — a re-render would re-serialise the tile style and ~123 features), saves user-initiated settles after a 500ms wait (a following `ConstrainedCamera` correction saves the final camera), retains in-progress pans for app backgrounding, and ignores MapLibre's non-user events, which can report a default camera. `null` (first-ever visit) means default to the user's current location. Validation lives in `parseMapView` (`lib/core/map-view.ts`).

Launch sequence: read AsyncStorage → `setState({ ready: true })`, which lifts the splash via `SplashGate` → revalidate over the network only if the cache is older than 24 hours.

## Timezone model

Status is a *civil date* question, so the app never mixes instants with calendar days:

- `sgToday()` returns a `Date` whose **local** Y/M/D match Singapore's. Pass these civil dates around, not `new Date()`.
- `sgInstant(civil, hour)` converts a civil date plus an SGT hour into a real instant — what a notification trigger needs. SGT is hardcoded UTC+8.
- Add days with `new Date(y, m, d + i)`, never `+ 86400000` — fixed milliseconds can shift the calendar day across a DST boundary in the *device's* timezone.
- `lib/date.ts` is display formatting only, hand-rolled rather than `Intl.DateTimeFormat` because Hermes on Android depends on device ICU data.

## Notifications

`lib/core/reminder-schedule.ts` builds the schedule purely (`buildSchedule`); `lib/notifications.ts` hands it to expo-notifications. Closures are grouped one entry per date (five favourites closing the same day → one notification), Mondays are excluded deliberately, and each date gets two reminders: 7pm the evening before, 6am the morning of.

iOS silently keeps only the ~64 soonest pending requests, so `rescheduleAll` caps at 56 and cancels-then-rebuilds every time; the daily background task (`lib/background.ts`) tops the queue up as near ones fire. Background refresh is best-effort — cold-start rescheduling in the store is the reliable path, not the task.

## Handing a market to a map app

Tapping the address opens Apple Maps or Google Maps; the setting is iOS-only (Android's `geo:` hand-off already uses the user's default).

- `lib/core/map-provider.ts` is pure: `resolveMapProvider(pref, installed)` and `mapUrl`. `lib/maps.ts` supplies `Platform.OS` and the `canOpenURL` probes.
- Stored preference is `MapProvider | 'auto'`; `'auto'` resolves to Google Maps when installed, else Apple Maps. The Apple probe is hardcoded `true` — iOS keeps `maps://` registered even when the app is "deleted", so `canOpenURL` can't detect it. Which apps are installed is *not* app state: `openInMaps` probes at tap time; Settings uses `useMapProvider(pref)`, which returns `null` while probing.
- `canOpenURL` answers false for schemes not in `LSApplicationQueriesSchemes` (`app.json`), so `comgooglemaps` is listed there — dropping it silently turns "installed" into "missing". Adding a third map app means adding its scheme.

## UI conventions

- `components/ui/` is the primitive layer (`Text`, `Button`, `Card`, `Row`, `Notice`, `Segmented`, `EmptyState`, `Fab`, `Icon`), imported from `components/ui`.
- Use `Text` from `components/ui`, never `react-native`'s. Pick a `variant` and a `tone`, not raw `fontSize`/`color`. **Never cap `maxFontSizeMultiplier`** on body copy — the audience is seniors and Dynamic Type must work at every size.
- Colours and spacing come from `lib/theme` (`space`, `radius`, `HIT_SIZE`, `useTheme`). In dark mode `theme.shadow` is a hairline border — a shadow is invisible against black.
- `useThemedStyles(factory)` memoises on the factory, so **declare the factory at module scope**.
- `Fab` places itself against the tab bar: mount it as the last child of a `flex: 1` container on a tab screen and add `FAB_CLEARANCE` to the scrolling child's `contentContainerStyle`. Do not add `useSafeAreaInsets`/tab-bar-height padding — the screen box already ends at the tab bar's top edge.
- Today rows switch to a compact text hierarchy past `COMPACT_FONT_SCALE` (1.4). Read the scale reactively with `useWindowDimensions().fontScale`, never `PixelRatio.getFontScale()` at render.
- Anything tappable inside a gesture takes `Pressable` from the gesture wrapper (`SwipeToDeleteRow` re-exports it), never from `react-native`.
- The back button is a bare chevron everywhere via `headerBackButtonDisplayMode: 'minimal'` on the root `<Stack>`; a new nested `Stack` that pushes screens must repeat it — `screenOptions` don't reach nested navigators.
- One `ThemeProvider` at the root themes the native chrome. react-navigation is vendored inside expo-router 57 — import from `expo-router`; there is no `@react-navigation/*` package. Leave tab bar labels to the default; a custom `tabBarLabel` bypasses iOS's fixed-height bar behaviour.

### Map (MapLibre + OneMap)

- Tiles end at `SG_BOUNDS` (`lib/core/map-bounds.ts`). The raster source's `bounds` only stops requests, so OneMap still serves non-PNG boundary tiles that MapLibre logs as errors — silenced in dev by `configureMapLogging()` (`lib/maplibre.ts`), called at module scope from `MarketMap` to keep MapLibre out of cold start.
- `ConstrainedCamera` keeps empty background unreachable: `maxBounds` gets `SG_BOUNDS` inset by half the viewport span, and `constrain()` eases the centre back after an outgrowing zoom-out. A reported centre outside `SG_BOUNDS` is startup garbage — ignore it, don't clamp it. Keep its state in that component; a settle in `MarketMap` would re-serialise the tile style and all features.
- Initial view priority: saved `mapView` → user's current location (first visit, via `awaitingFix`) → Singapore overview.

## i18n

`lib/i18n.ts` holds two flat objects. `en` is the source of truth (`StringKey = keyof typeof en`) and `zh` is typed `Record<keyof typeof en, string>`, so a missing translation fails typecheck. Get `t` from `useT()`; interpolate with `{name}` placeholders. Market names have a separate Chinese lookup in `lib/core/zh-names.ts`, keyed by the *friendly* (parenthesised) part of the NEA name — reach it through `getDisplayName`/`displayName` so notifications aren't half-translated.

Closure reasons are worded once, in `lib/core/reason-words.ts` (in core because `notificationCopy` is there), and read back by `i18n.ts` for the status pill. Word a new reason there, not at the call site.

Language resolution: `state.langPref` (`Lang | 'system'`) is the choice, `lang` follows from it, resolved through `lib/lang.ts` (separate module so headless `background.ts` can reach it without the store). Three rules: a missing `oa_lang` means `'system'` (`loadLangPref` returns it rather than `null` — `?? 'en'` once sent English reminders to Chinese phones); membership of the supported set is `isLang()`, never `=== 'en' || === 'zh'`; re-passing an unchanged `langPref` to `setState` re-resolves deliberately (that's how foreground picks up a device-language change).

## Dataset handling

- Market identity is the raw NEA `name` string; favourites are stored as those strings. `parseMarketName` splits `"Blk 1 Foo Rd (Bar Market)"` into street plus friendly name and decodes HTML entities.
- `normalizeMarkets` runs at every ingress — network fetch *and* cache read. Dataset quirk fixes belong there.
- A market can leave the dataset: favourites pointing at a missing market are pruned on load, and `useMarket` returns `null`. Handle that in any new screen.
- `MAX_FAVORITES` (`lib/core/favorites.ts`) caps the list; it's a reminder-queue bound alongside `HORIZON_DAYS` and `MAX_SCHEDULED_REMINDERS`, and `reminder-schedule.test.ts` asserts a full list still fits. Enforcement is at the add only; removal always works. `toggleFavorite` raises the limit Alert itself.
- `fetchMarketsFromAPI` returns `null` rather than throwing (10s timeout, one retry); the caller falls back to the cache and sets `stale`.
- AsyncStorage keys are namespaced `oa_`. Nothing migrates older prefixes — the bundle identifier changed with each rename, so those installs are different apps.
