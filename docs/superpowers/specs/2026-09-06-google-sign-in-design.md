# Google sign-in

> Design spec, 6 Sep 2026. Scope: "Continue with Google" on the mobile auth screens, backed by
> one new backend endpoint. Apple sign-in is the next slice on the same seam (App Store rules
> require it before submission, not before dogfooding). Companion docs:
> [backend/CLAUDE.md](../../../backend/CLAUDE.md), [mobile/CLAUDE.md](../../../mobile/CLAUDE.md)
> (follow-up 6), `backend/docs/api/openapi.yaml`.

## 1. Decisions taken

| Decision | Call | Why |
|---|---|---|
| Schema change | Edit `V1__baseline_schema.sql` in place, then wipe the local stack (`docker compose down -v`) | The in-place rule holds until real users exist. The only data today is the disposable `jamie` account, but Flyway has V1's checksum recorded, so the volume **must** be wiped or the next boot fails validation |
| Email collision | Reject with 409 "Email already registered, sign in with your password". No auto-link | Volt has no email verification. Auto-linking lets anyone who pre-registers your email capture your Google sign-in. Linking becomes an authenticated Settings action later |
| `email_verified` | Must be `true` in the Google token, else 401 | The collision check and account creation both trust the email claim |
| Token verification | `spring-security-oauth2-jose` + `NimbusJwtDecoder` on Google's JWKS with issuer + audience validators | Spring's own JWT stack; no Google SDK; lazy key fetch so no network at boot |
| Username for new Google users | Generated from the email local part; user renames in Profile (`PATCH /api/users/me`) | No extra screen. Username is `not null unique` and the rest of the app keys on it |
| Password login on a Google-only account | `CustomUserDetailsService` returns `""` as the password; the `DaoAuthenticationProvider` gets a wrapping `UserDetailsService` that throws `UsernameNotFoundException` on an empty password | Provider hides it as "Bad credentials": no account-type leak, no BCrypt WARN. The rejection must sit on the password path only — `JwtAuthenticationFilter` loads users through the same service, and throwing there 500s every bearer request for Google-only accounts (caught in final review) |
| Google `iss` values | Accept both `https://accounts.google.com` and `accounts.google.com` (`volt.google.issuers` list) | Google documents both forms; an exact match on one silently rejects a whole platform |
| Google `name` claim | Stripped and truncated to 50 chars before `displayName` | Entity is `@Size(max = 50)`; a longer name would fail at commit with a 500 |
| Mobile library | `@react-native-google-signin/google-signin` (free tier) + `expo-dev-client` | Native account sheet, returns the ID token directly. Needs a development build, which Live Activity and Android background GPS need anyway |
| Nonce | Not validated | Native ID-token flow; the library does not support a nonce on Android. Accepted ceremony cut |
| Apple | Deferred to its own PR | One more nullable `*_sub` column, one endpoint, one button on the same seam |

## 2. Scope

### In
- Backend: `POST /api/auth/google` `{ idToken }` → existing `AuthResponse`. Schema: `password_hash`
  nullable, `google_sub varchar(255) unique` nullable. Contract updated in `openapi.yaml`.
- Mobile: `loginWithGoogle` in the auth store, `src/auth/google.ts` wrapper, a "Continue with
  Google" button on login and register, dev-build config, regenerated API types.
- Docs: `backend/CLAUDE.md` (schema-change rule gains the wipe step, Google client-id property),
  `mobile/CLAUDE.md` (dev build commands, env vars, follow-up 6 → Apple only).

### Out
- Apple sign-in. Account linking. Android device testing (no emulator on this Mac). Rate
  limiting on `/api/auth/**` (ROADMAP D6, unchanged). Baking the Cloudflare Gateway CA into the
  Docker image (see §6).

## 3. Backend

### Schema (V1 in place)
```sql
password_hash        varchar(255),                 -- was not null
google_sub           varchar(255) unique,          -- new, nullable
```
`User` entity: `passwordHash` loses `nullable = false`; new `googleSub` field with a unique
column. `FlywayPostgresIntegrationTest` (Testcontainers, `ddl-auto=validate`) catches drift.

### Configuration
```properties
# application.properties
volt.google.client-ids=${VOLT_GOOGLE_CLIENT_IDS:}
volt.google.issuer=https://accounts.google.com
volt.google.jwk-set-uri=https://www.googleapis.com/oauth2/v3/certs
```
`client-ids` is the comma-separated list of accepted audiences (iOS, Android, Web client IDs).
Bound by a `GoogleProperties` record next to `JwtProperties`. Empty list in tests is fine: the
decoder bean is mocked there.

### Decoder bean (`config/GoogleAuthConfig.java`)
```java
@Bean
JwtDecoder googleJwtDecoder(GoogleProperties google) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(google.jwkSetUri()).build();
    OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>(
            "aud", aud -> aud != null && aud.stream().anyMatch(google.clientIds()::contains));
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(google.issuer()), audience));
    return decoder;
}
```
Adding `spring-security-oauth2-jose` alone (not the resource-server starter) brings no
auto-configuration, so the existing `JwtAuthenticationFilter` is untouched.

