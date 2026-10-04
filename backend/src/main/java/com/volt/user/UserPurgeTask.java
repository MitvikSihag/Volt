package com.volt.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;

/** Hard-deletes accounts 30 days after soft deletion; FK cascades remove everything they own. */
@Component
public class UserPurgeTask {

    private static final Logger log = LoggerFactory.getLogger(UserPurgeTask.class);
    static final Duration RETENTION = Duration.ofDays(30);

    private final UserRepository userRepository;
    private final Clock clock;

    public UserPurgeTask(UserRepository userRepository, Clock clock) {
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeDeletedUsers() {
        int purged = userRepository.purgeDeletedBefore(clock.instant().minus(RETENTION));
        if (purged > 0) log.info("Purged {} deleted account(s)", purged);
    }
}
