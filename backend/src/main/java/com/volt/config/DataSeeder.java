package com.volt.config;

import com.volt.workout.Equipment;
import com.volt.workout.Exercise;
import com.volt.workout.ExerciseRepository;
import com.volt.workout.MovementType;
import com.volt.workout.MuscleGroup;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

import static com.volt.workout.Equipment.*;
import static com.volt.workout.MovementType.*;
import static com.volt.workout.MuscleGroup.*;

@Component
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
                ex("Barbell Bench Press", CHEST, Set.of(TRICEPS, SHOULDERS), BARBELL, COMPOUND),
                ex("Incline Barbell Bench Press", CHEST, Set.of(TRICEPS, SHOULDERS), BARBELL, COMPOUND),
                ex("Decline Barbell Bench Press", CHEST, Set.of(TRICEPS), BARBELL, COMPOUND),
                ex("Dumbbell Bench Press", CHEST, Set.of(TRICEPS, SHOULDERS), DUMBBELL, COMPOUND),
                ex("Incline Dumbbell Bench Press", CHEST, Set.of(TRICEPS, SHOULDERS), DUMBBELL, COMPOUND),
                ex("Dumbbell Fly", CHEST, Set.of(), DUMBBELL, ISOLATION),
                ex("Cable Fly", CHEST, Set.of(), CABLE, ISOLATION),
                ex("Push-Up", CHEST, Set.of(TRICEPS, SHOULDERS), BODYWEIGHT, COMPOUND),
                ex("Chest Dip", CHEST, Set.of(TRICEPS), BODYWEIGHT, COMPOUND),
                ex("Machine Chest Press", CHEST, Set.of(TRICEPS), MACHINE, COMPOUND),

                // Back
                ex("Barbell Deadlift", BACK, Set.of(HAMSTRINGS, GLUTES, CORE), BARBELL, COMPOUND),
                ex("Sumo Deadlift", BACK, Set.of(GLUTES, QUADRICEPS), BARBELL, COMPOUND),
                ex("Pull-Up", BACK, Set.of(BICEPS), BODYWEIGHT, COMPOUND),
                ex("Chin-Up", BACK, Set.of(BICEPS), BODYWEIGHT, COMPOUND),
                ex("Barbell Row", BACK, Set.of(BICEPS), BARBELL, COMPOUND),
                ex("Pendlay Row", BACK, Set.of(BICEPS), BARBELL, COMPOUND),
                ex("Dumbbell Row", BACK, Set.of(BICEPS), DUMBBELL, COMPOUND),
                ex("Cable Row", BACK, Set.of(BICEPS), CABLE, COMPOUND),
                ex("Lat Pulldown", BACK, Set.of(BICEPS), CABLE, COMPOUND),
                ex("T-Bar Row", BACK, Set.of(BICEPS), BARBELL, COMPOUND),
                ex("Chest-Supported Row", BACK, Set.of(BICEPS), DUMBBELL, COMPOUND),

                // Shoulders
                ex("Barbell Overhead Press", SHOULDERS, Set.of(TRICEPS), BARBELL, COMPOUND),
                ex("Dumbbell Overhead Press", SHOULDERS, Set.of(TRICEPS), DUMBBELL, COMPOUND),
                ex("Arnold Press", SHOULDERS, Set.of(TRICEPS), DUMBBELL, COMPOUND),
                ex("Dumbbell Lateral Raise", SHOULDERS, Set.of(), DUMBBELL, ISOLATION),
                ex("Cable Lateral Raise", SHOULDERS, Set.of(), CABLE, ISOLATION),
                ex("Dumbbell Front Raise", SHOULDERS, Set.of(), DUMBBELL, ISOLATION),
                ex("Face Pull", SHOULDERS, Set.of(BACK), CABLE, COMPOUND),
                ex("Reverse Fly", SHOULDERS, Set.of(BACK), DUMBBELL, ISOLATION),
                ex("Machine Shoulder Press", SHOULDERS, Set.of(TRICEPS), MACHINE, COMPOUND),

                // Biceps
                ex("Barbell Curl", BICEPS, Set.of(), BARBELL, ISOLATION),
                ex("EZ-Bar Curl", BICEPS, Set.of(), BARBELL, ISOLATION),
                ex("Dumbbell Curl", BICEPS, Set.of(), DUMBBELL, ISOLATION),
                ex("Hammer Curl", BICEPS, Set.of(FOREARMS), DUMBBELL, ISOLATION),
                ex("Incline Dumbbell Curl", BICEPS, Set.of(), DUMBBELL, ISOLATION),
                ex("Cable Curl", BICEPS, Set.of(), CABLE, ISOLATION),
                ex("Preacher Curl", BICEPS, Set.of(), MACHINE, ISOLATION),
                ex("Concentration Curl", BICEPS, Set.of(), DUMBBELL, ISOLATION),

                // Triceps
                ex("Close-Grip Bench Press", TRICEPS, Set.of(CHEST), BARBELL, COMPOUND),
                ex("Tricep Pushdown", TRICEPS, Set.of(), CABLE, ISOLATION),
                ex("Overhead Tricep Extension", TRICEPS, Set.of(), DUMBBELL, ISOLATION),
                ex("Cable Overhead Extension", TRICEPS, Set.of(), CABLE, ISOLATION),
                ex("Skull Crusher", TRICEPS, Set.of(), BARBELL, ISOLATION),
                ex("Tricep Dip", TRICEPS, Set.of(CHEST), BODYWEIGHT, COMPOUND),
                ex("Tricep Kickback", TRICEPS, Set.of(), DUMBBELL, ISOLATION),

                // Quadriceps
                ex("Barbell Back Squat", QUADRICEPS, Set.of(GLUTES, HAMSTRINGS), BARBELL, COMPOUND),
                ex("Barbell Front Squat", QUADRICEPS, Set.of(GLUTES, CORE), BARBELL, COMPOUND),
                ex("Goblet Squat", QUADRICEPS, Set.of(GLUTES), DUMBBELL, COMPOUND),
                ex("Leg Press", QUADRICEPS, Set.of(GLUTES, HAMSTRINGS), MACHINE, COMPOUND),
                ex("Hack Squat", QUADRICEPS, Set.of(GLUTES), MACHINE, COMPOUND),
                ex("Leg Extension", QUADRICEPS, Set.of(), MACHINE, ISOLATION),
                ex("Walking Lunge", QUADRICEPS, Set.of(GLUTES), DUMBBELL, COMPOUND),
                ex("Step-Up", QUADRICEPS, Set.of(GLUTES), DUMBBELL, COMPOUND),

                // Hamstrings
                ex("Romanian Deadlift", HAMSTRINGS, Set.of(GLUTES, BACK), BARBELL, COMPOUND),
                ex("Dumbbell Romanian Deadlift", HAMSTRINGS, Set.of(GLUTES), DUMBBELL, COMPOUND),
                ex("Lying Leg Curl", HAMSTRINGS, Set.of(), MACHINE, ISOLATION),
                ex("Seated Leg Curl", HAMSTRINGS, Set.of(), MACHINE, ISOLATION),
                ex("Nordic Curl", HAMSTRINGS, Set.of(), BODYWEIGHT, ISOLATION),
                ex("Good Morning", HAMSTRINGS, Set.of(BACK, GLUTES), BARBELL, COMPOUND),

                // Glutes
                ex("Hip Thrust", GLUTES, Set.of(HAMSTRINGS), BARBELL, COMPOUND),
                ex("Bulgarian Split Squat", GLUTES, Set.of(QUADRICEPS), DUMBBELL, COMPOUND),
                ex("Cable Pull-Through", GLUTES, Set.of(HAMSTRINGS), CABLE, COMPOUND),
                ex("Glute Bridge", GLUTES, Set.of(HAMSTRINGS), BODYWEIGHT, ISOLATION),
                ex("Kettlebell Swing", GLUTES, Set.of(HAMSTRINGS, CORE), KETTLEBELL, COMPOUND),

                // Calves
                ex("Standing Calf Raise", CALVES, Set.of(), MACHINE, ISOLATION),
                ex("Seated Calf Raise", CALVES, Set.of(), MACHINE, ISOLATION),

                // Core
                ex("Plank", CORE, Set.of(), BODYWEIGHT, ISOLATION),
                ex("Ab Rollout", CORE, Set.of(), BODYWEIGHT, COMPOUND),
                ex("Hanging Leg Raise", CORE, Set.of(), BODYWEIGHT, ISOLATION),
                ex("Cable Crunch", CORE, Set.of(), CABLE, ISOLATION),
                ex("Russian Twist", CORE, Set.of(), BODYWEIGHT, ISOLATION),
                ex("Pallof Press", CORE, Set.of(), CABLE, ISOLATION),

                // Forearms
                ex("Wrist Curl", FOREARMS, Set.of(), BARBELL, ISOLATION),
                ex("Reverse Wrist Curl", FOREARMS, Set.of(), BARBELL, ISOLATION),
                ex("Farmer's Walk", FOREARMS, Set.of(CORE), DUMBBELL, COMPOUND),
                ex("Dead Hang", FOREARMS, Set.of(), BODYWEIGHT, ISOLATION)
        );

        exerciseRepository.saveAll(exercises);
    }

    private Exercise ex(String name, MuscleGroup primary, Set<MuscleGroup> secondary,
                        Equipment equipment, MovementType movement) {
        Exercise e = new Exercise();
        e.setName(name);
        e.setPrimaryMuscleGroup(primary);
        e.setSecondaryMuscleGroups(secondary);
        e.setEquipment(equipment);
        e.setMovementType(movement);
        e.setSystem(true);
        return e;
    }
}
