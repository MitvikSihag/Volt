package com.volt.workout.dto;

import com.volt.workout.PersonalRecord;
import com.volt.workout.PersonalRecordType;

import java.time.Instant;
import java.util.UUID;

public record PersonalRecordResponse(
        PersonalRecordType type,
        double value,
        Instant achievedAt,
        UUID workoutSetId,
        Double contextWeightKg
) {
    public static PersonalRecordResponse from(PersonalRecord pr) {
        return new PersonalRecordResponse(
                pr.getType(),
                pr.getValue(),
                pr.getAchievedAt(),
                pr.getWorkoutSet() != null ? pr.getWorkoutSet().getId() : null,
                pr.getType() == PersonalRecordType.MAX_REPS_AT_WEIGHT && pr.getWorkoutSet() != null
                        ? pr.getWorkoutSet().getWeightKg()
                        : null
        );
    }
}
