package com.volt.user.dto;

import com.volt.user.User;

import java.time.Instant;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String username,
        String displayName,
        String bio,
        String profilePictureUrl,
        Instant joinedAt
) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getBio(),
                user.getProfilePictureUrl(),
                user.getCreatedAt()
        );
    }
}
