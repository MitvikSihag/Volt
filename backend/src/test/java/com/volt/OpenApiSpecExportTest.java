package com.volt;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Guards the checked-in OpenAPI contract consumed by the web and mobile frontends against drift
 * from the runtime Springdoc contract.
 */
class OpenApiSpecExportTest extends AbstractIntegrationTest {

    private static final Path SPEC_PATH = Path.of("docs", "api", "openapi.yaml");

    @Test
    void runtimeOpenApiSpecMatchesCheckedInContract() throws Exception {
        String runtimeYaml = mockMvc.perform(get("/v3/api-docs.yaml"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        assertThat(runtimeYaml).contains("openapi:");
        assertThat(SPEC_PATH)
                .as("The checked-in OpenAPI contract must exist at %s", SPEC_PATH)
                .isRegularFile();

        String checkedInYaml = Files.readString(SPEC_PATH, StandardCharsets.UTF_8);

        assertThat(runtimeYaml)
                .as("Runtime Springdoc YAML differs from %s; update the contract intentionally and commit it", SPEC_PATH)
                .isEqualTo(checkedInYaml);
    }
}
