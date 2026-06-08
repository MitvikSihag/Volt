package com.volt.workout;

import com.volt.user.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface WorkoutSetRepository extends JpaRepository<WorkoutSet, UUID> {

    @Query("""
            SELECT s FROM WorkoutSet s
            JOIN FETCH s.workoutExercise we
            JOIN FETCH we.exercise
            JOIN FETCH we.workout w
            WHERE we.exercise.id = :exerciseId
              AND w.user = :user
              AND w.deletedAt IS NULL
            ORDER BY w.startedAt DESC, s.setNumber ASC
            """)
    List<WorkoutSet> findHistoryByExerciseAndUser(UUID exerciseId, User user, Pageable pageable);

    /**
     * For each exercise in the list, returns all sets from that exercise's most recent
     * completed workout for the user, ordered by setNumber DESC.
     * Callers deduplicate by exerciseId to get the last set only.
     */
    @Query("""
            SELECT s FROM WorkoutSet s
            JOIN FETCH s.workoutExercise we
            JOIN FETCH we.exercise e
            JOIN we.workout w
            WHERE e.id IN :exerciseIds
              AND w.user = :user
              AND w.deletedAt IS NULL
              AND w.completedAt IS NOT NULL
              AND w.startedAt = (
                  SELECT MAX(w2.startedAt) FROM Workout w2
                  WHERE w2.user = :user
                    AND w2.deletedAt IS NULL
                    AND w2.completedAt IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM WorkoutExercise we2
                        WHERE we2.workout = w2
                          AND we2.exercise.id = e.id
                    )
              )
            ORDER BY e.id ASC, w.startedAt DESC, s.setNumber DESC
            """)
    List<WorkoutSet> findLastSetsForExercises(List<UUID> exerciseIds, User user);

    @Query("""
            SELECT s FROM WorkoutSet s
            JOIN FETCH s.workoutExercise we
            JOIN FETCH we.exercise
            JOIN FETCH we.workout w
            WHERE we.exercise.id = :exerciseId
              AND w.user = :user
              AND w.deletedAt IS NULL
            ORDER BY w.startedAt DESC, s.setNumber ASC
            """)
    List<WorkoutSet> findAllByExerciseAndUser(UUID exerciseId, User user);
}
