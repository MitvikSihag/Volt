package com.volt;

import com.fasterxml.jackson.databind.JsonNode;
import com.volt.user.User;
import com.volt.workout.Exercise;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.hasSize;

class RoutineControllerIntegrationTest extends AbstractIntegrationTest {

    private Exercise secondSystemExercise() {
        return exerciseRepository.findAll().stream()
                .filter(Exercise::isSystem)
                .sorted(Comparator.comparing(Exercise::getName))
                .skip(1)
                .findFirst()
                .orElseThrow();
    }

    @Test
    void routineLifecycleAndStart() throws Exception {
        AuthTokens alice = register("routinealice");
        Exercise exTwo = secondSystemExercise();

        // create with 2 exercises
        Map<String, Object> ex1 = new HashMap<>();
        ex1.put("exerciseId", systemExercise.getId());
        ex1.put("targetSets", 3);
        ex1.put("targetReps", 8);
        ex1.put("restSeconds", 90);
        ex1.put("notes", "warm up");
        Map<String, Object> ex2 = new HashMap<>();
        ex2.put("exerciseId", exTwo.getId());
        ex2.put("targetReps", 12);

        MvcResult createResult = mockMvc.perform(post("/api/routines")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "name", "Push Routine",
                                "notes", "chest day",
                                "exercises", List.of(ex1, ex2)))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Push Routine"))
                .andExpect(jsonPath("$.exercises", hasSize(2)))
                .andExpect(jsonPath("$.exercises[0].exerciseId").value(systemExercise.getId().toString()))
                .andExpect(jsonPath("$.exercises[0].position").value(0))
                .andExpect(jsonPath("$.exercises[0].targetSets").value(3))
                .andExpect(jsonPath("$.exercises[1].exerciseId").value(exTwo.getId().toString()))
                .andExpect(jsonPath("$.exercises[1].position").value(1))
                .andReturn();

        String routineId = readBody(createResult).get("id").asText();

