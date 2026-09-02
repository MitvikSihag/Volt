package com.volt.analytics;

import com.volt.analytics.dto.DashboardResponse;
import com.volt.workout.PersonalRecordRepository;
import com.volt.workout.Workout;
import com.volt.workout.WorkoutRepository;

import com.volt.activity.Activity;
import com.volt.activity.ActivityRepository;
import com.volt.common.exception.ResourceNotFoundException;
import com.volt.load.TrainingMath;
import com.volt.user.User;
import com.volt.user.UserLookup;
import com.volt.workout.dto.PersonalRecordResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final UserLookup userLookup;
    private final WorkoutRepository workoutRepository;
    private final PersonalRecordRepository prRepository;
    private final ActivityRepository activityRepository;
    private final Clock clock;

    public DashboardService(UserLookup userLookup,
                            WorkoutRepository workoutRepository,
                            PersonalRecordRepository prRepository,
                            ActivityRepository activityRepository,
                            Clock clock) {
        this.userLookup = userLookup;
        this.workoutRepository = workoutRepository;
        this.prRepository = prRepository;
        this.activityRepository = activityRepository;
        this.clock = clock;
    }

    public DashboardResponse get(String username) {
        User user = userLookup.require(username);

        LocalDate today = LocalDate.now(clock);
        LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1);
        Instant weekStartInstant = weekStart.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant fourteenDaysAgo = today.minusDays(13).atStartOfDay().toInstant(ZoneOffset.UTC);

        List<Workout> weekWorkouts = workoutRepository
                .findByUserAndStartedAtAfterAndDeletedAtIsNull(user, weekStartInstant);
        double weekVolume = weekWorkouts.stream()
                .flatMap(w -> w.getAllSets().stream())
                .mapToDouble(s -> TrainingMath.setVolumeKg(s.getReps(), s.getWeightKg()))
                .sum();
        double weekDistanceKm = activityRepository
                .sumDistanceByUserAndStartedAtAfter(user, weekStartInstant) / 1000.0;

        List<Workout> recentWorkouts = workoutRepository
                .findByUserAndStartedAtAfterAndDeletedAtIsNull(user, fourteenDaysAgo);
        List<Activity> recentActivities = activityRepository
                .findByUserAndStartedAtAfterAndDeletedAtIsNull(user, fourteenDaysAgo);

        Map<LocalDate, Double> volumeByDay = recentWorkouts.stream()
                .collect(Collectors.groupingBy(
                        w -> w.getStartedAt().atZone(ZoneOffset.UTC).toLocalDate(),
                        Collectors.summingDouble(w -> w.getAllSets().stream()
                                .mapToDouble(s -> TrainingMath.setVolumeKg(s.getReps(), s.getWeightKg())).sum())));

        Map<LocalDate, Double> distanceByDay = recentActivities.stream()
                .filter(a -> a.getDistanceMeters() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getStartedAt().atZone(ZoneOffset.UTC).toLocalDate(),
                        Collectors.summingDouble(a -> a.getDistanceMeters() / 1000.0)));

        List<DashboardResponse.ChartPoint> chartData = new ArrayList<>();
        List<DashboardResponse.DayActivity> calendar = new ArrayList<>();
        Set<LocalDate> activeDaySet = new HashSet<>();

        for (int i = 13; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            double vol = volumeByDay.getOrDefault(date, 0.0);
            double dist = distanceByDay.getOrDefault(date, 0.0);
            chartData.add(new DashboardResponse.ChartPoint(date, vol, dist));
            if (i < 7) {
                calendar.add(new DashboardResponse.DayActivity(date, vol > 0, dist > 0));
                if (vol > 0 || dist > 0) activeDaySet.add(date);
            }
        }

        List<PersonalRecordResponse> recentPrs = prRepository
                .findTop3ByUserOrderByAchievedAtDesc(user)
                .stream().map(PersonalRecordResponse::from).toList();

        return new DashboardResponse(
                new DashboardResponse.WeekSummary(weekVolume, weekWorkouts.size(),
                        weekDistanceKm, activeDaySet.size()),
                calendar,
                chartData,
                recentPrs
        );
    }
}
