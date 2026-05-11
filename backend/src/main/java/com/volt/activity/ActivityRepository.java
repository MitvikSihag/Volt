package com.volt.activity;

import com.volt.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.user = :user AND a.deletedAt IS NULL")
    long countByUser(User user);

    @Query("SELECT COALESCE(SUM(a.distanceMeters), 0) FROM Activity a WHERE a.user = :user AND a.deletedAt IS NULL")
    double sumDistanceByUser(User user);
}
