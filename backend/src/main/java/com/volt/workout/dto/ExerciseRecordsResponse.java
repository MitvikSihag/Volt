package com.volt.workout.dto;

import java.util.List;
import java.util.UUID;

public record ExerciseRecordsResponse(
        UUID exerciseId,
        String exerciseName,
        List<PersonalRecordResponse> records
) {}
