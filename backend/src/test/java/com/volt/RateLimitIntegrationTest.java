package com.volt;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = "volt.security.rate-limit-enabled=true")
class RateLimitIntegrationTest extends AbstractIntegrationTest {

    @Test
    void eleventhLoginFromOneAddressIs429() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.1.0.1"); return r; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("usernameOrEmail", "someone" + i, "password", "x"))))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.1.0.1"); return r; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "someone", "password", "x"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith("Too many attempts, try again in ")));
    }

    @Test
    void eleventhLoginForOneIdentityAcrossAddressesIs429() throws Exception {
        for (int i = 0; i < 10; i++) {
            final int n = i;
            mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.2.0." + n); return r; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("usernameOrEmail", "Target@Example.com", "password", "x"))))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.2.0.99"); return r; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "target@example.com", "password", "x"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    void publicProfileIsLimitedPerAddress() throws Exception {
        register("public1");
        for (int i = 0; i < 60; i++) {
            mockMvc.perform(get("/api/users/public1").with(r -> { r.setRemoteAddr("10.3.0.1"); return r; }))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(get("/api/users/public1").with(r -> { r.setRemoteAddr("10.3.0.1"); return r; }))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void fourthForgotForOneEmailIs429() throws Exception {
        for (int i = 0; i < 3; i++) {
            final int n = i;
            mockMvc.perform(post("/api/auth/password/forgot").with(r -> { r.setRemoteAddr("10.5.0." + n); return r; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("email", "same@example.com"))))
                    .andExpect(status().isNoContent());
        }
        mockMvc.perform(post("/api/auth/password/forgot").with(r -> { r.setRemoteAddr("10.5.0.99"); return r; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "same@example.com"))))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void sixthVerifyRequestForOneUserIs429() throws Exception {
        AuthTokens tokens = register("resender");
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/verify/request").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                    .andExpect(status().isNoContent());
        }
        mockMvc.perform(post("/api/auth/verify/request").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void forwardedForIsIgnoredUnlessTrusted() throws Exception {
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.4.0.1"); return r; })
                            .header("X-Forwarded-For", "203.0.113." + i)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("usernameOrEmail", "spoof" + i, "password", "x"))))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.4.0.1"); return r; })
                        .header("X-Forwarded-For", "203.0.113.200")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "spoof", "password", "x"))))
                .andExpect(status().isTooManyRequests());
    }
}
