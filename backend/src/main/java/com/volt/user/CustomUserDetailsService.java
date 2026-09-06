package com.volt.user;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        User user = userRepository.findByUsernameOrEmail(usernameOrEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + usernameOrEmail));

        // Google-only accounts have no password. Spring's User rejects a null password but
        // accepts "" — callers on the password-login path reject that empty hash themselves
        // (see SecurityConfig#authenticationProvider); the JWT filter loads it as-is.
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                Objects.requireNonNullElse(user.getPasswordHash(), ""),
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }
}
