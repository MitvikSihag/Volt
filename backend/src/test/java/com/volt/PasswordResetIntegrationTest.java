package com.volt;

import com.volt.common.mail.MailService;
import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PasswordResetIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private MailService mailService;

    private void forgot(String email) throws Exception {
        mockMvc.perform(post("/api/auth/password/forgot").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email))))
                .andExpect(status().isNoContent());
    }

    private String resetToken(String email) {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailService).send(eq(email), eq("Reset your Volt password"), any(), link.capture());
        return link.getValue().substring(link.getValue().indexOf("token=") + 6);
    }

    @Test
    void unknownEmailIs204AndSendsNothing() throws Exception {
        forgot("nobody@example.com");
        verify(mailService, never()).send(eq("nobody@example.com"), eq("Reset your Volt password"), any(), any());
    }

    @Test
    void googleOnlyAccountGetsNoResetMail() throws Exception {
        User user = new User();
        user.setUsername("gonly"); user.setEmail("gonly@example.com"); user.setGoogleSub("sub-gonly"); user.setDisplayName("gonly");
        userRepository.save(user);
        forgot("gonly@example.com");
        verify(mailService, never()).send(eq("gonly@example.com"), eq("Reset your Volt password"), any(), any());
    }

    @Test
    void resetChangesPasswordRevokesSessionsAndIsSingleUse() throws Exception {
        AuthTokens tokens = register("resetter");
        forgot("  RESETTER@example.com ");
        String token = resetToken(tokens.email());

        mockMvc.perform(post("/api/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token, "newPassword", "NewPassword456"))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "resetter", "password", tokens.password()))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("usernameOrEmail", "resetter", "password", "NewPassword456"))))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token, "newPassword", "Another789xyz"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Link is invalid or has expired"));
        assertThat(findUser("resetter").getEmailVerifiedAt()).isNotNull();
    }

    @Test
    void shortPasswordIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/password/reset").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "x", "newPassword", "short"))))
                .andExpect(status().isBadRequest());
    }
}
