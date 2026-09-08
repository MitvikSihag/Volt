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
