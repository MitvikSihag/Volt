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
