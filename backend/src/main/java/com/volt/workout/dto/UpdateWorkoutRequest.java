package com.volt.workout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record UpdateWorkoutRequest(

        @Size(max = 100)
        String title,

        @Size(max = 1000)
        String notes,

        Instant completedAt,

        @Valid
        List<CreateWorkoutExerciseRequest> exercises
) {}
