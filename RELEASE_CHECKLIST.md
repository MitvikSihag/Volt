# Volt — Pre-release checklist

Living doc. Everything that must be true before v1.0 goes to the App Store / Play Store.
Status reflects the repo as of 2026-09-08 (branch `feat/auth-hardening`). Tick items as they land;
add new ones at the bottom of the relevant section. Nothing here is built yet unless marked ✅.

Legend: ✅ done · 🔸 partial · ❌ missing · ❓ decision needed

---

## 1. Abuse & rate limiting

Rate limiting shipped 8 Sep 2026 (`RateLimitFilter` + `IdentityRateLimiter`); the table below is
the live configuration.

| Endpoint | Why | Limit (starting point) | Status |
|---|---|---|---|
| `POST /api/auth/login` | Credential stuffing / brute force | 10 / 15 min per IP **and** per username-or-email | ✅ Done |
| `POST /api/auth/register` | Account spam, disposable-email floods | 5 / hour per IP | ✅ Done |
| `POST /api/auth/google` | Token replay hammering Google JWKS | 20 / min per IP | ✅ Done |
| `POST /api/auth/refresh` | Stolen refresh-token guessing | 30 / min per IP | ✅ Done |
| `POST /api/users/me/avatar` | 5 MB uploads → disk/bandwidth burn | 10 / hour per user | ✅ Done |
| `POST /api/workouts`, `/api/activities`, sets | Scripted flooding of a user's own data (cheap, but bounds DB growth) | 120 / min per user | ✅ Done |
| `GET /api/users/{username}` (public, unauthenticated) | Username enumeration / scraping | 60 / min per IP | ✅ Done |
| Everything else (authenticated) | Generic backstop | 600 / min per user | ✅ Done |

Implementation notes
- One servlet filter keyed on `(route-class, IP or userId)`; bucket4j in-memory is fine for a
  single backend instance. Move buckets to Redis only when there is >1 instance.
- Return `429` with `Retry-After`; mobile shows "Too many attempts, try again in N minutes".
- Login must **not** reveal whether the username exists (same error for bad user / bad password).
  Verify the current `UnauthorizedException` message does this.
- Prefer rate limiting at the edge (Cloudflare / load balancer) **in addition**, once hosting is chosen.
- Related: **lockout after N failed logins** is a separate decision — ❓ skip for v1, rate limit is enough.

## 2. Auth hardening (beyond rate limiting)

| Item | Status | Notes |
|---|---|---|
| Password policy | 🔸 | `@Size(min=8,max=72)` only. Add a breached-password check (HIBP k-anonymity) or leave as-is; **don't** add composition rules (uppercase/symbol), they hurt more than they help |
| Email verification | ✅ | `POST /api/auth/verify/request` + `/api/auth/verify/confirm`; `volt://verify?token=` deep link; Today shows a verify line until `emailVerifiedAt` is set |
| Password reset / forgot password | ✅ | `POST /api/auth/password/forgot` + `/api/auth/password/reset`; `volt://reset?token=` deep link; mobile forgot/reset screens shipped; mail via Resend (DEV ONLY log line when disabled) |
| Refresh-token rotation + reuse detection | ✅ | `AuthService.refresh` rotates and invalidates the old token; reused revoked token kills the whole family (verified) |
| Logout everywhere / session list | ❓ | Nice-to-have; v1.1 |
| JWT secret from env | ✅ | `VOLT_JWT_KEYS` + `VOLT_JWT_ACTIVE_KID` replace `VOLT_JWT_SECRET`; fails fast if unset (keys, fail-fast) |
| `/h2-console` permitAll | ✅ | Matcher only registered when the H2 console is enabled |
| CORS | ✅ | Origins from `VOLT_CORS_ALLOWED_ORIGINS` env var; mobile doesn't need CORS, web landing does |
| Security headers | 🔸 | `Referrer-Policy` added; HSTS still pending TLS termination |
| Apple Sign In | ❌ | **App Store requirement**: if you offer Google sign-in you must offer Sign in with Apple (guideline 4.8). Already planned as follow-up 6 |
| Account linking (Google ↔ password) | ❌ | Currently rejected with a 409. Acceptable for v1 if the error copy is clear |

