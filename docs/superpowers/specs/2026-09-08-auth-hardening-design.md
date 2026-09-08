# Auth hardening (self-hosted launch block)

> Design spec, 8 Sep 2026. Scope: everything a hosted identity provider would have given us that
> Volt still lacks, built on the existing JWT + refresh stack. Decision taken: **stay self-hosted**
> (cheaper than Clerk at any scale, equal to Firebase, and the identity table stays ours).
> Source of requirements: [RELEASE_CHECKLIST.md](../../../RELEASE_CHECKLIST.md) §1–§3, §6;
> [backend/ROADMAP.md](../../../backend/ROADMAP.md) D5/D6/D8; the Google sign-in spec
> ([2026-09-06](2026-09-06-google-sign-in-design.md)) for the token model this extends.
> Branch `feat/auth-hardening` is stacked on `feat/google-sign-in`.

## 1. Decisions taken

| Decision | Call | Why |
|---|---|---|
| Email vendor | Resend, via its HTTPS API and Spring's `RestClient`. No SDK | One API key, free 3k/month, nothing to wire beyond a `POST` |
| Unverified accounts | Can do everything. Verification gates future account linking and social features; a reset mail goes to the registered address whether or not it is verified (§4). Today shows a quiet "verify your email" line | Offline-first and deferred sign-up must keep working; blocking at the door loses users |
| Apple sign-in | Out of this slice (no developer account yet; not going to the store yet) | Same seam as Google; one day when the account exists |
| Instances | Single instance; rate-limit counters in memory (Bucket4j + Caffeine). Upgrade path is a Redis/Postgres bucket store behind the same filter | No Redis before there are users. Refresh tokens, email tokens and signing keys already live in Postgres/config, so nothing else changes when scaling out |
| Refresh tokens | 256-bit random, SHA-256 stored, lookup by hash (closes D5) | DB leak no longer equals account takeover |
| JWT keys | `VOLT_JWT_KEYS=kid:base64,…` + `VOLT_JWT_ACTIVE_KID`; sign with active, verify by `kid` against any listed. No defaults on the postgres profile | Rotation without logging everyone out; fail-fast in prod |
| Verification / reset tokens | One `email_tokens` table (purpose VERIFY or RESET), SHA-256 stored, 24 h / 1 h, single-use, newest replaces older | One mechanism, no plaintext secrets at rest |
| Forgot-password response | Always 204. Mail only if a password account exists for that (verified or not) email | No enumeration. See §4 for the unverified case |
| Account deletion | Soft delete + anonymise identity immediately (username, email, google_sub rewritten; avatar file removed; every refresh/email token gone). Hard purge 30 days later via FK cascades (`on delete cascade` added to V1) | Store requirement; frees unique indexes so a deleted username is reusable (fixes the soft-delete collision gap); 30-day window matches the checklist |
| Consent capture | `terms_accepted_at` + `terms_version` set on register and Google create from `volt.legal.terms-version` | Checklist §4; the docs themselves are out of scope |
| Email case | Lowercased + trimmed on register, login (when the identifier contains `@`), forgot, Google | `Bob@x.com` and `bob@x.com` are one account |
| Rate limits | Exactly the checklist §1 table, per IP or per user in a servlet filter; per identity for login/forgot inside `AuthService`. 429 + `Retry-After` | Identity keys need the request body; the filter never reads bodies |
| `X-Forwarded-For` | Honoured only when `volt.security.trust-proxy=true` (default false) | Spoofable until there is a proxy we control |
| Lockout after N failures, HIBP, session list, MFA, passkeys, data export | Out | Checklist marks them v1.1 / decision-later |
| Schema | V1 edited in place, local stack wiped (last time before the freeze at launch) | No users exist |

## 2. Scope

### In (backend)
Key rotation · hashed refresh tokens · email normalisation · consent columns · mail service ·
email verification · password reset · account deletion + purge · rate limiting · H2-console
matcher only when the console is enabled · CORS origins from config · `Referrer-Policy` header ·
contract regeneration · docs.

