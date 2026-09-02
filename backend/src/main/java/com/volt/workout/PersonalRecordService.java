package com.volt.workout;

import com.volt.common.exception.ResourceNotFoundException;
import com.volt.load.TrainingMath;
import com.volt.user.User;
import com.volt.user.UserRepository;
import com.volt.workout.dto.ExerciseRecordsResponse;
import com.volt.workout.dto.PersonalRecordResponse;
import com.volt.workout.dto.ProgressionPointResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PersonalRecordService {

    private final WorkoutSetRepository workoutSetRepository;
    private final PersonalRecordRepository prRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;

    public PersonalRecordService(WorkoutSetRepository workoutSetRepository,
                                 PersonalRecordRepository prRepository,
                                 ExerciseRepository exerciseRepository,
                                 UserRepository userRepository) {
        this.workoutSetRepository = workoutSetRepository;
        this.prRepository = prRepository;
        this.exerciseRepository = exerciseRepository;
        this.userRepository = userRepository;
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
                            .mapToDouble(s -> TrainingMath.epleyOneRepMax(s.getWeightKg(), s.getReps()))
                            .max().orElse(0.0);

                    Double bestWeightKg = workoutSets.stream()
                            .filter(s -> s.getWeightKg() != null)
                            .map(WorkoutSet::getWeightKg)
                            .max(Comparator.naturalOrder())
                            .orElse(null);

                    double volumeKg = workoutSets.stream()
                            .mapToDouble(s -> TrainingMath.setVolumeKg(s.getReps(), s.getWeightKg()))
                            .sum();

                    return new ProgressionPointResponse(
                            workout.getStartedAt(), estimatedOneRepMax, bestWeightKg, volumeKg);
                })
                .sorted(Comparator.comparing(ProgressionPointResponse::date))
                .toList();
    }

    public void recomputePersonalRecords(User user, Exercise exercise) {
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
                                s -> TrainingMath.epleyOneRepMax(s.getWeightKg(), s.getReps())))
                        .map(set -> new PrComputation(
                                TrainingMath.epleyOneRepMax(set.getWeightKg(), set.getReps()),
                                set.getWorkout().getStartedAt(),
                                set)));

        Map<Workout, List<WorkoutSet>> setsByWorkout = sets.stream()
                .collect(Collectors.groupingBy(WorkoutSet::getWorkout));
        syncPr(existingByType, user, exercise, PersonalRecordType.MAX_VOLUME,
                setsByWorkout.entrySet().stream()
                        .map(entry -> {
                            double volume = entry.getValue().stream()
                                    .mapToDouble(s -> TrainingMath.setVolumeKg(s.getReps(), s.getWeightKg()))
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

    public void clearPrReferences(WorkoutSet set) {
        prRepository.findByWorkoutSet(set).forEach(pr -> pr.setWorkoutSet(null));
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

    private Exercise findAccessibleExerciseEntity(String username, UUID exerciseId) {
        Exercise exercise = exerciseRepository.findByIdAndDeletedAtIsNull(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
        if (!exercise.isSystem() && (exercise.getCreatedBy() == null
                || !exercise.getCreatedBy().getUsername().equals(username))) {
            throw new ResourceNotFoundException("Exercise not found");
        }
        return exercise;
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private record PrComputation(double value, Instant achievedAt, WorkoutSet workoutSet) {}
}
