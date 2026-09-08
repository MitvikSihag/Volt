package com.volt;

import com.volt.config.JwtProperties;
import com.volt.config.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {
        "volt.jwt.keys=dev:dGhpcy1pcy1hLXZlcnktc2VjcmV0LWtleS1mb3Itdm9sdC1hcHAtZGV2LTIwMjY=,old:" + JwtTokenProviderTest.KEY_A,
        "volt.jwt.active-kid=dev"
})
class JwtKeyRotationTest extends AbstractIntegrationTest {

    @Test
    void requestSignedWithRetiredButListedKeyStillAuthenticates() throws Exception {
        register("rotator");
        JwtProperties oldProps = new JwtProperties();
        oldProps.setKeys("old:" + JwtTokenProviderTest.KEY_A);
        oldProps.setActiveKid("old");
        oldProps.setAccessTokenExpirationMs(60_000);
        String oldToken = new JwtTokenProvider(oldProps).generateAccessToken(findUser("rotator"));

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + oldToken))
                .andExpect(status().isOk());
    }

    @Test
    void requestSignedWithUnlistedKeyIsRejected() throws Exception {
        register("rotator2");
        JwtProperties ghost = new JwtProperties();
        ghost.setKeys("ghost:" + JwtTokenProviderTest.KEY_B);
        ghost.setActiveKid("ghost");
        ghost.setAccessTokenExpirationMs(60_000);
        String token = new JwtTokenProvider(ghost).generateAccessToken(findUser("rotator2"));

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
