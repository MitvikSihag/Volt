package com.volt;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regenerates the checked-in OpenAPI contract on every test run so it never drifts from the code.
 * The spec at docs/api/openapi.yaml is the source of truth consumed by the web and mobile frontends.
 */
class OpenApiSpecExportTest extends AbstractIntegrationTest {

    private static final Path SPEC_PATH = Path.of("docs", "api", "openapi.yaml");

    @Test
    void exportsOpenApiSpecToDocs() throws Exception {
        String yaml = mockMvc.perform(get("/v3/api-docs.yaml"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        assertThat(yaml).contains("openapi:");

        Files.createDirectories(SPEC_PATH.getParent());
        Files.writeString(SPEC_PATH, yaml, StandardCharsets.UTF_8);

        assertThat(Files.exists(SPEC_PATH)).isTrue();
    }
}
