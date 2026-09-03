# Volt — Mobile

The primary product surface (see root [PRODUCT.md](../PRODUCT.md): mobile-first, web is
marketing + companion). Scaffolded 2 Sep 2026 in `volt-mobile/`; slice 1 (auth + Log loop) is
in. Spec: [docs/superpowers/specs/2026-09-02-mobile-log-loop-design.md](../docs/superpowers/specs/2026-09-02-mobile-log-loop-design.md).

## Stack (decided at scaffold time)
- **Expo SDK 57 + Expo Router 57 + React Native 0.86 + TypeScript 6 (strict)**. Expo has
  changed: read https://docs.expo.dev/versions/v57.0.0/ before writing code.
- **Server state:** `@tanstack/react-query` with an AsyncStorage persister (24 h cache) so reads
  work offline. **Session state:** one Zustand store persisted to AsyncStorage
  (`src/session/store.ts`) — the source of truth from Start to Save.
- **API:** `openapi-fetch` client over types generated from `backend/docs/api/openapi.yaml`
  (`npm run gen:api` → `src/api/schema.d.ts`, committed). Never hand-write API shapes.
- **Auth:** JWT + rotating refresh in `expo-secure-store` (AsyncStorage on the web dev target);
  one refresh-and-retry on 401 inside the fetch wrapper.
- **Design system:** `src/ui/tokens.ts` mirrors VOLT_DESIGN_SYSTEM.md §2; primitives in
  `src/ui/primitives.tsx` (Numeral, Meta, Mono, Body, Heading, Zone, Hairline, Button,
  Stepper, TierChip, HeaderWash) and `Bolt.tsx`. Fonts: JetBrains Mono (numerals/meta) + Inter (headings/body).
- **Tests:** plain `babel-jest` on pure modules only (`src/**/*.test.ts`). Screens are verified
  visually.

