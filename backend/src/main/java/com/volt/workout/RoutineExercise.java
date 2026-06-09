package com.volt.workout;

import com.volt.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "routine_exercises", indexes = {
        @Index(name = "idx_routine_exercises_routine_id", columnList = "routine_id"),
        @Index(name = "idx_routine_exercises_exercise_id", columnList = "exercise_id")
})
public class RoutineExercise extends BaseEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "routine_id", nullable = false)
    private Routine routine;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(nullable = false)
    private int position;

    @Column
    private Integer targetSets;

    @Column
    private Integer targetReps;

    @Column
    private Integer restSeconds;

    @Size(max = 300)
    @Column(length = 300)
    private String notes;

    public Routine getRoutine() { return routine; }
    public void setRoutine(Routine routine) { this.routine = routine; }

    public Exercise getExercise() { return exercise; }
    public void setExercise(Exercise exercise) { this.exercise = exercise; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public Integer getTargetSets() { return targetSets; }
    public void setTargetSets(Integer targetSets) { this.targetSets = targetSets; }

    public Integer getTargetReps() { return targetReps; }
    public void setTargetReps(Integer targetReps) { this.targetReps = targetReps; }

    public Integer getRestSeconds() { return restSeconds; }
    public void setRestSeconds(Integer restSeconds) { this.restSeconds = restSeconds; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
