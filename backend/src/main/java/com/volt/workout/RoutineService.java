package com.volt.workout;

import com.volt.common.exception.ApiException;
import com.volt.common.exception.ResourceNotFoundException;
import com.volt.user.User;
import com.volt.user.UserLookup;
import com.volt.workout.dto.CreateRoutineExerciseRequest;
import com.volt.workout.dto.CreateRoutineRequest;
import com.volt.workout.dto.RoutineResponse;
import com.volt.workout.dto.WorkoutResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class RoutineService {

    private final RoutineRepository routineRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserLookup userLookup;
    private final WorkoutRepository workoutRepository;
    private final Clock clock;

    public RoutineService(RoutineRepository routineRepository,
                          ExerciseRepository exerciseRepository,
                          UserLookup userLookup,
                          WorkoutRepository workoutRepository,
                          Clock clock) {
        this.routineRepository = routineRepository;
        this.exerciseRepository = exerciseRepository;
        this.userLookup = userLookup;
        this.workoutRepository = workoutRepository;
        this.clock = clock;
    }

    public RoutineResponse create(String username, CreateRoutineRequest request) {
        User user = userLookup.require(username);

        Routine routine = new Routine();
        routine.setUser(user);
        routine.setName(request.name());
        routine.setNotes(request.notes());

        applyExercises(username, routine, request.exercises());

        return RoutineResponse.from(routineRepository.save(routine));
    }

    @Transactional(readOnly = true)
    public List<RoutineResponse> list(String username) {
        User user = userLookup.require(username);
        return routineRepository.findByUserAndDeletedAtIsNullOrderByCreatedAtDesc(user)
                .stream().map(RoutineResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RoutineResponse getById(String username, UUID id) {
        Routine routine = findActive(id);
        assertOwner(username, routine);
        return RoutineResponse.from(routine);
    }

    public RoutineResponse update(String username, UUID id, CreateRoutineRequest request) {
        Routine routine = findActive(id);
        assertOwner(username, routine);

        routine.setName(request.name());
        routine.setNotes(request.notes());
        routine.getExercises().clear();
        applyExercises(username, routine, request.exercises());

        return RoutineResponse.from(routineRepository.save(routine));
    }

    public void delete(String username, UUID id) {
        Routine routine = findActive(id);
        assertOwner(username, routine);
        routine.setDeletedAt(Instant.now(clock));
        routineRepository.save(routine);
    }

    public WorkoutResponse start(String username, UUID id) {
        Routine routine = findActive(id);
        assertOwner(username, routine);

        Workout workout = new Workout();
        workout.setUser(routine.getUser());
        workout.setTitle(routine.getName());
        workout.setNotes(routine.getNotes());
        workout.setStartedAt(Instant.now(clock));
        workout.setCompletedAt(null);

        for (RoutineExercise routineExercise : routine.getExercises()) {
            WorkoutExercise workoutExercise = new WorkoutExercise();
            workoutExercise.setWorkout(workout);
            workoutExercise.setExercise(routineExercise.getExercise());
            workoutExercise.setPosition(routineExercise.getPosition());
            workoutExercise.setNotes(routineExercise.getNotes());
            workoutExercise.setRestSeconds(routineExercise.getRestSeconds());

            Integer targetSets = routineExercise.getTargetSets();
            if (targetSets != null) {
                for (int setNumber = 1; setNumber <= targetSets; setNumber++) {
                    WorkoutSet set = new WorkoutSet();
                    set.setWorkoutExercise(workoutExercise);
                    set.setSetNumber(setNumber);
                    set.setSetType(SetType.NORMAL);
                    set.setReps(null);
                    set.setWeightKg(null);
                    set.setCompletedAt(null);
                    set.setPr(false);
                    workoutExercise.getSets().add(set);
                }
            }
            workout.getExercises().add(workoutExercise);
        }

        Workout saved = workoutRepository.save(workout);
        return WorkoutResponse.from(saved);
    }

    private void applyExercises(String username, Routine routine,
                               List<CreateRoutineExerciseRequest> requests) {
        if (requests == null) return;
        int position = 0;
        for (CreateRoutineExerciseRequest req : requests) {
            Exercise exercise = findAccessibleExercise(username, req.exerciseId());
            RoutineExercise routineExercise = new RoutineExercise();
            routineExercise.setRoutine(routine);
            routineExercise.setExercise(exercise);
            routineExercise.setPosition(position++);
            routineExercise.setTargetSets(req.targetSets());
            routineExercise.setTargetReps(req.targetReps());
            routineExercise.setRestSeconds(req.restSeconds());
            routineExercise.setNotes(req.notes());
            routine.getExercises().add(routineExercise);
        }
    }

    private Routine findActive(UUID id) {
        return routineRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Routine not found"));
    }

    private Exercise findAccessibleExercise(String username, UUID exerciseId) {
        Exercise exercise = exerciseRepository.findByIdAndDeletedAtIsNull(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        if (!exercise.isSystem() && (exercise.getCreatedBy() == null
                || !exercise.getCreatedBy().getUsername().equals(username))) {
            throw new ResourceNotFoundException("Exercise not found");
        }
        return exercise;
    }

    private void assertOwner(String username, Routine routine) {
        if (!routine.getUser().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }
    }

    }
