package com.volt.workout.dto;

import com.volt.workout.Equipment;
import com.volt.workout.MuscleGroup;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record UpdateExerciseRequest(

        @Size(max = 100)
        String name,

        @Size(max = 500)
        String description,

        MuscleGroup primaryMuscleGroup,

        Set<MuscleGroup> secondaryMuscleGroups,

        Equipment equipment
) {}
