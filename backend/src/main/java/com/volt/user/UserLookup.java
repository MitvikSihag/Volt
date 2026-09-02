package com.volt.user;

import com.volt.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

/** Single place services resolve an authenticated username to a User. */
@Component
public class UserLookup {

    private final UserRepository userRepository;

    public UserLookup(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User require(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
