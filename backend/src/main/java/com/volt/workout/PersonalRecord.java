package com.volt.workout;

import com.volt.common.BaseEntity;
import com.volt.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "personal_records",
        indexes = @Index(name = "idx_pr_user_exercise", columnList = "user_id, exercise_id"),
        uniqueConstraints = @UniqueConstraint(
                name = "uq_pr_user_exercise_type",
                columnNames = {"user_id", "exercise_id", "type"}
        ))
public class PersonalRecord extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PersonalRecordType type;

    @Column(name = "record_value", nullable = false)
    private double value;

    @Column(nullable = false)
    private Instant achievedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_set_id")
    private WorkoutSet workoutSet;

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Exercise getExercise() { return exercise; }
    public void setExercise(Exercise exercise) { this.exercise = exercise; }

    public PersonalRecordType getType() { return type; }
    public void setType(PersonalRecordType type) { this.type = type; }

    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }

    public Instant getAchievedAt() { return achievedAt; }
    public void setAchievedAt(Instant achievedAt) { this.achievedAt = achievedAt; }

    public WorkoutSet getWorkoutSet() { return workoutSet; }
    public void setWorkoutSet(WorkoutSet workoutSet) { this.workoutSet = workoutSet; }
}
