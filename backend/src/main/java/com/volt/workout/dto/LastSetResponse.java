package com.volt.workout.dto;

import com.volt.workout.WorkoutSet;

import java.util.UUID;

public record LastSetResponse(
        UUID exerciseId,
        Integer reps,
        Double weightKg,
        Integer durationSeconds,
        Double distanceMeters
) {
    public static LastSetResponse from(UUID exerciseId, WorkoutSet s) {
        return new LastSetResponse(exerciseId, s.getReps(), s.getWeightKg(),
                s.getDurationSeconds(), s.getDistanceMeters());
    }
}
