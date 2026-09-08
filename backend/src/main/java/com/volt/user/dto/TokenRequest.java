package com.volt.user.dto;

import jakarta.validation.constraints.NotBlank;

public record TokenRequest(@NotBlank String token) {}
