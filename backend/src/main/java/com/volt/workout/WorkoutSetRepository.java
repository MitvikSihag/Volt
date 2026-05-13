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
            JOIN FETCH s.exercise
            JOIN FETCH s.workout
            WHERE s.exercise.id = :exerciseId
              AND s.workout.user = :user
              AND s.workout.deletedAt IS NULL
            ORDER BY s.workout.startedAt DESC, s.setOrder ASC
            """)
    List<WorkoutSet> findHistoryByExerciseAndUser(UUID exerciseId, User user, Pageable pageable);

    /**
     * For each exercise in the list, returns all sets from that exercise's most recent
     * completed workout for the user, ordered by setOrder DESC.
     * Callers deduplicate by exerciseId to get the last set only.
     */
    @Query("""
            SELECT s FROM WorkoutSet s
            JOIN FETCH s.exercise e
            JOIN s.workout w
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
                        SELECT 1 FROM WorkoutSet s2
                        WHERE s2.workout = w2
                          AND s2.exercise.id = e.id
                    )
              )
            ORDER BY e.id ASC, s.setOrder DESC
            """)
    List<WorkoutSet> findLastSetsForExercises(List<UUID> exerciseIds, User user);
}