### In (mobile)
Forgot-password screen · reset screen (deep link) · verify screen (deep link) · Today
"verify your email" line with resend · Settings "Account" section: Log out, Delete account (with
its own confirm screen) · 429 copy passes through the existing error line.

### Out
Apple sign-in, account linking, HIBP, MFA, session list, data export, legal documents, Sentry,
hosting, object storage, edge rate limiting.

## 3. Schema (V1 in place)

```sql
-- users: add
    email_verified_at    timestamp(6) with time zone,
    terms_accepted_at    timestamp(6) with time zone,
    terms_version        varchar(20),

-- refresh_tokens: token → token_hash
    token_hash  varchar(64) not null unique,          -- sha-256 hex of the random token

-- new
create table email_tokens (
    id          uuid not null,
    user_id     uuid not null,
    purpose     varchar(10) not null check (purpose in ('VERIFY','RESET')),
    token_hash  varchar(64) not null unique,
    expires_at  timestamp(6) with time zone not null,
    used_at     timestamp(6) with time zone,
    primary key (id)
);
create index idx_email_tokens_user_purpose on email_tokens (user_id, purpose);

-- FK actions (purge by cascade): every user-owned chain gets on delete cascade;
-- exercises.created_by_user_id gets on delete set null.
refresh_tokens.user_id, email_tokens.user_id, routines.user_id, workouts.user_id,
personal_records.user_id, activities.user_id                    → references users(id) on delete cascade
routine_exercises.routine_id → routines on delete cascade
workout_exercises.workout_id → workouts on delete cascade
workout_sets.workout_exercise_id → workout_exercises on delete cascade
personal_records.workout_set_id → workout_sets on delete cascade
routes.activity_id, laps.activity_id → activities on delete cascade
exercises.created_by_user_id → users on delete set null
```
JPA side: `@OnDelete(action = OnDeleteAction.CASCADE)` (Hibernate) on the matching `@ManyToOne`/
`@OneToOne` so H2 (Hibernate DDL) behaves like Postgres in tests; `SET_NULL` on
`Exercise.createdBy`. Flyway drift test validates columns and types, not FK actions, so the two
are kept in step by hand and by the deletion test.

## 4. Backend behaviour

### Key rotation (`config/JwtProperties`, `JwtTokenProvider`)
```properties
volt.jwt.keys=${VOLT_JWT_KEYS:dev:dGhpcy1pcy1hLXZlcnktc2VjcmV0LWtleS1mb3Itdm9sdC1hcHAtZGV2LTIwMjY=}
volt.jwt.active-kid=${VOLT_JWT_ACTIVE_KID:dev}
```
`keys` parses `kid:base64,kid:base64` into `Map<String, SecretKey>`; startup fails if `active-kid`
is not in the map or any key is shorter than 32 bytes. Access tokens carry `kid` in the header;
the parser uses a jjwt `Locator<Key>` that resolves `kid` and rejects unknown ids. Postgres
profile: `volt.jwt.keys=${VOLT_JWT_KEYS}` and `volt.jwt.active-kid=${VOLT_JWT_ACTIVE_KID}`
with no fallback. `volt.jwt.secret` is removed everywhere (compose, docs, `.env`).

### Refresh tokens
`createRefreshToken` generates 32 bytes from `SecureRandom`, base64url (43 chars) → returned to
the client; stores `tokenHash = sha256Hex(token)`. `refresh`/`logout` hash the presented token and
look up by hash. Everything else (rotation, family revocation, cleanup) unchanged.

### Email normalisation
`AuthService.normaliseEmail(s) = s.trim().toLowerCase(Locale.ROOT)` used in register, forgot,
Google. `CustomUserDetailsService` lowercases the identifier when it contains `@`.

### Consent
`register` and the Google create path set `termsAcceptedAt = clock.instant()` and
`termsVersion = legal.termsVersion` (`volt.legal.terms-version`, default `2026-09`).

