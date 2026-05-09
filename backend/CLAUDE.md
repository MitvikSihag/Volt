# Volt — Backend

Spring Boot REST API for the Volt fitness platform. See the root `../CLAUDE.md` for the full product overview.

## Stack
- **Language:** Java 21
- **Framework:** Spring Boot 3.5 (Spring Web, Spring Data JPA, Spring Security)
- **Build:** Gradle 8.14 (Kotlin DSL) — run from this directory (`backend/`)
- **Database:** H2 (dev/test) → PostgreSQL (production)
- **Auth:** JWT (stateless, `Authorization: Bearer <token>`)
- **API docs:** OpenAPI 3 via springdoc-openapi — spec at `/v3/api-docs`, UI at `/swagger-ui`
- **Package root:** `com.volt`

## Project Structure
```
src/main/java/com/volt/
├── VoltApplication.java
├── user/           — User entity, auth (register/login/JWT)
├── workout/        — Workout logging: Workout, WorkoutSet, Exercise
├── activity/       — Cardio: Activity, Route, Lap
├── social/         — Follow graph, feed, kudos
├── common/         — Shared DTOs, exceptions, base entities
└── config/         — Security, OpenAPI, JPA config
```

## Domain Model
| Entity | Description |
|---|---|
| `User` | Profile, goals, body stats |
| `Exercise` | Library entry (name, muscle groups, equipment); system or user-created |
| `Workout` | A strength session (belongs to User, has many WorkoutSets) |
| `WorkoutSet` | One set in a workout (exercise, reps, weight, set type) |
| `Activity` | A cardio session (run/ride/hike) with GPS route and laps |
| `Route` | GPS polyline + elevation profile for an Activity |

## Build Order
- [x] Project scaffolding (Java 21 + Gradle)
- [ ] Spring Boot setup (blocked by SSL — see below)
- [ ] Domain model — JPA entities
- [ ] User auth — register, login, JWT
- [ ] Workout logging API
- [ ] Activity tracking API
- [ ] Social features
- [ ] Analytics
- [ ] Integrations (Apple Health, GPX/FIT import)

## Key Conventions
- DTOs are separate from JPA entities — never expose entities directly in API responses
- Validation via `jakarta.validation` annotations on request DTOs
- `@ControllerAdvice` for global exception handling
- All timestamps stored as `Instant` in UTC
- Soft deletes where applicable (deleted_at column, not hard delete)
- REST conventions: `GET` reads, `POST` creates, `PUT` full updates, `PATCH` partial updates, `DELETE` removes

## Running Locally
```bash
cd backend
./gradlew bootRun
# API: http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui
# H2 console: http://localhost:8080/h2-console
```

## Known Environment Issue — SSL
The network uses Cloudflare Gateway for SSL inspection. The JVM doesn't trust the Cloudflare Gateway CA by default, which blocks downloading Maven artifacts over HTTPS.

**Fix:** Import the Cloudflare Gateway CA into Corretto's cacerts:
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
