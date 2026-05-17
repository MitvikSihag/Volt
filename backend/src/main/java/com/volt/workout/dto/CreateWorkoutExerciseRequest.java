package com.volt.workout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record CreateWorkoutExerciseRequest(

        @NotNull
        UUID exerciseId,

        @NotEmpty
        @Valid
        List<CreateWorkoutSetRequest> sets
) {}
