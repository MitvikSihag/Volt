# Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the self-hosted launch block: JWT key rotation, hashed refresh tokens, email verification, password reset, account deletion with 30-day purge, rate limiting on every endpoint class, consent capture, email normalisation, and the small security-config fixes, with the mobile screens that use them.

**Architecture:** Everything extends the existing JWT + rotating-refresh stack. One `email_tokens` table serves verification and reset. Mail goes through Resend's HTTPS API via Spring's `RestClient`. Rate limits live in a servlet filter after the JWT filter (per IP / per user) plus a small in-service limiter for per-identity rules. Deletion anonymises immediately and a scheduled task hard-deletes 30 days later through FK cascades added to V1.

**Tech Stack:** Java 21, Spring Boot 3.5 (Security, Data JPA, `RestClient`), jjwt 0.12, Bucket4j 8.10 + Caffeine, Flyway, JUnit + MockMvc; Expo SDK 57 + Expo Router, Zustand, TanStack Query.

**Spec:** [docs/superpowers/specs/2026-09-08-auth-hardening-design.md](../specs/2026-09-08-auth-hardening-design.md). Requirements source: [RELEASE_CHECKLIST.md](../../../RELEASE_CHECKLIST.md) §1–§3.

## Global Constraints

- Branch `feat/auth-hardening`, stacked on `feat/google-sign-in` (spec committed at 43ec236). Gradle runs from `backend/`. Never stage `web/`, `RELEASE_CHECKLIST.md`, `AGENTS.md` (owner's uncommitted edits), `backend/.env`, or `mobile/volt-mobile/ios/`.
- `V1__baseline_schema.sql` is edited in place; the local compose stack is wiped in Task 7 (`docker compose down -v`). Until Task 7 the running stack is stale — do not restart it in earlier tasks.
- `backend/docs/api/openapi.yaml` is regenerated in Task 7 only; `OpenApiSpecExportTest` is expected red from Task 3 until then. Never hand-edit the contract.
- `volt.jwt.secret` disappears; keys are `volt.jwt.keys=kid:base64,…` + `volt.jwt.active-kid`. Postgres profile has no fallbacks for either.
- Error copy, exact: `Bad credentials` · `Link is invalid or has expired` · `Email already verified` · `Too many attempts, try again in N seconds` (N integer seconds, also sent as `Retry-After`).
- Rate limits exactly as the spec §4 table. Tests run with `volt.security.rate-limit-enabled=false` except `RateLimitIntegrationTest`.
- No new interfaces for single implementations; no mail SDK; no Redis.
- Mobile: never hand-write API shapes (`npm run gen:api`); grayscale chrome, `Button tone="ghost"` for secondary actions, ember only for the destructive "Delete my account" label.
- Commit trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

### Task 1: JWT key rotation

**Files:**
- Modify: `backend/src/main/java/com/volt/config/JwtProperties.java`
- Modify: `backend/src/main/java/com/volt/config/JwtTokenProvider.java`
- Modify: `backend/src/main/resources/application.properties:25-29`
- Modify: `backend/src/main/resources/application-postgres.properties:10-12`
- Modify: `backend/src/test/resources/application.properties:16-19`
- Modify: `backend/docker-compose.yml:31`
- Test: `backend/src/test/java/com/volt/JwtKeyRotationTest.java` (new), `backend/src/test/java/com/volt/JwtTokenProviderTest.java` (new)

**Interfaces:**
- Produces: `JwtProperties.getKeys(): String`, `getActiveKid(): String`; `JwtTokenProvider` unchanged public API (`generateAccessToken`, `extractUsername`, `isTokenValid`) but tokens now carry a `kid` header.

- [ ] **Step 1: Failing tests**

`JwtTokenProviderTest.java` (plain unit test):
```java
package com.volt;

import com.volt.config.JwtProperties;
import com.volt.config.JwtTokenProvider;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    static final String KEY_A = "YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE="; // 32 × 'a'
    static final String KEY_B = "YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmI="; // 32 × 'b'

    private static JwtProperties props(String keys, String active) {
        JwtProperties p = new JwtProperties();
        p.setKeys(keys);
        p.setActiveKid(active);
        p.setAccessTokenExpirationMs(60_000);
        p.setRefreshTokenExpirationMs(60_000);
        return p;
    }

    @Test
    void tokenSignedWithListedNonActiveKeyIsValid() {
        JwtTokenProvider old = new JwtTokenProvider(props("a:" + KEY_A, "a"));
        JwtTokenProvider rotated = new JwtTokenProvider(props("a:" + KEY_A + ",b:" + KEY_B, "b"));
        String token = old.generateAccessToken("jamie");
        assertThat(rotated.isTokenValid(token)).isTrue();
        assertThat(rotated.extractUsername(token)).isEqualTo("jamie");
    }

    @Test
    void tokenWithUnknownKidIsRejected() {
        JwtTokenProvider a = new JwtTokenProvider(props("a:" + KEY_A, "a"));
        JwtTokenProvider bOnly = new JwtTokenProvider(props("b:" + KEY_B, "b"));
        assertThat(bOnly.isTokenValid(a.generateAccessToken("jamie"))).isFalse();
    }

    @Test
    void activeKidMustBeListed() {
        assertThatThrownBy(() -> new JwtTokenProvider(props("a:" + KEY_A, "zzz")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("active-kid");
    }

    @Test
    void shortKeyIsRejected() {
        assertThatThrownBy(() -> new JwtTokenProvider(props("a:c2hvcnQ=", "a")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }
}
```

`JwtKeyRotationTest.java` (integration, own context):
```java
package com.volt;

import com.volt.config.JwtProperties;
import com.volt.config.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {
        "volt.jwt.keys=dev:dGhpcy1pcy1hLXZlcnktc2VjcmV0LWtleS1mb3Itdm9sdC1hcHAtZGV2LTIwMjY=,old:" + JwtTokenProviderTest.KEY_A,
        "volt.jwt.active-kid=dev"
})
class JwtKeyRotationTest extends AbstractIntegrationTest {

    @Test
    void requestSignedWithRetiredButListedKeyStillAuthenticates() throws Exception {
        register("rotator");
        JwtProperties oldProps = new JwtProperties();
        oldProps.setKeys("old:" + JwtTokenProviderTest.KEY_A);
        oldProps.setActiveKid("old");
        oldProps.setAccessTokenExpirationMs(60_000);
        String oldToken = new JwtTokenProvider(oldProps).generateAccessToken("rotator");

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + oldToken))
                .andExpect(status().isOk());
    }

    @Test
    void requestSignedWithUnlistedKeyIsRejected() throws Exception {
        register("rotator2");
        JwtProperties ghost = new JwtProperties();
        ghost.setKeys("ghost:" + JwtTokenProviderTest.KEY_B);
        ghost.setActiveKid("ghost");
        ghost.setAccessTokenExpirationMs(60_000);
        String token = new JwtTokenProvider(ghost).generateAccessToken("rotator2");

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./gradlew test --tests com.volt.JwtTokenProviderTest --tests com.volt.JwtKeyRotationTest`
Expected: compile error — `setKeys` / `setActiveKid` do not exist.

- [ ] **Step 3: `JwtProperties`**

Replace the `secret` field and accessors with:
```java
    /** "kid:base64,kid:base64" — every listed key verifies; only the active one signs. */
    private String keys;
    private String activeKid;

    public String getKeys() { return keys; }
    public void setKeys(String keys) { this.keys = keys; }

    public String getActiveKid() { return activeKid; }
    public void setActiveKid(String activeKid) { this.activeKid = activeKid; }
```
(keep the two expiration properties.)

- [ ] **Step 4: `JwtTokenProvider`**

Replace the class body:
```java
@Component
public class JwtTokenProvider {

    private final Map<String, SecretKey> keys;
    private final String activeKid;
    private final long accessTokenExpirationMs;

    public JwtTokenProvider(JwtProperties props) {
        Map<String, SecretKey> parsed = new HashMap<>();
        for (String entry : props.getKeys().split(",")) {
            String[] kv = entry.trim().split(":", 2);
            if (kv.length != 2 || kv[0].isBlank()) {
                throw new IllegalStateException("volt.jwt.keys entries must be kid:base64, got '" + entry + "'");
            }
            byte[] raw = Decoders.BASE64.decode(kv[1].trim());
            if (raw.length < 32) {
                throw new IllegalStateException("JWT key '" + kv[0] + "' must be at least 32 bytes");
            }
            parsed.put(kv[0].trim(), Keys.hmacShaKeyFor(raw));
        }
        if (!parsed.containsKey(props.getActiveKid())) {
            throw new IllegalStateException("volt.jwt.active-kid '" + props.getActiveKid() + "' is not listed in volt.jwt.keys");
        }
        this.keys = Map.copyOf(parsed);
        this.activeKid = props.getActiveKid();
        this.accessTokenExpirationMs = props.getAccessTokenExpirationMs();
    }

    public String generateAccessToken(String username) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .header().keyId(activeKid).and()
                .issuer("volt")
                .subject(username)
                .issuedAt(new Date(now))
                .expiration(new Date(now + accessTokenExpirationMs))
                .signWith(keys.get(activeKid))
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .keyLocator(header -> {
                    String kid = header instanceof ProtectedHeader ph ? ph.getKeyId() : null;
                    SecretKey key = kid == null ? null : keys.get(kid);
                    if (key == null) throw new JwtException("Unknown key id");
                    return key;
                })
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```
Imports: `io.jsonwebtoken.ProtectedHeader`, `java.util.HashMap`, `java.util.Map`.

- [ ] **Step 5: Properties and compose**

`application.properties` — replace the `volt.jwt.secret` line and its comment with:
```properties
# JWT signing keys — "kid:base64,kid:base64"; every listed key verifies, only the active one signs.
# Rotate: add a new kid, switch active-kid, drop the old kid after the access TTL has passed.
# The committed dev key MUST be overridden via VOLT_JWT_KEYS in any non-local environment.
volt.jwt.keys=${VOLT_JWT_KEYS:dev:dGhpcy1pcy1hLXZlcnktc2VjcmV0LWtleS1mb3Itdm9sdC1hcHAtZGV2LTIwMjY=}
volt.jwt.active-kid=${VOLT_JWT_ACTIVE_KID:dev}
```
`application-postgres.properties` — replace `volt.jwt.secret=${VOLT_JWT_SECRET}` with:
```properties
volt.jwt.keys=${VOLT_JWT_KEYS}
volt.jwt.active-kid=${VOLT_JWT_ACTIVE_KID}
```
`src/test/resources/application.properties` — replace the `volt.jwt.secret` line with:
```properties
volt.jwt.keys=dev:dGhpcy1pcy1hLXZlcnktc2VjcmV0LWtleS1mb3Itdm9sdC1hcHAtZGV2LTIwMjY=
volt.jwt.active-kid=dev
```
`docker-compose.yml` — replace the `VOLT_JWT_SECRET` line with:
```yaml
      VOLT_JWT_KEYS: ${VOLT_JWT_KEYS:?Set VOLT_JWT_KEYS to "kid:base64" (at least 32 bytes)}
      VOLT_JWT_ACTIVE_KID: ${VOLT_JWT_ACTIVE_KID:?Set VOLT_JWT_ACTIVE_KID}
```

- [ ] **Step 6: Run tests, then full suite**

Run: `cd backend && ./gradlew test`
Expected: all green (the two new classes plus the existing 35). No `volt.jwt.secret` reference remains: `grep -rn "jwt.secret\|VOLT_JWT_SECRET" backend/src backend/docker-compose.yml` returns nothing (docs are updated in Task 10).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/volt/config/JwtProperties.java backend/src/main/java/com/volt/config/JwtTokenProvider.java backend/src/main/resources/application.properties backend/src/main/resources/application-postgres.properties backend/src/test/resources/application.properties backend/docker-compose.yml backend/src/test/java/com/volt/JwtTokenProviderTest.java backend/src/test/java/com/volt/JwtKeyRotationTest.java
git commit -m "feat(backend): JWT key rotation — kid-tagged access tokens, multi-key verification, fail-fast on the postgres profile

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Hashed refresh tokens, email normalisation, consent columns

**Files:**
- Create: `backend/src/main/java/com/volt/common/Hashes.java`
- Modify: `backend/src/main/resources/db/migration/V1__baseline_schema.sql` (users + refresh_tokens)
- Modify: `backend/src/main/java/com/volt/user/User.java`, `RefreshToken.java`, `RefreshTokenRepository.java`, `AuthService.java`, `CustomUserDetailsService.java`
- Modify: `backend/src/main/java/com/volt/user/dto/UserSelfResponse.java`
- Modify: `backend/src/main/resources/application.properties`, `backend/src/test/resources/application.properties`
- Test: `backend/src/test/java/com/volt/AuthHardeningIntegrationTest.java` (new), `AuthGoogleIntegrationTest.java` (one test)

**Interfaces:**
- Produces: `Hashes.sha256Hex(String): String`; `RefreshToken.getTokenHash()`; `RefreshTokenRepository.findByTokenHash(String)`; `User.get/setEmailVerifiedAt`, `get/setTermsAcceptedAt`, `get/setTermsVersion`; `AuthService.normaliseEmail(String)` (package-private static); `UserSelfResponse.emailVerifiedAt`.

- [ ] **Step 1: Failing tests**

`AuthHardeningIntegrationTest.java`:
```java
package com.volt;

import com.volt.user.RefreshToken;
import com.volt.user.RefreshTokenRepository;
import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthHardeningIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Test
    void refreshTokenIsStoredHashed() throws Exception {
        AuthTokens tokens = register("hashed");
        RefreshToken stored = refreshTokenRepository.findAll().stream()
                .filter(t -> t.getUser().getUsername().equals("hashed")).findFirst().orElseThrow();
        assertThat(stored.getTokenHash()).hasSize(64).isNotEqualTo(tokens.refreshToken());
        assertThat(tokens.refreshToken()).hasSize(43);

        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isOk());
    }

    @Test
    void emailIsNormalisedOnRegisterAndLogin() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "casey", "email", "  Casey@Example.COM ", "password", "Password123"))))
                .andExpect(status().isCreated());
        assertThat(findUser("casey").getEmail()).isEqualTo("casey@example.com");

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "CASEY@example.com", "password", "Password123"))))
                .andExpect(status().isOk());
    }

    @Test
    void registerRecordsConsent() throws Exception {
        register("consent");
        User user = findUser("consent");
        assertThat(user.getTermsAcceptedAt()).isNotNull();
        assertThat(user.getTermsVersion()).isEqualTo("2026-09");
        assertThat(user.getEmailVerifiedAt()).isNull();
    }
}
```
Add to `AuthGoogleIntegrationTest`:
```java
    @Test
    void googleEmailCollisionIsCaseInsensitive() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "mixed", "email", "Mixed@Example.com", "password", "Password123"))))
                .andExpect(status().isCreated());
        when(googleJwtDecoder.decode("tok-g8")).thenReturn(googleJwt("g8", "mixed@example.com", true, "Mixed"));
        assertThat(google("tok-g8").getResponse().getStatus()).isEqualTo(409);
    }
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./gradlew test --tests com.volt.AuthHardeningIntegrationTest`
Expected: compile error — `getTokenHash`, `getTermsAcceptedAt` missing.

- [ ] **Step 3: `Hashes`**

```java
package com.volt.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class Hashes {
    private Hashes() {}

    public static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
```

- [ ] **Step 4: V1 schema**

In `users`, after `google_sub`:
```sql
    email_verified_at    timestamp(6) with time zone,
    terms_accepted_at    timestamp(6) with time zone,
    terms_version        varchar(20),
```
In `refresh_tokens`, replace the `token` line with:
```sql
    token_hash  varchar(64) not null unique,
```

- [ ] **Step 5: Entities and repository**

`User.java`: after `googleSub` add
```java
    @Column
    private Instant emailVerifiedAt;

    @Column
    private Instant termsAcceptedAt;

    @Column(length = 20)
    private String termsVersion;
```
with getters/setters (import `java.time.Instant`).

`RefreshToken.java`: rename field `token` → `tokenHash`, `@Column(name = "token_hash", nullable = false, unique = true, length = 64)`, index `@Index(name = "idx_refresh_tokens_token_hash", columnList = "token_hash")`, accessors `getTokenHash`/`setTokenHash`.

`RefreshTokenRepository.java`: `Optional<RefreshToken> findByTokenHash(String tokenHash);` (replacing `findByToken`).

`UserSelfResponse.java`: add `Instant emailVerifiedAt` after `email`, mapped from `user.getEmailVerifiedAt()`.

- [ ] **Step 6: `AuthService`**

Add fields/constructor params: `Clock clock`, `@Value("${volt.legal.terms-version}") String termsVersion` (constructor parameter annotated). Add:
```java
    private static final SecureRandom RANDOM = new SecureRandom();

    static String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
```
`register`: `String email = normaliseEmail(request.email());` use `email` for the exists check and `setEmail`; after `setDisplayName` add `user.setTermsAcceptedAt(clock.instant()); user.setTermsVersion(termsVersion);`.
`loginWithGoogle`: `String email = normaliseEmail(jwt.getClaimAsString("email"))` guarded for null (keep the null check before normalising); on the create path also set `termsAcceptedAt`/`termsVersion`.
`refresh(rawRefreshToken)` and `logout`: look up with `refreshTokenRepository.findByTokenHash(Hashes.sha256Hex(rawRefreshToken))`.
`createRefreshToken`:
```java
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        RefreshToken stored = new RefreshToken();
        stored.setTokenHash(Hashes.sha256Hex(token));
        stored.setUser(user);
        stored.setExpiresAt(Instant.now().plusMillis(jwtProperties.getRefreshTokenExpirationMs()));
        refreshTokenRepository.save(stored);
        return token;
```
`CustomUserDetailsService.loadUserByUsername`: first line `if (usernameOrEmail.contains("@")) usernameOrEmail = usernameOrEmail.trim().toLowerCase(Locale.ROOT);`.

Properties (both main and test `application.properties`):
```properties
# Legal — version string recorded on the user at consent time (register / Google sign-up)
volt.legal.terms-version=${VOLT_TERMS_VERSION:2026-09}
```

- [ ] **Step 7: Tests then full suite**

Run: `cd backend && ./gradlew test`
Expected: green. (`FlywayPostgresIntegrationTest` validates the renamed column.)

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/volt/common/Hashes.java backend/src/main/resources/db/migration/V1__baseline_schema.sql backend/src/main/java/com/volt/user/User.java backend/src/main/java/com/volt/user/RefreshToken.java backend/src/main/java/com/volt/user/RefreshTokenRepository.java backend/src/main/java/com/volt/user/AuthService.java backend/src/main/java/com/volt/user/CustomUserDetailsService.java backend/src/main/java/com/volt/user/dto/UserSelfResponse.java backend/src/main/resources/application.properties backend/src/test/resources/application.properties backend/src/test/java/com/volt/AuthHardeningIntegrationTest.java backend/src/test/java/com/volt/AuthGoogleIntegrationTest.java
git commit -m "feat(backend): hashed refresh tokens (D5), lowercase emails, consent columns, emailVerifiedAt on /me

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Mail service, email tokens, verification endpoints

**Files:**
- Modify: `backend/build.gradle.kts` (no new dependency; `RestClient` ships with `spring-boot-starter-web`)
- Create: `backend/src/main/java/com/volt/common/mail/MailProperties.java`, `MailService.java`
- Create: `backend/src/main/resources/mail/verify.html`, `mail/reset.html`
- Create: `backend/src/main/java/com/volt/user/EmailToken.java`, `EmailTokenPurpose.java`, `EmailTokenRepository.java`, `EmailTokenService.java`
- Create: `backend/src/main/java/com/volt/user/dto/TokenRequest.java`
- Modify: `V1__baseline_schema.sql` (email_tokens table), `AuthService.java`, `AuthController.java`, `SecurityConfig.java` (authenticated matcher), `application.properties` (main + test)
- Test: `backend/src/test/java/com/volt/EmailVerificationIntegrationTest.java` (new)

**Interfaces:**
- Consumes: `Hashes.sha256Hex`, `User.setEmailVerifiedAt`, `normaliseEmail`.
- Produces: `MailService.send(String to, String subject, String html, String link)`, `MailService.render(String template, String link): String`, `MailProperties.getLinkBase()`; `EmailTokenService.issue(User, EmailTokenPurpose): String` (plaintext token), `EmailTokenService.consume(String token, EmailTokenPurpose): User`; `EmailTokenRepository.deleteByUser(User)`; HTTP `POST /api/auth/verify/request` (auth, 204/409) and `POST /api/auth/verify/confirm {token}` (204/400).

- [ ] **Step 1: Failing tests**

```java
package com.volt;

import com.volt.common.mail.MailService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EmailVerificationIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private MailService mailService;

    /** Token from the last mail sent to {@code email}. */
    protected String lastToken(String email) {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailService, org.mockito.Mockito.atLeastOnce()).send(eq(email), any(), any(), link.capture());
        return link.getValue().substring(link.getValue().indexOf("token=") + 6);
    }

    @Test
    void registerSendsVerificationAndConfirmMarksVerified() throws Exception {
        AuthTokens tokens = register("verifyme");
        String token = lastToken(tokens.email());
        assertThat(token).hasSize(43);

        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token))))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerifiedAt").isString());

        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Link is invalid or has expired"));
    }

    @Test
    void resendIssuesNewTokenAndInvalidatesOld() throws Exception {
        AuthTokens tokens = register("resend");
        String first = lastToken(tokens.email());

        mockMvc.perform(post("/api/auth/verify/request").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isNoContent());
        String second = lastToken(tokens.email());
        assertThat(second).isNotEqualTo(first);

        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", first))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", second))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/verify/request").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already verified"));
    }

    @Test
    void verifyRequestRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/auth/verify/request")).andExpect(status().isUnauthorized());
    }

    @Test
    void garbageTokenIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "nope"))))
                .andExpect(status().isBadRequest());
    }
}
```
(`bearer(...)` exists in `AbstractIntegrationTest`.)

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./gradlew test --tests com.volt.EmailVerificationIntegrationTest`
Expected: compile error — `MailService` missing.

- [ ] **Step 3: Schema**

Append after the `refresh_tokens` table in V1:
```sql
-- ── email_tokens (verification / password reset; hash only) ─────────────────
create table email_tokens (
    id          uuid not null,
    user_id     uuid not null,
    purpose     varchar(10) not null check (purpose in ('VERIFY','RESET')),
    token_hash  varchar(64) not null unique,
    expires_at  timestamp(6) with time zone not null,
    used_at     timestamp(6) with time zone,
    primary key (id)
);
```
In the index block: `create index idx_email_tokens_user_purpose on email_tokens (user_id, purpose);`
In the FK block: `alter table email_tokens add constraint fk_email_tokens_user foreign key (user_id) references users (id);` (cascade actions are added in Task 5 for every FK at once).

- [ ] **Step 4: Mail**

`MailProperties.java`:
```java
package com.volt.common.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "volt.mail")
public class MailProperties {
    private boolean enabled;
    private String resendApiKey = "";
    private String from;
    /** Prefix for links in mail, e.g. "volt://" (deep link) or "https://volt.app/" (web later). */
    private String linkBase;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getResendApiKey() { return resendApiKey; }
    public void setResendApiKey(String resendApiKey) { this.resendApiKey = resendApiKey; }
    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public String getLinkBase() { return linkBase; }
    public void setLinkBase(String linkBase) { this.linkBase = linkBase; }
}
```
`MailService.java`:
```java
package com.volt.common.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/** Best-effort transactional mail through Resend. Failures are logged, never thrown: the user can resend. */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final MailProperties props;
    private final RestClient http;

    public MailService(MailProperties props, RestClient.Builder builder) {
        this.props = props;
        this.http = builder.baseUrl("https://api.resend.com").build();
    }

    public void send(String to, String subject, String html, String link) {
        if (!props.isEnabled()) {
            // DEV ONLY: the link is the secret. Never enable this branch in production (postgres profile sets enabled=true).
            log.warn("DEV ONLY mail disabled — '{}' to {}: {}", subject, to, link);
            return;
        }
        try {
            http.post().uri("/emails")
                    .header("Authorization", "Bearer " + props.getResendApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("from", props.getFrom(), "to", List.of(to), "subject", subject, "html", html))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.error("Mail '{}' to {} failed: {}", subject, to, e.getMessage());
        }
    }

    /** Loads mail/{template}.html and substitutes {{link}}. */
    public String render(String template, String link) {
        try {
            String body = new ClassPathResource("mail/" + template + ".html").getContentAsString(StandardCharsets.UTF_8);
            return body.replace("{{link}}", link);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
```
`mail/verify.html`:
```html
<p>Confirm this address for your Volt account.</p>
<p><a href="{{link}}">Verify my email</a></p>
<p>If the button does not open the app, paste this into your phone's browser: {{link}}</p>
<p>The link works for 24 hours. If you did not create a Volt account, ignore this mail.</p>
```
`mail/reset.html`:
```html
<p>Someone asked to reset the password for this Volt account.</p>
<p><a href="{{link}}">Set a new password</a></p>
<p>If the button does not open the app, paste this into your phone's browser: {{link}}</p>
<p>The link works for 1 hour. If this was not you, ignore this mail; your password is unchanged.</p>
```
Properties (main):
```properties
# Mail — Resend HTTPS API. Disabled by default: links are logged instead (dev only).
volt.mail.enabled=${VOLT_MAIL_ENABLED:false}
volt.mail.resend-api-key=${VOLT_RESEND_API_KEY:}
volt.mail.from=${VOLT_MAIL_FROM:Volt <noreply@volt.app>}
volt.mail.link-base=${VOLT_MAIL_LINK_BASE:volt://}
```
Test properties: same four lines with `enabled=false`, plus `logging.level.com.volt.common.mail=ERROR` so the DEV ONLY warning never appears in test output.

- [ ] **Step 5: Email tokens**

`EmailTokenPurpose.java`: `public enum EmailTokenPurpose { VERIFY, RESET }`

`EmailToken.java`:
```java
package com.volt.user;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "email_tokens", indexes = @Index(name = "idx_email_tokens_user_purpose", columnList = "user_id, purpose"))
public class EmailToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EmailTokenPurpose purpose;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column
    private Instant usedAt;

    // getters/setters for all fields
}
```
`EmailTokenRepository.java`:
```java
public interface EmailTokenRepository extends JpaRepository<EmailToken, UUID> {
    Optional<EmailToken> findByTokenHashAndPurpose(String tokenHash, EmailTokenPurpose purpose);

    @Modifying
    @Query("DELETE FROM EmailToken t WHERE t.user = :user AND t.purpose = :purpose")
    void deleteByUserAndPurpose(User user, EmailTokenPurpose purpose);

    @Modifying
    @Query("DELETE FROM EmailToken t WHERE t.user = :user")
    void deleteByUser(User user);
}
```
`EmailTokenService.java`:
```java
package com.volt.user;

import com.volt.common.Hashes;
import com.volt.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;

@Service
@Transactional
public class EmailTokenService {

    static final String INVALID = "Link is invalid or has expired";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailTokenRepository repository;
    private final Clock clock;

    public EmailTokenService(EmailTokenRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /** Replaces any outstanding token of this purpose; returns the plaintext token (never stored). */
    public String issue(User user, EmailTokenPurpose purpose) {
        repository.deleteByUserAndPurpose(user, purpose);
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        EmailToken row = new EmailToken();
        row.setUser(user);
        row.setPurpose(purpose);
        row.setTokenHash(Hashes.sha256Hex(token));
        row.setExpiresAt(clock.instant().plus(purpose == EmailTokenPurpose.VERIFY ? Duration.ofHours(24) : Duration.ofHours(1)));
        repository.save(row);
        return token;
    }

    /** Single use. One error message for every failure mode. */
    public User consume(String token, EmailTokenPurpose purpose) {
        EmailToken row = repository.findByTokenHashAndPurpose(Hashes.sha256Hex(token), purpose)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, INVALID));
        if (row.getUsedAt() != null || clock.instant().isAfter(row.getExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, INVALID);
        }
        row.setUsedAt(clock.instant());
        repository.save(row);
        return row.getUser();
    }
}
```
(`ApiException` is public with a `(HttpStatus, String)` constructor; check `deleteByUserAndPurpose` runs inside the transaction before the insert — it does, `@Transactional` on the class.)

- [ ] **Step 6: `AuthService`, controller, security**

`AuthService` gains `EmailTokenService emailTokens`, `EmailTokenRepository emailTokenRepository`, `MailService mail`, `MailProperties mailProps` (constructor). Add:
```java
    public void requestVerification(String username) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getEmailVerifiedAt() != null) throw new ConflictException("Email already verified");
        sendVerification(user);
    }

    public void confirmEmail(String token) {
        User user = emailTokens.consume(token, EmailTokenPurpose.VERIFY);
        user.setEmailVerifiedAt(clock.instant());
        userRepository.save(user);
    }

    private void sendVerification(User user) {
        String link = mailProps.getLinkBase() + "verify?token=" + emailTokens.issue(user, EmailTokenPurpose.VERIFY);
        mail.send(user.getEmail(), "Verify your Volt email", mail.render("verify", link), link);
    }
