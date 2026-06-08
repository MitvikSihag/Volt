package com.volt.activity.dto;

import com.volt.activity.Route;

public record ActivityRouteResponse(
        String encodedPolyline,
        String elevationData
) {
    public static ActivityRouteResponse from(Route route) {
        return new ActivityRouteResponse(
                route.getEncodedPolyline(),
                route.getElevationData()
        );
    }
}
