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
}
