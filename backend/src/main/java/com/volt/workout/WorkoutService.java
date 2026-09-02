package com.volt.workout;

import com.volt.common.dto.PageResponse;
import com.volt.common.exception.ApiException;
import com.volt.common.exception.ResourceNotFoundException;
import com.volt.user.User;
import com.volt.user.UserRepository;
import com.volt.workout.dto.AddSetRequest;
import com.volt.workout.dto.CreateWorkoutExerciseRequest;
import com.volt.workout.dto.CreateWorkoutRequest;
import com.volt.workout.dto.CreateWorkoutSetRequest;
import com.volt.workout.dto.LastSetResponse;
import com.volt.workout.dto.UpdateWorkoutRequest;
import com.volt.workout.dto.WorkoutResponse;
import com.volt.workout.dto.WorkoutSetResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkoutService {

    private final WorkoutRepository workoutRepository;
    private final WorkoutSetRepository workoutSetRepository;
    private final ExerciseRepository exerciseRepository;
    private final PersonalRecordService prService;
    private final UserRepository userRepository;

    public WorkoutService(WorkoutRepository workoutRepository,
                          WorkoutSetRepository workoutSetRepository,
                          ExerciseRepository exerciseRepository,
                          PersonalRecordService prService,
                          UserRepository userRepository) {
        this.workoutRepository = workoutRepository;
        this.workoutSetRepository = workoutSetRepository;
        this.exerciseRepository = exerciseRepository;
        this.prService = prService;
        this.userRepository = userRepository;
    }

    public WorkoutResponse create(String username, CreateWorkoutRequest request) {
        User user = getUser(username);
        validateWorkoutTimes(request.startedAt(), request.completedAt());

        Workout workout = new Workout();
        workout.setUser(user);
        workout.setTitle(request.title());
        workout.setNotes(request.notes());
        workout.setStartedAt(request.startedAt());
        workout.setCompletedAt(request.completedAt());

        if (request.exercises() != null) {
            int position = 0;
            for (CreateWorkoutExerciseRequest exerciseReq : request.exercises()) {
                Exercise exercise = findAccessibleExercise(username, exerciseReq.exerciseId());
                WorkoutExercise workoutExercise = new WorkoutExercise();
                workoutExercise.setWorkout(workout);
                workoutExercise.setExercise(exercise);
                workoutExercise.setPosition(position++);
                workoutExercise.setNotes(exerciseReq.notes());
                workoutExercise.setRestSeconds(exerciseReq.restSeconds());

                int setNumber = 1;
                for (CreateWorkoutSetRequest setReq : exerciseReq.sets()) {
                    WorkoutSet set = buildSet(workoutExercise, setNumber++, setReq.setType(),
                            setReq.reps(), setReq.weightKg(), setReq.durationSeconds(),
                            setReq.distanceMeters(), setReq.rpe(), setReq.notes(), setReq.completedAt());
                    workoutExercise.getSets().add(set);
                }
                workout.getExercises().add(workoutExercise);
            }
        }

        Workout saved = workoutRepository.save(workout);

        if (request.exercises() != null) {
            saved.getAllSets().stream()
                    .map(WorkoutSet::getExercise)
                    .collect(Collectors.toCollection(HashSet::new))
                    .forEach(exercise -> prService.recomputePersonalRecords(user, exercise));
        }

        return WorkoutResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<WorkoutResponse> list(String username, int page, int size) {
        User user = getUser(username);
        return PageResponse.from(
                workoutRepository.findByUserAndDeletedAtIsNullOrderByStartedAtDesc(
                        user, PageRequest.of(page, size))
                        .map(WorkoutResponse::from));
    }

    @Transactional(readOnly = true)
    public WorkoutResponse getById(String username, UUID id) {
        Workout workout = findActive(id);
        assertOwner(username, workout);
        return WorkoutResponse.from(workout);
    }

    public WorkoutResponse update(String username, UUID id, UpdateWorkoutRequest request) {
        Workout workout = findActive(id);
        assertOwner(username, workout);

        if (request.title() != null) workout.setTitle(request.title());
        if (request.notes() != null) workout.setNotes(request.notes());
        if (request.completedAt() != null) {
            validateWorkoutTimes(workout.getStartedAt(), request.completedAt());
            workout.setCompletedAt(request.completedAt());
        }

        return WorkoutResponse.from(workoutRepository.save(workout));
    }

    public void delete(String username, UUID id) {
        Workout workout = findActive(id);
        assertOwner(username, workout);
        workout.setDeletedAt(Instant.now());
        workoutRepository.save(workout);

        workout.getAllSets().stream()
                .map(WorkoutSet::getExercise)
                .collect(Collectors.toCollection(HashSet::new))
                .forEach(exercise -> prService.recomputePersonalRecords(workout.getUser(), exercise));
    }

    public WorkoutSetResponse addSet(String username, UUID workoutId, AddSetRequest request) {
        Workout workout = findActive(workoutId);
        assertOwner(username, workout);

        Exercise exercise = findAccessibleExercise(username, request.exerciseId());

        WorkoutExercise workoutExercise = workout.getExercises().stream()
                .filter(we -> we.getExercise().getId().equals(exercise.getId()))
                .findFirst()
                .orElse(null);

        if (workoutExercise == null) {
            workoutExercise = new WorkoutExercise();
            workoutExercise.setWorkout(workout);
            workoutExercise.setExercise(exercise);
            workoutExercise.setPosition(workout.getExercises().size());
            workout.getExercises().add(workoutExercise);
        }

        int setNumber = workoutExercise.getSets().size() + 1;
        WorkoutSet set = buildSet(workoutExercise, setNumber,
                request.setType(), request.reps(), request.weightKg(),
                request.durationSeconds(), request.distanceMeters(),
                request.rpe(), request.notes(), null);

        workoutExercise.getSets().add(set);
        workoutRepository.save(workout);

        prService.recomputePersonalRecords(workout.getUser(), exercise);

        return WorkoutSetResponse.from(set);
    }

    public WorkoutSetResponse updateSet(String username, UUID workoutId, UUID setId,
                                        com.volt.workout.dto.CreateWorkoutSetRequest request) {
        Workout workout = findActive(workoutId);
        assertOwner(username, workout);

        WorkoutSet set = findSet(workout, setId);
        applySetFields(set, request.setType(), request.reps(), request.weightKg(),
                request.durationSeconds(), request.distanceMeters(), request.rpe(), request.notes());

        workoutRepository.save(workout);
        prService.recomputePersonalRecords(workout.getUser(), set.getExercise());

        return WorkoutSetResponse.from(set);
    }

    public void removeSet(String username, UUID workoutId, UUID setId) {
        Workout workout = findActive(workoutId);
        assertOwner(username, workout);

        WorkoutSet set = findSet(workout, setId);
        prService.clearPrReferences(set);
        WorkoutExercise workoutExercise = set.getWorkoutExercise();
        Exercise exercise = workoutExercise.getExercise();

        workoutExercise.getSets().remove(set);
        renumberSets(workoutExercise.getSets());

        if (workoutExercise.getSets().isEmpty()) {
            workout.getExercises().remove(workoutExercise);
            reposition(workout.getExercises());
        }

        workoutRepository.save(workout);
        prService.recomputePersonalRecords(workout.getUser(), exercise);
    }

    @Transactional(readOnly = true)
    public List<WorkoutSetResponse> getExerciseHistory(String username, UUID exerciseId,
                                                        int page, int size) {
        User user = getUser(username);
        Exercise exercise = findAccessibleExerciseEntity(username, exerciseId);
        return workoutSetRepository
                .findHistoryByExerciseAndUser(exercise.getId(), user, PageRequest.of(page, size))
                .stream().map(WorkoutSetResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<LastSetResponse> getLastSets(String username, List<UUID> exerciseIds) {
        if (exerciseIds == null || exerciseIds.isEmpty()) return List.of();
        User user = getUser(username);
        return workoutSetRepository.findLastSetsForExercises(exerciseIds, user)
                .stream()
                .collect(Collectors.toMap(
                        s -> s.getExercise().getId(),
                        s -> s,
                        (existing, ignored) -> existing,  // keep first = latest workout, last set
                        LinkedHashMap::new
                ))
                .entrySet().stream()
                .map(e -> LastSetResponse.from(e.getKey(), e.getValue()))
                .toList();
    }

    private WorkoutSet buildSet(WorkoutExercise workoutExercise, int setNumber,
                                 SetType setType, Integer reps, Double weightKg,
                                 Integer durationSeconds, Double distanceMeters,
                                 Integer rpe, String notes, Instant completedAt) {
        WorkoutSet set = new WorkoutSet();
        set.setWorkoutExercise(workoutExercise);
        set.setSetNumber(setNumber);
        applySetFields(set, setType, reps, weightKg, durationSeconds, distanceMeters, rpe, notes);
        if (completedAt != null) set.setCompletedAt(completedAt);
        return set;
    }

    private void applySetFields(WorkoutSet set, SetType setType, Integer reps, Double weightKg,
                                 Integer durationSeconds, Double distanceMeters,
                                 Integer rpe, String notes) {
        if (setType != null) set.setSetType(setType);
        if (reps != null) set.setReps(reps);
        if (weightKg != null) set.setWeightKg(weightKg);
        if (durationSeconds != null) set.setDurationSeconds(durationSeconds);
        if (distanceMeters != null) set.setDistanceMeters(distanceMeters);
        if (rpe != null) set.setRpe(rpe);
        if (notes != null) set.setNotes(notes);
    }

    private void renumberSets(List<WorkoutSet> sets) {
        for (int i = 0; i < sets.size(); i++) {
            sets.get(i).setSetNumber(i + 1);
        }
    }

    private void reposition(List<WorkoutExercise> exercises) {
        for (int i = 0; i < exercises.size(); i++) {
            exercises.get(i).setPosition(i);
        }
    }

    private void validateWorkoutTimes(Instant startedAt, Instant completedAt) {
        if (completedAt != null && completedAt.isBefore(startedAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Workout completedAt cannot be before startedAt");
        }
    }

    private WorkoutSet findSet(Workout workout, UUID setId) {
        return workout.getAllSets().stream()
                .filter(s -> s.getId().equals(setId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Set not found"));
    }

    private Workout findActive(UUID id) {
        return workoutRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workout not found"));
    }

    private Exercise findAccessibleExercise(String username, UUID exerciseId) {
        return findAccessibleExerciseEntity(username, exerciseId);
    }

    private Exercise findAccessibleExerciseEntity(String username, UUID exerciseId) {
        Exercise exercise = exerciseRepository.findByIdAndDeletedAtIsNull(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        if (!exercise.isSystem() && (exercise.getCreatedBy() == null
                || !exercise.getCreatedBy().getUsername().equals(username))) {
            throw new ResourceNotFoundException("Exercise not found");
        }
        return exercise;
    }

    private void assertOwner(String username, Workout workout) {
        if (!workout.getUser().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

}
