package com.volt.workout.dto;

import com.volt.workout.Equipment;
import com.volt.workout.Exercise;
import com.volt.workout.MeasurementType;
import com.volt.workout.MovementType;
import com.volt.workout.MuscleGroup;

import java.util.Set;
import java.util.UUID;

public record ExerciseResponse(
        UUID id,
        String name,
        String description,
        MuscleGroup primaryMuscleGroup,
        Set<MuscleGroup> secondaryMuscleGroups,
        Equipment equipment,
        MovementType movementType,
        MeasurementType measurementType,
        boolean system
) {
    public static ExerciseResponse from(Exercise e) {
        return new ExerciseResponse(
                e.getId(),
                e.getName(),
                e.getDescription(),
                e.getPrimaryMuscleGroup(),
                e.getSecondaryMuscleGroups() == null
                        ? Set.of()
                        : Set.copyOf(e.getSecondaryMuscleGroups()),
                e.getEquipment(),
                e.getMovementType(),
                e.getMeasurementType(),
                e.isSystem()
        );
    }
}