```
`register`: call `sendVerification(user)` after `userRepository.save(user)` (before `issueTokens`).

`TokenRequest.java`: `public record TokenRequest(@NotBlank String token) {}`

`AuthController`:
```java
    @PostMapping("/verify/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(security = @SecurityRequirement(name = "bearerAuth"))
    public void requestVerification(@AuthenticationPrincipal UserDetails principal) {
        authService.requestVerification(principal.getUsername());
    }

    @PostMapping("/verify/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmEmail(@Valid @RequestBody TokenRequest request) {
        authService.confirmEmail(request.token());
    }
```
`SecurityConfig`: insert **before** the `/api/auth/**` permit matcher:
```java
                        .requestMatchers("/api/auth/verify/request").authenticated()
```

- [ ] **Step 7: Tests, then full suite**

Run: `cd backend && ./gradlew test`
Expected: everything green except `OpenApiSpecExportTest` (expected until Task 7). Test output must not contain "DEV ONLY".

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/volt/common/mail backend/src/main/resources/mail backend/src/main/java/com/volt/user/EmailToken.java backend/src/main/java/com/volt/user/EmailTokenPurpose.java backend/src/main/java/com/volt/user/EmailTokenRepository.java backend/src/main/java/com/volt/user/EmailTokenService.java backend/src/main/java/com/volt/user/dto/TokenRequest.java backend/src/main/resources/db/migration/V1__baseline_schema.sql backend/src/main/java/com/volt/user/AuthService.java backend/src/main/java/com/volt/user/AuthController.java backend/src/main/java/com/volt/config/SecurityConfig.java backend/src/main/resources/application.properties backend/src/test/resources/application.properties backend/src/test/java/com/volt/EmailVerificationIntegrationTest.java
git commit -m "feat(backend): email verification — Resend mail service, hashed single-use email tokens, verify/request + verify/confirm

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Password reset

**Files:**
- Create: `backend/src/main/java/com/volt/user/dto/ForgotPasswordRequest.java`, `ResetPasswordRequest.java`
- Modify: `AuthService.java`, `AuthController.java`
- Test: `backend/src/test/java/com/volt/PasswordResetIntegrationTest.java` (new)

**Interfaces:**
- Consumes: `EmailTokenService.issue/consume`, `MailService`, `normaliseEmail`, `RefreshTokenRepository.revokeAllByUser`, `EmailTokenRepository.deleteByUser`.
- Produces: `POST /api/auth/password/forgot {email}` → 204 always; `POST /api/auth/password/reset {token, newPassword}` → 204/400.

- [ ] **Step 1: Failing tests**

```java
package com.volt;

import com.volt.common.mail.MailService;
import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PasswordResetIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private MailService mailService;

    private void forgot(String email) throws Exception {
        mockMvc.perform(post("/api/auth/password/forgot").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email))))
                .andExpect(status().isNoContent());
    }

    private String resetToken(String email) {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailService).send(eq(email), eq("Reset your Volt password"), any(), link.capture());
        return link.getValue().substring(link.getValue().indexOf("token=") + 6);
    }

    @Test
    void unknownEmailIs204AndSendsNothing() throws Exception {
        forgot("nobody@example.com");
        verify(mailService, never()).send(eq("nobody@example.com"), eq("Reset your Volt password"), any(), any());
    }

    @Test
    void googleOnlyAccountGetsNoResetMail() throws Exception {
        User user = new User();
        user.setUsername("gonly"); user.setEmail("gonly@example.com"); user.setGoogleSub("sub-gonly"); user.setDisplayName("gonly");
        userRepository.save(user);
        forgot("gonly@example.com");
        verify(mailService, never()).send(eq("gonly@example.com"), eq("Reset your Volt password"), any(), any());
    }

    @Test
    void resetChangesPasswordRevokesSessionsAndIsSingleUse() throws Exception {
        AuthTokens tokens = register("resetter");
        forgot("  RESETTER@example.com ");
        String token = resetToken(tokens.email());

        mockMvc.perform(post("/api/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token, "newPassword", "NewPassword456"))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "resetter", "password", tokens.password()))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "resetter", "password", "NewPassword456"))))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token, "newPassword", "Another789xyz"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Link is invalid or has expired"));
        assertThat(findUser("resetter").getEmailVerifiedAt()).isNotNull();
    }

    @Test
    void shortPasswordIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "x", "newPassword", "short"))))
                .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && ./gradlew test --tests com.volt.PasswordResetIntegrationTest`
Expected: the forgot/reset endpoints return 404 (or 401) — tests fail on status.

- [ ] **Step 3: DTOs**

```java
public record ForgotPasswordRequest(@NotBlank @Email String email) {}
public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 8, max = 72) String newPassword) {}
```

- [ ] **Step 4: Service and controller**

`AuthService`:
```java
    public void forgotPassword(String rawEmail) {
        String email = normaliseEmail(rawEmail);
        userRepository.findByEmail(email)
                .filter(user -> user.getPasswordHash() != null)
                .ifPresent(user -> {
                    String link = mailProps.getLinkBase() + "reset?token=" + emailTokens.issue(user, EmailTokenPurpose.RESET);
                    mail.send(user.getEmail(), "Reset your Volt password", mail.render("reset", link), link);
                });
    }

    public void resetPassword(String token, String newPassword) {
        User user = emailTokens.consume(token, EmailTokenPurpose.RESET);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        if (user.getEmailVerifiedAt() == null) user.setEmailVerifiedAt(clock.instant()); // the address just proved control
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUser(user);
        emailTokenRepository.deleteByUser(user);
    }
```
`AuthController`:
```java
    @PostMapping("/password/forgot")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
    }

    @PostMapping("/password/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
    }
```

- [ ] **Step 5: Tests, then full suite** (`OpenApiSpecExportTest` still expected red)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/volt/user/dto/ForgotPasswordRequest.java backend/src/main/java/com/volt/user/dto/ResetPasswordRequest.java backend/src/main/java/com/volt/user/AuthService.java backend/src/main/java/com/volt/user/AuthController.java backend/src/test/java/com/volt/PasswordResetIntegrationTest.java
git commit -m "feat(backend): password reset — forgot (204 always, mail only for password accounts) and reset (revokes sessions, single use)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Account deletion, FK cascades, 30-day purge

**Files:**
- Modify: `V1__baseline_schema.sql` (FK actions)
- Modify: entities `RefreshToken`, `EmailToken`, `Routine`, `RoutineExercise`, `Workout`, `WorkoutExercise`, `WorkoutSet`, `PersonalRecord`, `Activity`, `Route`, `Lap`, `Exercise` (`@OnDelete`)
- Create: `backend/src/main/java/com/volt/user/dto/DeleteAccountRequest.java`, `backend/src/main/java/com/volt/user/UserPurgeTask.java`
- Modify: `UserService.java`, `UserController.java`, `UserRepository.java`
- Test: `backend/src/test/java/com/volt/AccountDeletionIntegrationTest.java` (new)

**Interfaces:**
- Produces: `DELETE /api/users/me {password?}` → 204/401; `UserService.deleteSelf(String username, String password)`; `UserRepository.purgeDeletedBefore(Instant): int`; `UserPurgeTask.purgeDeletedUsers()`.

- [ ] **Step 1: Failing tests**

```java
package com.volt;

import com.volt.activity.Activity;
import com.volt.user.User;
import com.volt.user.UserPurgeTask;
import com.volt.workout.Workout;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountDeletionIntegrationTest extends AbstractIntegrationTest {

    @Autowired private UserPurgeTask purgeTask;
    @Autowired private EntityManager em;

    @Test
    void wrongPasswordIsRejected() throws Exception {
        AuthTokens tokens = register("keepme");
        mockMvc.perform(delete("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("password", "wrong"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bad credentials"));
        assertThat(findUser("keepme").getDeletedAt()).isNull();
    }

    @Test
    void deleteAnonymisesRevokesAndFreesTheUsername() throws Exception {
        AuthTokens tokens = register("gone");
        mockMvc.perform(delete("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("password", tokens.password()))))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isUnauthorized());

        User row = userRepository.findAll().stream().filter(u -> u.getDeletedAt() != null).findFirst().orElseThrow();
        assertThat(row.getUsername()).startsWith("deleted-");
        assertThat(row.getEmail()).endsWith("@deleted.volt.invalid");
        assertThat(row.getPasswordHash()).isNull();

        register("gone"); // username reusable
    }

    @Test
    void googleOnlyAccountDeletesWithoutPassword() throws Exception {
        User user = new User();
        user.setUsername("gdel"); user.setEmail("gdel@example.com"); user.setGoogleSub("sub-gdel"); user.setDisplayName("gdel");
        userRepository.save(user);
        String access = new com.volt.config.JwtTokenProvider(jwtProps()).generateAccessToken("gdel");
        mockMvc.perform(delete("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + access))
                .andExpect(status().isNoContent());
    }

    @Test
    void purgeHardDeletesThirtyDayOldAccountsWithTheirData() throws Exception {
        register("purged");
        User user = findUser("purged");
        Workout workout = createWorkoutEntity(user, systemExercise, Instant.now().minus(Duration.ofDays(40)), 5);
        Activity activity = createActivityEntity(user, Instant.now().minus(Duration.ofDays(40)), 5000);
        user.setDeletedAt(Instant.now().minus(Duration.ofDays(31)));
        userRepository.save(user);
        em.flush();

        purgeTask.purgeDeletedUsers();
        em.flush(); em.clear();

        assertThat(userRepository.findById(user.getId())).isEmpty();
        assertThat(workoutRepository.findById(workout.getId())).isEmpty();
        assertThat(activityRepository.findById(activity.getId())).isEmpty();
    }

    private com.volt.config.JwtProperties jwtProps() {
        com.volt.config.JwtProperties p = new com.volt.config.JwtProperties();
        p.setKeys("dev:dGhpcy1pcy1hLXZlcnktc2VjcmV0LWtleS1mb3Itdm9sdC1hcHAtZGV2LTIwMjY=");
        p.setActiveKid("dev");
        p.setAccessTokenExpirationMs(60_000);
        return p;
    }
}
```
Check the signature of `createWorkoutEntity` in `AbstractIntegrationTest` (line 106) and adapt the call's trailing arguments to it.

- [ ] **Step 2: Run to verify they fail** — `DELETE /api/users/me` → 405/404; `UserPurgeTask` missing (compile error).

- [ ] **Step 3: FK actions in V1**

Rewrite the FK block so that:
- `refresh_tokens.user_id`, `email_tokens.user_id`, `routines.user_id`, `workouts.user_id`, `personal_records.user_id`, `activities.user_id` → `references users (id) on delete cascade`
- `routine_exercises.routine_id` → `routines` cascade; `workout_exercises.workout_id` → `workouts` cascade; `workout_sets.workout_exercise_id` → `workout_exercises` cascade; `personal_records.workout_set_id` → `workout_sets` cascade; `routes.activity_id`, `laps.activity_id` → `activities` cascade
- `exercises.created_by_user_id` → `references users (id) on delete set null`
- exercise-side FKs (`*_exercise`, `exercise_secondary_muscles`) unchanged.

- [ ] **Step 4: `@OnDelete` on entities**

On each association listed in Step 3 add `@OnDelete(action = OnDeleteAction.CASCADE)` (import `org.hibernate.annotations.OnDelete`, `OnDeleteAction`) directly above the `@ManyToOne`/`@OneToOne`: `RefreshToken.user`, `EmailToken.user`, `Routine.user`, `Workout.user`, `PersonalRecord.user`, `Activity.user`, `RoutineExercise.routine`, `WorkoutExercise.workout`, `WorkoutSet.workoutExercise`, `PersonalRecord.workoutSet`, `Route.activity`, `Lap.activity`. On `Exercise.createdBy`: `@OnDelete(action = OnDeleteAction.SET_NULL)`. If `SET_NULL` is not available in the bundled Hibernate version, omit that one annotation and say so in the report (the purge test creates no user exercise).

- [ ] **Step 5: Deletion**

`DeleteAccountRequest.java`: `public record DeleteAccountRequest(String password) {}`

`UserRepository`:
```java
    @Modifying
    @Query("DELETE FROM User u WHERE u.deletedAt < :cutoff")
    int purgeDeletedBefore(Instant cutoff);
```
`UserService` (add `PasswordEncoder`, `RefreshTokenRepository`, `EmailTokenRepository`, `Clock` to the constructor; `StorageService` is already there — verify):
```java
    public void deleteSelf(String username, String password) {
        User user = findActiveUser(username);
        if (user.getPasswordHash() != null && (password == null || !passwordEncoder.matches(password, user.getPasswordHash()))) {
            throw new UnauthorizedException("Bad credentials");
        }
        if (user.getProfilePictureUrl() != null) storageService.delete(user.getProfilePictureUrl());
        String tag = "deleted-" + user.getId().toString().replace("-", "").substring(0, 12);
        user.setUsername(tag);
        user.setEmail(tag + "@deleted.volt.invalid");
        user.setGoogleSub(null);
        user.setPasswordHash(null);
        user.setDisplayName("Deleted user");
        user.setBio(null);
        user.setProfilePictureUrl(null);
        user.setDeletedAt(clock.instant());
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUser(user);
        emailTokenRepository.deleteByUser(user);
    }
```
`UserController`:
```java
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(security = @SecurityRequirement(name = "bearerAuth"))
    public void deleteSelf(@AuthenticationPrincipal UserDetails principal,
                           @RequestBody(required = false) DeleteAccountRequest request) {
        userService.deleteSelf(principal.getUsername(), request == null ? null : request.password());
    }
```
`UserPurgeTask.java`:
```java
package com.volt.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;

/** Hard-deletes accounts 30 days after soft deletion; FK cascades remove everything they own. */
@Component
public class UserPurgeTask {

    private static final Logger log = LoggerFactory.getLogger(UserPurgeTask.class);
    static final Duration RETENTION = Duration.ofDays(30);

    private final UserRepository userRepository;
    private final Clock clock;

    public UserPurgeTask(UserRepository userRepository, Clock clock) {
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeDeletedUsers() {
        int purged = userRepository.purgeDeletedBefore(clock.instant().minus(RETENTION));
        if (purged > 0) log.info("Purged {} deleted account(s)", purged);
    }
}
```

- [ ] **Step 6: Tests, then full suite** (`OpenApiSpecExportTest` still red; `FlywayPostgresIntegrationTest` must pass — it validates the FK columns exist, not their actions).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V1__baseline_schema.sql backend/src/main/java/com/volt/user backend/src/main/java/com/volt/workout backend/src/main/java/com/volt/activity backend/src/test/java/com/volt/AccountDeletionIntegrationTest.java
git status --short   # confirm only intended files are staged
git commit -m "feat(backend): account deletion — anonymise + revoke immediately, FK cascades in V1, 30-day hard purge task

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Rate limiting and security-config fixes

**Files:**
- Modify: `backend/build.gradle.kts`
- Create: `backend/src/main/java/com/volt/config/RateLimitFilter.java`, `backend/src/main/java/com/volt/common/exception/TooManyRequestsException.java`, `backend/src/main/java/com/volt/user/IdentityRateLimiter.java`
- Modify: `SecurityConfig.java`, `GlobalExceptionHandler.java`, `AuthService.java`, `application.properties` (main, postgres, test)
- Test: `backend/src/test/java/com/volt/RateLimitIntegrationTest.java` (new)

**Interfaces:**
- Produces: `TooManyRequestsException(long retryAfterSeconds)` (ApiException 429, message `Too many attempts, try again in N seconds`); `IdentityRateLimiter.check(String scope, String key, long capacity, Duration period)`; filter 429 JSON + `Retry-After`. Properties `volt.security.rate-limit-enabled`, `volt.security.trust-proxy`, `volt.cors.allowed-origins`.

- [ ] **Step 1: Failing tests**

```java
package com.volt;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = "volt.security.rate-limit-enabled=true")
class RateLimitIntegrationTest extends AbstractIntegrationTest {

    @Test
    void eleventhLoginFromOneAddressIs429() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.1.0.1"); return r; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("usernameOrEmail", "someone" + i, "password", "x"))))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.1.0.1"); return r; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "someone", "password", "x"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith("Too many attempts, try again in ")));
    }

    @Test
    void eleventhLoginForOneIdentityAcrossAddressesIs429() throws Exception {
        for (int i = 0; i < 10; i++) {
            final int n = i;
            mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.2.0." + n); return r; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("usernameOrEmail", "Target@Example.com", "password", "x"))))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.2.0.99"); return r; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "target@example.com", "password", "x"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    void publicProfileIsLimitedPerAddress() throws Exception {
        register("public1");
        for (int i = 0; i < 60; i++) {
            mockMvc.perform(get("/api/users/public1").with(r -> { r.setRemoteAddr("10.3.0.1"); return r; }))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(get("/api/users/public1").with(r -> { r.setRemoteAddr("10.3.0.1"); return r; }))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void forwardedForIsIgnoredUnlessTrusted() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.4.0.1"); return r; })
                            .header("X-Forwarded-For", "203.0.113." + i)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("usernameOrEmail", "spoof" + i, "password", "x"))))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.4.0.1"); return r; })
                        .header("X-Forwarded-For", "203.0.113.200")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "spoof", "password", "x"))))
                .andExpect(status().isTooManyRequests());
    }
}
```
(`register` in this class hits the register rule once per test from `127.0.0.1` — 5/h — fine.)

- [ ] **Step 2: Run to verify they fail** — 11th request is 401, not 429.

- [ ] **Step 3: Dependencies**

```kotlin
    implementation("com.bucket4j:bucket4j-core:8.10.1")
    implementation("com.github.ben-manes.caffeine:caffeine")
