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
import com.volt.workout.dto.ExerciseRecordsResponse;
import com.volt.workout.dto.LastSetResponse;
import com.volt.workout.dto.PersonalRecordResponse;
import com.volt.workout.dto.ProgressionPointResponse;
import com.volt.workout.dto.UpdateWorkoutRequest;
import com.volt.workout.dto.WorkoutResponse;
import com.volt.workout.dto.WorkoutSetResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkoutService {

    private final WorkoutRepository workoutRepository;
    private final WorkoutSetRepository workoutSetRepository;
    private final ExerciseRepository exerciseRepository;
    private final PersonalRecordRepository prRepository;
    private final UserRepository userRepository;

    public WorkoutService(WorkoutRepository workoutRepository,
                          WorkoutSetRepository workoutSetRepository,
                          ExerciseRepository exerciseRepository,
                          PersonalRecordRepository prRepository,
                          UserRepository userRepository) {
        this.workoutRepository = workoutRepository;
        this.workoutSetRepository = workoutSetRepository;
        this.exerciseRepository = exerciseRepository;
        this.prRepository = prRepository;
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
                    .forEach(exercise -> recomputePersonalRecords(user, exercise));
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
                .forEach(exercise -> recomputePersonalRecords(workout.getUser(), exercise));
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

        recomputePersonalRecords(workout.getUser(), exercise);

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
        recomputePersonalRecords(workout.getUser(), set.getExercise());

        return WorkoutSetResponse.from(set);
    }

    public void removeSet(String username, UUID workoutId, UUID setId) {
        Workout workout = findActive(workoutId);
        assertOwner(username, workout);

        WorkoutSet set = findSet(workout, setId);
        clearPrReferences(set);
        WorkoutExercise workoutExercise = set.getWorkoutExercise();
        Exercise exercise = workoutExercise.getExercise();

        workoutExercise.getSets().remove(set);
        renumberSets(workoutExercise.getSets());

        if (workoutExercise.getSets().isEmpty()) {
            workout.getExercises().remove(workoutExercise);
            reposition(workout.getExercises());
        }

        workoutRepository.save(workout);
        recomputePersonalRecords(workout.getUser(), exercise);
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

    @Transactional(readOnly = true)
    public List<PersonalRecordResponse> getPersonalRecords(String username, UUID exerciseId) {
        User user = getUser(username);
        Exercise exercise = findAccessibleExerciseEntity(username, exerciseId);
        return prRepository.findByUserAndExercise(user, exercise)
                .stream().map(PersonalRecordResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ExerciseRecordsResponse> getRecordsGrid(String username) {
        User user = getUser(username);
        Map<Exercise, List<PersonalRecord>> byExercise = prRepository.findByUser(user).stream()
                .collect(Collectors.groupingBy(PersonalRecord::getExercise,
                        LinkedHashMap::new, Collectors.toList()));
        return byExercise.entrySet().stream()
                .map(entry -> new ExerciseRecordsResponse(
                        entry.getKey().getId(),
                        entry.getKey().getName(),
                        entry.getValue().stream().map(PersonalRecordResponse::from).toList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProgressionPointResponse> getProgression(String username, UUID exerciseId) {
        User user = getUser(username);
        Exercise exercise = findAccessibleExerciseEntity(username, exerciseId);
        List<WorkoutSet> sets = workoutSetRepository.findAllByExerciseAndUser(exercise.getId(), user);
        if (sets.isEmpty()) return List.of();

        Map<Workout, List<WorkoutSet>> byWorkout = sets.stream()
                .collect(Collectors.groupingBy(WorkoutSet::getWorkout, LinkedHashMap::new, Collectors.toList()));

        return byWorkout.entrySet().stream()
                .map(entry -> {
                    Workout workout = entry.getKey();
                    List<WorkoutSet> workoutSets = entry.getValue();

                    double estimatedOneRepMax = workoutSets.stream()
                            .filter(s -> s.getReps() != null && s.getReps() > 0
                                    && s.getWeightKg() != null && s.getWeightKg() > 0)
                            .mapToDouble(s -> s.getWeightKg() * (1 + s.getReps() / 30.0))
                            .max().orElse(0.0);

                    Double bestWeightKg = workoutSets.stream()
                            .filter(s -> s.getWeightKg() != null)
                            .map(WorkoutSet::getWeightKg)
                            .max(Comparator.naturalOrder())
                            .orElse(null);

                    double volumeKg = workoutSets.stream()
                            .filter(s -> s.getReps() != null && s.getWeightKg() != null)
                            .mapToDouble(s -> s.getReps() * s.getWeightKg())
                            .sum();

                    return new ProgressionPointResponse(
                            workout.getStartedAt(), estimatedOneRepMax, bestWeightKg, volumeKg);
                })
                .sorted(Comparator.comparing(ProgressionPointResponse::date))
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

    private void recomputePersonalRecords(User user, Exercise exercise) {
        List<WorkoutSet> sets = workoutSetRepository.findAllByExerciseAndUser(exercise.getId(), user);
        List<PersonalRecord> existing = prRepository.findByUserAndExercise(user, exercise);
        Map<PersonalRecordType, PersonalRecord> existingByType = existing.stream()
                .collect(Collectors.toMap(PersonalRecord::getType, pr -> pr, (left, ignored) -> left,
                        () -> new EnumMap<>(PersonalRecordType.class)));

        syncPr(existingByType, user, exercise, PersonalRecordType.MAX_WEIGHT,
                sets.stream()
                        .filter(s -> s.getWeightKg() != null && s.getWeightKg() > 0)
                        .max(Comparator.comparing(WorkoutSet::getWeightKg))
                        .map(set -> new PrComputation(set.getWeightKg(), set.getWorkout().getStartedAt(), set)));

        syncPr(existingByType, user, exercise, PersonalRecordType.ONE_REP_MAX,
                sets.stream()
                        .filter(s -> s.getReps() != null && s.getReps() > 0
                                && s.getWeightKg() != null && s.getWeightKg() > 0)
                        .max(Comparator.comparingDouble(
                                s -> s.getWeightKg() * (1 + s.getReps() / 30.0)))
                        .map(set -> new PrComputation(
                                set.getWeightKg() * (1 + set.getReps() / 30.0),
                                set.getWorkout().getStartedAt(),
                                set)));

        Map<Workout, List<WorkoutSet>> setsByWorkout = sets.stream()
                .collect(Collectors.groupingBy(WorkoutSet::getWorkout));
        syncPr(existingByType, user, exercise, PersonalRecordType.MAX_VOLUME,
                setsByWorkout.entrySet().stream()
                        .map(entry -> {
                            double volume = entry.getValue().stream()
                                    .filter(s -> s.getReps() != null && s.getWeightKg() != null)
                                    .mapToDouble(s -> s.getReps() * s.getWeightKg())
                                    .sum();
                            WorkoutSet representativeSet = entry.getValue().stream()
                                    .max(Comparator.comparingInt(WorkoutSet::getSetNumber))
                                    .orElse(null);
                            return volume > 0 && representativeSet != null
                                    ? new PrComputation(volume, entry.getKey().getStartedAt(), representativeSet)
                                    : null;
                        })
                        .filter(computation -> computation != null)
                        .max(Comparator.comparingDouble(PrComputation::value)));

        syncPr(existingByType, user, exercise, PersonalRecordType.MAX_REPS_AT_WEIGHT,
                sets.stream()
                        .filter(s -> s.getReps() != null && s.getReps() > 0
                                && s.getWeightKg() != null && s.getWeightKg() > 0)
                        .max(Comparator.comparingInt(WorkoutSet::getReps)
                                .thenComparingDouble(WorkoutSet::getWeightKg))
                        .map(set -> new PrComputation(set.getReps(), set.getWorkout().getStartedAt(), set)));

        Set<UUID> prSetIds = prRepository.findByUserAndExercise(user, exercise).stream()
                .map(PersonalRecord::getWorkoutSet)
                .filter(ws -> ws != null)
                .map(WorkoutSet::getId)
                .collect(Collectors.toSet());
        sets.forEach(s -> s.setPr(prSetIds.contains(s.getId())));
    }

    private void syncPr(Map<PersonalRecordType, PersonalRecord> existingByType,
                        User user,
                        Exercise exercise,
                        PersonalRecordType type,
                        Optional<PrComputation> computation) {
        PersonalRecord current = existingByType.get(type);
        if (computation.isEmpty()) {
            if (current != null) {
                prRepository.delete(current);
            }
            return;
        }

        PrComputation result = computation.get();
        PersonalRecord pr = current != null ? current : new PersonalRecord();
        pr.setUser(user);
        pr.setExercise(exercise);
        pr.setType(type);
        pr.setValue(result.value());
        pr.setAchievedAt(result.achievedAt());
        pr.setWorkoutSet(result.workoutSet());
        prRepository.save(pr);
    }

    private void clearPrReferences(WorkoutSet set) {
        prRepository.findByWorkoutSet(set).forEach(pr -> pr.setWorkoutSet(null));
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

    private record PrComputation(double value, Instant achievedAt, WorkoutSet workoutSet) {}
}
