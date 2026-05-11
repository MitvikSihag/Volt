package com.volt.config;

import com.volt.workout.Equipment;
import com.volt.workout.Exercise;
import com.volt.workout.ExerciseRepository;
import com.volt.workout.MuscleGroup;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
@Profile("dev")
public class DataSeeder implements CommandLineRunner {

    private final ExerciseRepository exerciseRepository;

    public DataSeeder(ExerciseRepository exerciseRepository) {
        this.exerciseRepository = exerciseRepository;
    }

    @Override
    public void run(String... args) {
        if (exerciseRepository.countSystemExercises() > 0) return;

        List<Exercise> exercises = List.of(
                // Chest
                ex("Barbell Bench Press", MuscleGroup.CHEST, Set.of(MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS), Equipment.BARBELL),
                ex("Incline Barbell Bench Press", MuscleGroup.CHEST, Set.of(MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS), Equipment.BARBELL),
                ex("Dumbbell Bench Press", MuscleGroup.CHEST, Set.of(MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS), Equipment.DUMBBELL),
                ex("Incline Dumbbell Bench Press", MuscleGroup.CHEST, Set.of(MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS), Equipment.DUMBBELL),
                ex("Dumbbell Fly", MuscleGroup.CHEST, Set.of(), Equipment.DUMBBELL),
                ex("Cable Fly", MuscleGroup.CHEST, Set.of(), Equipment.CABLE),
                ex("Push-Up", MuscleGroup.CHEST, Set.of(MuscleGroup.TRICEPS, MuscleGroup.SHOULDERS), Equipment.BODYWEIGHT),
                ex("Chest Dip", MuscleGroup.CHEST, Set.of(MuscleGroup.TRICEPS), Equipment.BODYWEIGHT),

                // Back
                ex("Barbell Deadlift", MuscleGroup.BACK, Set.of(MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES, MuscleGroup.CORE), Equipment.BARBELL),
                ex("Pull-Up", MuscleGroup.BACK, Set.of(MuscleGroup.BICEPS), Equipment.BODYWEIGHT),
                ex("Chin-Up", MuscleGroup.BACK, Set.of(MuscleGroup.BICEPS), Equipment.BODYWEIGHT),
                ex("Barbell Row", MuscleGroup.BACK, Set.of(MuscleGroup.BICEPS), Equipment.BARBELL),
                ex("Dumbbell Row", MuscleGroup.BACK, Set.of(MuscleGroup.BICEPS), Equipment.DUMBBELL),
                ex("Cable Row", MuscleGroup.BACK, Set.of(MuscleGroup.BICEPS), Equipment.CABLE),
                ex("Lat Pulldown", MuscleGroup.BACK, Set.of(MuscleGroup.BICEPS), Equipment.CABLE),
                ex("T-Bar Row", MuscleGroup.BACK, Set.of(MuscleGroup.BICEPS), Equipment.BARBELL),

                // Shoulders
                ex("Barbell Overhead Press", MuscleGroup.SHOULDERS, Set.of(MuscleGroup.TRICEPS), Equipment.BARBELL),
                ex("Dumbbell Overhead Press", MuscleGroup.SHOULDERS, Set.of(MuscleGroup.TRICEPS), Equipment.DUMBBELL),
                ex("Dumbbell Lateral Raise", MuscleGroup.SHOULDERS, Set.of(), Equipment.DUMBBELL),
                ex("Cable Lateral Raise", MuscleGroup.SHOULDERS, Set.of(), Equipment.CABLE),
                ex("Dumbbell Front Raise", MuscleGroup.SHOULDERS, Set.of(), Equipment.DUMBBELL),
                ex("Face Pull", MuscleGroup.SHOULDERS, Set.of(MuscleGroup.BACK), Equipment.CABLE),
                ex("Arnold Press", MuscleGroup.SHOULDERS, Set.of(MuscleGroup.TRICEPS), Equipment.DUMBBELL),

                // Biceps
                ex("Barbell Curl", MuscleGroup.BICEPS, Set.of(), Equipment.BARBELL),
                ex("Dumbbell Curl", MuscleGroup.BICEPS, Set.of(), Equipment.DUMBBELL),
                ex("Hammer Curl", MuscleGroup.BICEPS, Set.of(), Equipment.DUMBBELL),
                ex("Incline Dumbbell Curl", MuscleGroup.BICEPS, Set.of(), Equipment.DUMBBELL),
                ex("Cable Curl", MuscleGroup.BICEPS, Set.of(), Equipment.CABLE),
                ex("Preacher Curl", MuscleGroup.BICEPS, Set.of(), Equipment.MACHINE),

                // Triceps
                ex("Close-Grip Bench Press", MuscleGroup.TRICEPS, Set.of(MuscleGroup.CHEST), Equipment.BARBELL),
                ex("Tricep Pushdown", MuscleGroup.TRICEPS, Set.of(), Equipment.CABLE),
                ex("Overhead Tricep Extension", MuscleGroup.TRICEPS, Set.of(), Equipment.DUMBBELL),
                ex("Skull Crusher", MuscleGroup.TRICEPS, Set.of(), Equipment.BARBELL),
                ex("Tricep Dip", MuscleGroup.TRICEPS, Set.of(), Equipment.BODYWEIGHT),

                // Legs
                ex("Barbell Back Squat", MuscleGroup.QUADRICEPS, Set.of(MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS), Equipment.BARBELL),
                ex("Barbell Front Squat", MuscleGroup.QUADRICEPS, Set.of(MuscleGroup.GLUTES), Equipment.BARBELL),
                ex("Leg Press", MuscleGroup.QUADRICEPS, Set.of(MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS), Equipment.MACHINE),
                ex("Hack Squat", MuscleGroup.QUADRICEPS, Set.of(MuscleGroup.GLUTES), Equipment.MACHINE),
                ex("Leg Extension", MuscleGroup.QUADRICEPS, Set.of(), Equipment.MACHINE),
                ex("Romanian Deadlift", MuscleGroup.HAMSTRINGS, Set.of(MuscleGroup.GLUTES, MuscleGroup.BACK), Equipment.BARBELL),
                ex("Leg Curl", MuscleGroup.HAMSTRINGS, Set.of(), Equipment.MACHINE),
                ex("Nordic Curl", MuscleGroup.HAMSTRINGS, Set.of(), Equipment.BODYWEIGHT),
                ex("Hip Thrust", MuscleGroup.GLUTES, Set.of(MuscleGroup.HAMSTRINGS), Equipment.BARBELL),
                ex("Bulgarian Split Squat", MuscleGroup.GLUTES, Set.of(MuscleGroup.QUADRICEPS), Equipment.DUMBBELL),
                ex("Walking Lunge", MuscleGroup.QUADRICEPS, Set.of(MuscleGroup.GLUTES), Equipment.DUMBBELL),
                ex("Standing Calf Raise", MuscleGroup.CALVES, Set.of(), Equipment.MACHINE),
                ex("Seated Calf Raise", MuscleGroup.CALVES, Set.of(), Equipment.MACHINE),

                // Core
                ex("Plank", MuscleGroup.CORE, Set.of(), Equipment.BODYWEIGHT),
                ex("Ab Rollout", MuscleGroup.CORE, Set.of(), Equipment.BODYWEIGHT),
                ex("Hanging Leg Raise", MuscleGroup.CORE, Set.of(), Equipment.BODYWEIGHT),
                ex("Cable Crunch", MuscleGroup.CORE, Set.of(), Equipment.CABLE),
                ex("Russian Twist", MuscleGroup.CORE, Set.of(), Equipment.BODYWEIGHT)
        );

        exerciseRepository.saveAll(exercises);
    }

    private Exercise ex(String name, MuscleGroup primary, Set<MuscleGroup> secondary, Equipment equipment) {
        Exercise e = new Exercise();
        e.setName(name);
        e.setPrimaryMuscleGroup(primary);
        e.setSecondaryMuscleGroups(secondary);
        e.setEquipment(equipment);
        e.setSystem(true);
        return e;
    }
}