### Mail (`common/mail/MailService`)
```properties
volt.mail.enabled=${VOLT_MAIL_ENABLED:false}
volt.mail.resend-api-key=${VOLT_RESEND_API_KEY:}
volt.mail.from=${VOLT_MAIL_FROM:Volt <noreply@volt.app>}
volt.app.link-base=${VOLT_APP_LINK_BASE:volt://}
```
`send(to, subject, html)`: when enabled, `POST https://api.resend.com/emails` with
`Authorization: Bearer <key>` and `{from,to,subject,html}` via `RestClient`; non-2xx → logged
and swallowed (the API call that triggered it still succeeds — mail is best-effort, the user can
resend). When disabled, logs one WARN line `DEV ONLY mail disabled — <subject> to <to>: <link>`
(dev convenience; postgres profile sets `enabled=true`). Templates: two small HTML resources under
`src/main/resources/mail/` with a `{{link}}` placeholder, plus the plain link as text. Links:
`<link-base>verify?token=…`, `<link-base>reset?token=…`.

### Email tokens (`user/EmailToken`, `EmailTokenRepository`, issued by `AuthService`)
`issue(user, purpose)`: delete existing rows for (user, purpose); insert new with
`expiresAt = now + (VERIFY 24 h | RESET 1 h)`; return the plaintext token (never stored).
`consume(token, purpose)`: hash → find; must exist, `usedAt == null`, not expired; set `usedAt`;
return user. Failure → 400 `"Link is invalid or has expired"` (one message for all cases).

### Endpoints (all under `/api/auth`, public unless noted)
| Method / path | Body | Result |
|---|---|---|
| `POST /verify/request` (auth) | — | 204; issues VERIFY, sends mail. 409 if already verified |
| `POST /verify/confirm` | `{token}` | 204; sets `emailVerifiedAt` |
| `POST /password/forgot` | `{email}` | 204 always. If a non-deleted user with that email **and a password hash** exists: issue RESET, send mail. Google-only or unknown: nothing |
| `POST /password/reset` | `{token, newPassword (8..72)}` | 204; sets hash, `revokeAllByUser`, deletes all email tokens for the user |
| `DELETE /api/users/me` (auth) | `{password}` (required when the account has a hash) | 204; see deletion |

Register additionally calls `issue(VERIFY)` + mail. Login is unchanged.

Unverified-email edge: a reset mail goes to the registered address whether or not it is verified
(the address is where the user proves control; verification is a separate claim). Marking the
address verified on successful reset is a free win and is done.

### Deletion (`UserService.deleteSelf`)
1. Password accounts: `passwordEncoder.matches(password, hash)` else 401 "Bad credentials".
2. Avatar: `storageService.delete(profilePictureUrl)` if present (add `delete` to `StorageService`).
3. Rewrite: `username = "deleted-" + first 12 hex of id`, `email = username + "@deleted.volt.invalid"`,
   `googleSub = null`, `passwordHash = null`, `displayName = "Deleted user"`, `bio = null`,
   `profilePictureUrl = null`, `deletedAt = now`.
4. `refreshTokenRepository.revokeAllByUser`, `emailTokenRepository.deleteByUser`.
The JWT filter then fails to load the old username (row filtered by `deletedAt` and renamed) → 401.
`UserPurgeTask` (`@Scheduled` daily, 03:30): `DELETE FROM users WHERE deleted_at < now - 30 d`;
cascades remove everything user-owned.

### Rate limiting (`config/RateLimitFilter`, `RateLimitRules`, `user/IdentityRateLimiter`)
Filter registered **after** `JwtAuthenticationFilter` so per-user rules see the principal.
Rules, first match wins (from RELEASE_CHECKLIST §1):

| Match | Key | Limit |
|---|---|---|
| `POST /api/auth/login` | IP | 10 / 15 min |
| `POST /api/auth/register` | IP | 5 / h |
| `POST /api/auth/google` | IP | 20 / min |
| `POST /api/auth/refresh` | IP | 30 / min |
| `POST /api/auth/password/forgot` | IP | 5 / h |
| `POST /api/auth/password/reset`, `POST /api/auth/verify/confirm` | IP | 10 / h |
| `POST /api/auth/verify/request` | user | 5 / h |
| `POST /api/users/me/avatar` | user | 10 / h |
| `POST|PUT|PATCH|DELETE /api/workouts/**`, `/api/activities/**`, `/api/routines/**` | user | 120 / min |
| `GET /api/users/{username}` (unauthenticated) | IP | 60 / min |
| any other authenticated request | user | 600 / min |
| anything else | IP | 120 / min |