## Commands
```bash
cd mobile/volt-mobile
npm start            # Metro; scan the QR with Expo Go, or press i / a
npm run typecheck    # tsc --noEmit
npm test             # jest (pure modules)
npm run gen:api      # regenerate src/api/schema.d.ts from the backend contract
```
Backend for dev: `cd backend && ./gradlew bootRun` (H2, in-memory — data is wiped on
restart). API base URL: `EXPO_PUBLIC_API_URL` (default `http://localhost:8080`; on a physical
phone use the Mac's LAN IP). `.npmrc` sets `legacy-peer-deps` — required for `expo install`.

## Layout
```
volt-mobile/
├── app/                 Expo Router routes
│   ├── _layout.tsx      fonts, QueryClient + persister, auth hydrate + gate, stack
│   ├── (auth)/          login, register (full-screen modal; register honours `useAuth.next`)
│   ├── (onboarding)/    goal (18), week (19) — runs without a token
│   ├── (tabs)/          Today · Plan · Feed · Rivals (Plan/Feed/Rivals are placeholders)
│   ├── workout/         live (Live Lift), picker, finish, summary (also read-only from History)
│   ├── run/             live (Live Run, GPS), save (Save/Edit activity), privacy (bottom sheet)
│   ├── exercise/[id].tsx Exercise Detail — About · History · Charts · Records
│   ├── history.tsx      History (lifts + cardio, week groups)
│   └── profile.tsx      Profile — month calendar with dual dots, totals, link to History
└── src/
    ├── api/             schema.d.ts (generated), client.ts, queries.ts
    ├── auth/store.ts
    ├── session/         reducer.ts (pure, tested), toRequest.ts, pr.ts, store.ts, fromRoutine.ts
    ├── run/             geo.ts (pure, tested: distance, splits, pace, trim, polyline), store.ts, tracker.ts (expo-location + task)
    ├── settings/store.ts privacy + share defaults (local until the API has them)
    ├── onboarding/      store.ts (goal, event date, first-set stopwatch), templates.ts (seeded weeks; `local:<name>` ids)
    └── ui/              tokens.ts, primitives.tsx, Bolt.tsx, LineChart.tsx, RouteArt.tsx (svg), SessionPill.tsx, useNow.ts, field.ts
```

## Offline model (slice 1)
Logging a set never touches the network. The session lives in the persisted store; Save maps
it to one nested `POST /api/workouts`. A failed save leaves the session `unsaved` and Today
shows a retry row. A session is never lost.

## Product constraints that shape the code
- Logging speed is sacred: ≤2 taps per set, previous-session prefill, one action in the thumb zone.
- kg is the default unit everywhere; lb is a settings toggle (not built yet).
- Measurement type should come from the Exercise config — the API has none yet, so the logger
  infers reps-only from `equipment === BODYWEIGHT`.
- GPS recording must survive backgrounding (Android reliability is a feature, not a bug class).
- Live Activity / lock-screen (rest countdown + tick sets) is v1 scope, not polish.

## Design source of truth
Claude Design project "Volt - App Screens" (26 artboards) — do not invent screens; port them.
The mark is `src/ui/Bolt.tsx` (white split-V polygon, never ember); no wordmark inside the app.
`Meta` defaults to the mid gray `t2` — meaningful metadata never sits at `t3`/`t4` (contrast floor).
Grammar: `#121212` darkness ladder, ember `#FF5A1F` = strength, jade `#31A98D` = endurance,
gold = earned only, mono numerals, grayscale chrome, one number owns each screen.
Muscle figure: `design-screens/body-map/volt-body-map.svg` (locked; recolor via CSS vars).

## Backend follow-ups surfaced by slice 1
1. Session-level `rpe` on `CreateWorkoutRequest` / `WorkoutResponse` (currently prefixed into `notes`).
2. `measurementType` on Exercise (`REPS_WEIGHT | DISTANCE | DURATION | REPS_ONLY`).
3. Load and rating endpoints (Today's 842, Summary's load-earned and rating delta).
4. Events entity (race countdown on Today).

## Screens built (artboard numbers)
01 Today · 02 Live Lift · 03 Live Run · 06 Profile · 08 History · 10 Finish · 11 Summary ·
13/14 Exercise Detail · 16 Save/Edit activity · 17 Privacy sheet · 18–20 Onboarding.
Plus login, register, exercise picker (no artboards); Plan/Feed/Rivals tabs are placeholders.

## Navigation rules learned the hard way
- Every screen reached from inside the workout modal stack must declare `presentation:
  'fullScreenModal'` and apply `useSafeAreaInsets()` itself — screens pushed above a modal inherit
  the sheet style and lose the safe-area inset. Never `router.replace('/(tabs)')` from inside
  that stack; use `router.dismissAll()`, or Today re-presents as a sheet.
- Surfaces paint edge to edge behind the status bar (the artboards' `9:41` row is the OS).

## GPS recording
`src/run/tracker.ts` registers a TaskManager background task (works on device with the Always
permission; Expo Go on iOS supports it, Android background needs a development build) and falls
back to a foreground watch. Points go into the persisted run store; pauses open a new segment so
distance never bridges a pause. Save trims the route ends per the privacy settings **before** the
POST, then sends one nested `POST /api/activities` with laps from the per-km splits. Simulator:
`xcrun simctl location <udid> start --speed=3.3 <lat,lng ...>` to drive a route.

## Deferred account (onboarding)
The gate lets `(onboarding)` and `workout/*` run without a token while onboarding is active.
The seeded week uses `local:<seed name>` exercise ids; Finish asks for the account at Save
(`useAuth.next = '/workout/finish'`), then resolves names against `GET /api/exercises` before
the POST. The chosen goal drives Today's race-countdown line until an Events entity exists.

## Next slices
Share cards (12) → Settings (22) → Today low states (23–25) when Plan exists → Live Activity /
lock screen. See [PRODUCT.md §7](../PRODUCT.md).
