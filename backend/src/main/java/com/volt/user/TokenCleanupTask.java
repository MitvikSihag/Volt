package com.volt.user;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class TokenCleanupTask {

    private final RefreshTokenRepository refreshTokenRepository;

    public TokenCleanupTask(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeExpiredAndRevokedTokens() {
        refreshTokenRepository.deleteExpiredAndRevoked(Instant.now());
    }
}
