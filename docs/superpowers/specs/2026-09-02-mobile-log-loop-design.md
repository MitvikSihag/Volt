# Mobile slice 1 — foundation + Log loop

> Design spec, 2 Sep 2026. Scope: the first vertical slice of the Expo app — auth, tab shell,
> Today, Live Lift, Finish, Summary. Companion docs: [PRODUCT.md](../../../PRODUCT.md) §4/§7,
> [VOLT_DESIGN_SYSTEM.md](../../../VOLT_DESIGN_SYSTEM.md), the Claude Design project
> "Volt - App Screens" (artboards 01, 02, 10, 11), and `backend/docs/api/openapi.yaml`.

## 1. Decisions taken

| Decision | Call | Why |
|---|---|---|
| Existing frontend code | Discarded. `mobile/volt-mobile` is replaced in place; `web/` untouched | Old scaffold is a light-theme placeholder; owner said not to reuse |
| Account | Login first. Onboarding 18–20 (deferred sign-up) ships in a later slice | Every endpoint needs a JWT; alpha user is the founder |
| Where a logged set goes | Phone first, one nested POST at Save, queued if offline | Offline logging is the wedge; backend live-set endpoints need a server workout id that does not exist offline |
| Numbers with no backend | Omitted or replaced by an honestly-captioned real number. Never faked | Fake numbers fail design review (§6 of the design system) |

## 2. Scope

### In
- **Auth**: login (`POST /api/auth/login`), register (`POST /api/auth/register`), silent refresh
  (`POST /api/auth/refresh`), logout. Tokens in `expo-secure-store`.
- **Tab shell**: Today · Plan · Feed · Rivals as drawn. Plan, Feed, Rivals are empty zones with
  a one-line "arrives with v1.x" caption. Profile is reached from the avatar on Today and shows
  only display name + logout in this slice.
- **Today** (artboard 01): ember header wash; "Monday. Pull day." two-tone heading
  (weekday + first routine name); giant numeral = `dashboard.week.volumeKg` captioned
  `Volume, last seven days · kg`; strength/endurance split bar from `week.volumeKg` vs
  `week.distanceKm` presence is **omitted** (no load model) — the bar is not drawn;
  session preview = first routine (exercises with `targetSets × targetReps`), "+N more · tap
  for detail"; `Start session` builds a local session from that routine; long-press opens an
  empty session (ad-hoc). Race countdown line omitted (no Events entity).
- **Live Lift** (artboard 02): one exercise at a time. Header: elapsed timer (ember dot),
  session title, `EXERCISE i / n`, close (× → discard confirm). Exercise name, `SET k OF n ·
  PR <best>` from cached `GET /api/exercises/{id}/records` (omitted when none). Giant current
  weight + reps with ± steppers (2.5 kg, 1 rep; long-press repeats). Folded "k sets logged ·
  avg RPE" row expands the logged list. Planned sets ghosted below with the next one marked
  `NOW`. "Next up — <exercise>" line. `REST m:ss` countdown starts on Log set (per-exercise
  `restSeconds` from the routine, else 2:00). Single `Log set` button in the thumb zone.
  Swipe down minimises to a pill over any tab; tap restores. Exercise picker: full-screen
  dense list over `GET /api/exercises` with search, muscle filter chips.
- **Finish** (artboard 10): `STOPPED` state, giant elapsed time, session RPE 4–10 (session
  level), optional note, `Save session`, `Discard`.
- **Summary** (artboard 11): title + date line; giant numeral = `totalVolumeKg` from the
  server response captioned `Total volume · kg` (load-earned omitted); duration; muscles
  worked chips (derived client-side: count sets per `primaryMuscleGroup`); PR rows from sets
  with `isPr: true`; `Done`. Rating delta and Share omitted.
- **Offline**: all reads served from a persisted query cache; Save queues and retries; an
  unsaved session is shown on Today with a retry row until it lands.

### Out (later slices)
History, Exercise Detail, Live Run, Save/Edit activity, Privacy, Onboarding, Share cards,
Vault, muscle map, Rivals, Feed, Settings, Live Activity/lock screen, voice.

## 3. Architecture

```
mobile/volt-mobile/
├── app/
│   ├── _layout.tsx            fonts, QueryClient + persister, auth gate, stack
│   ├── (auth)/login.tsx · register.tsx
│   ├── (tabs)/_layout.tsx     Today · Plan · Feed · Rivals (sunken #0D0D0D bar)
│   ├── (tabs)/index.tsx       Today
│   ├── (tabs)/plan.tsx · feed.tsx · rivals.tsx   placeholders
│   ├── profile.tsx
│   └── workout/live.tsx · picker.tsx · finish.tsx · summary.tsx
├── src/
│   ├── api/
│   │   ├── schema.d.ts        generated: openapi-typescript backend/docs/api/openapi.yaml
│   │   ├── client.ts          fetch wrapper: base URL, bearer, one refresh-and-retry on 401
│   │   └── queries.ts         useExercises, useRoutines, useLastSets, useRecords, useDashboard, useSaveWorkout
│   ├── auth/store.ts          zustand: tokens (secure-store), user, login/register/logout
│   ├── session/
│   │   ├── store.ts           zustand + persist(AsyncStorage): the active session
│   │   ├── reducer.ts         pure: start, logSet, step, nextExercise, finish  (tested)
│   │   ├── toRequest.ts       pure: Session → CreateWorkoutRequest             (tested)
│   │   └── pr.ts              pure: isPr(set, records)                          (tested)
│   └── ui/
│       ├── tokens.ts          colours, ramp, spacing, fonts — mirrors VOLT_DESIGN_SYSTEM.md §2
│       └── primitives.tsx     Numeral, Meta, Heading, Zone, Stepper, Button, TierChip, HeaderWash
└── package.json
```

