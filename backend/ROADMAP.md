# Volt Backend — Roadmap

> **Single source of truth for backend planning.** This document supersedes the stale
> "Build Order" checklist in [`CLAUDE.md`](CLAUDE.md) and earlier frontend-oriented planning,
> both of which describe a stack and sequence that no longer match reality
> (Supabase/Mapbox/Next 14 were never built — the backend is Spring Boot, the web is Next 16).
>
> Scope: **backend only.** Frontend/mobile are referenced solely where they gate API design.
>
> **Sequencing superseded (Sep 2026):** the root [PRODUCT.md](../PRODUCT.md) now owns the product
> plan — mobile-first vertical slices; social moved post-launch; new v1 scope (Events, unified
> load, Volt Score ratings, muscle transparency, Vault). This doc remains authoritative for
> backend phase *content* and conventions; consult PRODUCT.md for *order*.

---

## 1. How to use this doc

- Phases are **sequential by default** but the cross-cutting workstreams (§6) run in parallel.
- Each phase has a **Goal**, **Scope** (entities/endpoints), and **Definition of Done**.
- After a phase PR merges, check it off here and tag the merge commit `phaseN-<slug>`; no phase
  tags exist yet.
- Keep the checked-in OpenAPI contract (`docs/api/openapi.yaml`) authoritative — every new
  endpoint lands with its contract and integration tests in the same PR. Contract verification
  must compare generated output with the checked-in file, never silently overwrite it.

---

## 2. Phase-numbering reconciliation

The project accumulated **two conflicting numbering schemes** (a fingerprint of the mid-project
re-architecture that flattened then re-nested the workout model). Going forward, **one canonical
scheme** continues from the merged Phase 2 baseline. Historical and current mapping:

