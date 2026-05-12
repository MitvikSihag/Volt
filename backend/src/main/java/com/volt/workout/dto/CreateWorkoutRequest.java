package com.volt.workout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record CreateWorkoutRequest(

        @Size(max = 100)
        String title,

        @Size(max = 1000)
        String notes,

        @NotNull
        Instant startedAt,

        Instant completedAt,

        @Valid
        List<CreateWorkoutExerciseRequest> exercises
) {}
