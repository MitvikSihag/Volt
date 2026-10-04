# Google Sign-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Continue with Google" on the mobile login and register screens, backed by `POST /api/auth/google`, which verifies a Google ID token and issues Volt's existing JWT + refresh pair.

**Architecture:** Backend verifies the ID token with Spring's own `NimbusJwtDecoder` (Google JWKS, issuer + audience validators), finds the user by `google_sub` or creates one with a generated username, and reuses `issueTokens`. Email collisions with a password account are rejected (409), never auto-linked. Mobile uses the native `@react-native-google-signin/google-signin` sheet in a development build and posts the ID token through the existing auth store.

**Tech Stack:** Java 21, Spring Boot 3.5, `spring-security-oauth2-jose`, Flyway, JUnit + MockMvc + `@MockitoBean`; Expo SDK 57, `expo-dev-client`, `@react-native-google-signin/google-signin` 16.x, Zustand.

**Spec:** [docs/superpowers/specs/2026-09-06-google-sign-in-design.md](../specs/2026-09-06-google-sign-in-design.md)

## Global Constraints

- Run Gradle from `backend/` (`./gradlew build`). If Maven Central resolution fails (corporate SSL), retry with `--offline` — note the new dependency in Task 2 must resolve online once.
- `backend/docs/api/openapi.yaml` is the checked-in contract. It is regenerated intentionally in Task 3 and the diff must contain only the new path and schema.
- `V1__baseline_schema.sql` is edited in place (spec §1). The running compose stack has V1's checksum recorded and one disposable account (`jamie`); Task 4 wipes it with `docker compose down -v`. Never skip that step or the next boot fails Flyway validation.
- No auto-linking by email. `email_verified` must be `true`. Invalid token → 401. Collision → 409 with message `Email already registered, sign in with your password`.
- No new interfaces for single implementations. No Google SDK on the backend. No new mobile dependencies beyond the two named above.
- Mobile: never hand-write API shapes; regenerate `src/api/schema.d.ts` with `npm run gen:api`. Design grammar: grayscale chrome, `Button tone="ghost"` for the secondary action.
- Do not stage the paused `web/` WIP (`web/components/landing/`, `web/components/ui/logo.tsx`, `web/components/workout/`).
- Commit messages end with: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- Branch: `feat/google-sign-in` (already created off `main`; spec is committed on it).

---

### Task 1: Schema + entity for Google-only accounts

**Files:**
- Modify: `backend/src/main/resources/db/migration/V1__baseline_schema.sql:12` (users table)
- Modify: `backend/src/main/java/com/volt/user/User.java:33-34` (passwordHash), add `googleSub`
- Modify: `backend/src/main/java/com/volt/user/UserRepository.java`
- Modify: `backend/src/main/java/com/volt/user/CustomUserDetailsService.java:23-31`
- Test: `backend/src/test/java/com/volt/AuthGoogleIntegrationTest.java` (new)

**Interfaces:**
- Produces: `User.getGoogleSub()/setGoogleSub(String)`, `UserRepository.findByGoogleSub(String): Optional<User>`; `password_hash` nullable.

- [ ] **Step 1: Write the failing test — password login on a Google-only account is a plain 401**

```java
package com.volt;

import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthGoogleIntegrationTest extends AbstractIntegrationTest {

    @Test
    void passwordLoginOnGoogleOnlyAccountIsBadCredentials() throws Exception {
        User user = new User();
        user.setUsername("googleonly");
        user.setEmail("googleonly@example.com");
        user.setGoogleSub("sub-googleonly");
        user.setDisplayName("googleonly");
        userRepository.save(user);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "googleonly", "password", "anything"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bad credentials"));
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && ./gradlew test --tests com.volt.AuthGoogleIntegrationTest`
Expected: compile error — `setGoogleSub` does not exist.

- [ ] **Step 3: Edit V1 in place**

In `V1__baseline_schema.sql`, users table:
```sql
    password_hash        varchar(255),
    google_sub           varchar(255) unique,
```
(`password_hash` loses `not null`; `google_sub` is a new line directly after it.)

- [ ] **Step 4: Entity**

