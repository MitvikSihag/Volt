package com.volt.user;

import com.volt.common.exception.ApiException;
import com.volt.user.dto.UpdateProfileRequest;
import com.volt.user.dto.UserProfileResponse;
import com.volt.user.dto.UserSelfResponse;
import com.volt.user.dto.UserStatsResponse;
import com.volt.workout.PersonalRecordService;
import com.volt.workout.dto.ExerciseRecordsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_AVATAR_SIZE = 5 * 1024 * 1024;

    private final UserService userService;
    private final PersonalRecordService prService;

    public UserController(UserService userService, PersonalRecordService prService) {
        this.userService = userService;
        this.prService = prService;
    }

    @GetMapping("/{username}")
    public UserProfileResponse getProfile(@PathVariable String username) {
        return userService.getByUsername(username);
    }

    @GetMapping("/me")
    @Operation(security = @SecurityRequirement(name = "bearerAuth"))
    public UserSelfResponse getSelf(@AuthenticationPrincipal UserDetails principal) {
        return userService.getSelf(principal.getUsername());
    }

    @PatchMapping("/me")
    @Operation(security = @SecurityRequirement(name = "bearerAuth"))
    public UserSelfResponse updateProfile(@AuthenticationPrincipal UserDetails principal,
                                          @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(principal.getUsername(), request);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(security = @SecurityRequirement(name = "bearerAuth"))
    public UserSelfResponse uploadAvatar(@AuthenticationPrincipal UserDetails principal,
                                         @RequestPart("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG, and WebP images are allowed");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File size exceeds 5MB limit");
        }
        return userService.uploadAvatar(principal.getUsername(), file);
    }

    @GetMapping("/me/stats")
    @Operation(security = @SecurityRequirement(name = "bearerAuth"))
    public UserStatsResponse getStats(@AuthenticationPrincipal UserDetails principal) {
        return userService.getStats(principal.getUsername());
    }

    @GetMapping("/me/records")
    @Operation(security = @SecurityRequirement(name = "bearerAuth"))
    public List<ExerciseRecordsResponse> getRecords(@AuthenticationPrincipal UserDetails principal) {
        return prService.getRecordsGrid(principal.getUsername());
    }
}
