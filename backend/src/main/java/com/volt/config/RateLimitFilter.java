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
