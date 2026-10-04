package com.volt.user;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

/** Spring's UserDetails plus the account's stable id, so a token can be bound to the row it was minted for. */
public class VoltUserDetails extends org.springframework.security.core.userdetails.User {

    private final UUID id;

    public VoltUserDetails(User user, String password) {
        super(user.getUsername(), password, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        this.id = user.getId();
    }

    public UUID getId() {
        return id;
    }
}
