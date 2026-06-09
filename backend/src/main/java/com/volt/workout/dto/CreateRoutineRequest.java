package com.volt.workout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateRoutineRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 1000)
        String notes,

        @Valid
        List<CreateRoutineExerciseRequest> exercises
) {}
