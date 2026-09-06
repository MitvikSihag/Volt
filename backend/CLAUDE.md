# Volt — Backend

Spring Boot REST API for the Volt fitness platform. See the root `../CLAUDE.md` for the full product overview.

## Stack
- **Language:** Java 21
- **Framework:** Spring Boot 3.5 (Spring Web, Spring Data JPA, Spring Security)
- **Build:** Gradle 8.14 (Kotlin DSL) — run from this directory (`backend/`)
- **Database:** H2 in-memory (default/`dev` + tests) · PostgreSQL via the `postgres` profile (prod/docker). Schema managed by **Flyway** migrations (`src/main/resources/db/migration`) with Hibernate `validate` on the Postgres profile.
- **Auth:** JWT (stateless, `Authorization: Bearer <token>`)
- **API docs:** OpenAPI 3 via springdoc-openapi — checked-in contract at
  `docs/api/openapi.yaml`, runtime spec at `/v3/api-docs`, UI at `/swagger-ui`
- **Package root:** `com.volt`

## Project Structure
```
src/main/java/com/volt/
├── VoltApplication.java
├── user/           — User entity, profiles, auth (register/login/refresh/JWT), UserLookup
├── workout/        — Exercises, workouts, routines; PersonalRecordService owns the PR engine
├── activity/       — Cardio: Activity, Route, Lap
├── analytics/      — Cross-domain read models (dashboard today; feed/rivals later)
├── load/           — TrainingMath: single source of truth for Epley 1RM + set volume
├── common/         — Shared DTOs, exceptions, base entities
└── config/         — Security, OpenAPI, JPA config, GoogleAuthConfig/GoogleProperties
```

The social graph, feed, kudos, and comments are planned for Phase 4; no `social/` package exists
yet.

## Domain Model
| Entity | Description |
|---|---|
| `User` | Profile, goals, body stats; optional `google_sub`, nullable `password_hash` for Google-only accounts |
| `Exercise` | Library entry (name, muscle groups, equipment, measurement type); system or user-created |
| `Workout` | A strength session (belongs to User, has many WorkoutExercises); optional session `rpe` 1–10 |
| `WorkoutExercise` | An ordered exercise entry within a workout, containing WorkoutSets |
| `WorkoutSet` | One set in a workout exercise (reps, weight, set type) |
| `Routine` | Reusable strength-workout template |
| `PersonalRecord` | Tracked strength record for a user and exercise |
| `Activity` | A cardio session (run/ride/hike) with GPS route and laps |
| `Route` | GPS polyline + elevation profile for an Activity |
| `Lap` | A timed/distance split within an Activity |
| `RefreshToken` | Rotating auth token; unlike other entities, does not extend `BaseEntity` |

## Build Order
> The authoritative, phased plan lives in [`ROADMAP.md`](ROADMAP.md). Summary status:
- [x] Project scaffolding, Spring Boot setup, foundations (OpenAPI contract, Clock, exception handling)
- [x] Domain model — JPA entities (Workout→Exercise→Set, Routine, PR, Activity→Route/Lap)
- [x] User auth — register, login, refresh (rotating), logout
- [x] Exercise library, workout logging, routines/templates, PRs + 1RM progression
- [x] Activity (cardio) tracking API + dashboard
- [ ] **Persistence & deploy foundation (Phase 3)** — stabilized with PostgreSQL, Flyway, Docker,
  auth family-revocation regression fix, and checked-in OpenAPI verification; awaiting PR + merge
- [ ] Social features (Phase 4)
- [ ] Analytics & cross-discipline insights (Phase 5)
- [ ] Integrations / import-export (Phase 6) · Challenges & streaks (Phase 7) · Nutrition (Phase 8)

Current verified inventory: **7 controllers, 39 HTTP operations, 25 OpenAPI paths, and 76 seeded
system exercises**. `main` has 20 tests; the Phase 3 stabilization branch has 22, including the
auth reuse regression and PostgreSQL/Testcontainers drift-catcher. A CI workflow is being added,
but it is not a required or enforced check until merged and configured in the remote branch
settings. No phase tags exist yet.

