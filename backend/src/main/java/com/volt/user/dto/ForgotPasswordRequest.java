package com.volt.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.Locale;

public record ForgotPasswordRequest(@NotBlank @Email String email) {
    // Normalise before @Email validates — see RegisterRequest for why (padded/mixed-case input
    // is a well-formed address that would otherwise fail the strict @Email pattern here).
    public ForgotPasswordRequest {
        if (email != null) {
            email = email.trim().toLowerCase(Locale.ROOT);
        }
    }
}