## 3. Account & data rights (legal / store requirements)

| Item | Status | Notes |
|---|---|---|
| **Account deletion in-app** | ✅ | `DELETE /api/users/me` anonymises immediately (revokes refresh tokens, removes the avatar file); a daily task hard-deletes after the 30-day window; Settings has a "Delete account…" entry |
| Data export | ❌ | GDPR Art. 20 / CCPA. v1 minimum: "Email me my data" → JSON zip of workouts + activities (GPX for routes). Can be a manual process behind a support email at launch, but the doc must promise it |
| Play Store "Data safety" form | ❌ | Declares collected data: email, name, precise location, fitness info, photos (avatar). Must match the privacy policy |
| App Store "App Privacy" nutrition label | ❌ | Same declaration, Apple's format. Precise Location + Health & Fitness + Contact Info + User Content, all "linked to user" |
| Age gate | ❓ | Fitness apps are typically 13+ / 4+ rating with no gate. If you ever go <13 you need COPPA. Set the store age rating to 4+ but state 13+ minimum in T&C |
| Health data caveat | 🔸 | Volt does **not** use HealthKit in v1 (deferred to v1.2), so no HealthKit-specific privacy clauses yet. Re-check when integrations land |

## 4. Legal documents

All must be **hosted at a stable public URL** (the web app is the natural home: `/privacy`, `/terms`)
and linked from: store listings, the register screen ("By continuing you agree…"), and Settings.
The web footer currently has `href="#"` placeholders for Privacy and Terms.

| Doc | Status | Must cover |
|---|---|---|
| Privacy Policy | ❌ | What we collect (email, name, avatar, workout logs, **precise + background GPS**, device info), why, retention, third parties (Google Sign-In, hosting provider, email provider, crash/analytics if added), user rights (access, delete, export, withdraw consent), contact address, effective date, children (13+), international transfer if servers are outside user's region. Background location must be justified explicitly — both stores review this |
| Terms & Conditions / EULA | ❌ | Eligibility (13+), account responsibility, acceptable use (no scraping, no cheating ratings — relevant once Rivals/Benchmarks ship), user content licence (workouts, avatar, future share cards), termination, **fitness disclaimer** ("not medical advice, consult a doctor"), limitation of liability, governing law, changes to terms. Apple's standard EULA applies by default on iOS unless you supply your own — supplying your own is fine but must meet Apple's minimum terms |
| Cookie notice (web only) | ❓ | Only needed if the landing page sets non-essential cookies (analytics). Skip if you use a cookieless analytics tool (Plausible / Umami) |
| Open-source licence attributions | ❓ | Optional "Licenses" screen in Settings. Expo has `expo-licenses`-style tooling; low priority |
| Consent capture | ✅ | `terms_accepted_at` + `terms_version` recorded on the `users` table at register and Google sign-up |

Practical route: draft with a generator (Termly / iubenda / Docracy) as a base, then edit for the
GPS + fitness specifics. Get a lawyer to review before launch if budget allows; not strictly
required for a free app but the background-location clause is the one most likely to be wrong.

## 5. Store submission

| Item | Status | Notes |
|---|---|---|
| Apple Developer + Google Play accounts | ❓ | Personal account (MitvikSihag), matching the repo commit identity rule |
| Bundle IDs | ✅ | `app.volt.mobile` both platforms |
| Background location justification | 🔸 | Permission strings exist ("Volt records your route while you run."). Apple requires a **demo video** or clear in-app explanation for background location; Play requires a declaration form + video for `ACCESS_BACKGROUND_LOCATION`. Consider **when-in-use only** for v1 if the run screen stays foregrounded — dramatically simpler review |
| Screenshots + preview video | ❌ | 6.7" and 6.1" iPhone, 7"/10" tablet not required if not supporting iPad (set `supportsTablet: false`) |
| App icon, splash | ❓ | Check `app.json` assets are final, not Expo defaults |
| Store listing copy | ❌ | Title, subtitle, description, keywords — pull positioning from PRODUCT.md |
| Support URL + marketing URL | ❌ | Web landing page + a `support@` mailbox |
| Demo account for review | ❌ | Reviewers need a login with seeded data (fixture user `jamie` exists in dev; needs a prod equivalent) |
| Export compliance (encryption) | ❌ | Set `ITSAppUsesNonExemptEncryption: false` in `infoPlist` (HTTPS only = exempt) |
| EAS build profiles | ❓ | `eas.json` with `production` profile, credentials managed by EAS |
| Sign in with Apple | ❌ | See §2 — blocker for App Store approval |
| Account deletion | ✅ | See §3 — `DELETE /api/users/me` + Settings entry shipped |

