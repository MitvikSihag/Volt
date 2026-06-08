package com.volt.activity.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record ActivityLapRequest(

        @PositiveOrZero
        Double distanceMeters,

        @PositiveOrZero
        Integer durationSeconds,

        @PositiveOrZero
        Double averagePaceMinPerKm,

        @PositiveOrZero
        Integer averageHeartRate
) {}
