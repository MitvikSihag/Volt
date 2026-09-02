package com.volt;

import com.volt.user.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Test
    void registerLoginRefreshAndLogoutWork() throws Exception {
        AuthTokens tokens = register("authuser");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of(
                                "usernameOrEmail", tokens.email(),
                                "password", tokens.password()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.refreshToken").isString())
                .andExpect(jsonPath("$.tokenType").value("Bearer"));

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refreshToken", not(tokens.refreshToken())));

        mockMvc.perform(post("/api/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isNoContent());
    }

    @Test
    void loginRejectsInvalidCredentials() throws Exception {
        register("badlogin");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of(
                                "usernameOrEmail", "badlogin",
                                "password", "wrong-password"
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bad credentials"));
    }

    @Test
    void refreshRejectsUnknownToken() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of("refreshToken", "missing-token"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid refresh token"));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void reusingRotatedRefreshTokenRevokesItsTokenFamily() throws Exception {
        AuthTokens tokens = register("refreshreuse");

        var rotationResult = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isOk())
                .andReturn();
        String rotatedRefreshToken = readBody(rotationResult).get("refreshToken").asText();

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of("refreshToken", rotatedRefreshToken))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registerValidatesPayload() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of(
                                "username", "",
                                "email", "not-an-email",
                                "password", "short"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors").isArray());
    }
}