## Key Conventions
- DTOs are separate from JPA entities — never expose entities directly in API responses
- Validation via `jakarta.validation` annotations on request DTOs
- `@ControllerAdvice` for global exception handling
- All timestamps stored as `Instant` in UTC
- Soft deletes where applicable (deleted_at column, not hard delete)
- REST conventions: `GET` reads, `POST` creates, `PUT` full updates, `PATCH` partial updates, `DELETE` removes

## Running Locally

**Dev (H2, ephemeral — fast iteration):**
```bash
cd backend
./gradlew bootRun
# API: http://localhost:8080 · Swagger: /swagger-ui · H2 console: /h2-console
```

**Production-like (PostgreSQL + Flyway, persistent):**
```bash
cd backend
export VOLT_JWT_SECRET="$(openssl rand -base64 48)"
./gradlew bootJar && docker compose up --build   # app + Postgres, data in named volumes
# Optionally override database credentials via POSTGRES_USER/PASSWORD/DB
```
The boot jar is built on the host (not inside the image) so the Docker build works
behind the TLS-intercepting proxy.

To point a local run at an existing Postgres instead:
```bash
SPRING_PROFILES_ACTIVE=postgres \
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/volt \
SPRING_DATASOURCE_USERNAME=volt SPRING_DATASOURCE_PASSWORD=volt ./gradlew bootRun
```

Google sign-in needs `VOLT_GOOGLE_CLIENT_IDS` (comma-separated iOS/Android/Web OAuth client IDs).
The container JVM does not trust the Cloudflare Gateway CA, so on the intercepting network the
JWKS fetch fails inside Docker; run the app on the host against the compose `db` (published on
5432) for Google-login dogfooding. Off the intercepting network the compose stack works as is.

### Schema changes
Flyway is the single source of truth on the Postgres profile. Until the first real users exist,
the V1 baseline is edited in place (PRODUCT.md §2 locked decision). **After any V1 edit, wipe the
local stack** — Flyway records V1's checksum, so the next boot fails validation otherwise:
`./gradlew bootJar && docker compose down -v && docker compose up -d --build` (local accounts are
disposable; re-register). Once a database is deployed, never edit an applied migration — add
`V2__*.sql`, `V3__*.sql`, … under `src/main/resources/db/migration`.
`FlywayPostgresIntegrationTest` (Testcontainers) boots the app under Postgres with
`ddl-auto=validate` and fails if a migration and the JPA entities drift apart. It may skip locally
when Docker is absent, but fails closed when Docker is unavailable in CI.

### OpenAPI contract changes
`docs/api/openapi.yaml` is the checked-in source of truth. Update it intentionally with API
changes. Verification must generate the runtime contract separately and compare it with the
checked-in file; it must never make a mismatch pass by silently overwriting that file.

## Known Environment Issue — SSL
The network uses Cloudflare Gateway for SSL inspection. The JVM doesn't trust the Cloudflare Gateway CA by default, which blocks downloading Maven artifacts over HTTPS.

**Current status:** the **host** Corretto truststore is patched, so `./gradlew build` resolves Maven Central fine. A **fresh container JVM is not patched**, so building the app *inside* a Docker image fails with `PKIX/unable to find valid certification path`. That's why the `Dockerfile` ships a host-built boot jar instead of building in-container (see Running Locally). Clean-network CI is unaffected.

**Fix (for a new host or to enable in-container builds):** Import the Cloudflare Gateway CA into Corretto's cacerts:
```bash
openssl s_client -connect repo.maven.apache.org:443 -showcerts 2>/dev/null \
  | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/' \
  | awk 'BEGIN{n=0} /BEGIN CERTIFICATE/{n++} n==2{print}' > /tmp/cloudflare-gateway-ca.pem

sudo keytool -importcert -trustcacerts -alias cloudflare-gateway \
  -file /tmp/cloudflare-gateway-ca.pem \
  -keystore /Users/a41223/Library/Java/JavaVirtualMachines/corretto-21.0.10/Contents/Home/lib/security/cacerts \
  -storepass changeit
```

**Workaround until fixed:** `./gradlew build --offline` works if dependencies are already cached.
