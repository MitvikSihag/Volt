package com.volt.workout.dto;

import com.volt.workout.WorkoutExercise;

import java.util.List;
import java.util.UUID;

public record WorkoutExerciseResponse(
        UUID id,
        UUID exerciseId,
        String exerciseName,
        int position,
        String notes,
        Integer restSeconds,
        List<WorkoutSetResponse> sets
) {
    public static WorkoutExerciseResponse from(WorkoutExercise we) {
        return new WorkoutExerciseResponse(
                we.getId(),
                we.getExercise().getId(),
                we.getExercise().getName(),
                we.getPosition(),
                we.getNotes(),
                we.getRestSeconds(),
                we.getSets().stream().map(WorkoutSetResponse::from).toList()
        );
    }
}
