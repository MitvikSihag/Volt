package com.volt.workout.dto;

import com.volt.workout.SetType;
import com.volt.workout.WorkoutSet;

import java.util.UUID;

public record WorkoutSetResponse(
        UUID id,
        UUID exerciseId,
        String exerciseName,
        int setOrder,
        SetType setType,
        Integer reps,
        Double weightKg,
        Integer durationSeconds,
        Double distanceMeters,
        Integer rpe,
        String notes
) {
    public static WorkoutSetResponse from(WorkoutSet s) {
        return new WorkoutSetResponse(
                s.getId(),
                s.getExercise().getId(),
                s.getExercise().getName(),
                s.getSetOrder(),
                s.getSetType(),
                s.getReps(),
                s.getWeightKg(),
                s.getDurationSeconds(),
                s.getDistanceMeters(),
                s.getRpe(),
                s.getNotes()
        );
    }
}
