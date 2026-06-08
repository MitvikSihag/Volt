package com.volt.workout;

import com.volt.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutRepository extends JpaRepository<Workout, UUID> {

    @Query("SELECT COUNT(w) FROM Workout w WHERE w.user = :user AND w.deletedAt IS NULL")
    long countByUser(User user);

    @Query("SELECT COALESCE(SUM(s.reps * s.weightKg), 0) FROM WorkoutSet s WHERE s.workoutExercise.workout.user = :user AND s.reps IS NOT NULL AND s.weightKg IS NOT NULL AND s.workoutExercise.workout.deletedAt IS NULL")
    double sumVolumeByUser(User user);

    Page<Workout> findByUserAndDeletedAtIsNullOrderByStartedAtDesc(User user, Pageable pageable);

    Optional<Workout> findByIdAndDeletedAtIsNull(UUID id);

    List<Workout> findByUserAndStartedAtAfterAndDeletedAtIsNull(User user, Instant after);
}
