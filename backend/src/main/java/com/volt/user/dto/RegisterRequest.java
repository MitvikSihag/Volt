package com.volt.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public record RegisterRequest(

        @NotBlank
        @Size(min = 3, max = 30)
        String username,

        @NotBlank
        @Email
        String email,

        @NotBlank
        @Size(min = 8, max = 72)
        String password
) {
    // Normalise before @Email validates: a leading/trailing space or mixed-case domain is a
    // well-formed address that would otherwise fail the strict @Email pattern here (see
    // AuthService.normaliseEmail, which this pre-empts so validation and persistence agree).
    public RegisterRequest {
        if (email != null) {
            email = email.trim().toLowerCase(Locale.ROOT);
        }
    }
}
