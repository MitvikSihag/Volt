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
│   ├── (auth)/          login, register
│   ├── (tabs)/          Today · Plan · Feed · Rivals (Plan/Feed/Rivals are placeholders)
│   ├── workout/         live (Live Lift), picker, finish, summary
│   └── profile.tsx
└── src/
    ├── api/             schema.d.ts (generated), client.ts, queries.ts
    ├── auth/store.ts
    ├── session/         reducer.ts (pure, tested), toRequest.ts, pr.ts, store.ts, fromRoutine.ts
    └── ui/              tokens.ts, primitives.tsx, SessionPill.tsx, useNow.ts, field.ts
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

## Next slices
History + Exercise Detail (existing endpoints) → Live Run + Save/Edit → Onboarding 18–20
(deferred account) → Share cards. See [PRODUCT.md §7](../PRODUCT.md).