In `User.java` replace the `passwordHash` column and add `googleSub` after it:
```java
    @Column
    private String passwordHash;

    @Column(unique = true)
    private String googleSub;
```
Add accessors next to the existing ones:
```java
    public String getGoogleSub() { return googleSub; }
    public void setGoogleSub(String googleSub) { this.googleSub = googleSub; }
```

- [ ] **Step 5: Repository**

Add to `UserRepository`:
```java
    @Query("SELECT u FROM User u WHERE u.googleSub = :googleSub AND u.deletedAt IS NULL")
    Optional<User> findByGoogleSub(String googleSub);
```

- [ ] **Step 6: Null hash → "Bad credentials"**

In `CustomUserDetailsService.loadUserByUsername`, after the lookup:
```java
        // Google-only accounts have no password; the provider hides this as "Bad credentials".
        if (user.getPasswordHash() == null) {
            throw new UsernameNotFoundException("No password set for: " + usernameOrEmail);
        }
```

- [ ] **Step 7: Run the test and the whole suite**

Run: `cd backend && ./gradlew test`
Expected: all green. `FlywayPostgresIntegrationTest` validates the edited V1 against the entity (skips if Docker is down — say so in the commit if it did).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/V1__baseline_schema.sql backend/src/main/java/com/volt/user/User.java backend/src/main/java/com/volt/user/UserRepository.java backend/src/main/java/com/volt/user/CustomUserDetailsService.java backend/src/test/java/com/volt/AuthGoogleIntegrationTest.java
git commit -m "feat(backend): nullable password_hash + google_sub on users; Google-only accounts get plain Bad credentials on password login

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `POST /api/auth/google`

**Files:**
- Modify: `backend/build.gradle.kts:23` (dependencies)
- Create: `backend/src/main/java/com/volt/config/GoogleProperties.java`
- Create: `backend/src/main/java/com/volt/config/GoogleAuthConfig.java`
- Create: `backend/src/main/java/com/volt/user/dto/GoogleAuthRequest.java`
- Modify: `backend/src/main/resources/application.properties` (after the JWT block, line 29)
- Modify: `backend/src/main/java/com/volt/user/AuthService.java` (constructor + new method)
- Modify: `backend/src/main/java/com/volt/user/AuthController.java`
- Test: `backend/src/test/java/com/volt/AuthGoogleIntegrationTest.java`

**Interfaces:**
- Consumes: `User.setGoogleSub`, `UserRepository.findByGoogleSub` (Task 1); existing `AuthService.issueTokens(User)`, `UnauthorizedException(String)`, `ConflictException(String)`.
- Produces: bean `JwtDecoder googleJwtDecoder`; `AuthService.loginWithGoogle(String idToken): AuthResponse`; HTTP `POST /api/auth/google {idToken}` → 200 `AuthResponse`.

- [ ] **Step 1: Write the failing tests**

