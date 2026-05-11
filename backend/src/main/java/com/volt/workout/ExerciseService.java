package com.volt.workout;

import com.volt.common.exception.ApiException;
import com.volt.common.exception.ResourceNotFoundException;
import com.volt.user.User;
import com.volt.user.UserRepository;
import com.volt.workout.dto.CreateExerciseRequest;
import com.volt.workout.dto.ExerciseResponse;
import com.volt.workout.dto.UpdateExerciseRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;

    public ExerciseService(ExerciseRepository exerciseRepository, UserRepository userRepository) {
        this.exerciseRepository = exerciseRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ExerciseResponse> list(String username, MuscleGroup muscleGroup, Equipment equipment) {
        User user = getUser(username);
        List<Exercise> exercises;

        if (muscleGroup != null && equipment != null) {
            exercises = exerciseRepository.findByMuscleGroupAndEquipment(user, muscleGroup, equipment);
        } else if (muscleGroup != null) {
            exercises = exerciseRepository.findByMuscleGroup(user, muscleGroup);
        } else if (equipment != null) {
            exercises = exerciseRepository.findByEquipment(user, equipment);
        } else {
            exercises = exerciseRepository.findAllAvailableTo(user);
        }

        return exercises.stream().map(ExerciseResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ExerciseResponse getById(String username, UUID id) {
        Exercise exercise = findActive(id);
        if (!exercise.isSystem() && (exercise.getCreatedBy() == null
                || !exercise.getCreatedBy().getUsername().equals(username))) {
            throw new ResourceNotFoundException("Exercise not found");
        }
        return ExerciseResponse.from(exercise);
    }

    public ExerciseResponse create(String username, CreateExerciseRequest request) {
        User user = getUser(username);

        Exercise exercise = new Exercise();
        exercise.setName(request.name());
        exercise.setDescription(request.description());
        exercise.setPrimaryMuscleGroup(request.primaryMuscleGroup());
        if (request.secondaryMuscleGroups() != null) {
            exercise.setSecondaryMuscleGroups(request.secondaryMuscleGroups());
        }
        exercise.setEquipment(request.equipment());
        exercise.setSystem(false);
        exercise.setCreatedBy(user);

        return ExerciseResponse.from(exerciseRepository.save(exercise));
    }

    public ExerciseResponse update(String username, UUID id, UpdateExerciseRequest request) {
        Exercise exercise = findActive(id);
        assertOwner(username, exercise);

        if (request.name() != null) exercise.setName(request.name());
        if (request.description() != null) exercise.setDescription(request.description());
        if (request.primaryMuscleGroup() != null) exercise.setPrimaryMuscleGroup(request.primaryMuscleGroup());
        if (request.secondaryMuscleGroups() != null) exercise.setSecondaryMuscleGroups(request.secondaryMuscleGroups());
        if (request.equipment() != null) exercise.setEquipment(request.equipment());

        return ExerciseResponse.from(exerciseRepository.save(exercise));
    }

    public void delete(String username, UUID id) {
        Exercise exercise = findActive(id);
        assertOwner(username, exercise);
        exercise.setDeletedAt(Instant.now());
        exerciseRepository.save(exercise);
    }

    private Exercise findActive(UUID id) {
        return exerciseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found"));
    }

    private void assertOwner(String username, Exercise exercise) {
        if (exercise.isSystem() || exercise.getCreatedBy() == null
                || !exercise.getCreatedBy().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only modify your own exercises");
        }
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
