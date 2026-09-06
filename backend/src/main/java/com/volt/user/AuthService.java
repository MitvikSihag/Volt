package com.volt.user;

import com.volt.common.exception.ConflictException;
import com.volt.common.exception.ResourceNotFoundException;
import com.volt.common.exception.UnauthorizedException;
import com.volt.config.JwtProperties;
import com.volt.config.JwtTokenProvider;
import com.volt.user.dto.AuthResponse;
import com.volt.user.dto.LoginRequest;
import com.volt.user.dto.RegisterRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final JwtProperties jwtProperties;
    private final AuthenticationManager authenticationManager;
    private final JwtDecoder googleJwtDecoder;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       JwtProperties jwtProperties,
                       AuthenticationManager authenticationManager,
                       JwtDecoder googleJwtDecoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.jwtProperties = jwtProperties;
        this.authenticationManager = authenticationManager;
        this.googleJwtDecoder = googleJwtDecoder;
    }

    public AuthResponse register(RegisterRequest request) {
        // Exclude soft-deleted users from uniqueness checks so a deleted username can be reused
        if (userRepository.existsByUsernameAndNotDeleted(request.username())) {
            throw new ConflictException("Username already taken");
        }
        if (userRepository.existsByEmailAndNotDeleted(request.email())) {
            throw new ConflictException("Email already registered");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.username());
        userRepository.save(user);

        return issueTokens(user);
    }

    public AuthResponse login(LoginRequest request) {
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
        RefreshToken stored = refreshTokenRepository.findByToken(rawRefreshToken)
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
        refreshTokenRepository.findByToken(rawRefreshToken).ifPresent(token -> {
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
                    if (name != null) name = name.strip();
                    user.setDisplayName(name != null && !name.isBlank()
                            ? name.substring(0, Math.min(name.length(), 50))
                            : user.getUsername());
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
        String accessToken = tokenProvider.generateAccessToken(user.getUsername());
        String refreshToken = createRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken, jwtProperties.getAccessTokenExpirationMs());
    }

    private String createRefreshToken(User user) {
        RefreshToken token = new RefreshToken();
        token.setToken(UUID.randomUUID().toString());
        token.setUser(user);
        token.setExpiresAt(Instant.now().plusMillis(jwtProperties.getRefreshTokenExpirationMs()));
        refreshTokenRepository.save(token);
        return token.getToken();
    }
}