| Canonical phase | Branch / PR | Old commit label | Status |
|---|---|---|---|
| 0 — Foundations | `feat/phase-0-foundations` (#5) | — (also "Phase 3" profiles era) | ✅ merged |
| 1 — Workout model | `feat/phase-1-workout-model` (#6) | "Phase 1" | ✅ merged |
| 2 — Routines & records | `feat/phase-2-routines-records` (#7) | "Phase 2" | ✅ merged |
| 3 — Persistence & deploy | `codex/phase-3-stabilization` | — | 🟡 stabilized; awaiting PR + merge |
| (folded into 0–2) | `feat/user-profiles` (#2) | "Phase 3" | ✅ merged |
| (folded into 0–2) | `feat/workout-logging` (#4) | "Phase 4+5" | ✅ merged |
| (dead) | `feat/exercise-library` | "Phase 4" | ⚠️ orphaned — **delete** |
| (folded) | `fix/auth-issues` (#1) | — | ✅ merged |

**Action:** delete the orphaned `feat/exercise-library` branch (superseded; never merged).
All future work uses canonical phase numbers **3+** below.

---

## 3. Current state — merged baseline and stabilization branch

Phase 2 was merged into `main` via PR #7. That Spring Boot 3.5 / Java 21 JWT-stateless REST API
has **7 controllers, 39 HTTP operations, and 25 OpenAPI paths**. Domain entities generally extend
`BaseEntity` (UUID id plus audit/soft-delete timestamps); `RefreshToken` is the exception and has
its own UUID id, expiry, and revocation fields.

- **Foundations** — global exception handling, checked-in OpenAPI contract, injectable `Clock`,
  local file storage, CORS for web/mobile dev origins, actuator health.
- **Auth** — register / login / rotating refresh / logout; access 15 min, refresh 7 days; nightly
  expired-token cleanup cron. The stabilization branch includes the family-revocation regression
  fix so reuse of an old refresh token also invalidates its rotated descendants.
- **Users** — self + public profile, profile update, avatar upload, stats, records aggregate.
- **Exercises** — 76 seeded system exercises + user-custom; search/filter by muscle / equipment /
  movement; CRUD with ownership; per-exercise `history` / `records` / `progression`.
- **Workouts** — nested `Workout → WorkoutExercise → WorkoutSet`; create / list (paged) / get /
  patch / delete; live `addSet` / `updateSet` / `removeSet`; `last-sets`; total volume; `inProgress`.
- **Personal records** — 4 types (`MAX_WEIGHT`, `ONE_REP_MAX`, `MAX_VOLUME`, `MAX_REPS_AT_WEIGHT`)
  recomputed on every set change; `isPr` flagging; **Epley** 1RM = `weight × (1 + reps/30)`.
- **Routines** — CRUD + `POST /routines/{id}/start` clones a template into a fresh workout.
- **Activities (cardio)** — CRUD; route (encoded polyline + elevation); laps; paged list.
- **Dashboard** — week summary, 14-day chart, recent PRs, training calendar.
- **Persistence & deploy (Phase 3, stabilization branch only)** — PostgreSQL + Flyway (`postgres`
  profile, `ddl-auto=validate`); H2 remains the default for fast dev/tests; Docker Compose stack;
  env-externalized secrets. This is not delivered until its PR passes and merges.
- **Tests** — `main` has 20 tests; the stabilization branch has 22 including the auth reuse
  regression test and the
  Flyway/PostgreSQL Testcontainers drift-catcher. Local verification is green.
- **CI** — a GitHub Actions workflow is being added in stabilization. It is not a required or
  enforced merge gate until the workflow is merged and the remote branch settings are configured.
- **Not yet present** — social graph/feed/kudos/comments remain planned for Phase 4.

---

## 4. Known issues & tech debt

Ordered by severity. Several are blockers for *any* real deployment and are pulled into Phase 3.

| # | Issue | Impact | Addressed in |
|---|---|---|---|
| D1 | ~~`ddl-auto=create-drop` on in-memory H2~~ | Data wiped on restart | 🟡 **Phase 3 stabilization** — `postgres` profile persists; pending merge |
| D2 | ~~Postgres not a dependency; no migrations~~ | Couldn't deploy/evolve schema | 🟡 **Phase 3 stabilization** — Flyway + drift-catcher test; pending merge |
| D11 | ~~Refresh-token family revocation rolled back with the reuse error~~ | A rotated descendant stayed valid after reuse detection | 🟡 **Phase 3 stabilization** — regression fix; pending merge |
| D12 | ~~OpenAPI export test silently overwrote the checked-in contract~~ | Contract drift could be hidden instead of failing verification | 🟡 **Phase 3 stabilization** — generate separately and compare; pending merge |
| D3 | CI is not yet a required remote check | No enforced automated build/test gate | **Phase 3 stabilization** + remote branch settings; §6 (W1) |
| D4 | ~~PostgreSQL runtime could inherit the committed dev JWT secret~~ | Missing config allowed token forgery with a known key | 🟡 **Phase 3 stabilization** — Postgres fails closed without `VOLT_JWT_SECRET`; pending merge |
| D5 | Refresh tokens stored as **raw UUIDs** | DB leak = account takeover; hash at rest | §6 (W2) |
| D6 | No rate limiting on `/api/auth/**` | Credential-stuffing / brute force exposure | §6 (W2) |
| D7 | Live PR banner lacks "previous value" context | `addSet` returns `isPr` but not the beaten record → frontend can't show "prev: 100kg × 5" | Phase 5 (or quick win) |
| D8 | Soft-delete filtering not audited for consistency | Risk of deleted rows leaking into reads | §6 (W3) |
| D9 | Nested fetches risk N+1 (`open-in-view=false`, good) | Latency at scale | §6 (W3) |
| D10 | No observability beyond actuator health | Hard to debug prod | §6 (W4) |

---

## 5. Phased roadmap (Phase 3+)

### Phase 3 — Persistence & deploy foundation  🟡 **STABILIZED — AWAITING PR + MERGE**
**Goal:** the backend keeps data and can be deployed. Unblocks everything else.

**Present on `codex/phase-3-stabilization`:**
- PostgreSQL driver + **Flyway** added (`build.gradle.kts`). Profile split: default/`dev` = H2
  (ephemeral, fast), `postgres` profile = PostgreSQL + Flyway + `ddl-auto=validate`
  (`application.properties`, `application-postgres.properties`).
- Flyway baseline `db/migration/V1__baseline_schema.sql` — generated from Hibernate's own
  PostgreSQL DDL, so `validate` matches the entity model exactly.
- Secrets externalized via env (`VOLT_JWT_SECRET`, `SPRING_DATASOURCE_*`); the H2 dev profile keeps
  a local default, while the PostgreSQL profile fails startup when `VOLT_JWT_SECRET` is absent.
- `Dockerfile` (slim runtime, host-built jar — works behind the TLS-intercepting proxy) +
  `docker-compose.yml` (app + Postgres, named volumes) + `.dockerignore`.
- `FlywayPostgresIntegrationTest` (Testcontainers) — permanent drift-catcher: boots under
  Postgres with `validate` in CI. Closes D2's drift gap.
- Refresh-token reuse regression fix: family revocation survives the unauthorized response, so
  an already-rotated descendant cannot be used after an ancestor token is reused.
- OpenAPI contract verification obtains the runtime Springdoc output in memory and compares it
  with `docs/api/openapi.yaml`; verification does not rewrite the authoritative checked-in contract.
- A GitHub Actions workflow is being added for build/tests and OpenAPI verification. It cannot be
  described as required or enforced until this branch merges and remote branch settings require it.

**Verified locally:** clean boot under Postgres (Flyway V1 applied, `validate` passed); a
registered user survived both a process restart and a full `docker compose down`/`up`; seeder
stayed idempotent (no duplicate exercises); the stabilization suite is green (22 tests, including
the auth reuse regression and Testcontainers drift-catcher; `main` has 20).

**Remaining before DONE:** open the Phase 3 PR, pass CI, merge into `main`, configure the remote
required check, and create the first phase tag. No phase tags exist today.

**Follow-ups deferred:** move the 76-exercise seed from `DataSeeder` into a repeatable Flyway
migration; add Postgres-backed `SELECT … FOR UPDATE`/index tuning as data grows.

### Phase 4 — Social graph & feed
**Goal:** the missing core pillar — follow, feed, kudos, comments. New `social/` package.
- Entities: `Follow` (follower→followee), `Kudos`, `Comment` (polymorphic over workout/activity).
- Endpoints: follow/unfollow, followers/following lists, `GET /api/feed` (following + global),
  kudos add/remove, comment CRUD; privacy/opt-in flag on workouts/activities (no auto-posting).
- Feed item shape unifies workouts + activities; cursor pagination.
- **DoD:** a user can follow another, see their shared sessions in the feed, give kudos & comment;
  privacy default respected; integration tests for visibility rules.

### Phase 5 — Analytics & cross-discipline insights  ⭐ *the differentiator*
**Goal:** deliver Volt's stated unique value — strength × cardio analytics (Screen 10).
- Period-based aggregation (week / month / 3M / year / all-time) endpoints.
- Strength: muscle-volume distribution, volume trend, 1RM progression per lift, frequency heatmap.
- Cardio: distance/time trend, pace progression, elevation gain.
- **Cross-discipline correlation** (training balance, recovery proxy, volume↔mileage correlation).
- Resolve **D7**: return previous-record context with `addSet`/`updateSet` for the live PR banner.
- **DoD:** analytics endpoints back every Screen-10 chart; cross-discipline correlation returns
  real data; PR banner has prev-value context.

> Phase 4 and 5 are swappable. Recommended order is Social → Analytics for engagement; flip if the
> cross-discipline analytics demo is the priority.

### Phase 6 — Integrations & import/export
**Goal:** get data in/out — the "import from Strava & Hevy / works offline" promises.
- GPX / FIT file import → Activity (+ route + laps); CSV/JSON workout import.
- Export endpoints (user data export).
- Provider scaffolding for Apple Health / Garmin / Wahoo (start with file-based, then OAuth).
- **DoD:** upload a GPX produces a complete Activity with route + splits; user can export their data.

### Phase 7 — Challenges, streaks & notifications
**Goal:** retention mechanics.
- Streak computation (already have training-calendar data), challenges, goal tracking.
- Notification model + delivery hooks (rest-timer/PR/kudos events) for mobile push.
- **DoD:** streaks and at least one challenge type work end-to-end; events emit notifications.

### Phase 8 — Nutrition (basic)  *lowest priority*
**Goal:** minimal nutrition logging from the product scope.
- Food/meal entities, daily macro logging, basic targets.
- **DoD:** log a meal, see daily macro totals.

---

## 6. Cross-cutting workstreams (run in parallel)

- **W1 — CI/CD:** add GitHub Actions `./gradlew build` + tests, checked-in OpenAPI verification,
  Compose validation, and an image build on PR; after merge, configure it as a required check.
  Add deployment later.
- **W2 — Security hardening:** hash refresh tokens at rest (D5), rate-limit auth (D6), add security
  headers, centralize deployed secret management, and consider access-token revocation if needed.
- **W3 — Data integrity & performance:** audit soft-delete filtering (D8), add `@EntityGraph`/fetch
  joins to kill N+1 on nested reads (D9), add DB constraints/indexes as schema grows.
- **W4 — Observability:** structured logging, request tracing, metrics (Micrometer), error tracking.
- **W6 — Structure prep for the new domains** (from the Sep 2026 SOLID audit; do BEFORE
  `rating/` `load/` `event/` `benchmark/` `social/` land, each gets strictly harder after):
  1. Extract `load/` metric primitives first — a stateless Epley/volume utility; the math is
     currently duplicated (Epley ×3 in `WorkoutService`, volume ×6 across services/DTOs/JPQL)
     and it is the rating engine's input, so one source of truth is non-negotiable.
  2. Split `WorkoutService` (469 lines = 3 services): move the PR engine (~L338–423 + PR reads)
     into `PersonalRecordService` — rating/ and benchmark/ both consume PRs and must not inject
     a workout-CRUD god-service.
  3. One `Users.require(username)` lookup in `user/`, replacing 6 copy-pasted `getUser` helpers.
  4. Move `DashboardService` out of `workout/` into a new `analytics/` package (it's a
     cross-domain read model importing activity internals), and route `UserService`'s stats
     through workout/activity *services* instead of their repositories — sets the precedent
     for feed/rivals read models.
  Target layout: new sibling packages `rating/ load/ event/ benchmark/ social/ analytics/`,
  each package-by-feature with its own `dto/`, same conventions as today.
  Deliberately skipped: per-service interfaces, mapper frameworks, ownership abstractions.
- **W5 — API contract discipline:** every endpoint ships with the checked-in OpenAPI contract +
  integration tests; verify generated output without overwriting the contract; version the API
  (`/api/v1`) before the first external consumer.

---

## 7. Conventions & definition of done

- DTOs separate from entities; `jakarta.validation` on request DTOs; `@ControllerAdvice` for errors.
- All timestamps `Instant` UTC via injected `Clock`. Soft-delete, never hard-delete user data.
- REST: `GET` read, `POST` create, `PATCH` partial, `PUT` full, `DELETE` remove.
- **A feature is "done" only when:** endpoints + DTOs implemented, the checked-in OpenAPI contract
  intentionally updated and verified without silent overwrite, integration tests green,
  ownership/privacy enforced, and this roadmap updated.
