package com.volt.workout.dto;

import com.volt.workout.SetType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateWorkoutSetRequest(

        SetType setType,

        @Min(0)
        Integer reps,

        @PositiveOrZero
        Double weightKg,

        @PositiveOrZero
        Integer durationSeconds,

        @PositiveOrZero
        Double distanceMeters,

        @Min(1) @Max(10)
        Integer rpe,

        @Size(max = 300)
        String notes,

        Instant completedAt
) {}
