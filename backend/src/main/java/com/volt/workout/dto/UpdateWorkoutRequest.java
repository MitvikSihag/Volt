package com.volt.workout.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record UpdateWorkoutRequest(

        @Size(max = 100)
        String title,

        @Size(max = 1000)
        String notes,

        Instant completedAt,

        @Min(1) @Max(10)
        Integer rpe
) {}
