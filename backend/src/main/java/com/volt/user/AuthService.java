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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final JwtProperties jwtProperties;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       JwtProperties jwtProperties,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.jwtProperties = jwtProperties;
        this.authenticationManager = authenticationManager;
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
