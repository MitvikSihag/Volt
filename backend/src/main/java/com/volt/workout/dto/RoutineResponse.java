package com.volt.workout.dto;

import com.volt.workout.Routine;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RoutineResponse(
        UUID id,
        String name,
        String notes,
        List<RoutineExerciseResponse> exercises,
        Instant createdAt
) {
    public static RoutineResponse from(Routine r) {
        return new RoutineResponse(
                r.getId(),
                r.getName(),
                r.getNotes(),
                r.getExercises().stream().map(RoutineExerciseResponse::from).toList(),
                r.getCreatedAt()
        );
    }
}
