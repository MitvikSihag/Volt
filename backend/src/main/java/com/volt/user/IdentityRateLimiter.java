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
