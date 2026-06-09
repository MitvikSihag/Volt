package com.volt.workout;

import com.volt.workout.dto.CreateRoutineRequest;
import com.volt.workout.dto.RoutineResponse;
import com.volt.workout.dto.WorkoutResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/routines")
@SecurityRequirement(name = "bearerAuth")
public class RoutineController {

    private final RoutineService routineService;

    public RoutineController(RoutineService routineService) {
        this.routineService = routineService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoutineResponse create(@AuthenticationPrincipal UserDetails principal,
                                  @Valid @RequestBody CreateRoutineRequest request) {
        return routineService.create(principal.getUsername(), request);
    }

    @GetMapping
    public List<RoutineResponse> list(@AuthenticationPrincipal UserDetails principal) {
        return routineService.list(principal.getUsername());
    }

    @GetMapping("/{id}")
    public RoutineResponse getById(@AuthenticationPrincipal UserDetails principal,
                                   @PathVariable UUID id) {
        return routineService.getById(principal.getUsername(), id);
    }

    @PutMapping("/{id}")
    public RoutineResponse update(@AuthenticationPrincipal UserDetails principal,
                                  @PathVariable UUID id,
                                  @Valid @RequestBody CreateRoutineRequest request) {
        return routineService.update(principal.getUsername(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails principal,
                       @PathVariable UUID id) {
        routineService.delete(principal.getUsername(), id);
    }

    @PostMapping("/{id}/start")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkoutResponse start(@AuthenticationPrincipal UserDetails principal,
                                 @PathVariable UUID id) {
        return routineService.start(principal.getUsername(), id);
    }
}
