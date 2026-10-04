package com.volt.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface EmailTokenRepository extends JpaRepository<EmailToken, UUID> {
    Optional<EmailToken> findByTokenHashAndPurpose(String tokenHash, EmailTokenPurpose purpose);

    @Modifying
    @Query("DELETE FROM EmailToken t WHERE t.user = :user AND t.purpose = :purpose")
    void deleteByUserAndPurpose(User user, EmailTokenPurpose purpose);

    @Modifying
    @Query("DELETE FROM EmailToken t WHERE t.user = :user")
    void deleteByUser(User user);
}
