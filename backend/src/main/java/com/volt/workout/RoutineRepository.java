package com.volt.workout;

import com.volt.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoutineRepository extends JpaRepository<Routine, UUID> {

    List<Routine> findByUserAndDeletedAtIsNullOrderByCreatedAtDesc(User user);

    Optional<Routine> findByIdAndDeletedAtIsNull(UUID id);
}
