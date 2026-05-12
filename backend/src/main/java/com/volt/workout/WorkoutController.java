package com.volt.workout;

import com.volt.common.dto.PageResponse;
import com.volt.workout.dto.AddSetRequest;
import com.volt.workout.dto.CreateWorkoutRequest;
import com.volt.workout.dto.CreateWorkoutSetRequest;
import com.volt.workout.dto.UpdateWorkoutRequest;
import com.volt.workout.dto.WorkoutResponse;
import com.volt.workout.dto.WorkoutSetResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {

    private final WorkoutService workoutService;

    public WorkoutController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkoutResponse create(@AuthenticationPrincipal UserDetails principal,
                                  @Valid @RequestBody CreateWorkoutRequest request) {
        return workoutService.create(principal.getUsername(), request);
    }

    @GetMapping
    public PageResponse<WorkoutResponse> list(@AuthenticationPrincipal UserDetails principal,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return workoutService.list(principal.getUsername(), page, size);
    }

    @GetMapping("/{id}")
    public WorkoutResponse getById(@AuthenticationPrincipal UserDetails principal,
                                   @PathVariable UUID id) {
        return workoutService.getById(principal.getUsername(), id);
    }

    @PatchMapping("/{id}")
    public WorkoutResponse update(@AuthenticationPrincipal UserDetails principal,
                                  @PathVariable UUID id,
                                  @Valid @RequestBody UpdateWorkoutRequest request) {
        return workoutService.update(principal.getUsername(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails principal,
                       @PathVariable UUID id) {
        workoutService.delete(principal.getUsername(), id);
    }

    @PostMapping("/{id}/sets")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkoutSetResponse addSet(@AuthenticationPrincipal UserDetails principal,
                                     @PathVariable UUID id,
                                     @Valid @RequestBody AddSetRequest request) {
        return workoutService.addSet(principal.getUsername(), id, request);
    }

    @PatchMapping("/{id}/sets/{setId}")
    public WorkoutSetResponse updateSet(@AuthenticationPrincipal UserDetails principal,
                                        @PathVariable UUID id,
                                        @PathVariable UUID setId,
                                        @Valid @RequestBody CreateWorkoutSetRequest request) {
        return workoutService.updateSet(principal.getUsername(), id, setId, request);
    }

    @DeleteMapping("/{id}/sets/{setId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeSet(@AuthenticationPrincipal UserDetails principal,
                          @PathVariable UUID id,
                          @PathVariable UUID setId) {
        workoutService.removeSet(principal.getUsername(), id, setId);
    }
}
