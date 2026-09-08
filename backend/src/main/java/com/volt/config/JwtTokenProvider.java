package com.volt.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.ProtectedHeader;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.io.Decoders;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

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
