package com.volt.activity.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.volt.activity.ActivityType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public class UpdateActivityRequest {

    @Size(max = 100)
    private String title;

    private ActivityType type;
    private Instant startedAt;
    private Instant completedAt;

    @PositiveOrZero
    private Integer durationSeconds;

    @PositiveOrZero
    private Double distanceMeters;

    @PositiveOrZero
    private Double elevationGainMeters;

    @PositiveOrZero
    private Integer averageHeartRate;

    @PositiveOrZero
    private Integer maxHeartRate;

    @PositiveOrZero
    private Integer calories;

    @Size(max = 1000)
    private String notes;

    @Valid
    private ActivityRouteRequest route;

    @Valid
    private List<@Valid ActivityLapRequest> laps;

    @JsonIgnore
    private boolean titleSet;

    @JsonIgnore
    private boolean typeSet;

    @JsonIgnore
    private boolean startedAtSet;

    @JsonIgnore
    private boolean completedAtSet;

    @JsonIgnore
    private boolean durationSecondsSet;

    @JsonIgnore
    private boolean distanceMetersSet;

    @JsonIgnore
    private boolean elevationGainMetersSet;

    @JsonIgnore
    private boolean averageHeartRateSet;

    @JsonIgnore
    private boolean maxHeartRateSet;

    @JsonIgnore
    private boolean caloriesSet;

    @JsonIgnore
    private boolean notesSet;

    @JsonIgnore
    private boolean routeSet;

    @JsonIgnore
    private boolean lapsSet;

    public String getTitle() { return title; }
    public ActivityType getType() { return type; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public Double getDistanceMeters() { return distanceMeters; }
    public Double getElevationGainMeters() { return elevationGainMeters; }
    public Integer getAverageHeartRate() { return averageHeartRate; }
    public Integer getMaxHeartRate() { return maxHeartRate; }
    public Integer getCalories() { return calories; }
    public String getNotes() { return notes; }
    public ActivityRouteRequest getRoute() { return route; }
    public List<ActivityLapRequest> getLaps() { return laps; }

    public boolean isTitleSet() { return titleSet; }
    public boolean isTypeSet() { return typeSet; }
    public boolean isStartedAtSet() { return startedAtSet; }
    public boolean isCompletedAtSet() { return completedAtSet; }
    public boolean isDurationSecondsSet() { return durationSecondsSet; }
    public boolean isDistanceMetersSet() { return distanceMetersSet; }
    public boolean isElevationGainMetersSet() { return elevationGainMetersSet; }
    public boolean isAverageHeartRateSet() { return averageHeartRateSet; }
    public boolean isMaxHeartRateSet() { return maxHeartRateSet; }
    public boolean isCaloriesSet() { return caloriesSet; }
    public boolean isNotesSet() { return notesSet; }
    public boolean isRouteSet() { return routeSet; }
    public boolean isLapsSet() { return lapsSet; }

    @JsonSetter("title")
    public void setTitle(String title) {
        this.title = title;
        this.titleSet = true;
    }

    @JsonSetter("type")
    public void setType(ActivityType type) {
        this.type = type;
        this.typeSet = true;
    }

    @JsonSetter("startedAt")
    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
        this.startedAtSet = true;
    }

    @JsonSetter("completedAt")
    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
        this.completedAtSet = true;
    }

    @JsonSetter("durationSeconds")
    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
        this.durationSecondsSet = true;
    }

    @JsonSetter("distanceMeters")
    public void setDistanceMeters(Double distanceMeters) {
        this.distanceMeters = distanceMeters;
        this.distanceMetersSet = true;
    }

    @JsonSetter("elevationGainMeters")
    public void setElevationGainMeters(Double elevationGainMeters) {
        this.elevationGainMeters = elevationGainMeters;
        this.elevationGainMetersSet = true;
    }

    @JsonSetter("averageHeartRate")
    public void setAverageHeartRate(Integer averageHeartRate) {
        this.averageHeartRate = averageHeartRate;
        this.averageHeartRateSet = true;
    }

    @JsonSetter("maxHeartRate")
    public void setMaxHeartRate(Integer maxHeartRate) {
        this.maxHeartRate = maxHeartRate;
        this.maxHeartRateSet = true;
    }

    @JsonSetter("calories")
    public void setCalories(Integer calories) {
        this.calories = calories;
        this.caloriesSet = true;
    }

    @JsonSetter("notes")
    public void setNotes(String notes) {
        this.notes = notes;
        this.notesSet = true;
    }

    @JsonSetter("route")
    public void setRoute(ActivityRouteRequest route) {
        this.route = route;
        this.routeSet = true;
    }

    @JsonSetter("laps")
    public void setLaps(List<ActivityLapRequest> laps) {
        this.laps = laps;
        this.lapsSet = true;
    }
}
