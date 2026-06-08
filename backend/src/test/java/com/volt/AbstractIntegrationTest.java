package com.volt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.volt.activity.Activity;
import com.volt.activity.ActivityRepository;
import com.volt.activity.ActivityType;
import com.volt.user.User;
import com.volt.user.UserRepository;
import com.volt.workout.Exercise;
import com.volt.workout.ExerciseRepository;
import com.volt.workout.Workout;
import com.volt.workout.WorkoutExercise;
import com.volt.workout.WorkoutRepository;
import com.volt.workout.WorkoutSet;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "volt.storage.upload-dir=build/test-uploads")
abstract class AbstractIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected ExerciseRepository exerciseRepository;

    @Autowired
    protected WorkoutRepository workoutRepository;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected ActivityRepository activityRepository;

    protected Exercise systemExercise;

    @BeforeEach
    void loadSystemExercise() {
        systemExercise = exerciseRepository.findAll().stream()
                .filter(Exercise::isSystem)
                .min(Comparator.comparing(Exercise::getName))
                .orElseThrow();
    }

    protected AuthTokens register(String username) throws Exception {
        String email = username + "@example.com";
        String password = "Password123";
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "username", username,
                                "email", email,
                                "password", password
                        ))))
                .andReturn();
        JsonNode body = readBody(result);
        return new AuthTokens(
                body.get("accessToken").asText(),
                body.get("refreshToken").asText(),
                email,
                password
        );
    }

    protected String bearer(String accessToken) {
        return "Bearer " + accessToken;
    }

    protected String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    protected JsonNode readBody(MvcResult result) throws Exception {
        String content = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(content);
    }

    protected User findUser(String username) {
        return userRepository.findByUsername(username).orElseThrow();
    }

    protected Workout createWorkoutEntity(User user, Exercise exercise, Instant startedAt,
                                          Instant completedAt, int reps, double weightKg) {
        Workout workout = new Workout();
        workout.setUser(user);
        workout.setTitle("Seed workout");
        workout.setStartedAt(startedAt);
        workout.setCompletedAt(completedAt);

        WorkoutExercise workoutExercise = new WorkoutExercise();
        workoutExercise.setWorkout(workout);
        workoutExercise.setExercise(exercise);
        workoutExercise.setPosition(0);

        WorkoutSet set = new WorkoutSet();
        set.setWorkoutExercise(workoutExercise);
        set.setSetNumber(1);
        set.setReps(reps);
        set.setWeightKg(weightKg);
        workoutExercise.getSets().add(set);
        workout.getExercises().add(workoutExercise);

        return workoutRepository.save(workout);
    }

    protected Activity createActivityEntity(User user, Instant startedAt, double distanceMeters) {
        Activity activity = new Activity();
        activity.setUser(user);
        activity.setType(ActivityType.RUN);
        activity.setTitle("Morning run");
        activity.setStartedAt(startedAt);
        activity.setCompletedAt(startedAt.plusSeconds(1800));
        activity.setDurationSeconds(1800);
        activity.setDistanceMeters(distanceMeters);
        return activityRepository.save(activity);
    }

    protected record AuthTokens(String accessToken, String refreshToken, String email, String password) {}
}
