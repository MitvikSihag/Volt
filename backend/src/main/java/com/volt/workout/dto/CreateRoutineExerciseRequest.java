package com.volt.workout.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateRoutineExerciseRequest(

        @NotNull
        UUID exerciseId,

        Integer targetSets,

        Integer targetReps,

        Integer restSeconds,

        @Size(max = 300)
        String notes
) {}
