package com.volt.activity.dto;

import com.volt.activity.Activity;
import com.volt.activity.ActivityType;

import java.time.Instant;
import java.util.UUID;

public record ActivityListItemResponse(
        UUID id,
        String title,
        ActivityType type,
        Instant startedAt,
        Instant completedAt,
        Integer durationSeconds,
        Double distanceMeters,
        Integer calories,
        Instant createdAt
) {
    public static ActivityListItemResponse from(Activity activity) {
        return new ActivityListItemResponse(
                activity.getId(),
                activity.getTitle(),
                activity.getType(),
                activity.getStartedAt(),
                activity.getCompletedAt(),
                activity.getDurationSeconds(),
                activity.getDistanceMeters(),
                activity.getCalories(),
                activity.getCreatedAt()
        );
    }
}
