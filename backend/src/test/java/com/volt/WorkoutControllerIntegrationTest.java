package com.volt;

import com.fasterxml.jackson.databind.JsonNode;
import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WorkoutControllerIntegrationTest extends AbstractIntegrationTest {

    @Test
    void workoutCrudSetOperationsHistoryAndRecordsWork() throws Exception {
        AuthTokens alice = register("workoutalice");

        Instant startedAt = Instant.parse("2026-05-10T06:00:00Z");
        MvcResult createResult = mockMvc.perform(post("/api/workouts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Push Day",
                                "notes", "Heavy bench",
                                "startedAt", startedAt.toString(),
                                "completedAt", startedAt.plusSeconds(3600).toString(),
                                "exercises", List.of(Map.of(
                                        "exerciseId", systemExercise.getId(),
                                        "sets", List.of(
                                                Map.of("setType", "NORMAL", "reps", 5, "weightKg", 100.0, "rpe", 8),
                                                Map.of("setType", "NORMAL", "reps", 6, "weightKg", 102.5, "rpe", 9)
                                        )
                                ))
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sets", hasSize(2)))
                .andExpect(jsonPath("$.inProgress").value(false))
                .andReturn();

        JsonNode createdWorkout = readBody(createResult);
        String workoutId = createdWorkout.get("id").asText();
        String firstSetId = createdWorkout.get("sets").get(0).get("id").asText();

        mockMvc.perform(get("/api/workouts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/workouts/{id}", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Push Day"));

        mockMvc.perform(patch("/api/workouts/{id}", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Updated Push Day"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Push Day"));

        mockMvc.perform(post("/api/workouts/{id}/sets", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "exerciseId", systemExercise.getId(),
                                "setType", "DROP_SET",
                                "reps", 12,
                                "weightKg", 70.0,
                                "rpe", 9
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.setOrder").value(2));

        mockMvc.perform(patch("/api/workouts/{id}/sets/{setId}", workoutId, firstSetId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "setType", "NORMAL",
                                "reps", 7,
                                "weightKg", 105.0,
                                "rpe", 9
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reps").value(7))
                .andExpect(jsonPath("$.weightKg").value(105.0));

        mockMvc.perform(get("/api/exercises/{id}/history", systemExercise.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].exerciseId").value(systemExercise.getId().toString()));

        mockMvc.perform(get("/api/exercises/{id}/records", systemExercise.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].type").isNotEmpty())
                .andExpect(jsonPath("$[?(@.type=='MAX_REPS_AT_WEIGHT')].contextWeightKg", hasItem(70.0)));

        JsonNode workoutAfterAdd = readBody(mockMvc.perform(get("/api/workouts/{id}", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andReturn());
        String lastSetId = workoutAfterAdd.get("sets").get(2).get("id").asText();

        mockMvc.perform(delete("/api/workouts/{id}/sets/{setId}", workoutId, lastSetId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/workouts/{id}", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sets", hasSize(2)))
                .andExpect(jsonPath("$.sets[1].setOrder").value(1));

        mockMvc.perform(get("/api/exercises/{id}/records", systemExercise.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type=='MAX_REPS_AT_WEIGHT')].value", hasItem(7.0)))
                .andExpect(jsonPath("$[?(@.type=='MAX_REPS_AT_WEIGHT')].contextWeightKg", hasItem(105.0)));

        mockMvc.perform(delete("/api/workouts/{id}", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/workouts/{id}", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNotFound());
    }

    @Test
    void lastSetsUsesMostRecentCompletedWorkout() throws Exception {
        AuthTokens alice = register("lastsetuser");
        User user = findUser("lastsetuser");

        createWorkoutEntity(user, systemExercise,
                Instant.parse("2026-05-10T06:00:00Z"),
                Instant.parse("2026-05-10T07:00:00Z"),
                5, 100.0);
        createWorkoutEntity(user, systemExercise,
                Instant.parse("2026-05-11T06:00:00Z"),
                Instant.parse("2026-05-11T07:00:00Z"),
                6, 110.0);
        createWorkoutEntity(user, systemExercise,
                Instant.parse("2026-05-12T06:00:00Z"),
                null,
                12, 60.0);

        mockMvc.perform(get("/api/workouts/last-sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .param("exerciseIds", systemExercise.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].exerciseId").value(systemExercise.getId().toString()))
                .andExpect(jsonPath("$[0].reps").value(6))
                .andExpect(jsonPath("$[0].weightKg").value(110.0));
    }

    @Test
    void workoutEndpointsEnforceOwnershipAndValidatePayloads() throws Exception {
        AuthTokens alice = register("owneralice");
        AuthTokens bob = register("ownerbob");

        MvcResult createResult = mockMvc.perform(post("/api/workouts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Leg Day",
                                "startedAt", "2026-05-10T06:00:00Z",
                                "completedAt", "2026-05-10T07:00:00Z",
                                "exercises", List.of(Map.of(
                                        "exerciseId", systemExercise.getId(),
                                        "sets", List.of(Map.of("reps", 5, "weightKg", 140.0))
                                ))
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        String workoutId = readBody(createResult).get("id").asText();

        mockMvc.perform(get("/api/workouts/{id}", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(bob.accessToken())))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/workouts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Invalid Workout",
                                "startedAt", "2026-05-10T07:00:00Z",
                                "completedAt", "2026-05-10T06:00:00Z"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Workout completedAt cannot be before startedAt"));

        mockMvc.perform(post("/api/workouts/{id}/sets", workoutId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "exerciseId", systemExercise.getId(),
                                "reps", 5,
                                "weightKg", -1.0
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }
}
