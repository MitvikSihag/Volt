package com.volt.activity.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;

public record ActivityRouteRequest(

        @Size(max = 20000)
        String encodedPolyline,

        @Size(max = 20000)
        String elevationData
) {
    @AssertTrue(message = "Route must include encodedPolyline or elevationData")
    public boolean hasRouteData() {
        return hasText(encodedPolyline) || hasText(elevationData);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
