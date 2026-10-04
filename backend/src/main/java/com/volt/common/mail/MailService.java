package com.volt.common.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/** Best-effort transactional mail through Resend. Failures are logged, never thrown: the user can resend. */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final MailProperties props;
    private final RestClient http;

    public MailService(MailProperties props, RestClient.Builder builder) {
        this.props = props;
        this.http = builder.baseUrl("https://api.resend.com").build();
    }

    /** Sends mail asynchronously off the request thread. Failures are logged. */
    @Async
    public void send(String to, String subject, String html, String link) {
        if (!props.isEnabled()) {
            // DEV ONLY: the link is the secret. The postgres profile defaults volt.mail.enabled=true,
            // so this branch is only reached locally (or when VOLT_MAIL_ENABLED=false is exported deliberately).
            log.warn("DEV ONLY mail disabled — '{}' to {}: {}", subject, to, link);
            return;
        }
        try {
            http.post().uri("/emails")
                    .header("Authorization", "Bearer " + props.getResendApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("from", props.getFrom(), "to", List.of(to), "subject", subject, "html", html))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.error("Mail '{}' to {} failed: {}", subject, to, e.getMessage());
        }
    }

    /** Loads mail/{template}.html and substitutes {{link}}. */
    public String render(String template, String link) {
        try {
            String body = new ClassPathResource("mail/" + template + ".html").getContentAsString(StandardCharsets.UTF_8);
            return body.replace("{{link}}", link);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
