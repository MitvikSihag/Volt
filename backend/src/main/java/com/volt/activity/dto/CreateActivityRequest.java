package com.volt.activity.dto;

import com.volt.activity.ActivityType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record CreateActivityRequest(

        @Size(max = 100)
        String title,

        @NotNull
        ActivityType type,

        @NotNull
        Instant startedAt,

        Instant completedAt,

        @PositiveOrZero
        Integer durationSeconds,

        @PositiveOrZero
        Double distanceMeters,

        @PositiveOrZero
        Double elevationGainMeters,

        @PositiveOrZero
        Integer averageHeartRate,

        @PositiveOrZero
        Integer maxHeartRate,

        @PositiveOrZero
        Integer calories,

        @Size(max = 1000)
        String notes,

        @Valid
        ActivityRouteRequest route,

        @Valid
        List<@Valid ActivityLapRequest> laps
) {}