        // create a second, newer routine to assert ordering
        mockMvc.perform(post("/api/routines")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Pull Routine"))))
                .andExpect(status().isCreated());

        // list, newest first
        mockMvc.perform(get("/api/routines")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Pull Routine"))
                .andExpect(jsonPath("$[1].name").value("Push Routine"));

        // get single
        mockMvc.perform(get("/api/routines/{id}", routineId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises", hasSize(2)));

        // PUT full replace of exercises (replace with single exercise)
        Map<String, Object> replacement = new HashMap<>();
        replacement.put("exerciseId", exTwo.getId());
        replacement.put("targetSets", 5);
        mockMvc.perform(put("/api/routines/{id}", routineId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "name", "Push Routine V2",
                                "exercises", List.of(replacement)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Push Routine V2"))
                .andExpect(jsonPath("$.exercises", hasSize(1)))
                .andExpect(jsonPath("$.exercises[0].exerciseId").value(exTwo.getId().toString()))
                .andExpect(jsonPath("$.exercises[0].position").value(0))
                .andExpect(jsonPath("$.exercises[0].targetSets").value(5));

        // validation: blank name -> 400
        mockMvc.perform(post("/api/routines")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", " "))))
                .andExpect(status().isBadRequest());

        // ownership: bob cannot read alice's routine -> 403
        AuthTokens bob = register("routinebob");
        mockMvc.perform(get("/api/routines/{id}", routineId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(bob.accessToken())))
                .andExpect(status().isForbidden());

        // soft delete -> excluded from list + 404 on get
        mockMvc.perform(delete("/api/routines/{id}", routineId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/routines")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Pull Routine"));

        mockMvc.perform(get("/api/routines/{id}", routineId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNotFound());
    }

    @Test
    void startRoutineCreatesInProgressWorkout() throws Exception {
        AuthTokens alice = register("routinestarter");
        Exercise exTwo = secondSystemExercise();

        Map<String, Object> ex1 = new HashMap<>();
        ex1.put("exerciseId", systemExercise.getId());
        ex1.put("targetSets", 3);
        ex1.put("targetReps", 8);
        ex1.put("restSeconds", 60);
        Map<String, Object> ex2 = new HashMap<>();
        ex2.put("exerciseId", exTwo.getId());
        // no targetSets -> zero sets

        MvcResult createResult = mockMvc.perform(post("/api/routines")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "name", "Leg Day",
                                "notes", "squats",
                                "exercises", List.of(ex1, ex2)))))
                .andExpect(status().isCreated())
                .andReturn();
        String routineId = readBody(createResult).get("id").asText();

        mockMvc.perform(post("/api/routines/{id}/start", routineId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Leg Day"))
                .andExpect(jsonPath("$.notes").value("squats"))
                .andExpect(jsonPath("$.inProgress").value(true))
                .andExpect(jsonPath("$.completedAt").doesNotExist())
                .andExpect(jsonPath("$.exercises", hasSize(2)))
                .andExpect(jsonPath("$.exercises[0].exerciseId").value(systemExercise.getId().toString()))
                .andExpect(jsonPath("$.exercises[0].position").value(0))
                .andExpect(jsonPath("$.exercises[0].restSeconds").value(60))
                .andExpect(jsonPath("$.exercises[0].sets", hasSize(3)))
                .andExpect(jsonPath("$.exercises[0].sets[0].setNumber").value(1))
                .andExpect(jsonPath("$.exercises[0].sets[1].setNumber").value(2))
                .andExpect(jsonPath("$.exercises[0].sets[2].setNumber").value(3))
                .andExpect(jsonPath("$.exercises[0].sets[0].setType").value("NORMAL"))
                .andExpect(jsonPath("$.exercises[1].sets", hasSize(0)));
    }

    @Test
    void recordsGridAndProgression() throws Exception {
        AuthTokens alice = register("recordsalice");
        User user = findUser("recordsalice");

        // two workouts for systemExercise -> PRs computed via service? No: createWorkoutEntity
        // bypasses PR recompute, so drive records through the API for one and progression directly.
        Instant first = Instant.parse("2026-04-01T06:00:00Z");
        Instant second = Instant.parse("2026-04-08T06:00:00Z");

        // create workouts via API so PRs get recomputed
        mockMvc.perform(post("/api/workouts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "W1",
                                "startedAt", first.toString(),
                                "completedAt", first.plusSeconds(3600).toString(),
                                "exercises", List.of(Map.of(
                                        "exerciseId", systemExercise.getId(),
                                        "sets", List.of(Map.of("setType", "NORMAL", "reps", 5, "weightKg", 100.0)))))) ))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/workouts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "W2",
                                "startedAt", second.toString(),
                                "completedAt", second.plusSeconds(3600).toString(),
                                "exercises", List.of(Map.of(
                                        "exerciseId", systemExercise.getId(),
                                        "sets", List.of(Map.of("setType", "NORMAL", "reps", 3, "weightKg", 110.0)))))) ))
                .andExpect(status().isCreated());

        // records grid groups by exercise
        mockMvc.perform(get("/api/users/me/records")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].exerciseId").value(systemExercise.getId().toString()))
                .andExpect(jsonPath("$[0].records").isNotEmpty());

        // progression ascending; estimatedOneRepMax for first point = 100*(1+5/30)
        double expectedFirst1rm = 100.0 * (1 + 5 / 30.0);
        mockMvc.perform(get("/api/exercises/{id}/progression", systemExercise.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].date").value(first.toString()))
                .andExpect(jsonPath("$[0].estimatedOneRepMax").value(expectedFirst1rm))
                .andExpect(jsonPath("$[0].bestWeightKg").value(100.0))
                .andExpect(jsonPath("$[0].volumeKg").value(500.0))
                .andExpect(jsonPath("$[1].date").value(second.toString()))
                .andExpect(jsonPath("$[1].bestWeightKg").value(110.0));
    }
}
