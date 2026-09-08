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
