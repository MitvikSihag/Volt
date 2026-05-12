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
import com.volt.workout.dto.PersonalRecordResponse;
import com.volt.workout.dto.UpdateWorkoutRequest;
import com.volt.workout.dto.WorkoutResponse;
import com.volt.workout.dto.WorkoutSetResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

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

        Workout workout = new Workout();
        workout.setUser(user);
        workout.setTitle(request.title());
        workout.setNotes(request.notes());
        workout.setStartedAt(request.startedAt());
        workout.setCompletedAt(request.completedAt());

        if (request.exercises() != null) {
            int order = 0;
            for (CreateWorkoutExerciseRequest exerciseReq : request.exercises()) {
                Exercise exercise = findAccessibleExercise(username, exerciseReq.exerciseId());
                for (CreateWorkoutSetRequest setReq : exerciseReq.sets()) {
                    WorkoutSet set = buildSet(workout, exercise, order++, setReq.setType(),
                            setReq.reps(), setReq.weightKg(), setReq.durationSeconds(),
                            setReq.distanceMeters(), setReq.rpe(), setReq.notes());
                    workout.getSets().add(set);
                }
            }
        }

        Workout saved = workoutRepository.save(workout);

        if (request.exercises() != null) {
            for (WorkoutSet s : saved.getSets()) {
                checkAndUpdatePr(user, s);
            }
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
        if (request.completedAt() != null) workout.setCompletedAt(request.completedAt());

        return WorkoutResponse.from(workoutRepository.save(workout));
    }

    public void delete(String username, UUID id) {
        Workout workout = findActive(id);
        assertOwner(username, workout);
        workout.setDeletedAt(Instant.now());
        workoutRepository.save(workout);
    }

    public WorkoutSetResponse addSet(String username, UUID workoutId, AddSetRequest request) {
        Workout workout = findActive(workoutId);
        assertOwner(username, workout);

        Exercise exercise = findAccessibleExercise(username, request.exerciseId());
        int order = workout.getSets().size();

        WorkoutSet set = buildSet(workout, exercise, order,
                request.setType(), request.reps(), request.weightKg(),
                request.durationSeconds(), request.distanceMeters(),
                request.rpe(), request.notes());

        workout.getSets().add(set);
        workoutRepository.save(workout);

        WorkoutSet saved = workout.getSets().get(workout.getSets().size() - 1);
        checkAndUpdatePr(workout.getUser(), saved);

        return WorkoutSetResponse.from(saved);
    }

    public WorkoutSetResponse updateSet(String username, UUID workoutId, UUID setId,
                                        com.volt.workout.dto.CreateWorkoutSetRequest request) {
        Workout workout = findActive(workoutId);
        assertOwner(username, workout);

        WorkoutSet set = findSet(workout, setId);
        applySetFields(set, request.setType(), request.reps(), request.weightKg(),
                request.durationSeconds(), request.distanceMeters(), request.rpe(), request.notes());

        workoutRepository.save(workout);
        checkAndUpdatePr(workout.getUser(), set);

        return WorkoutSetResponse.from(set);
    }

    public void removeSet(String username, UUID workoutId, UUID setId) {
        Workout workout = findActive(workoutId);
        assertOwner(username, workout);

        WorkoutSet set = findSet(workout, setId);
        workout.getSets().remove(set);

        reorderSets(workout.getSets());
        workoutRepository.save(workout);
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
    public List<PersonalRecordResponse> getPersonalRecords(String username, UUID exerciseId) {
        User user = getUser(username);
        Exercise exercise = findAccessibleExerciseEntity(username, exerciseId);
        return prRepository.findByUserAndExercise(user, exercise)
                .stream().map(PersonalRecordResponse::from).toList();
    }

    private void checkAndUpdatePr(User user, WorkoutSet set) {
        Exercise exercise = set.getExercise();

        if (set.getWeightKg() != null && set.getWeightKg() > 0) {
            updatePr(user, exercise, PersonalRecordType.MAX_WEIGHT, set.getWeightKg(), set);
        }

        if (set.getReps() != null && set.getReps() > 0 && set.getWeightKg() != null && set.getWeightKg() > 0) {
            double epley = set.getWeightKg() * (1 + set.getReps() / 30.0);
            updatePr(user, exercise, PersonalRecordType.ONE_REP_MAX, epley, set);
        }

        double workoutVolume = set.getWorkout().getSets().stream()
                .filter(s -> s.getExercise().getId().equals(exercise.getId())
                        && s.getReps() != null && s.getWeightKg() != null)
                .mapToDouble(s -> s.getReps() * s.getWeightKg())
                .sum();
        if (workoutVolume > 0) {
            updatePr(user, exercise, PersonalRecordType.MAX_VOLUME, workoutVolume, set);
        }
    }

    private void updatePr(User user, Exercise exercise, PersonalRecordType type,
                           double newValue, WorkoutSet set) {
        prRepository.findByUserAndExerciseAndType(user, exercise, type).ifPresentOrElse(
                pr -> {
                    if (newValue > pr.getValue()) {
                        pr.setValue(newValue);
                        pr.setAchievedAt(set.getWorkout().getStartedAt());
                        pr.setWorkoutSet(set);
                        prRepository.save(pr);
                    }
                },
                () -> {
                    PersonalRecord pr = new PersonalRecord();
                    pr.setUser(user);
                    pr.setExercise(exercise);
                    pr.setType(type);
                    pr.setValue(newValue);
                    pr.setAchievedAt(set.getWorkout().getStartedAt());
                    pr.setWorkoutSet(set);
                    prRepository.save(pr);
                }
        );
    }

    private WorkoutSet buildSet(Workout workout, Exercise exercise, int order,
                                 SetType setType, Integer reps, Double weightKg,
                                 Integer durationSeconds, Double distanceMeters,
                                 Integer rpe, String notes) {
        WorkoutSet set = new WorkoutSet();
        set.setWorkout(workout);
        set.setExercise(exercise);
        set.setSetOrder(order);
        applySetFields(set, setType, reps, weightKg, durationSeconds, distanceMeters, rpe, notes);
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

    private void reorderSets(List<WorkoutSet> sets) {
        for (int i = 0; i < sets.size(); i++) {
            sets.get(i).setSetOrder(i);
        }
    }

    private WorkoutSet findSet(Workout workout, UUID setId) {
        return workout.getSets().stream()
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
