package com.volt.user.dto;

import com.volt.user.Gender;
import com.volt.user.User;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UserSelfResponse(
        UUID id,
        String username,
        String email,
        String displayName,
        String bio,
        String profilePictureUrl,
        LocalDate dateOfBirth,
        Gender gender,
        Integer heightCm,
        Double weightKg,
        Instant joinedAt
) {
    public static UserSelfResponse from(User user) {
        return new UserSelfResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getBio(),
                user.getProfilePictureUrl(),
                user.getDateOfBirth(),
                user.getGender(),
                user.getHeightCm(),
                user.getWeightKg(),
                user.getCreatedAt()
        );
    }
}
