package com.volt;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OpenApiIntegrationTest extends AbstractIntegrationTest {

    @Test
    void openApiAdvertisesBearerAuthAndActivityEndpoints() throws Exception {
        JsonNode docs = readBody(mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn());

        JsonNode securitySchemes = docs.path("components").path("securitySchemes");
        assertThat(securitySchemes.isMissingNode()).isFalse();
        assertThat(securitySchemes.path("bearerAuth").path("type").asText()).isEqualTo("http");
        assertThat(securitySchemes.path("bearerAuth").path("scheme").asText()).isEqualTo("bearer");
        assertThat(docs.path("paths").path("/api/dashboard").path("get").path("security").isArray()).isTrue();
        assertThat(docs.path("paths").path("/api/workouts").path("get").path("security").isArray()).isTrue();
        assertThat(docs.path("paths").path("/api/workouts").path("post").path("security").isArray()).isTrue();
        assertThat(docs.path("paths").path("/api/users/me").path("get").path("security").isArray()).isTrue();
        assertThat(docs.path("paths").path("/api/activities").path("get").path("security").isArray()).isTrue();
        assertThat(docs.path("paths").path("/api/activities").path("post").path("security").isArray()).isTrue();
        assertThat(docs.path("paths").path("/api/activities/{id}").path("patch").path("security").isArray()).isTrue();
        assertThat(docs.path("paths").path("/api/activities/{id}").path("delete").path("security").isArray()).isTrue();

        JsonNode updateWorkoutSchema = docs.path("components").path("schemas").path("UpdateWorkoutRequest");
        assertThat(updateWorkoutSchema.path("properties").has("exercises")).isFalse();

        JsonNode updateActivitySchema = docs.path("components").path("schemas").path("UpdateActivityRequest");
        assertThat(updateActivitySchema.path("properties").has("route")).isTrue();
        assertThat(updateActivitySchema.path("properties").has("laps")).isTrue();
        assertThat(updateActivitySchema.path("properties").has("titleSet")).isFalse();
    }
}