- **Stack**: Expo (current SDK), Expo Router, TypeScript strict, `@tanstack/react-query` +
  `@tanstack/query-async-storage-persister`, `zustand`, `expo-secure-store`,
  `@react-native-async-storage/async-storage`, `expo-linear-gradient`, `@expo-google-fonts/inter`,
  `@expo-google-fonts/jetbrains-mono`, `react-native-gesture-handler` + `reanimated` (Expo
  Router already pulls them). Dev: `openapi-typescript`, `jest-expo`.
- **Server state**: TanStack Query. Persisted cache (24 h) so exercises, routines, last sets,
  records and dashboard are readable offline. `useSaveWorkout` is a mutation with
  `networkMode: 'offlineFirst'` and a persisted mutation default so it resumes after restart.
- **Session state**: one Zustand store, persisted. Shape:
  ```ts
  type Session = {
    id: string; title: string; routineId?: string; startedAt: string;
    exercises: { exerciseId: string; name: string; muscle: string; restSeconds: number;
                 planned: { weightKg: number|null; reps: number|null }[];
                 logged:  { weightKg: number|null; reps: number|null; rpe?: number; at: string; setType: 'NORMAL'|'WARMUP'|'DROP_SET'|'FAILURE' }[] }[];
    currentExercise: number; current: { weightKg: number|null; reps: number|null };
    rest: { until: string|null }; status: 'live'|'finishing'|'unsaved'|'saved';
    finish?: { rpe: number; note: string; completedAt: string };
  }
  ```
  Prefill order for `current`: last logged set of this exercise → last-sets endpoint →
  routine target reps with null weight.
- **Save**: `toRequest(session)` → `POST /api/workouts` (`CreateWorkoutRequest` with nested
  exercises/sets; `startedAt`, `completedAt`, `notes = note`, and session RPE prefixed into
  notes as `RPE 8 · ` because the API has no session-level RPE). On success: status `saved`,
  navigate to Summary with the `WorkoutResponse`, invalidate dashboard/last-sets/records.
  On failure: status `unsaved`, Today shows a retry row. Discard clears the store.
- **Auth**: access token in memory + secure store, refresh token in secure store. Client
  retries once after a successful refresh; on refresh failure the auth store logs out and the
  router gate sends the user to login. Unsaved sessions survive logout.
- **Design system**: `tokens.ts` is the single source; surfaces `#121212/#0D0D0D/#171717/#000`,
  ember `#FF5A1F`, jade `#31A98D`, gold placeholder `#D9B45B` (pending the final hex), text
  ramp `#FAFAFA/#A8A8AA/#6E6E70`. Numerals JetBrains Mono, headings Inter. No cards, borders,
  shadows or glows; zones separate by luminance; 1 px hairline only where a zone stops reading.
  Motion: 200–300 ms ease-out, once; only timers loop.
- **Measurement type**: the API has none. The logger shows kg × reps for everything except
  `BODYWEIGHT` equipment, which shows reps only (weight null). Noted as a backend follow-up.

## 4. Data flow

1. Boot → fonts → hydrate auth + session stores → hydrate query cache → gate: no token → login.
2. Today mounts → `useDashboard`, `useRoutines` (cache-first). Start → `start(routine)` builds the
   session; `useLastSets(exerciseIds)` fills `planned`/`current` when it arrives.
3. Log set → `logSet()` appends, resets `current` to the same values, arms `rest.until`,
   advances the `NOW` marker; after the last planned set the "Next up" line becomes the action.
4. Finish → `finish({rpe, note})` → Save → mutation → Summary. Timer stops at `completedAt`.
5. App killed mid-session → store rehydrates with `status: 'live'`; Today shows the minimised
   pill; elapsed time is derived from `startedAt`, never counted.

## 5. Error handling
- Network errors never surface raw text; every failure path has a one-line human message and
  keeps user data. Save failure ≠ data loss.
- 401 → refresh once → retry once → logout. 4xx validation → shown inline on the form.
- Empty states are real sentences ("No routines yet. Long-press Start to log ad hoc.").

## 6. Testing
- `jest-expo` on the pure modules only: `reducer.ts` (start/logSet/step/finish),
  `toRequest.ts` (shape matches `CreateWorkoutRequest`, RPE prefix, nulls for bodyweight),
  `pr.ts` (beats stored e1RM/max weight). One small test file each.
- Screens: verified in the iOS Simulator against artboards 01/02/10/11 with screenshots;
  backend running locally on H2 (`./gradlew bootRun`).
- TypeScript strict + generated schema is the contract check.

## 7. Backend follow-ups surfaced by this slice (not built here)
1. Session-level `rpe` on `CreateWorkoutRequest` / `WorkoutResponse`.
2. `measurementType` on Exercise (`REPS_WEIGHT | DISTANCE | DURATION | REPS_ONLY`).
3. Load and rating endpoints (Today's 842, Summary's load-earned and rating delta).
4. Events entity (race countdown on Today).
