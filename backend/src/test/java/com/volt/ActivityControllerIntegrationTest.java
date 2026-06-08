package com.volt;

import com.fasterxml.jackson.databind.JsonNode;
import com.volt.activity.Activity;
import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ActivityControllerIntegrationTest extends AbstractIntegrationTest {

    @Test
    void activityCrudSupportsNestedDataAndSoftDelete() throws Exception {
        AuthTokens alice = register("activityalice");
        // Anchor both activities to "now" so they land in the dashboard's current-week window.
        // The long run is the most recent so it stays first in the startedAt-desc list ordering.
        Instant walkStart = Instant.now();
        Instant longRunStart = walkStart.plusSeconds(60);
        Map<String, Object> createPayload = new LinkedHashMap<>();
        createPayload.put("title", "Morning long run");
        createPayload.put("type", "RUN");
        createPayload.put("startedAt", longRunStart.toString());
        createPayload.put("completedAt", longRunStart.plusSeconds(4500).toString());
        createPayload.put("durationSeconds", 4500);
        createPayload.put("distanceMeters", 12000.0);
        createPayload.put("elevationGainMeters", 180.5);
        createPayload.put("averageHeartRate", 148);
        createPayload.put("maxHeartRate", 172);
        createPayload.put("calories", 820);
        createPayload.put("notes", "Steady effort");
        createPayload.put("route", Map.of(
                "encodedPolyline", "encoded-line-1",
                "elevationData", "[1,2,3]"
        ));
        createPayload.put("laps", List.of(
                Map.of(
                        "distanceMeters", 1000.0,
                        "durationSeconds", 360,
                        "averagePaceMinPerKm", 6.0,
                        "averageHeartRate", 140
                ),
                Map.of(
                        "distanceMeters", 1000.0,
                        "durationSeconds", 355,
                        "averagePaceMinPerKm", 5.92,
                        "averageHeartRate", 145
                )
        ));

        MvcResult createResult = mockMvc.perform(post("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(createPayload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("RUN"))
                .andExpect(jsonPath("$.route.encodedPolyline").value("encoded-line-1"))
                .andExpect(jsonPath("$.laps", hasSize(2)))
                .andExpect(jsonPath("$.laps[0].lapNumber").value(1))
                .andReturn();

        JsonNode createdActivity = readBody(createResult);
        String activityId = createdActivity.get("id").asText();

        MvcResult secondCreate = mockMvc.perform(post("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Recovery walk",
                                "type", "WALK",
                                "startedAt", walkStart.toString(),
                                "durationSeconds", 1800,
                                "distanceMeters", 3000.0
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        String secondActivityId = readBody(secondCreate).get("id").asText();

        mockMvc.perform(get("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].id").value(activityId))
                .andExpect(jsonPath("$.content[1].id").value(secondActivityId));

        mockMvc.perform(get("/api/activities/{id}", activityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Morning long run"))
                .andExpect(jsonPath("$.laps[1].lapNumber").value(2));

        Map<String, Object> updatePayload = new LinkedHashMap<>();
        updatePayload.put("title", "Updated long run");
        updatePayload.put("completedAt", null);
        updatePayload.put("distanceMeters", 12500.0);
        updatePayload.put("notes", null);
        updatePayload.put("route", null);
        updatePayload.put("laps", List.of(Map.of(
                "distanceMeters", 5000.0,
                "durationSeconds", 1700,
                "averagePaceMinPerKm", 5.67,
                "averageHeartRate", 150
        )));

        mockMvc.perform(patch("/api/activities/{id}", activityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(updatePayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated long run"))
                .andExpect(jsonPath("$.completedAt").isEmpty())
                .andExpect(jsonPath("$.notes").isEmpty())
                .andExpect(jsonPath("$.distanceMeters").value(12500.0))
                .andExpect(jsonPath("$.route").isEmpty())
                .andExpect(jsonPath("$.laps", hasSize(1)))
                .andExpect(jsonPath("$.laps[0].lapNumber").value(1));

        mockMvc.perform(get("/api/users/me/stats")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalActivities").value(2))
                .andExpect(jsonPath("$.totalDistanceMeters").value(15500.0));

        mockMvc.perform(get("/api/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.week.distanceKm", greaterThanOrEqualTo(15.5)))
                .andExpect(jsonPath("$.trainingCalendar").isArray());

        mockMvc.perform(delete("/api/activities/{id}", activityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(secondActivityId));

        mockMvc.perform(get("/api/activities/{id}", activityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/users/me/stats")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalActivities").value(1))
                .andExpect(jsonPath("$.totalDistanceMeters").value(3000.0));
    }

    @Test
    void activityEndpointsEnforceOwnershipAndValidation() throws Exception {
        AuthTokens alice = register("activityowneralice");
        AuthTokens bob = register("activityownerbob");

        MvcResult createResult = mockMvc.perform(post("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Lunch ride",
                                "type", "RIDE",
                                "startedAt", "2026-05-10T06:00:00Z",
                                "completedAt", "2026-05-10T07:00:00Z",
                                "durationSeconds", 3600,
                                "distanceMeters", 25000.0
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        String activityId = readBody(createResult).get("id").asText();

        mockMvc.perform(get("/api/activities/{id}", activityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(bob.accessToken())))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Invalid run",
                                "type", "RUN",
                                "startedAt", "2026-05-10T07:00:00Z",
                                "completedAt", "2026-05-10T06:00:00Z"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Activity completedAt cannot be before startedAt"));

        mockMvc.perform(post("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Bad metrics",
                                "type", "RUN",
                                "startedAt", "2026-05-10T06:00:00Z",
                                "averageHeartRate", 160,
                                "maxHeartRate", 150
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Activity averageHeartRate cannot exceed maxHeartRate"));

        mockMvc.perform(post("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Negative distance",
                                "type", "RUN",
                                "startedAt", "2026-05-10T06:00:00Z",
                                "distanceMeters", -1.0
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));

        Map<String, Object> invalidPatch = new LinkedHashMap<>();
        invalidPatch.put("startedAt", null);
        mockMvc.perform(patch("/api/activities/{id}", activityId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(invalidPatch)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Activity startedAt is required"));

        mockMvc.perform(post("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "title", "Blank route",
                                "type", "HIKE",
                                "startedAt", "2026-05-10T06:00:00Z",
                                "route", Map.of(
                                        "encodedPolyline", "",
                                        "elevationData", ""
                                )
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void activityListExcludesSoftDeletedEntities() throws Exception {
        AuthTokens alice = register("activitylistuser");
        User user = findUser("activitylistuser");

        Activity kept = createActivityEntity(user, Instant.parse("2026-05-11T06:00:00Z"), 5000.0);
        Activity deleted = createActivityEntity(user, Instant.parse("2026-05-12T06:00:00Z"), 7000.0);
        deleted.setDeletedAt(Instant.parse("2026-05-13T00:00:00Z"));
        activityRepository.save(deleted);

        mockMvc.perform(get("/api/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(kept.getId().toString()));
    }
}