## 6. Infrastructure & ops

| Item | Status | Notes |
|---|---|---|
| Hosting decision | ❓ | Backend (Fly.io / Railway / Render / a VPS), managed Postgres, object storage for avatars. Current avatar storage is **local disk** (`volt.storage.upload-dir`) — will not survive a redeploy; move to S3/R2 before launch |
| TLS + custom domain | ❌ | `api.volt.app` or similar; HSTS after |
| Secrets | 🔸 | JWT secret, Google client IDs, DB creds, email provider key — all via env; **no defaults in prod** |
| Database backups | ❌ | Daily automated + tested restore once |
| Flyway baseline frozen | 🔸 | PRODUCT.md says edit V1 in place until first users. **Freeze V1 at launch**; all later changes are new migrations |
| Logging | 🔸 | Actuator `health,info` exposed. Add structured JSON logs, never log tokens/passwords/emails at INFO |
| Error tracking | ❌ | Sentry (backend + mobile) or equivalent. Cheap, essential for a solo launch |
| Analytics | ❓ | Decide now because it changes the privacy policy. Product events (PostHog / Amplitude) vs none for v1 |
| Uptime monitoring | ❌ | Ping `/actuator/health` from an external monitor |
| Token cleanup task | ✅ | `TokenCleanupTask` exists — confirm schedule runs in prod |
| Upload limits | ✅ | 5 MB multipart cap. Also validate content type is an image and re-encode/strip EXIF (GPS in avatar photos leaks home location) |
| CI | ✅ | `backend` check required on main. Add mobile typecheck/lint job |
| Dependency audit | ❌ | `./gradlew dependencyCheckAnalyze` or GitHub Dependabot; `npm audit` on mobile |

## 7. Mobile app quality gates

| Item | Status |
|---|---|
| Offline behaviour: logging a set with no network must not lose data (queue + retry) | ❓ |
| GPS tracking survives backgrounding / screen lock on a real device (not simulator) | ❓ |
| Battery: a 1-hour run doesn't drain >10% beyond baseline | ❓ |
| Token expiry mid-workout doesn't kick the user out (refresh is silent) | ❓ |
| Crash-free on iOS 17+ and Android 13+ on real hardware — Android has never been run | ❌ |
| Accessibility basics: Dynamic Type doesn't break Log screen, VoiceOver labels on primary buttons | ❓ |
| Empty states, error states, loading states on every screen | ❓ |
| Remove dev-only UI: fixture logins, debug menus, H2 console links | ❓ |

## 8. Web (landing only for v1)

| Item | Status |
|---|---|
| `/privacy` and `/terms` pages, linked from footer (currently `href="#"`) | ❌ |
| Footer links: drop Pricing/Changelog/Roadmap/Blog or make them real | ❌ |
| App Store / Play badges → real store URLs | ❌ |
| `support@` / contact link | ❌ |
| Cookieless analytics or none | ❓ |

## 9. Launch-day runbook (fill in when close)

- [ ] Rollback plan for backend (previous image tag) and for a bad mobile build (phased rollout on Play, hold on App Store)
- [ ] Who to contact if the API is down (you) — set up phone alerts
- [ ] Support inbox monitored
- [ ] Kill switch for Google sign-in if Google client IDs get misconfigured

---

## Suggested order

1. Account deletion endpoint + Settings entry (store blocker, small)
2. Sign in with Apple (store blocker, already planned)
3. Password reset + email provider (user blocker)
4. Rate limiting filter (one PR, all endpoints in §1)
5. Privacy Policy + T&C drafted, hosted on web, linked from register screen, consent recorded
6. Hosting + object storage + backups + Sentry
7. Store forms (Data safety / App Privacy), screenshots, demo account
8. Real-device QA pass (§7), especially Android and background GPS