```

- [ ] **Step 4: Exception + handler**

`TooManyRequestsException.java`:
```java
package com.volt.common.exception;

import org.springframework.http.HttpStatus;

public class TooManyRequestsException extends ApiException {
    private final long retryAfterSeconds;

    public TooManyRequestsException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts, try again in " + retryAfterSeconds + " seconds");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
```
`GlobalExceptionHandler` — add **above** the `ApiException` handler (more specific first):
```java
    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooMany(TooManyRequestsException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(new ErrorResponse(429, ex.getMessage()));
    }
```

- [ ] **Step 5: Identity limiter**

```java
package com.volt.user;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.volt.common.exception.TooManyRequestsException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** Per-identity limits (login by username/email, forgot by email) — keys the servlet filter cannot see. */
// ponytail: in-memory buckets; move to a Redis/Postgres bucket store when there is more than one instance.
@Component
public class IdentityRateLimiter {

    private final boolean enabled;
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofHours(1)).maximumSize(100_000).build();

    public IdentityRateLimiter(@Value("${volt.security.rate-limit-enabled}") boolean enabled) {
        this.enabled = enabled;
    }

    public void check(String scope, String key, long capacity, Duration period) {
        if (!enabled) return;
        Bucket bucket = buckets.get(scope + ":" + key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(capacity).refillIntervally(capacity, period).build())
                .build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            throw new TooManyRequestsException(Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L));
        }
    }
}
```
`AuthService.login`: first line `identityLimiter.check("login", request.usernameOrEmail().trim().toLowerCase(Locale.ROOT), 10, Duration.ofMinutes(15));`. `forgotPassword`: after normalising, `identityLimiter.check("forgot", email, 3, Duration.ofHours(1));`. Constructor param `IdentityRateLimiter identityLimiter`.

- [ ] **Step 6: Filter**

```java
package com.volt.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Per-IP / per-user limits from RELEASE_CHECKLIST §1. Runs after JwtAuthenticationFilter so the principal is known.
 * ponytail: in-memory buckets (single instance); swap the Caffeine map for a Redis/Postgres bucket store when scaling out.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    enum KeyBy { IP, USER }
    record Rule(Predicate<HttpServletRequest> matches, KeyBy keyBy, long capacity, Duration period) {}

    private static final Set<String> WRITE = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final boolean enabled;
    private final boolean trustProxy;
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofHours(1)).maximumSize(200_000).build();

    private final List<Rule> rules = List.of(
            new Rule(post("/api/auth/login"), KeyBy.IP, 10, Duration.ofMinutes(15)),
            new Rule(post("/api/auth/register"), KeyBy.IP, 5, Duration.ofHours(1)),
            new Rule(post("/api/auth/google"), KeyBy.IP, 20, Duration.ofMinutes(1)),
            new Rule(post("/api/auth/refresh"), KeyBy.IP, 30, Duration.ofMinutes(1)),
            new Rule(post("/api/auth/password/forgot"), KeyBy.IP, 5, Duration.ofHours(1)),
            new Rule(post("/api/auth/password/reset").or(post("/api/auth/verify/confirm")), KeyBy.IP, 10, Duration.ofHours(1)),
            new Rule(post("/api/auth/verify/request"), KeyBy.USER, 5, Duration.ofHours(1)),
            new Rule(post("/api/users/me/avatar"), KeyBy.USER, 10, Duration.ofHours(1)),
            new Rule(r -> WRITE.contains(r.getMethod()) && (path(r).startsWith("/api/workouts") || path(r).startsWith("/api/activities") || path(r).startsWith("/api/routines")), KeyBy.USER, 120, Duration.ofMinutes(1)),
            new Rule(r -> "GET".equals(r.getMethod()) && path(r).matches("/api/users/[^/]+") && !path(r).equals("/api/users/me") && !isAuthenticated(), KeyBy.IP, 60, Duration.ofMinutes(1)),
            new Rule(r -> isAuthenticated(), KeyBy.USER, 600, Duration.ofMinutes(1)),
            new Rule(r -> true, KeyBy.IP, 120, Duration.ofMinutes(1))
    );

    public RateLimitFilter(@Value("${volt.security.rate-limit-enabled}") boolean enabled,
                           @Value("${volt.security.trust-proxy}") boolean trustProxy) {
        this.enabled = enabled;
        this.trustProxy = trustProxy;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!enabled) { chain.doFilter(request, response); return; }
        for (int i = 0; i < rules.size(); i++) {
            Rule rule = rules.get(i);
            if (!rule.matches().test(request)) continue;
            String subject = rule.keyBy() == KeyBy.USER && isAuthenticated() ? "u:" + currentUsername() : "ip:" + clientIp(request);
            Bucket bucket = buckets.get(i + ":" + subject, k -> Bucket.builder()
                    .addLimit(Bandwidth.builder().capacity(rule.capacity()).refillIntervally(rule.capacity(), rule.period()).build())
                    .build());
            ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
            if (!probe.isConsumed()) {
                long seconds = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
                response.setStatus(429);
                response.setHeader("Retry-After", String.valueOf(seconds));
                response.setContentType("application/json");
                response.getWriter().write("{\"status\":429,\"message\":\"Too many attempts, try again in " + seconds
                        + " seconds\",\"timestamp\":\"" + Instant.now() + "\"}");
                return;
            }
            break; // first matching rule wins
        }
        chain.doFilter(request, response);
    }

    private static Predicate<HttpServletRequest> post(String path) {
        return r -> "POST".equals(r.getMethod()) && path(r).equals(path);
    }

    private static String path(HttpServletRequest r) {
        return r.getRequestURI();
    }

    private static boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
    }

    private static String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private String clientIp(HttpServletRequest request) {
        if (trustProxy) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```
Verify the exact `ErrorResponse` JSON shape (the entry point in `SecurityConfig` writes the same three fields) and match it.

`SecurityConfig`: inject `RateLimitFilter rateLimitFilter` and add `.addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class)` after the existing `addFilterBefore`.

- [ ] **Step 7: Security-config fixes**

`SecurityConfig`:
- constructor gains `@Value("${spring.h2.console.enabled:false}") boolean h2Console` and `@Value("${volt.cors.allowed-origins}") List<String> corsOrigins`.
- permit list: keep everything except `/h2-console/**`; add `if (h2Console) auth.requestMatchers("/h2-console/**").permitAll();` before the other matchers (or build the array conditionally).
- `headers(headers -> headers.frameOptions(f -> f.sameOrigin()).referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))`.
- `corsConfigurationSource`: `config.setAllowedOrigins(corsOrigins)`.

Properties, main:
```properties
# Security
volt.security.rate-limit-enabled=${VOLT_RATE_LIMIT_ENABLED:true}
volt.security.trust-proxy=${VOLT_TRUST_PROXY:false}
volt.cors.allowed-origins=${VOLT_CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:8081,http://localhost:19006}
```
postgres profile: `volt.cors.allowed-origins=${VOLT_CORS_ALLOWED_ORIGINS:}` (no localhost defaults in prod).
test: `volt.security.rate-limit-enabled=false`, `volt.security.trust-proxy=false`, `volt.cors.allowed-origins=http://localhost:3000`.

- [ ] **Step 8: Tests, then full suite** (`OpenApiSpecExportTest` still red).

- [ ] **Step 9: Commit**

```bash
git add backend/build.gradle.kts backend/src/main/java/com/volt/config/RateLimitFilter.java backend/src/main/java/com/volt/common/exception/TooManyRequestsException.java backend/src/main/java/com/volt/user/IdentityRateLimiter.java backend/src/main/java/com/volt/config/SecurityConfig.java backend/src/main/java/com/volt/common/exception/GlobalExceptionHandler.java backend/src/main/java/com/volt/user/AuthService.java backend/src/main/resources/application.properties backend/src/main/resources/application-postgres.properties backend/src/test/resources/application.properties backend/src/test/java/com/volt/RateLimitIntegrationTest.java
git commit -m "feat(backend): rate limiting (D6) per IP/user/identity with 429 + Retry-After; H2 matcher gated, CORS from config, Referrer-Policy

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Contract regeneration, compose/env, stack wipe, backend docs

**Files:**
- Modify: `backend/docs/api/openapi.yaml` (regenerated), `backend/docker-compose.yml`, `backend/CLAUDE.md`, `backend/ROADMAP.md` (D5/D6 rows), `backend/.env` (local only)

- [ ] **Step 1: Regenerate the contract** (compose still holds 8080; boot on 8090)

```bash
cd backend
./gradlew bootRun --args='--server.port=8090' > /tmp/volt-bootrun.log 2>&1 &
BOOT=$!
until curl -sf http://localhost:8090/actuator/health >/dev/null; do sleep 2; done
curl -s http://localhost:8090/v3/api-docs.yaml > docs/api/openapi.yaml
kill $BOOT
```
Review the diff: expected additions only — paths `/api/auth/verify/request`, `/api/auth/verify/confirm`, `/api/auth/password/forgot`, `/api/auth/password/reset`, `DELETE /api/users/me`; schemas `TokenRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`, `DeleteAccountRequest`; `emailVerifiedAt` on `UserSelfResponse`. Restore `- url: http://localhost` if the server line changed. Anything else → stop and investigate.

- [ ] **Step 2: Full suite green** — `./gradlew test` (all classes, `OpenApiSpecExportTest` included).

- [ ] **Step 3: Compose env**

`app.environment` gains (after `VOLT_GOOGLE_CLIENT_IDS`):
```yaml
      VOLT_MAIL_ENABLED: ${VOLT_MAIL_ENABLED:-false}
      VOLT_RESEND_API_KEY: ${VOLT_RESEND_API_KEY:-}
      VOLT_MAIL_FROM: ${VOLT_MAIL_FROM:-Volt <noreply@volt.app>}
      VOLT_MAIL_LINK_BASE: ${VOLT_MAIL_LINK_BASE:-volt://}
      VOLT_TRUST_PROXY: ${VOLT_TRUST_PROXY:-false}
      VOLT_CORS_ALLOWED_ORIGINS: ${VOLT_CORS_ALLOWED_ORIGINS:-}
```

- [ ] **Step 4: Local `.env` (gitignored, never printed)**

Replace `VOLT_JWT_SECRET=<value>` with `VOLT_JWT_KEYS=k1:<the same value>` and add `VOLT_JWT_ACTIVE_KID=k1`. Do this with `sed -i '' 's/^VOLT_JWT_SECRET=/VOLT_JWT_KEYS=k1:/' backend/.env && echo 'VOLT_JWT_ACTIVE_KID=k1' >> backend/.env` — never cat the file.

- [ ] **Step 5: Wipe and rebuild the stack** (authorised: V1 changed; no real users)

```bash
cd backend && ./gradlew bootJar && docker compose down -v && docker compose up -d --build
docker compose logs app | grep -E "Successfully (applied|validated)" | tail -2
curl -sf http://localhost:8080/actuator/health
```
Expected: `Successfully applied 1 migration`, `{"status":"UP"}`.

- [ ] **Step 6: Docs**

`backend/CLAUDE.md`:
- Stack → Auth bullet: `JWT (stateless, Authorization: Bearer <token>; kid-tagged, rotating keys via VOLT_JWT_KEYS/VOLT_JWT_ACTIVE_KID) + hashed rotating refresh tokens; email verification + password reset via Resend; rate limits per RELEASE_CHECKLIST §1`.
- Project Structure: `common/` line mentions `mail/ (Resend), Hashes`; `config/` line adds `RateLimitFilter`; `user/` line adds `EmailToken*, IdentityRateLimiter, UserPurgeTask`.
- Domain Model: add `EmailToken` row ("Hashed single-use verification / reset token; not a BaseEntity").
- Running Locally: replace the `export VOLT_JWT_SECRET=...` line with
  `export VOLT_JWT_KEYS="k1:$(openssl rand -base64 48)" VOLT_JWT_ACTIVE_KID=k1` and add a paragraph: "Mail is off by default (`VOLT_MAIL_ENABLED=false`): verification and reset links are logged by the app (`docker compose logs app | grep 'DEV ONLY'`). Set `VOLT_MAIL_ENABLED=true` + `VOLT_RESEND_API_KEY` to send. Rate limiting is on; set `VOLT_RATE_LIMIT_ENABLED=false` only for load scripts. Behind a proxy set `VOLT_TRUST_PROXY=true`."
- Key rotation paragraph under Running Locally: "Rotate: append `,k2:<new>` to `VOLT_JWT_KEYS`, restart, switch `VOLT_JWT_ACTIVE_KID=k2`, restart, remove `k1` after 15 minutes."
`backend/ROADMAP.md`: strike D5 and D6 rows (`~~…~~`, status "✅ auth hardening, Sep 2026") the way D12 is written.

- [ ] **Step 7: Commit**

```bash
git add backend/docs/api/openapi.yaml backend/docker-compose.yml backend/CLAUDE.md backend/ROADMAP.md
git commit -m "docs(backend): auth-hardening contract, compose env, key-rotation and mail runbook; D5/D6 closed

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Mobile — store, queries, forgot/reset/verify screens, Today line

**Files:**
- Modify: `mobile/volt-mobile/src/auth/store.ts`, `src/api/queries.ts`, `src/api/schema.d.ts` (generated), `app/_layout.tsx` (AuthGate), `app/(auth)/login.tsx`, `app/(tabs)/index.tsx`
- Create: `app/(auth)/forgot.tsx`, `app/reset.tsx`, `app/verify.tsx`

**Interfaces:**
- Consumes: contract from Task 7.
- Produces: `useAuth` actions `forgotPassword(email)`, `resetPassword(token, newPassword)`, `confirmEmail(token)`; `useResendVerification()`, `useDeleteAccount()` mutations.

- [ ] **Step 1: Types** — `cd mobile/volt-mobile && npm run gen:api`; confirm the five new operations and `emailVerifiedAt` appear.

- [ ] **Step 2: Store**

Add to `AuthState`:
```ts
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  confirmEmail: (token: string) => Promise<void>;
```
Add helper next to `postAuth`:
```ts
async function postAuthVoid(path: string, body: unknown): Promise<void> {
  const res = await fetch(BASE_URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorMessage(res));
}
```
Implement after `loginWithGoogle`:
```ts
    forgotPassword: (email) => postAuthVoid('/api/auth/password/forgot', { email }),
    resetPassword: (token, newPassword) => postAuthVoid('/api/auth/password/reset', { token, newPassword }),
    confirmEmail: (token) => postAuthVoid('/api/auth/verify/confirm', { token }),
```

- [ ] **Step 3: Queries**

```ts
export const useResendVerification = () => useMutation({ mutationFn: () => unwrap(api.POST('/api/auth/verify/request')) });
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password?: string) => unwrap(api.DELETE('/api/users/me', { body: password ? { password } : {} })),
    onSuccess: () => qc.clear(),
  });
}
```
(import `useMutation`, `useQueryClient` if not already.)

- [ ] **Step 4: AuthGate** (`app/_layout.tsx`)

In the effect: `const inLink = segments[0] === 'reset' || segments[0] === 'verify';` and extend the redirect guard: `if (!token && !inAuth && !inOnboarding && !inLink && !(onboarding && inWorkout)) …`.

- [ ] **Step 5: Screens**

`app/(auth)/forgot.tsx`:
```tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { AuthClose } from '@/ui/AuthClose';
import { field } from '@/ui/field';
import { Bolt } from '@/ui/Bolt';
import { Body, Button, Heading, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function Forgot() {
  const forgotPassword = useAuth((s) => s.forgotPassword);
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false); const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await forgotPassword(email.trim()); setSent(true); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not send the link'); } finally { setBusy(false); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <AuthClose />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 16 }}><Bolt size={40} /></View>
          <Heading style={{ marginBottom: 24 }}>Reset your password.</Heading>
          {sent ? (
            <Body tone="t2">If an account exists for that email, a reset link is on its way. Open it on this phone.</Body>
          ) : (
            <>
              <TextInput style={field} placeholder="Email" placeholderTextColor={color.t3} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} value={email} onChangeText={setEmail} onSubmitEditing={submit} />
              {err && <Body tone="ember" size={13}>{err}</Body>}
              <View style={{ height: 8 }} />
              <Button label={busy ? 'Sending…' : 'Send reset link'} onPress={submit} disabled={busy || !email.includes('@')} />
            </>
          )}
          <Link href="/(auth)/login" style={{ alignSelf: 'center', marginTop: 16 }}><Body tone="t2">Back to sign in</Body></Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
```
`app/reset.tsx`:
```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { field } from '@/ui/field';
import { Bolt } from '@/ui/Bolt';
import { Body, Button, Heading, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function Reset() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const resetPassword = useAuth((s) => s.resetPassword); const router = useRouter();
  const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!token) return;
    setBusy(true); setErr(null);
    try { await resetPassword(token, pw); router.replace('/(auth)/login'); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not reset the password'); } finally { setBusy(false); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 16 }}><Bolt size={40} /></View>
          <Heading style={{ marginBottom: 24 }}>Set a new password.</Heading>
          {!token && <Body tone="ember" size={13}>This link is missing its token. Request a new one from the sign-in screen.</Body>}
          <TextInput style={field} placeholder="New password (8+ characters)" placeholderTextColor={color.t3} secureTextEntry value={pw} onChangeText={setPw} onSubmitEditing={submit} />
          {err && <Body tone="ember" size={13}>{err}</Body>}
          <View style={{ height: 8 }} />
          <Button label={busy ? 'Saving…' : 'Set new password'} onPress={submit} disabled={busy || !token || pw.length < 8} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
```
`app/verify.tsx`:
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/store';
import { Bolt } from '@/ui/Bolt';
import { Body, Button, Heading, Zone } from '@/ui/primitives';

export default function Verify() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const confirmEmail = useAuth((s) => s.confirmEmail); const hasSession = useAuth((s) => !!s.accessToken);
  const router = useRouter(); const qc = useQueryClient();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working'); const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!token) { setState('error'); setErr('This link is missing its token.'); return; }
    confirmEmail(token).then(() => { setState('done'); qc.invalidateQueries({ queryKey: ['me'] }); })
      .catch((e) => { setState('error'); setErr(e instanceof Error ? e.message : 'Could not verify'); });
  }, [token]);
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
          <View style={{ marginBottom: 16 }}><Bolt size={40} /></View>
          <Heading style={{ marginBottom: 12 }}>{state === 'working' ? 'Verifying…' : state === 'done' ? 'Email verified.' : 'That link did not work.'}</Heading>
          {err && <Body tone="ember" size={13}>{err}</Body>}
          {state !== 'working' && <Button label="Continue" onPress={() => router.replace(hasSession ? '/(tabs)' : '/(auth)/login')} />}
        </View>
      </SafeAreaView>
    </Zone>
  );
}
```
`login.tsx`: after the Google button add `<Link href="/(auth)/forgot" style={{ alignSelf: 'center', marginTop: 12 }}><Body tone="t2">Forgot password?</Body></Link>`.

- [ ] **Step 6: Today line** (`app/(tabs)/index.tsx`)

Import `useResendVerification` from `@/api/queries` and `Pressable` (already imported). After the `<Meta …>{raceLine ?? dateLine}</Meta>` line:
```tsx
          {me && !me.emailVerifiedAt && <VerifyLine />}
```
At the bottom of the file:
```tsx
function VerifyLine() {
  const resend = useResendVerification();
  return (
    <Pressable onPress={() => resend.mutate()} disabled={resend.isPending || resend.isSuccess} style={{ paddingHorizontal: 24, paddingTop: 8 }}>
      <Meta tone="t2">Verify your email · {resend.isSuccess ? 'Sent' : resend.isPending ? 'Sending…' : resend.isError ? 'Try again' : 'Resend'}</Meta>
    </Pressable>
  );
}
```

- [ ] **Step 7: Checks** — `npm run typecheck && npm test`. Expected clean.

- [ ] **Step 8: Commit**

```bash
git add src/auth/store.ts src/api/queries.ts src/api/schema.d.ts app/_layout.tsx "app/(auth)/login.tsx" "app/(auth)/forgot.tsx" app/reset.tsx app/verify.tsx "app/(tabs)/index.tsx"
git commit -m "feat(mobile): forgot/reset/verify flows via deep links, Today verify-your-email line, regenerated API types

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Mobile — Account section, delete-account screen, simulator verification

**Files:**
- Modify: `mobile/volt-mobile/app/settings.tsx`
- Create: `mobile/volt-mobile/app/delete-account.tsx`

- [ ] **Step 1: Settings**

Add a section before "About":
```tsx
        <Section title="Account">
          <Row label="Log out" onPress={() => useAuth.getState().logout()} right={<Mono tone="t3">›</Mono>} />
          <Row label="Delete account…" sub="Removes your account and all your data" onPress={() => router.push('/delete-account')} right={<Mono tone="t3">›</Mono>} />
        </Section>
```
and remove the "Log out" row from "About".

- [ ] **Step 2: Delete screen** (`app/delete-account.tsx`)

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeleteAccount } from '@/api/queries';
import { useAuth } from '@/auth/store';
import { field } from '@/ui/field';
import { Body, Button, Heading, Mono, Zone } from '@/ui/primitives';
import { color } from '@/ui/tokens';

export default function DeleteAccount() {
  const router = useRouter(); const del = useDeleteAccount();
  const [pw, setPw] = useState(''); const [err, setErr] = useState<string | null>(null);
  const confirm = async () => {
    setErr(null);
    try { await del.mutateAsync(pw || undefined); await useAuth.getState().logout(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete the account'); }
  };
  return (
    <Zone style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Mono tone="t2" size={18}>←</Mono></Pressable>
          <Heading style={{ marginTop: 12 }}>Delete your account.</Heading>
          <Body tone="t2" style={{ marginBottom: 12 }}>Your workouts, runs, records and profile are removed. Sign-in stops immediately; data is purged within 30 days. This cannot be undone.</Body>
          <TextInput style={field} placeholder="Password (leave empty for Google-only accounts)" placeholderTextColor={color.t3} secureTextEntry value={pw} onChangeText={setPw} />
          {err && <Body tone="ember" size={13}>{err}</Body>}
          <View style={{ height: 8 }} />
          <Button label={del.isPending ? 'Deleting…' : 'Delete my account'} tone="ghost" onPress={confirm} disabled={del.isPending} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Zone>
  );
}
```
(The label stays grayscale; the ember tone is reserved for the error line — the design system's "ember = strength" rule keeps it off destructive buttons.)

- [ ] **Step 3: Checks** — `npm run typecheck && npm test`.

- [ ] **Step 4: Simulator verification** (dev client already installed; rebuild only if native config changed — it has not: `npx expo start --dev-client`, press `i`). Backend: the compose stack from Task 7 with mail disabled.
1. Register a fresh account on the simulator. Today shows "Verify your email · Resend". Screenshot.
2. `docker compose logs app | grep "DEV ONLY" | tail -1` → copy the verify link; `xcrun simctl openurl booted "volt://verify?token=…"` → "Email verified." → Continue → Today line gone. Screenshot.
3. Log out. Login → "Forgot password?" → enter the email → success copy. Grab the reset link from the logs; `openurl` → set a new password → lands on Login → sign in with the new password works; the old one fails.
4. Settings → Account → Delete account… → enter the password → app returns to the onboarding/register gate. Re-registering the same username succeeds.
Save screenshots under `.superpowers/sdd/2026-09-08-auth-hardening/` as `task-9-verify-line.png`, `task-9-verified.png`, `task-9-delete.png`.

- [ ] **Step 5: Commit**

```bash
git add app/settings.tsx app/delete-account.tsx
git commit -m "feat(mobile): Account section — log out, delete account with confirmation screen

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Mobile docs, checklist statuses, final checks

**Files:**
- Modify: `mobile/CLAUDE.md`, `RELEASE_CHECKLIST.md` (statuses only, alongside the owner's uncommitted edits — stage only the checklist hunks that flip a status; do not stage `AGENTS.md`)

- [ ] **Step 1: `mobile/CLAUDE.md`**
- Stack → Auth bullet: append "Forgot/reset/verify flows via `volt://reset?token=` and `volt://verify?token=` deep links (`app/reset.tsx`, `app/verify.tsx`, `app/(auth)/forgot.tsx`); Today shows a verify line until `me.emailVerifiedAt` is set; Settings → Account has Log out and Delete account."
- Layout: add the three new routes and `delete-account.tsx`.
- A "Deep links on the simulator" line under GPS recording or Commands: `xcrun simctl openurl booted "volt://verify?token=…"`; links come from `docker compose logs app | grep "DEV ONLY"` while mail is disabled.
- Backend follow-ups: keep Apple + linking as item 6; add "7. Data export (GDPR) — manual via support until built."

- [ ] **Step 2: `RELEASE_CHECKLIST.md`** — flip to ✅ with a one-word note: every §1 row; §2 Email verification, Password reset, Refresh-token rotation + reuse detection (verified), JWT secret from env (keys, fail-fast), `/h2-console`, CORS, Security headers (Referrer-Policy added; HSTS pending TLS → 🔸); §3 Account deletion in-app (30-day purge task); §4 Consent capture. Leave everything else as the owner wrote it.

- [ ] **Step 3: Final checks**

```bash
cd backend && ./gradlew build
cd ../mobile/volt-mobile && npm run typecheck && npm test
git status --short   # AGENTS.md and web/ must remain unstaged
```

- [ ] **Step 4: Commit**

```bash
git add mobile/CLAUDE.md RELEASE_CHECKLIST.md
git commit -m "docs: auth-hardening mobile runbook; release checklist statuses for rate limiting, verification, reset, deletion, consent

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
No push in this task; the controller pushes after the whole-branch review.
