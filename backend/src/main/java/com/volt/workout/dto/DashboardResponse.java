package com.volt.workout.dto;

import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        WeekSummary week,
        List<DayActivity> trainingCalendar,
        List<ChartPoint> chartData,
        List<PersonalRecordResponse> recentPrs
) {
    public record WeekSummary(
            double volumeKg,
            int workouts,
            double distanceKm,
            int activeDays
    ) {}

    public record DayActivity(
            LocalDate date,
            boolean hasWorkout,
            boolean hasActivity
    ) {}

    public record ChartPoint(
            LocalDate date,
            double volumeKg,
            double distanceKm
    ) {}
}
