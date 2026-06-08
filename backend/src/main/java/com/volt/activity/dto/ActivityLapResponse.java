package com.volt.activity.dto;

import com.volt.activity.Lap;

public record ActivityLapResponse(
        int lapNumber,
        Double distanceMeters,
        Integer durationSeconds,
        Double averagePaceMinPerKm,
        Integer averageHeartRate
) {
    public static ActivityLapResponse from(Lap lap) {
        return new ActivityLapResponse(
                lap.getLapNumber(),
                lap.getDistanceMeters(),
                lap.getDurationSeconds(),
                lap.getAveragePaceMinPerKm(),
                lap.getAverageHeartRate()
        );
    }
}
