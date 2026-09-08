package com.volt;

import com.volt.activity.Activity;
import com.volt.user.Gender;
import com.volt.user.User;
import com.volt.user.UserPurgeTask;
import com.volt.workout.Exercise;
import com.volt.workout.Workout;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountDeletionIntegrationTest extends AbstractIntegrationTest {

    @Autowired private UserPurgeTask purgeTask;
    @Autowired private EntityManager em;

    @Test
    void wrongPasswordIsRejected() throws Exception {
        AuthTokens tokens = register("keepme");
        mockMvc.perform(delete("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("password", "wrong"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bad credentials"));
        assertThat(findUser("keepme").getDeletedAt()).isNull();
    }

    @Test
    void deleteAnonymisesRevokesAndFreesTheUsername() throws Exception {
        AuthTokens tokens = register("gone");
        User before = findUser("gone");
        before.setDateOfBirth(LocalDate.of(1999, 1, 2));
        before.setGender(Gender.OTHER);
        before.setHeightCm(180);
        before.setWeightKg(75.0);
        userRepository.save(before);

        mockMvc.perform(delete("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("password", tokens.password()))))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(tokens.accessToken())))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", tokens.refreshToken()))))
                .andExpect(status().isUnauthorized());

        User row = userRepository.findAll().stream().filter(u -> u.getDeletedAt() != null).findFirst().orElseThrow();
        assertThat(row.getUsername()).startsWith("deleted-");
        assertThat(row.getEmail()).endsWith("@deleted.volt.invalid");
        assertThat(row.getPasswordHash()).isNull();
        assertThat(row.getDateOfBirth()).isNull();
        assertThat(row.getGender()).isNull();
        assertThat(row.getHeightCm()).isNull();
        assertThat(row.getWeightKg()).isNull();

        register("gone"); // username reusable
    }

    @Test
    void googleOnlyAccountDeletesWithoutPassword() throws Exception {
        User user = new User();
        user.setUsername("gdel"); user.setEmail("gdel@example.com"); user.setGoogleSub("sub-gdel"); user.setDisplayName("gdel");
        User saved = userRepository.save(user);
        String access = new com.volt.config.JwtTokenProvider(jwtProps()).generateAccessToken(saved);
        mockMvc.perform(delete("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + access))
                .andExpect(status().isNoContent());
    }

    @Test
    void purgeHardDeletesThirtyDayOldAccountsWithTheirData() throws Exception {
        register("purged");
        User user = findUser("purged");
        Instant startedAt = Instant.now().minus(Duration.ofDays(40));
        Workout workout = createWorkoutEntity(user, systemExercise, startedAt, startedAt.plusSeconds(1800), 5, 100.0);
        Activity activity = createActivityEntity(user, startedAt, 5000);
        user.setDeletedAt(Instant.now().minus(Duration.ofDays(31)));
        userRepository.save(user);
        em.flush();

        purgeTask.purgeDeletedUsers();
        em.flush(); em.clear();

        assertThat(userRepository.findById(user.getId())).isEmpty();
        assertThat(workoutRepository.findById(workout.getId())).isEmpty();
        assertThat(activityRepository.findById(activity.getId())).isEmpty();
    }

    @Test
    void deletedUsersTokenDoesNotAuthenticateTheNextOwnerOfTheUsername() throws Exception {
        AuthTokens old = register("reuse");
        mockMvc.perform(delete("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(old.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("password", old.password()))))
                .andExpect(status().isNoContent());

        register("reuse"); // the username is free again — a different account now owns it

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, bearer(old.accessToken())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void purgeSetsCreatedByNullOnUserExercises() throws Exception {
        register("curator");
        User user = findUser("curator");
        Exercise custom = new Exercise();
        custom.setName("Curator's press");
        custom.setPrimaryMuscleGroup(systemExercise.getPrimaryMuscleGroup());
        custom.setEquipment(systemExercise.getEquipment());
        custom.setSystem(false);
        custom.setCreatedBy(user);
        custom = exerciseRepository.save(custom);
        user.setDeletedAt(Instant.now().minus(Duration.ofDays(31)));
        userRepository.save(user);
        em.flush();

        purgeTask.purgeDeletedUsers();
        em.flush(); em.clear();

        Exercise survivor = exerciseRepository.findById(custom.getId()).orElseThrow();
        assertThat(survivor.getCreatedBy()).isNull();
    }

    private com.volt.config.JwtProperties jwtProps() {
        com.volt.config.JwtProperties p = new com.volt.config.JwtProperties();
        p.setKeys("dev:dGhpcy1pcy1hLXZlcnktc2VjcmV0LWtleS1mb3Itdm9sdC1hcHAtZGV2LTIwMjY=");
        p.setActiveKid("dev");
        p.setAccessTokenExpirationMs(60_000);
        return p;
    }
}
