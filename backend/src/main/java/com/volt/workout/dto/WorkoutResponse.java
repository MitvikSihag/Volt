package com.volt.workout.dto;

import com.volt.workout.Workout;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkoutResponse(
        UUID id,
        String title,
        String notes,
        Instant startedAt,
        Instant completedAt,
        boolean inProgress,
        List<WorkoutSetResponse> sets,
        Instant createdAt
) {
    public static WorkoutResponse from(Workout w) {
        return new WorkoutResponse(
                w.getId(),
                w.getTitle(),
                w.getNotes(),
                w.getStartedAt(),
                w.getCompletedAt(),
                w.isInProgress(),
                w.getSets().stream().map(WorkoutSetResponse::from).toList(),
                w.getCreatedAt()
        );
    }
}
