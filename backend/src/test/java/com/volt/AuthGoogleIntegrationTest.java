package com.volt;

import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthGoogleIntegrationTest extends AbstractIntegrationTest {

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
}
