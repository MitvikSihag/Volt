package com.volt.workout.dto;

import com.volt.workout.Equipment;
import com.volt.workout.MuscleGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record CreateExerciseRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 500)
        String description,

        @NotNull
        MuscleGroup primaryMuscleGroup,

        Set<MuscleGroup> secondaryMuscleGroups,

        @NotNull
        Equipment equipment
) {}
