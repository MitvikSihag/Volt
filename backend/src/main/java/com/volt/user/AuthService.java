package com.volt.user;

import com.volt.common.Hashes;
import com.volt.common.exception.ConflictException;
import com.volt.common.exception.ResourceNotFoundException;
import com.volt.common.exception.UnauthorizedException;
import com.volt.common.mail.MailProperties;
import com.volt.common.mail.MailService;
import com.volt.config.JwtProperties;
import com.volt.config.JwtTokenProvider;
import com.volt.user.dto.AuthResponse;
import com.volt.user.dto.LoginRequest;
import com.volt.user.dto.RegisterRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final JwtProperties jwtProperties;
    private final AuthenticationManager authenticationManager;
    private final JwtDecoder googleJwtDecoder;
    private final Clock clock;
    private final String termsVersion;
    private final EmailTokenService emailTokens;
    private final EmailTokenRepository emailTokenRepository;
    private final MailService mail;
    private final MailProperties mailProps;
    private final IdentityRateLimiter identityLimiter;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       JwtProperties jwtProperties,
                       AuthenticationManager authenticationManager,
                       JwtDecoder googleJwtDecoder,
                       Clock clock,
                       @Value("${volt.legal.terms-version}") String termsVersion,
                       EmailTokenService emailTokens,
                       EmailTokenRepository emailTokenRepository,
                       MailService mail,
                       MailProperties mailProps,
                       IdentityRateLimiter identityLimiter) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.jwtProperties = jwtProperties;
        this.authenticationManager = authenticationManager;
        this.googleJwtDecoder = googleJwtDecoder;
        this.clock = clock;
        this.termsVersion = termsVersion;
        this.emailTokens = emailTokens;
        this.emailTokenRepository = emailTokenRepository;
        this.mail = mail;
        this.mailProps = mailProps;
        this.identityLimiter = identityLimiter;
    }

    static String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public AuthResponse register(RegisterRequest request) {
        String email = normaliseEmail(request.email());
        // Exclude soft-deleted users from uniqueness checks so a deleted username can be reused
        if (userRepository.existsByUsernameAndNotDeleted(request.username())) {
            throw new ConflictException("Username already taken");
        }
        if (userRepository.existsByEmailAndNotDeleted(email)) {
            throw new ConflictException("Email already registered");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.username());
        user.setTermsAcceptedAt(clock.instant());
        user.setTermsVersion(termsVersion);
        userRepository.save(user);
        sendVerification(user);

        return issueTokens(user);
    }

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

    public void forgotPassword(String rawEmail) {
        String email = normaliseEmail(rawEmail);
        identityLimiter.check("forgot", email, 3, Duration.ofHours(1));
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

    private void sendVerification(User user) {
        String link = mailProps.getLinkBase() + "verify?token=" + emailTokens.issue(user, EmailTokenPurpose.VERIFY);
        mail.send(user.getEmail(), "Verify your Volt email", mail.render("verify", link), link);
    }

    public AuthResponse login(LoginRequest request) {
        identityLimiter.check("login", normaliseEmail(request.usernameOrEmail()), 10, Duration.ofMinutes(15));
        // One query via AuthenticationManager (unavoidable), then one direct index hit by username
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.usernameOrEmail(), request.password())
        );
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return issueTokens(user);
    }

    @Transactional(noRollbackFor = UnauthorizedException.class)
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken stored = refreshTokenRepository.findByTokenHash(Hashes.sha256Hex(rawRefreshToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (!stored.isValid()) {
            // Possible token reuse after rotation — revoke all tokens for this user
            refreshTokenRepository.revokeAllByUser(stored.getUser());
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        // Rotate: revoke old token, issue new one
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokens(stored.getUser());
    }

    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByTokenHash(Hashes.sha256Hex(rawRefreshToken)).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    public AuthResponse loginWithGoogle(String idToken) {
        Jwt jwt;
        try {
            jwt = googleJwtDecoder.decode(idToken);
        } catch (JwtException e) {
            throw new UnauthorizedException("Invalid Google token");
        }
        String rawEmail = jwt.getClaimAsString("email");
        if (!Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified")) || rawEmail == null) {
            throw new UnauthorizedException("Google account email is not verified");
        }
        String email = normaliseEmail(rawEmail);

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
                    if (name != null) name = name.strip();
                    user.setDisplayName(name != null && !name.isBlank()
                            ? name.substring(0, Math.min(name.length(), 50))
                            : user.getUsername());
                    user.setEmailVerifiedAt(clock.instant()); // Google asserted email_verified above
                    user.setTermsAcceptedAt(clock.instant());
                    user.setTermsVersion(termsVersion);
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

    private AuthResponse issueTokens(User user) {
        String accessToken = tokenProvider.generateAccessToken(user);
        String refreshToken = createRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken, jwtProperties.getAccessTokenExpirationMs());
    }

    private String createRefreshToken(User user) {
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        RefreshToken stored = new RefreshToken();
        stored.setTokenHash(Hashes.sha256Hex(token));
        stored.setUser(user);
        stored.setExpiresAt(Instant.now().plusMillis(jwtProperties.getRefreshTokenExpirationMs()));
        refreshTokenRepository.save(stored);
        return token;
    }
}
