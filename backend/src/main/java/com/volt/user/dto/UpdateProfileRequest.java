package com.volt.user.dto;

import com.volt.user.Gender;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateProfileRequest(

        @Size(max = 50)
        String displayName,

        @Size(max = 300)
        String bio,

        LocalDate dateOfBirth,

        Gender gender,

        Integer heightCm,

        Double weightKg
) {}
