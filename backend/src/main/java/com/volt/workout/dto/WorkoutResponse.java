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
        Integer rpe,
        boolean inProgress,
        double totalVolumeKg,
        List<WorkoutExerciseResponse> exercises,
        Instant createdAt
) {
    public static WorkoutResponse from(Workout w) {
        double totalVolumeKg = w.getAllSets().stream()
                .mapToDouble(s -> com.volt.load.TrainingMath.setVolumeKg(s.getReps(), s.getWeightKg()))
                .sum();
        return new WorkoutResponse(
                w.getId(),
                w.getTitle(),
                w.getNotes(),
                w.getStartedAt(),
                w.getCompletedAt(),
                w.getRpe(),
                w.isInProgress(),
                totalVolumeKg,
                w.getExercises().stream().map(WorkoutExerciseResponse::from).toList(),
                w.getCreatedAt()
        );
    }
}