Add to `AuthGoogleIntegrationTest` (imports listed; keep Task 1's test):
```java
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

    @MockitoBean
    private JwtDecoder googleJwtDecoder;

    private static Jwt googleJwt(String sub, String email, boolean verified, String name) {
        return Jwt.withTokenValue("tok-" + sub)
                .header("alg", "RS256")
                .subject(sub)
                .claim("email", email)
                .claim("email_verified", verified)
                .claim("name", name)
                .build();
    }

    private MvcResult google(String token) throws Exception {
        return mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", token))))
                .andReturn();
    }

    @Test
    void newGoogleUserGetsAccountAndTokens() throws Exception {
        when(googleJwtDecoder.decode("tok-g1")).thenReturn(googleJwt("g1", "g.one@example.com", true, "G One"));

        MvcResult result = google("tok-g1");
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(readBody(result).get("accessToken").asText()).isNotBlank();

        User created = userRepository.findByGoogleSub("g1").orElseThrow();
        assertThat(created.getUsername()).isEqualTo("gone");
        assertThat(created.getEmail()).isEqualTo("g.one@example.com");
        assertThat(created.getDisplayName()).isEqualTo("G One");
        assertThat(created.getPasswordHash()).isNull();
    }

    @Test
    void returningGoogleUserReusesAccount() throws Exception {
        when(googleJwtDecoder.decode("tok-g2")).thenReturn(googleJwt("g2", "g2@example.com", true, "G Two"));

        assertThat(google("tok-g2").getResponse().getStatus()).isEqualTo(200);
        assertThat(google("tok-g2").getResponse().getStatus()).isEqualTo(200);

        assertThat(userRepository.findAll().stream().filter(u -> "g2@example.com".equals(u.getEmail())).count()).isEqualTo(1);
    }

    @Test
    void generatedUsernameAvoidsCollision() throws Exception {
        register("gthree");
        when(googleJwtDecoder.decode("tok-g3")).thenReturn(googleJwt("g3", "gthree@other.example", true, "G Three"));

        assertThat(google("tok-g3").getResponse().getStatus()).isEqualTo(200);
        String username = userRepository.findByGoogleSub("g3").orElseThrow().getUsername();
        assertThat(username).startsWith("gthree").isNotEqualTo("gthree").hasSize(10);
    }

    @Test
    void emailCollisionWithPasswordAccountIsRejected() throws Exception {
        register("collide"); // email collide@example.com
        when(googleJwtDecoder.decode("tok-g4")).thenReturn(googleJwt("g4", "collide@example.com", true, "Collide"));

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", "tok-g4"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already registered, sign in with your password"));
        assertThat(userRepository.findByGoogleSub("g4")).isEmpty();
    }

    @Test
    void unverifiedEmailIsRejected() throws Exception {
        when(googleJwtDecoder.decode("tok-g5")).thenReturn(googleJwt("g5", "g5@example.com", false, "G Five"));

        assertThat(google("tok-g5").getResponse().getStatus()).isEqualTo(401);
        assertThat(userRepository.findByGoogleSub("g5")).isEmpty();
    }

    @Test
    void invalidTokenIsRejected() throws Exception {
        when(googleJwtDecoder.decode(anyString())).thenThrow(new BadJwtException("bad"));

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", "garbage"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid Google token"));
    }

    @Test
    void blankTokenIsBadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", ""))))
                .andExpect(status().isBadRequest());
    }
```
(`readBody`, `json`, `register` come from `AbstractIntegrationTest`.)

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./gradlew test --tests com.volt.AuthGoogleIntegrationTest`
Expected: compile error — `JwtDecoder` not on the classpath.

- [ ] **Step 3: Dependency**

`build.gradle.kts`, after `spring-boot-starter-security`:
```kotlin
    implementation("org.springframework.security:spring-security-oauth2-jose")
```
Only the jose module, not `spring-boot-starter-oauth2-resource-server`: no auto-configuration, so the existing `JwtAuthenticationFilter` is untouched.

- [ ] **Step 4: Properties**

`application.properties`, after line 29:
```properties

# Google sign-in — accepted ID-token audiences (iOS, Android, Web OAuth client IDs, comma-separated)
volt.google.client-ids=${VOLT_GOOGLE_CLIENT_IDS:}
volt.google.issuer=https://accounts.google.com
volt.google.jwk-set-uri=https://www.googleapis.com/oauth2/v3/certs
```

`config/GoogleProperties.java` (same style as `JwtProperties`):
```java
package com.volt.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "volt.google")
public class GoogleProperties {

    private List<String> clientIds = List.of();
    private String issuer;
    private String jwkSetUri;

    public List<String> getClientIds() { return clientIds; }
    public void setClientIds(List<String> clientIds) { this.clientIds = clientIds; }

    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }

    public String getJwkSetUri() { return jwkSetUri; }
    public void setJwkSetUri(String jwkSetUri) { this.jwkSetUri = jwkSetUri; }
}
```

- [ ] **Step 5: Decoder bean**

`config/GoogleAuthConfig.java`:
```java
package com.volt.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.util.List;

@Configuration
public class GoogleAuthConfig {

