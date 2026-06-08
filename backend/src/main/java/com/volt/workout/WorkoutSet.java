package com.volt.workout;

import com.volt.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

@Entity
@Table(name = "workout_sets", indexes = {
        @Index(name = "idx_workout_sets_workout_exercise_id", columnList = "workout_exercise_id")
})
public class WorkoutSet extends BaseEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workout_exercise_id", nullable = false)
    private WorkoutExercise workoutExercise;

    @Column(nullable = false)
    private int setNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SetType setType = SetType.NORMAL;

    @Min(0)
    @Column
    private Integer reps;

    @Column
    private Double weightKg;

    @Column
    private Integer durationSeconds;

    @Column
    private Double distanceMeters;

    @Min(1) @Max(10)
    @Column
    private Integer rpe;

    @Column(length = 300)
    private String notes;

    @Column
    private Instant completedAt;

    @Column(nullable = false)
    private boolean isPr = false;

    public WorkoutExercise getWorkoutExercise() { return workoutExercise; }
    public void setWorkoutExercise(WorkoutExercise workoutExercise) { this.workoutExercise = workoutExercise; }

    public Exercise getExercise() { return workoutExercise.getExercise(); }
    public Workout getWorkout() { return workoutExercise.getWorkout(); }

    public int getSetNumber() { return setNumber; }
    public void setSetNumber(int setNumber) { this.setNumber = setNumber; }

    public SetType getSetType() { return setType; }
    public void setSetType(SetType setType) { this.setType = setType; }

    public Integer getReps() { return reps; }
    public void setReps(Integer reps) { this.reps = reps; }

    public Double getWeightKg() { return weightKg; }
    public void setWeightKg(Double weightKg) { this.weightKg = weightKg; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public Double getDistanceMeters() { return distanceMeters; }
    public void setDistanceMeters(Double distanceMeters) { this.distanceMeters = distanceMeters; }

    public Integer getRpe() { return rpe; }
    public void setRpe(Integer rpe) { this.rpe = rpe; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public boolean isPr() { return isPr; }
    public void setPr(boolean isPr) { this.isPr = isPr; }
}
