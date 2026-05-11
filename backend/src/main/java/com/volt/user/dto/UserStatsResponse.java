package com.volt.user.dto;

public record UserStatsResponse(
        long totalWorkouts,
        long totalActivities,
        double totalDistanceMeters,
        double totalVolumeKg
) {}
