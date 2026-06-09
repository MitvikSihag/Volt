package com.volt.workout.dto;

import com.volt.workout.RoutineExercise;

import java.util.UUID;

public record RoutineExerciseResponse(
        UUID id,
        UUID exerciseId,
        String exerciseName,
        int position,
        Integer targetSets,
        Integer targetReps,
        Integer restSeconds,
        String notes
) {
    public static RoutineExerciseResponse from(RoutineExercise re) {
        return new RoutineExerciseResponse(
                re.getId(),
                re.getExercise().getId(),
                re.getExercise().getName(),
                re.getPosition(),
                re.getTargetSets(),
                re.getTargetReps(),
                re.getRestSeconds(),
                re.getNotes()
        );
    }
}
