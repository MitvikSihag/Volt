package com.volt.workout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateWorkoutExerciseRequest(

        @NotNull
        UUID exerciseId,

        @Size(max = 300)
        String notes,

        @PositiveOrZero
        Integer restSeconds,

        @NotEmpty
        @Valid
        List<CreateWorkoutSetRequest> sets
) {}