    /** Verifies Google ID tokens. Keys are fetched lazily on first decode, so boot needs no network. */
    @Bean
    public JwtDecoder googleJwtDecoder(GoogleProperties google) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(google.getJwkSetUri()).build();
        OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>(
                "aud", aud -> aud != null && aud.stream().anyMatch(google.getClientIds()::contains));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(google.getIssuer()), audience));
        return decoder;
    }
}
```

- [ ] **Step 6: Request DTO**

`user/dto/GoogleAuthRequest.java`:
```java
package com.volt.user.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(@NotBlank String idToken) {}
```

- [ ] **Step 7: Service**

`AuthService`: add a field and constructor parameter `JwtDecoder googleJwtDecoder` (imports `org.springframework.security.oauth2.jwt.Jwt`, `JwtDecoder`, `JwtException`, `java.util.concurrent.ThreadLocalRandom`). Then add:
```java
    public AuthResponse loginWithGoogle(String idToken) {
        Jwt jwt;
        try {
            jwt = googleJwtDecoder.decode(idToken);
        } catch (JwtException e) {
            throw new UnauthorizedException("Invalid Google token");
        }
        String email = jwt.getClaimAsString("email");
        if (!Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified")) || email == null) {
            throw new UnauthorizedException("Google account email is not verified");
        }

        return userRepository.findByGoogleSub(jwt.getSubject())
                .map(this::issueTokens)
                .orElseGet(() -> {
                    // Never auto-link by email: Volt has no email verification of its own.
                    if (userRepository.existsByEmailAndNotDeleted(email)) {
                        throw new ConflictException("Email already registered, sign in with your password");
                    }
                    User user = new User();
                    user.setUsername(generateUsername(email));
                    user.setEmail(email);
                    user.setGoogleSub(jwt.getSubject());
                    String name = jwt.getClaimAsString("name");
                    user.setDisplayName(name != null && !name.isBlank() ? name : user.getUsername());
                    userRepository.save(user);
                    return issueTokens(user);
                });
    }

    /** Email local part → [a-z0-9_], 3..24 chars, 4 random digits appended while taken. */
    private String generateUsername(String email) {
        String base = email.substring(0, email.indexOf('@')).toLowerCase().replaceAll("[^a-z0-9_]", "");
        if (base.length() > 24) base = base.substring(0, 24);
        if (base.length() < 3) base = "volt" + base;
        String candidate = base;
        while (userRepository.existsByUsernameAndNotDeleted(candidate)) {
            candidate = base + ThreadLocalRandom.current().nextInt(1000, 10000);
        }
        return candidate;
    }
```

- [ ] **Step 8: Controller**

`AuthController`, after `login`:
```java
    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleAuthRequest request) {
        return authService.loginWithGoogle(request.idToken());
    }
