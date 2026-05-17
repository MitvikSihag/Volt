package com.volt.workout;

import com.volt.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

    @Query("""
            SELECT DISTINCT e FROM Exercise e LEFT JOIN e.secondaryMuscleGroups sg
            WHERE (e.system = true OR e.createdBy = :user) AND e.deletedAt IS NULL
            AND (:q IS NULL OR LOWER(e.name) LIKE LOWER(CONCAT('%', :q, '%')))
            AND (:muscle IS NULL OR e.primaryMuscleGroup = :muscle OR sg = :muscle)
            AND (:equipment IS NULL OR e.equipment = :equipment)
            AND (:movement IS NULL OR e.movementType = :movement)
            ORDER BY e.system DESC, e.name ASC
            """)
    List<Exercise> search(User user, String q, MuscleGroup muscle, Equipment equipment, MovementType movement);

    Optional<Exercise> findByIdAndDeletedAtIsNull(UUID id);

    @Query("SELECT COUNT(e) FROM Exercise e WHERE e.system = true AND e.deletedAt IS NULL")
    long countSystemExercises();
}
