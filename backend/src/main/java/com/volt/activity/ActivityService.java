package com.volt.activity;

import com.volt.activity.dto.ActivityDetailResponse;
import com.volt.activity.dto.ActivityLapRequest;
import com.volt.activity.dto.ActivityListItemResponse;
import com.volt.activity.dto.ActivityRouteRequest;
import com.volt.activity.dto.CreateActivityRequest;
import com.volt.activity.dto.UpdateActivityRequest;
import com.volt.common.dto.PageResponse;
import com.volt.common.exception.ApiException;
import com.volt.common.exception.ResourceNotFoundException;
import com.volt.user.User;
import com.volt.user.UserLookup;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final UserLookup userLookup;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public long countForUser(com.volt.user.User user) {
        return activityRepository.countByUser(user);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public double totalDistanceMetersForUser(com.volt.user.User user) {
        return activityRepository.sumDistanceByUser(user);
    }

    public ActivityService(ActivityRepository activityRepository, UserLookup userLookup) {
        this.activityRepository = activityRepository;
        this.userLookup = userLookup;
    }

    public ActivityDetailResponse create(String username, CreateActivityRequest request) {
        validateRequiredFields(request.type(), request.startedAt());
        validateActivityState(request.startedAt(), request.completedAt(),
                request.averageHeartRate(), request.maxHeartRate());

        Activity activity = new Activity();
        activity.setUser(userLookup.require(username));
        activity.setTitle(request.title());
        activity.setType(request.type());
        activity.setStartedAt(request.startedAt());
        activity.setCompletedAt(request.completedAt());
        activity.setDurationSeconds(request.durationSeconds());
        activity.setDistanceMeters(request.distanceMeters());
        activity.setElevationGainMeters(request.elevationGainMeters());
        activity.setAverageHeartRate(request.averageHeartRate());
        activity.setMaxHeartRate(request.maxHeartRate());
        activity.setCalories(request.calories());
        activity.setNotes(request.notes());

        replaceRoute(activity, request.route());
        replaceLaps(activity, request.laps());

        return ActivityDetailResponse.from(activityRepository.save(activity));
    }

    @Transactional(readOnly = true)
    public PageResponse<ActivityListItemResponse> list(String username, int page, int size) {
        User user = userLookup.require(username);
        return PageResponse.from(
                activityRepository.findByUserAndDeletedAtIsNullOrderByStartedAtDesc(
                                user, PageRequest.of(page, size))
                        .map(ActivityListItemResponse::from)
        );
    }

    @Transactional(readOnly = true)
    public ActivityDetailResponse getById(String username, UUID id) {
        Activity activity = findActive(id);
        assertOwner(username, activity);
        return ActivityDetailResponse.from(activity);
    }

    public ActivityDetailResponse update(String username, UUID id, UpdateActivityRequest request) {
        Activity activity = findActive(id);
        assertOwner(username, activity);

        ActivityType nextType = request.isTypeSet() ? request.getType() : activity.getType();
        Instant nextStartedAt = request.isStartedAtSet() ? request.getStartedAt() : activity.getStartedAt();
        Instant nextCompletedAt = request.isCompletedAtSet() ? request.getCompletedAt() : activity.getCompletedAt();
        Integer nextAverageHeartRate = request.isAverageHeartRateSet()
                ? request.getAverageHeartRate()
                : activity.getAverageHeartRate();
        Integer nextMaxHeartRate = request.isMaxHeartRateSet()
                ? request.getMaxHeartRate()
                : activity.getMaxHeartRate();

        validateRequiredFields(nextType, nextStartedAt);
        validateActivityState(nextStartedAt, nextCompletedAt, nextAverageHeartRate, nextMaxHeartRate);

        if (request.isTitleSet()) activity.setTitle(request.getTitle());
        if (request.isTypeSet()) activity.setType(request.getType());
        if (request.isStartedAtSet()) activity.setStartedAt(request.getStartedAt());
        if (request.isCompletedAtSet()) activity.setCompletedAt(request.getCompletedAt());
        if (request.isDurationSecondsSet()) activity.setDurationSeconds(request.getDurationSeconds());
        if (request.isDistanceMetersSet()) activity.setDistanceMeters(request.getDistanceMeters());
        if (request.isElevationGainMetersSet()) activity.setElevationGainMeters(request.getElevationGainMeters());
        if (request.isAverageHeartRateSet()) activity.setAverageHeartRate(request.getAverageHeartRate());
        if (request.isMaxHeartRateSet()) activity.setMaxHeartRate(request.getMaxHeartRate());
        if (request.isCaloriesSet()) activity.setCalories(request.getCalories());
        if (request.isNotesSet()) activity.setNotes(request.getNotes());
        if (request.isRouteSet()) replaceRoute(activity, request.getRoute());
        if (request.isLapsSet()) replaceLaps(activity, request.getLaps());

        return ActivityDetailResponse.from(activityRepository.save(activity));
    }

    public void delete(String username, UUID id) {
        Activity activity = findActive(id);
        assertOwner(username, activity);
        activity.setDeletedAt(Instant.now());
        activityRepository.save(activity);
    }

    private void replaceRoute(Activity activity, ActivityRouteRequest request) {
        if (request == null) {
            activity.setRoute(null);
            return;
        }

        Route route = activity.getRoute();
        if (route == null) {
            route = new Route();
            route.setActivity(activity);
        }

        route.setEncodedPolyline(request.encodedPolyline());
        route.setElevationData(request.elevationData());
        activity.setRoute(route);
    }

    private void replaceLaps(Activity activity, List<ActivityLapRequest> lapRequests) {
        activity.getLaps().clear();
        if (lapRequests == null) {
            return;
        }

        for (int i = 0; i < lapRequests.size(); i++) {
            ActivityLapRequest lapRequest = lapRequests.get(i);
            Lap lap = new Lap();
            lap.setActivity(activity);
            lap.setLapNumber(i + 1);
            lap.setDistanceMeters(lapRequest.distanceMeters());
            lap.setDurationSeconds(lapRequest.durationSeconds());
            lap.setAveragePaceMinPerKm(lapRequest.averagePaceMinPerKm());
            lap.setAverageHeartRate(lapRequest.averageHeartRate());
            activity.getLaps().add(lap);
        }
    }

    private void validateRequiredFields(ActivityType type, Instant startedAt) {
        if (type == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Activity type is required");
        }
        if (startedAt == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Activity startedAt is required");
        }
    }

    private void validateActivityState(Instant startedAt,
                                       Instant completedAt,
                                       Integer averageHeartRate,
                                       Integer maxHeartRate) {
        if (completedAt != null && completedAt.isBefore(startedAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Activity completedAt cannot be before startedAt");
        }
        if (averageHeartRate != null && maxHeartRate != null && averageHeartRate > maxHeartRate) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Activity averageHeartRate cannot exceed maxHeartRate");
        }
    }

    private Activity findActive(UUID id) {
        return activityRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
    }

    private void assertOwner(String username, Activity activity) {
        if (!activity.getUser().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }
    }

    }