Identity limits in `AuthService`: login 10 / 15 min per lowercase identifier; forgot 3 / h per
email. Store: `Caffeine<String, Bucket>` with `expireAfterAccess(1 h)`. 429 body
`{"status":429,"message":"Too many attempts, try again in N seconds"}` + `Retry-After: N`.
`ponytail:` comment names the Redis/Postgres upgrade path. IP = `request.getRemoteAddr()`, or
the first `X-Forwarded-For` entry when `volt.security.trust-proxy=true`.

### Security config
- `/h2-console/**` permit only when `spring.h2.console.enabled=true` (injected `@Value`).
- CORS origins from `volt.cors.allowed-origins` (comma list; default the current three localhost
  origins; postgres profile default empty).
- `headers.referrerPolicy(STRICT_ORIGIN_WHEN_CROSS_ORIGIN)`. Spring's defaults already add
  `X-Content-Type-Options`, cache control and HSTS on secure requests.

## 5. Mobile

- `src/auth/store.ts`: `forgotPassword(email)`, `resetPassword(token, newPassword)`,
  `confirmEmail(token)` via `postAuth` (public). `src/api/queries.ts`: `useResendVerification()`
  and `useDeleteAccount()` mutations via `api` (authenticated).
- `app/(auth)/forgot.tsx`: email field → "Send reset link" → success copy "If an account exists
  for that email, a reset link is on its way." Link from login: "Forgot password?".
- `app/reset.tsx` (deep link `volt://reset?token=`): new password field → "Set new password" →
  on success `router.replace('/(auth)/login')` with a one-line success state.
- `app/verify.tsx` (deep link `volt://verify?token=`): confirms on mount; shows "Email verified" or
  the server error; "Continue" → `/(tabs)`.
- `AuthGate`: `reset` and `verify` segments are allowed without a token.
- Today: when `me.emailVerifiedAt` is null, a `Meta` line under the heading: "Verify your email ·
  Resend" → mutation → "Sent". Hidden once verified.
- Settings: new section **Account** holding Log out (moved from About) and "Delete account…" →
  `app/delete-account.tsx`: explanation, password field when the account has a password (`me`
  has no such flag: show the field always, optional, server decides), ember "Delete my account"
  button → on 204 `logout()`.
- `UserSelfResponse` gains `emailVerifiedAt`; contract regenerated; `npm run gen:api`.
- 429s surface through the existing error line unchanged (server message already reads
  "Too many attempts, try again in N seconds").

## 6. Tests (backend, MockMvc)
- Key rotation: token signed with a non-active listed key still authenticates; unknown `kid` → 401;
  `JwtProperties` rejects an active kid that is not listed.
- Refresh: stored value is not the returned token; hashed lookup works; reuse still revokes family.
- Verify: register issues a token (captured from the mocked `MailService`); confirm → `/me`
  shows `emailVerifiedAt`; second confirm → 400; request when verified → 409.
- Reset: forgot for unknown email → 204 and no mail; forgot for a Google-only account → 204 and
  no mail; happy path → old password fails, new works, old refresh token → 401; token reuse → 400.
- Deletion: wrong password → 401; happy path → 204, `/me` with old token → 401, username
  re-registrable, refresh → 401; purge task hard-deletes a user whose `deletedAt` is 31 days old
  along with a workout and an activity (cascade).
- Rate limit: 11th login from one IP → 429 with `Retry-After`; 11th login for one identity from
  varying IPs → 429; unauthenticated `GET /api/users/{username}` 61st → 429.
- Email normalisation: register `Bob@X.com`, login `bob@x.com` works; Google with `bob@x.com` → 409.
- Consent: register sets `termsAcceptedAt` and version.

## 7. Effort
Backend ≈ 4 days (rate limiting 0.5, keys 0.5, hashing 0.5, mail + verify 1, reset 0.5,
deletion + purge 1) · mobile ≈ 1.5 days · docs/contract/stack 0.5. ≈ 6 days.
