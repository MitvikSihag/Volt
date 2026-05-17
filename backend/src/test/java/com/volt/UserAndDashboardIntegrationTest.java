package com.volt;

import com.volt.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import java.time.Instant;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserAndDashboardIntegrationTest extends AbstractIntegrationTest {

    @Test
    void meProfileStatsAndDashboardReflectWorkoutAndActivityData() throws Exception {
        AuthTokens alice = register("dashboarduser");
        User user = findUser("dashboarduser");

        createWorkoutEntity(user, systemExercise,
                Instant.parse("2026-05-12T06:00:00Z"),
                Instant.parse("2026-05-12T07:00:00Z"),
                5, 100.0);
        createActivityEntity(user, Instant.parse("2026-05-13T06:00:00Z"), 5000.0);

        mockMvc.perform(patch("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of(
                                "displayName", "Dashboard User",
                                "heightCm", 180,
                                "weightKg", 80.5
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Dashboard User"))
                .andExpect(jsonPath("$.heightCm").value(180))
                .andExpect(jsonPath("$.weightKg").value(80.5));

        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("dashboarduser"));

        mockMvc.perform(get("/api/users/me/stats")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWorkouts").value(1))
                .andExpect(jsonPath("$.totalActivities").value(1))
                .andExpect(jsonPath("$.totalDistanceMeters").value(5000.0))
                .andExpect(jsonPath("$.totalVolumeKg").value(500.0));

        mockMvc.perform(get("/api/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.week.volumeKg", greaterThanOrEqualTo(500.0)))
                .andExpect(jsonPath("$.week.distanceKm", greaterThanOrEqualTo(5.0)))
                .andExpect(jsonPath("$.recentPrs").isArray())
                .andExpect(jsonPath("$.chartData").isArray())
                .andExpect(jsonPath("$.trainingCalendar").isArray());
    }

    @Test
    void profileUpdateValidatesPositiveBodyMetrics() throws Exception {
        AuthTokens alice = register("profilevalidation");

        mockMvc.perform(patch("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice.accessToken()))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(json(java.util.Map.of(
                                "heightCm", -10,
                                "weightKg", -5
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }
}
