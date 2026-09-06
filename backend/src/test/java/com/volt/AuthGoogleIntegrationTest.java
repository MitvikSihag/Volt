package com.volt;

import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthGoogleIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private JwtDecoder googleJwtDecoder;

    private static Jwt googleJwt(String sub, String email, boolean verified, String name) {
        return Jwt.withTokenValue("tok-" + sub)
                .header("alg", "RS256")
                .subject(sub)
                .claim("email", email)
                .claim("email_verified", verified)
                .claim("name", name)
                .build();
    }

    private MvcResult google(String token) throws Exception {
        return mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", token))))
                .andReturn();
    }

    @Test
    void passwordLoginOnGoogleOnlyAccountIsBadCredentials() throws Exception {
        User user = new User();
        user.setUsername("googleonly");
        user.setEmail("googleonly@example.com");
        user.setGoogleSub("sub-googleonly");
        user.setDisplayName("googleonly");
        userRepository.save(user);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "googleonly", "password", "anything"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bad credentials"));
    }

    @Test
    void newGoogleUserGetsAccountAndTokens() throws Exception {
        when(googleJwtDecoder.decode("tok-g1")).thenReturn(googleJwt("g1", "g.one@example.com", true, "G One"));

        MvcResult result = google("tok-g1");
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(readBody(result).get("accessToken").asText()).isNotBlank();

        User created = userRepository.findByGoogleSub("g1").orElseThrow();
        assertThat(created.getUsername()).isEqualTo("gone");
        assertThat(created.getEmail()).isEqualTo("g.one@example.com");
        assertThat(created.getDisplayName()).isEqualTo("G One");
        assertThat(created.getPasswordHash()).isNull();
    }

    @Test
    void returningGoogleUserReusesAccount() throws Exception {
        when(googleJwtDecoder.decode("tok-g2")).thenReturn(googleJwt("g2", "g2@example.com", true, "G Two"));

        assertThat(google("tok-g2").getResponse().getStatus()).isEqualTo(200);
        assertThat(google("tok-g2").getResponse().getStatus()).isEqualTo(200);

        assertThat(userRepository.findAll().stream().filter(u -> "g2@example.com".equals(u.getEmail())).count()).isEqualTo(1);
    }

    @Test
    void generatedUsernameAvoidsCollision() throws Exception {
        register("gthree");
        when(googleJwtDecoder.decode("tok-g3")).thenReturn(googleJwt("g3", "gthree@other.example", true, "G Three"));

        assertThat(google("tok-g3").getResponse().getStatus()).isEqualTo(200);
        String username = userRepository.findByGoogleSub("g3").orElseThrow().getUsername();
        assertThat(username).startsWith("gthree").isNotEqualTo("gthree").hasSize(10);
    }

    @Test
    void emailCollisionWithPasswordAccountIsRejected() throws Exception {
        register("collide"); // email collide@example.com
        when(googleJwtDecoder.decode("tok-g4")).thenReturn(googleJwt("g4", "collide@example.com", true, "Collide"));

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", "tok-g4"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already registered, sign in with your password"));
        assertThat(userRepository.findByGoogleSub("g4")).isEmpty();
    }

    @Test
    void unverifiedEmailIsRejected() throws Exception {
        when(googleJwtDecoder.decode("tok-g5")).thenReturn(googleJwt("g5", "g5@example.com", false, "G Five"));

        assertThat(google("tok-g5").getResponse().getStatus()).isEqualTo(401);
        assertThat(userRepository.findByGoogleSub("g5")).isEmpty();
    }

    @Test
    void invalidTokenIsRejected() throws Exception {
        when(googleJwtDecoder.decode(anyString())).thenThrow(new BadJwtException("bad"));

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", "garbage"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid Google token"));
    }

    @Test
    void blankTokenIsBadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("idToken", ""))))
                .andExpect(status().isBadRequest());
    }
}
