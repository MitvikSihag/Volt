package com.volt;

import com.volt.workout.ExerciseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Drift-catcher for the PostgreSQL schema. Boots the full application against a real
 * Postgres container under the {@code postgres} profile, which runs the Flyway baseline
 * migration and then has Hibernate {@code validate} the entities against it. If the JPA
 * model and the migrations ever diverge, validation fails and the context will not load,
 * failing this test.
 *
 * <p>Runs in CI and fails closed there when Docker is unavailable. Local runs skip it when
 * Docker is unavailable so the H2-backed test loop remains usable.
 */
@SpringBootTest(properties = "volt.jwt.secret=dGhpcy1pcy1hLXRlc3Qtb25seS1zZWNyZXQta2V5LWZvci12b2x0LXBvc3RncmVz")
@ActiveProfiles("postgres")
@Testcontainers
@EnabledIf("dockerAvailable")
class FlywayPostgresIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    ExerciseRepository exerciseRepository;

    @Test
    void migratesValidatesAndSeedsAgainstPostgres() {
        // Reaching this point means Flyway migrate + Hibernate validate both succeeded.
        assertThat(exerciseRepository.countSystemExercises()).isGreaterThan(0);
    }

    static boolean dockerAvailable() {
        try {
            boolean available = DockerClientFactory.instance().isDockerAvailable();
            if (!available && runningInCi()) {
                throw new IllegalStateException("Docker is required for the PostgreSQL integration test in CI");
            }
            return available;
        } catch (Throwable t) {
            if (runningInCi()) {
                throw new IllegalStateException("Docker is required for the PostgreSQL integration test in CI", t);
            }
            return false;
        }
    }

    private static boolean runningInCi() {
        return "true".equalsIgnoreCase(System.getenv("CI"));
    }
}
