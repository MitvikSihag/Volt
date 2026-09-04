package com.volt;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ExerciseControllerIntegrationTest extends AbstractIntegrationTest {

    @Test
    void customExerciseLifecyclePermissionsAndSoftDeleteWork() throws Exception {
        AuthTokens alice = register("alice");
        AuthTokens bob = register("bob");

        MvcResult createResult = mockMvc.perform(post("/api/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "name", "Cable Crunch Variant",
                                "description", "Custom core movement",
                                "primaryMuscleGroup", "CORE",
                                "secondaryMuscleGroups", java.util.List.of("SHOULDERS"),
                                "equipment", "CABLE",
                                "movementType", "ISOLATION"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.system").value(false))
                .andExpect(jsonPath("$.name").value("Cable Crunch Variant"))
                .andExpect(jsonPath("$.measurementType").value("REPS_WEIGHT"))
                .andReturn();

        String exerciseId = readBody(createResult).get("id").asText();

        mockMvc.perform(get("/api/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", hasItem("Cable Crunch Variant")))
                .andExpect(jsonPath("$[?(@.name == 'Pull-Up')].measurementType", hasItem("REPS_ONLY")))
                .andExpect(jsonPath("$[?(@.name == 'Plank')].measurementType", hasItem("DURATION")));

        mockMvc.perform(get("/api/exercises/{id}", exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(bob.accessToken())))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/exercises/{id}", exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(bob.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Stolen Exercise"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/exercises/{id}", exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("description", "Updated description"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Updated description"));

        mockMvc.perform(delete("/api/exercises/{id}", exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/exercises/{id}", exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", not(hasItem("Cable Crunch Variant"))));
    }

    @Test
    void exerciseCreateValidatesPayloadAndRequiresAuth() throws Exception {
        mockMvc.perform(post("/api/exercises")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "name", "No Auth Exercise",
                                "primaryMuscleGroup", "BACK",
                                "equipment", "BARBELL",
                                "movementType", "COMPOUND"
                        ))))
                .andExpect(status().isUnauthorized());

        AuthTokens alice = register("exercisevalidation");
        mockMvc.perform(post("/api/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "name", "",
                                "primaryMuscleGroup", "BACK",
                                "equipment", "BARBELL",
                                "movementType", "COMPOUND"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }
}
