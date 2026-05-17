package com.volt.workout;

import com.volt.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PersonalRecordRepository extends JpaRepository<PersonalRecord, UUID> {

    List<PersonalRecord> findByUserAndExercise(User user, Exercise exercise);

    Optional<PersonalRecord> findByUserAndExerciseAndType(User user, Exercise exercise, PersonalRecordType type);

    List<PersonalRecord> findTop3ByUserOrderByAchievedAtDesc(User user);

    List<PersonalRecord> findByWorkoutSet(WorkoutSet workoutSet);
}
