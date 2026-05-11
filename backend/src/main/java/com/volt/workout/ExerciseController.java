package com.volt.workout;

import com.volt.workout.dto.CreateExerciseRequest;
import com.volt.workout.dto.ExerciseResponse;
import com.volt.workout.dto.UpdateExerciseRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {

    private final ExerciseService exerciseService;

    public ExerciseController(ExerciseService exerciseService) {
        this.exerciseService = exerciseService;
    }

    @GetMapping
    public List<ExerciseResponse> list(@AuthenticationPrincipal UserDetails principal,
                                       @RequestParam(required = false) MuscleGroup muscleGroup,
                                       @RequestParam(required = false) Equipment equipment) {
        return exerciseService.list(principal.getUsername(), muscleGroup, equipment);
    }

    @GetMapping("/{id}")
    public ExerciseResponse getById(@AuthenticationPrincipal UserDetails principal,
                                    @PathVariable UUID id) {
        return exerciseService.getById(principal.getUsername(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExerciseResponse create(@AuthenticationPrincipal UserDetails principal,
                                   @Valid @RequestBody CreateExerciseRequest request) {
        return exerciseService.create(principal.getUsername(), request);
    }

    @PutMapping("/{id}")
    public ExerciseResponse update(@AuthenticationPrincipal UserDetails principal,
                                   @PathVariable UUID id,
                                   @Valid @RequestBody UpdateExerciseRequest request) {
        return exerciseService.update(principal.getUsername(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails principal,
                       @PathVariable UUID id) {
        exerciseService.delete(principal.getUsername(), id);
    }
}
