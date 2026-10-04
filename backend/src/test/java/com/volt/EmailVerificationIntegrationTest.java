package com.volt;

import com.volt.common.mail.MailService;
import com.volt.user.EmailToken;
import com.volt.user.EmailTokenPurpose;
import com.volt.user.EmailTokenRepository;
import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EmailVerificationIntegrationTest extends AbstractIntegrationTest {

    @MockitoBean
    private MailService mailService;

    @Autowired
    private EmailTokenRepository emailTokenRepository;

    /** Token from the last mail sent to {@code email}. */
    protected String lastToken(String email) {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailService, org.mockito.Mockito.atLeastOnce()).send(eq(email), any(), any(), link.capture());
        return link.getValue().substring(link.getValue().indexOf("token=") + 6);
    }

    @Test
    void registerSendsVerificationAndConfirmMarksVerified() throws Exception {
        AuthTokens tokens = register("verifyme");
        String token = lastToken(tokens.email());
        assertThat(token).hasSize(43);

        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token))))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerifiedAt").isString());

        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Link is invalid or has expired"));
    }

    @Test
    void resendIssuesNewTokenAndInvalidatesOld() throws Exception {
        AuthTokens tokens = register("resend");
        String first = lastToken(tokens.email());

        mockMvc.perform(post("/api/auth/verify/request").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isNoContent());
        String second = lastToken(tokens.email());
        assertThat(second).isNotEqualTo(first);

        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", first))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", second))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/verify/request").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already verified"));
    }

    @Test
    void verifyRequestRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/auth/verify/request")).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        AuthTokens tokens = register("staleverify");
        String token = lastToken(tokens.email());
        User user = findUser("staleverify");
        EmailToken row = emailTokenRepository.findAll().stream()
                .filter(t -> t.getPurpose() == EmailTokenPurpose.VERIFY && t.getUser().getId().equals(user.getId()))
                .findFirst().orElseThrow();
        row.setExpiresAt(Instant.now().minusSeconds(1));
        emailTokenRepository.save(row);

        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Link is invalid or has expired"));
    }

    @Test
    void garbageTokenIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/verify/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "nope"))))
                .andExpect(status().isBadRequest());
    }
}
