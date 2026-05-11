package com.volt.workout;

import com.volt.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

    // System exercises visible to everyone
    @Query("SELECT e FROM Exercise e WHERE e.system = true AND e.deletedAt IS NULL ORDER BY e.name ASC")
    List<Exercise> findAllSystem();

    // User-created exercises for a specific user
    @Query("SELECT e FROM Exercise e WHERE e.createdBy = :user AND e.deletedAt IS NULL ORDER BY e.name ASC")
    List<Exercise> findByCreatedBy(User user);

    // Combined list: system + own custom
    @Query("SELECT e FROM Exercise e WHERE (e.system = true OR e.createdBy = :user) AND e.deletedAt IS NULL ORDER BY e.system DESC, e.name ASC")
    List<Exercise> findAllAvailableTo(User user);

    // Filtered by muscle group (primary or secondary)
    @Query("SELECT DISTINCT e FROM Exercise e LEFT JOIN e.secondaryMuscleGroups sg " +
           "WHERE (e.system = true OR e.createdBy = :user) " +
           "AND (e.primaryMuscleGroup = :muscleGroup OR sg = :muscleGroup) " +
           "AND e.deletedAt IS NULL ORDER BY e.name ASC")
    List<Exercise> findByMuscleGroup(User user, MuscleGroup muscleGroup);

    // Filtered by equipment
    @Query("SELECT e FROM Exercise e WHERE (e.system = true OR e.createdBy = :user) AND e.equipment = :equipment AND e.deletedAt IS NULL ORDER BY e.name ASC")
    List<Exercise> findByEquipment(User user, Equipment equipment);

    // Filtered by both (muscle group primary or secondary + equipment)
    @Query("SELECT DISTINCT e FROM Exercise e LEFT JOIN e.secondaryMuscleGroups sg " +
           "WHERE (e.system = true OR e.createdBy = :user) " +
           "AND (e.primaryMuscleGroup = :muscleGroup OR sg = :muscleGroup) " +
           "AND e.equipment = :equipment " +
           "AND e.deletedAt IS NULL ORDER BY e.name ASC")
    List<Exercise> findByMuscleGroupAndEquipment(User user, MuscleGroup muscleGroup, Equipment equipment);

    @Query("SELECT COUNT(e) FROM Exercise e WHERE e.system = true AND e.deletedAt IS NULL")
    long countSystemExercises();

    Optional<Exercise> findByIdAndDeletedAtIsNull(UUID id);
}