```
(import `com.volt.user.dto.GoogleAuthRequest`.) `/api/auth/**` is already `permitAll` in `SecurityConfig`.

- [ ] **Step 9: Run the Google tests**

Run: `cd backend && ./gradlew test --tests com.volt.AuthGoogleIntegrationTest`
Expected: 8 tests pass.

- [ ] **Step 10: Run the full suite**

Run: `cd backend && ./gradlew test`
Expected: everything green except `OpenApiSpecExportTest`, which now fails because the contract lacks the new path. Task 3 fixes that; do not touch `openapi.yaml` here.

- [ ] **Step 11: Commit**

```bash
git add backend/build.gradle.kts backend/src/main/resources/application.properties backend/src/main/java/com/volt/config/GoogleProperties.java backend/src/main/java/com/volt/config/GoogleAuthConfig.java backend/src/main/java/com/volt/user/dto/GoogleAuthRequest.java backend/src/main/java/com/volt/user/AuthService.java backend/src/main/java/com/volt/user/AuthController.java backend/src/test/java/com/volt/AuthGoogleIntegrationTest.java
git commit -m "feat(backend): POST /api/auth/google — verify Google ID token via JWKS, find-or-create user, reject email collisions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Regenerate the OpenAPI contract

**Files:**
- Modify: `backend/docs/api/openapi.yaml`

**Interfaces:**
- Produces: contract with `/api/auth/google` and `GoogleAuthRequest`, consumed by mobile `npm run gen:api` in Task 5.

- [ ] **Step 1: Confirm the contract test fails**

Run: `cd backend && ./gradlew test --tests com.volt.OpenApiSpecExportTest`
Expected: FAIL, "Runtime Springdoc YAML differs from docs/api/openapi.yaml".

- [ ] **Step 2: Regenerate from the runtime spec**

The compose stack holds port 8080, so boot on 8090:
```bash
cd backend
./gradlew bootRun --args='--server.port=8090' > /tmp/volt-bootrun.log 2>&1 &
BOOT=$!
until curl -sf http://localhost:8090/actuator/health >/dev/null; do sleep 2; done
curl -s http://localhost:8090/v3/api-docs.yaml > docs/api/openapi.yaml
kill $BOOT
```

- [ ] **Step 3: Review the diff — it must be only the addition**

Run: `git diff --stat backend/docs/api/openapi.yaml && git diff backend/docs/api/openapi.yaml`
Expected: one new path block `/api/auth/google` (post, `auth-controller`, `operationId: google`, request `GoogleAuthRequest`, 200 → `AuthResponse`) and one new schema `GoogleAuthRequest` with required `idToken` (`minLength: 1`). Anything else in the diff means the runtime spec drifted for another reason — stop and investigate, do not commit.

- [ ] **Step 4: Contract test passes; full suite green**

Run: `cd backend && ./gradlew test`
Expected: BUILD SUCCESSFUL, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/docs/api/openapi.yaml
git commit -m "docs(api): add POST /api/auth/google to the checked-in contract

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Local stack reset + backend docs

**Files:**
- Modify: `backend/docker-compose.yml` (db service)
- Modify: `backend/CLAUDE.md` (Schema changes section; Running Locally)
- Modify: `backend/.env` (gitignored, local only)

**Interfaces:**
- Produces: a compose stack whose Flyway history matches the edited V1; `db` reachable on `localhost:5432` for host-run backend.

- [ ] **Step 1: Expose Postgres to the host**

In `docker-compose.yml`, `db` service, add:
```yaml
    ports:
      - "5432:5432"
```
Needed because the Google JWKS fetch fails inside the container on the Cloudflare-intercepted network (spec §6); the host JVM is patched, so dogfooding runs the app on the host against this db.

- [ ] **Step 2: Wipe and rebuild the stack (destroys `jamie`; approved in the design review)**

```bash
cd backend
./gradlew bootJar && docker compose down -v && docker compose up -d --build
docker compose logs app | grep -iE "flyway|Successfully applied|Validated" | tail -5
```
Expected: `Successfully applied 1 migration`, no checksum error.

- [ ] **Step 3: Add the client-id env var placeholder**

Append to `backend/.env` (do not commit; the file is gitignored):
```
VOLT_GOOGLE_CLIENT_IDS=
```
The owner fills it after creating the OAuth clients (spec §5). Empty means every Google token is rejected with 401, which is the safe default.

- [ ] **Step 4: Update `backend/CLAUDE.md`**

In **Schema changes**, replace the first sentence about editing V1 with:
```markdown
Flyway is the single source of truth on the Postgres profile. Until the first real users exist,
the V1 baseline is edited in place (PRODUCT.md §2 locked decision). **After any V1 edit, wipe the
local stack** — Flyway records V1's checksum, so the next boot fails validation otherwise:
`./gradlew bootJar && docker compose down -v && docker compose up -d --build` (local accounts are
disposable; re-register). Once a database is deployed, never edit an applied migration — add
`V2__*.sql`, `V3__*.sql`, … under `src/main/resources/db/migration`.
```
In **Running Locally**, after the "point a local run at an existing Postgres" block, add:
```markdown
Google sign-in needs `VOLT_GOOGLE_CLIENT_IDS` (comma-separated iOS/Android/Web OAuth client IDs).
The container JVM does not trust the Cloudflare Gateway CA, so on the intercepting network the
JWKS fetch fails inside Docker; run the app on the host against the compose `db` (published on
5432) for Google-login dogfooding.
```
Also add `GoogleAuthConfig`/`GoogleProperties` to the `config/` line in **Project Structure** and `google_sub` to the `User` row of **Domain Model** ("Profile, goals, body stats; optional `google_sub`, nullable `password_hash` for Google-only accounts").

- [ ] **Step 5: Commit**

```bash
git add backend/docker-compose.yml backend/CLAUDE.md
git commit -m "docs(backend): V1-edit wipe step, Google client-id config, publish db port for host-run dogfooding

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Mobile — dependencies, wrapper, store action, types

**Files:**
- Modify: `mobile/volt-mobile/package.json` (via `expo install`)
- Modify: `mobile/volt-mobile/app.json` (plugins)
- Create: `mobile/volt-mobile/src/auth/google.ts`
- Modify: `mobile/volt-mobile/src/auth/store.ts:16-21` (type) and `:50-51` (actions)
- Modify: `mobile/volt-mobile/src/api/schema.d.ts` (generated)
- Modify: `mobile/volt-mobile/.env.example`

**Interfaces:**
- Consumes: contract from Task 3.
- Produces: `signInWithGoogle(): Promise<string | null>`; `useAuth.getState().loginWithGoogle(idToken: string): Promise<void>`.

- [ ] **Step 1: Install**

```bash
cd mobile/volt-mobile
npx expo install @react-native-google-signin/google-signin expo-dev-client
```
Expected: both land in `dependencies` with SDK-57-compatible versions (`google-signin` 16.x, `expo-dev-client` ~57.0).

- [ ] **Step 2: Config plugin**

In `app.json` `plugins`, add after `"expo-secure-store"`:
```json
      [
        "@react-native-google-signin/google-signin",
        { "iosUrlScheme": "com.googleusercontent.apps.REPLACE_WITH_IOS_CLIENT_ID" }
      ],
```
The owner replaces the placeholder with the reversed iOS client ID from spec §5 before the first `expo run:ios`. (`expo-dev-client` needs no plugin entry.)

- [ ] **Step 3: Regenerate API types**

Run: `npm run gen:api && git diff --stat src/api/schema.d.ts`
Expected: `schema.d.ts` gains `/api/auth/google` and `GoogleAuthRequest`.

- [ ] **Step 4: Wrapper**

`src/auth/google.ts`:
```ts
// Native Google account sheet → ID token. Lazy import so Expo Go / web (no native module) fail on tap, not on screen load.
export async function signInWithGoogle(): Promise<string | null> {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (res.type === 'cancelled') return null;
  if (!res.data.idToken) throw new Error('Google did not return an ID token');
  return res.data.idToken;
}
```

- [ ] **Step 5: Store action**

`src/auth/store.ts`: in `AuthState` add after `register`:
```ts
  loginWithGoogle: (idToken: string) => Promise<void>;
```
and in the returned object after `register:`:
```ts
    loginWithGoogle: async (idToken) => store(await postAuth('/api/auth/google', { idToken })),
```

- [ ] **Step 6: Document the env vars**

Append to `.env.example`:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json app.json .env.example src/auth/google.ts src/auth/store.ts src/api/schema.d.ts
git commit -m "feat(mobile): Google sign-in wrapper + loginWithGoogle store action; dev-client and google-signin deps

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Mobile — buttons, dev build, simulator verification

**Files:**
- Modify: `mobile/volt-mobile/app/(auth)/login.tsx`
- Modify: `mobile/volt-mobile/app/(auth)/register.tsx`

**Interfaces:**
- Consumes: `signInWithGoogle`, `useAuth.loginWithGoogle` (Task 5); `Button` primitive (`tone: 'primary' | 'ghost'`).

- [ ] **Step 1: Login screen**

In `login.tsx`: import `{ signInWithGoogle } from '@/auth/google'`; select the action `const loginWithGoogle = useAuth((s) => s.loginWithGoogle);`; add the handler after `submit`:
```tsx
  const google = async () => {
    setBusy(true); setErr(null);
    try { const t = await signInWithGoogle(); if (t) await loginWithGoogle(t); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Google sign-in failed'); }
    finally { setBusy(false); }
  };
```
and render directly after the primary `Button`:
```tsx
          <Button label="Continue with Google" tone="ghost" onPress={google} disabled={busy} />
```

- [ ] **Step 2: Register screen**

Same three additions in `register.tsx` (import, `loginWithGoogle` selector, `google` handler with the same body, ghost button after "Create account"). The heading copy for the deferred-account case is unchanged; the `AuthGate` in `app/_layout.tsx` already honours `next` when the token appears.

- [ ] **Step 3: Typecheck and unit tests**

Run: `npm run typecheck && npm test`
Expected: clean; existing pure-module tests pass.

- [ ] **Step 4: Development build on the iOS Simulator**

```bash
cd mobile/volt-mobile
npx expo run:ios
```
Expected: prebuild generates `ios/` (gitignored), CocoaPods installs, the app launches on the booted simulator with the dev client. If `pod install` fails on SSL behind the corporate proxy, retry off-network or with `CDN` sources disabled; note it in the PR.

- [ ] **Step 5: Verify on the simulator**

With `EXPO_PUBLIC_API_URL` pointing at the host-run backend (Task 4 §6 command) and the client IDs set in `.env`:
1. Open Register: "Continue with Google" renders as the ghost button under "Create account". Take a screenshot.
2. Tap it: the native Google sheet opens. Pick an account → app lands on Today; `GET /api/users/me` shows the generated username.
3. Sign out, Login → "Continue with Google" with the same account → Today (no duplicate account: check `users` in Postgres).
4. Register a password account with the same Google email, sign out, try Google → error line shows "Email already registered, sign in with your password".
If the owner has not created the OAuth clients yet, steps 2–4 cannot run: verify step 1 plus that a tap shows an error line (not a crash), and say so explicitly in the PR.

- [ ] **Step 6: Commit**

```bash
git add "app/(auth)/login.tsx" "app/(auth)/register.tsx"
git commit -m "feat(mobile): Continue with Google on login and register

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Mobile docs + PR

**Files:**
- Modify: `mobile/CLAUDE.md`

- [ ] **Step 1: Update `mobile/CLAUDE.md`**

In **Stack**, extend the Auth bullet:
```markdown
- **Auth:** JWT + rotating refresh in `expo-secure-store` (AsyncStorage on the web dev target);
  one refresh-and-retry on 401 inside the fetch wrapper. Google sign-in via
  `@react-native-google-signin/google-signin` (`src/auth/google.ts` → `POST /api/auth/google`);
  needs a development build — Expo Go does not show it.
```
In **Commands**, add:
```bash
npx expo run:ios     # development build on the simulator (required for Google sign-in, Live Activity)
```
and after the API base URL paragraph:
```markdown
Google sign-in: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
(from the Google Cloud OAuth clients; the reversed iOS ID also goes in `app.json` under the
google-signin plugin). Dogfood path is simulator first; a physical phone needs a signed dev
build (free Apple ID, 7-day expiry) or TestFlight.
```
In **Backend follow-ups still open**, replace item 6 with:
```markdown
6. Apple sign-in (App Store rule: required alongside Google before submission). Same seam as
   Google: nullable `apple_sub`, `POST /api/auth/apple`, `expo-apple-authentication` button.
   Account linking (Google ↔ password) as an authenticated Settings action.
```
Add `google.ts` to the `src/auth/` line in **Layout**.

- [ ] **Step 2: Final checks**

```bash
cd backend && ./gradlew build
cd ../mobile/volt-mobile && npm run typecheck && npm test
git status --short   # must not list web/ WIP as staged
```
Expected: BUILD SUCCESSFUL; typecheck clean; tests pass.

- [ ] **Step 3: Commit and push**

```bash
git add mobile/CLAUDE.md
git commit -m "docs(mobile): Google sign-in setup, dev-build path; follow-up 6 is now Apple + linking

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin feat/google-sign-in
```
Push via the git SSH remote as `MitvikSihag` (never the company `gh` account).

- [ ] **Step 4: Open the PR (as MitvikSihag, via the browser or the SSH-authenticated flow)**

Title: `feat: Google sign-in (backend endpoint + mobile dev-build button)`

Body:
```markdown
Implements docs/superpowers/specs/2026-09-06-google-sign-in-design.md.

- `POST /api/auth/google`: verifies the Google ID token with Spring's NimbusJwtDecoder (JWKS, issuer + audience), requires `email_verified`, finds by `google_sub` or creates a user with a generated username, reuses the existing token issuance. Email collision with a password account → 409, never auto-linked.
- Schema: `password_hash` nullable, `google_sub` unique — V1 edited in place; the local stack was wiped (`docker compose down -v`).
- Mobile: "Continue with Google" (ghost button) on login and register; native sheet via `@react-native-google-signin/google-signin` in a development build. Expo Go no longer shows this feature.
- Docs: wipe-after-V1-edit rule, Google client-id config, dev-build path, follow-up 6 → Apple.

Verified: <state exactly which of Task 6 step 5's four checks ran, with the screenshot>.
Not in this PR: Apple sign-in, account linking, Android device test, rate limiting (D6).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
