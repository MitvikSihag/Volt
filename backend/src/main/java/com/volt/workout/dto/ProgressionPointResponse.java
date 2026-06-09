package com.volt.workout.dto;

import java.time.Instant;

public record ProgressionPointResponse(
        Instant date,
        double estimatedOneRepMax,
        Double bestWeightKg,
        double volumeKg
) {}
