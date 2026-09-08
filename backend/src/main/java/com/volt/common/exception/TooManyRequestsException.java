package com.volt.common.exception;

import org.springframework.http.HttpStatus;

public class TooManyRequestsException extends ApiException {
    private final long retryAfterSeconds;

    public TooManyRequestsException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts, try again in " + retryAfterSeconds + " seconds");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
