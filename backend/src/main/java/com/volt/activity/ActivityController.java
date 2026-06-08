package com.volt.activity;

import com.volt.activity.dto.ActivityDetailResponse;
import com.volt.activity.dto.ActivityListItemResponse;
import com.volt.activity.dto.CreateActivityRequest;
import com.volt.activity.dto.UpdateActivityRequest;
import com.volt.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@RestController
@RequestMapping("/api/activities")
@SecurityRequirement(name = "bearerAuth")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityDetailResponse create(@AuthenticationPrincipal UserDetails principal,
                                         @Valid @RequestBody CreateActivityRequest request) {
        return activityService.create(principal.getUsername(), request);
    }

    @GetMapping
    public PageResponse<ActivityListItemResponse> list(@AuthenticationPrincipal UserDetails principal,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        return activityService.list(principal.getUsername(), page, size);
    }

    @GetMapping("/{id}")
    public ActivityDetailResponse getById(@AuthenticationPrincipal UserDetails principal,
                                          @PathVariable UUID id) {
        return activityService.getById(principal.getUsername(), id);
    }

    @PatchMapping("/{id}")
    public ActivityDetailResponse update(@AuthenticationPrincipal UserDetails principal,
                                         @PathVariable UUID id,
                                         @Valid @RequestBody UpdateActivityRequest request) {
        return activityService.update(principal.getUsername(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails principal,
                       @PathVariable UUID id) {
        activityService.delete(principal.getUsername(), id);
    }
}
