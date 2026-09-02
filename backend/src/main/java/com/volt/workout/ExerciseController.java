package com.volt.workout;

import com.volt.workout.dto.CreateExerciseRequest;
import com.volt.workout.dto.ExerciseResponse;
import com.volt.workout.dto.PersonalRecordResponse;
import com.volt.workout.dto.ProgressionPointResponse;
import com.volt.workout.dto.UpdateExerciseRequest;
import com.volt.workout.dto.WorkoutSetResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
@SecurityRequirement(name = "bearerAuth")
public class ExerciseController {

    private final ExerciseService exerciseService;
    private final WorkoutService workoutService;
    private final PersonalRecordService prService;

    public ExerciseController(ExerciseService exerciseService, WorkoutService workoutService,
                              PersonalRecordService prService) {
        this.exerciseService = exerciseService;
        this.workoutService = workoutService;
        this.prService = prService;
    }

    @GetMapping
    public List<ExerciseResponse> list(@AuthenticationPrincipal UserDetails principal,
                                       @RequestParam(required = false) String q,
                                       @RequestParam(required = false) MuscleGroup muscle,
                                       @RequestParam(required = false) Equipment equipment,
                                       @RequestParam(required = false) MovementType movement) {
        return exerciseService.search(principal.getUsername(), q, muscle, equipment, movement);
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

    @GetMapping("/{id}/history")
    public List<WorkoutSetResponse> history(@AuthenticationPrincipal UserDetails principal,
                                            @PathVariable UUID id,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "50") int size) {
        return workoutService.getExerciseHistory(principal.getUsername(), id, page, size);
    }

    @GetMapping("/{id}/records")
    public List<PersonalRecordResponse> records(@AuthenticationPrincipal UserDetails principal,
                                                @PathVariable UUID id) {
        return prService.getPersonalRecords(principal.getUsername(), id);
    }

    @GetMapping("/{id}/progression")
    public List<ProgressionPointResponse> progression(@AuthenticationPrincipal UserDetails principal,
                                                       @PathVariable UUID id) {
        return prService.getProgression(principal.getUsername(), id);
    }
}
