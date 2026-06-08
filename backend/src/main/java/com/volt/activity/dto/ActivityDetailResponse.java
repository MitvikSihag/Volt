package com.volt.activity.dto;

import com.volt.activity.Activity;
import com.volt.activity.ActivityType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ActivityDetailResponse(
        UUID id,
        String title,
        ActivityType type,
        Instant startedAt,
        Instant completedAt,
        Integer durationSeconds,
        Double distanceMeters,
        Double elevationGainMeters,
        Integer averageHeartRate,
        Integer maxHeartRate,
        Integer calories,
        String notes,
        ActivityRouteResponse route,
        List<ActivityLapResponse> laps,
        Instant createdAt,
        Instant updatedAt
) {
    public static ActivityDetailResponse from(Activity activity) {
        return new ActivityDetailResponse(
                activity.getId(),
                activity.getTitle(),
                activity.getType(),
                activity.getStartedAt(),
                activity.getCompletedAt(),
                activity.getDurationSeconds(),
                activity.getDistanceMeters(),
                activity.getElevationGainMeters(),
                activity.getAverageHeartRate(),
                activity.getMaxHeartRate(),
                activity.getCalories(),
                activity.getNotes(),
                activity.getRoute() != null ? ActivityRouteResponse.from(activity.getRoute()) : null,
                activity.getLaps().stream().map(ActivityLapResponse::from).toList(),
                activity.getCreatedAt(),
                activity.getUpdatedAt()
        );
    }
}
