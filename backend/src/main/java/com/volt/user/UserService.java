package com.volt.user;

import com.volt.activity.ActivityService;
import com.volt.common.exception.ResourceNotFoundException;
import com.volt.common.storage.StorageService;
import com.volt.user.dto.UpdateProfileRequest;
import com.volt.user.dto.UserProfileResponse;
import com.volt.user.dto.UserSelfResponse;
import com.volt.user.dto.UserStatsResponse;
import com.volt.workout.WorkoutService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final StorageService storageService;
    private final WorkoutService workoutService;
    private final ActivityService activityService;

    public UserService(UserRepository userRepository,
                       StorageService storageService,
                       WorkoutService workoutService,
                       ActivityService activityService) {
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.workoutService = workoutService;
        this.activityService = activityService;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return UserProfileResponse.from(user);
    }

    @Transactional(readOnly = true)
    public UserSelfResponse getSelf(String username) {
        return UserSelfResponse.from(findActiveUser(username));
    }

    public UserSelfResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = findActiveUser(username);

        if (request.displayName() != null) user.setDisplayName(request.displayName());
        if (request.bio() != null) user.setBio(request.bio());
        if (request.dateOfBirth() != null) user.setDateOfBirth(request.dateOfBirth());
        if (request.gender() != null) user.setGender(request.gender());
        if (request.heightCm() != null) user.setHeightCm(request.heightCm());
        if (request.weightKg() != null) user.setWeightKg(request.weightKg());

        return UserSelfResponse.from(userRepository.save(user));
    }

    public UserSelfResponse uploadAvatar(String username, MultipartFile file) {
        User user = findActiveUser(username);
        String oldUrl = user.getProfilePictureUrl();
        String newUrl = storageService.store(file, "avatars");
        user.setProfilePictureUrl(newUrl);
        UserSelfResponse response = UserSelfResponse.from(userRepository.save(user));
        if (oldUrl != null) {
            storageService.delete(oldUrl);
        }
        return response;
    }

    @Transactional(readOnly = true)
    public UserStatsResponse getStats(String username) {
        User user = findActiveUser(username);
        return new UserStatsResponse(
                workoutService.countForUser(user),
                activityService.countForUser(user),
                activityService.totalDistanceMetersForUser(user),
                workoutService.totalVolumeKgForUser(user)
        );
    }

    private User findActiveUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }
}
