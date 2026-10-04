package com.volt.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.util.List;

@Configuration
public class GoogleAuthConfig {

    /** Verifies Google ID tokens. Keys are fetched lazily on first decode, so boot needs no network. */
    @Bean
    public JwtDecoder googleJwtDecoder(GoogleProperties google) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(google.getJwkSetUri()).build();
        // Google documents `iss` as either form; accept both instead of an exact match.
        OAuth2TokenValidator<Jwt> issuer = new JwtClaimValidator<Object>(
                "iss", iss -> iss != null && google.getIssuers().contains(iss.toString()));
        OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>(
                "aud", aud -> aud != null && aud.stream().anyMatch(google.getClientIds()::contains));
        decoder.setJwtValidator(JwtValidators.createDefaultWithValidators(issuer, audience));
        return decoder;
    }
}