### Service (`AuthService.loginWithGoogle`)
1. `googleJwtDecoder.decode(idToken)`; any `JwtException` → `UnauthorizedException("Invalid Google token")`.
2. Claims: `sub`, `email`, `email_verified`, `name`. `email_verified != true` → 401.
3. `userRepository.findByGoogleSub(sub)` present → `issueTokens(user)`.
4. `userRepository.existsByEmailAndNotDeleted(email)` → `ConflictException("Email already registered, sign in with your password")`.
5. Create `User`: `username = generateUsername(email)`, `email`, `googleSub = sub`,
   `displayName = name` (fallback username), `passwordHash = null`. Save, `issueTokens`.

`generateUsername(email)`: local part lowercased, non `[a-z0-9_]` stripped, truncated to 24,
padded to 3 with `volt` if shorter; while `existsByUsernameAndNotDeleted`, append 4 random
digits. Private method on `AuthService`; no new class.

### Controller
`POST /api/auth/google` returns 200 with `AuthResponse`. Request DTO `GoogleAuthRequest(@NotBlank String idToken)`.
Already public via the `/api/auth/**` permit rule.

### Contract
`docs/api/openapi.yaml` gains the path and `GoogleAuthRequest` schema. The export test does a
string compare against the runtime spec, so the file is regenerated from `/v3/api-docs.yaml`
and the diff reviewed to be exactly that addition.

### Tests (`AuthGoogleIntegrationTest`, `@MockitoBean JwtDecoder`)
| Case | Decoder returns | Expect |
|---|---|---|
| New user | sub `g1`, verified email `g1@example.com`, name `G One` | 200, tokens; `GET /api/users/me` shows a generated username and the email |
| Returning user | same sub twice | second call 200, same username, one row |
| Email collision | verified email that `register()` already used | 409 |
| Unverified email | `email_verified=false` | 401 |
| Bad token | decoder throws `BadJwtException` | 401 |
| Password login on Google-only account | — | 401 "Bad credentials" |

## 4. Mobile

### Build
- `npx expo install @react-native-google-signin/google-signin expo-dev-client`.
- `app.json`: plugin `["@react-native-google-signin/google-signin", { "iosUrlScheme": "<reversed iOS client id>" }]`.
- Dev build: `npx expo run:ios` (generates `ios/`, gitignored). **Expo Go no longer shows this
  feature.** Physical phone needs free-Apple-ID signing (7-day expiry) or TestFlight; the
  expected dogfood path is simulator first, phone later. Android untested this slice.

### Code
- `src/auth/google.ts`: `GoogleSignin.configure({ webClientId, iosClientId })` from
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`;
  `signInWithGoogle(): Promise<string | null>` → ID token, or `null` when the user cancels.
- `src/auth/store.ts`: `loginWithGoogle: (idToken) => store(await postAuth('/api/auth/google', { idToken }))`.
- `app/(auth)/login.tsx` and `register.tsx`: a secondary `Button` "Continue with Google" under
  the primary action. Tap → `signInWithGoogle()` → if token, `loginWithGoogle(token)`; errors
  land in the existing `err` line. Cancel is silent.
- The root `AuthGate` already reacts to the token appearing and honours `next`, so the
  deferred-account flow (Finish → account → save) works unchanged.
- `npm run gen:api` after the contract lands.

## 5. Setup outside the repo (owner)
Google Cloud project → OAuth consent screen (external, testing) → three OAuth clients:
iOS (bundle `app.volt.mobile`), Android (package `app.volt.mobile`, debug keystore SHA-1),
Web (its ID is the backend's primary audience and the library's `webClientId`).
`VOLT_GOOGLE_CLIENT_IDS` in `backend/.env` = all three, comma-separated.

## 6. Known local blocker
The backend fetches Google's signing keys over HTTPS on first decode. The container JVM does
not trust the Cloudflare Gateway CA, so inside `docker compose` the first Google sign-in fails
with `PKIX path building failed`. For dogfooding run the app on the host (its JVM is patched)
against the compose Postgres, per the documented alternative in `backend/CLAUDE.md`:
```bash
docker compose up -d db
SPRING_PROFILES_ACTIVE=postgres SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/volt \
SPRING_DATASOURCE_USERNAME=volt SPRING_DATASOURCE_PASSWORD=volt \
VOLT_JWT_SECRET=... VOLT_GOOGLE_CLIENT_IDS=... ./gradlew bootRun
```
(`db` must publish 5432 for this; today it does not — add `ports: ["5432:5432"]` to the `db`
service.) Off the intercepting network the compose stack works as is.

## 7. Effort
Backend ~½ day · mobile ~1 day (mostly the first dev build) · console setup ~½ day.
