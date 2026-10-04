package com.volt.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "volt.jwt")
public class JwtProperties {

    /** "kid:base64,kid:base64" — every listed key verifies; only the active one signs. */
    private String keys;
    private String activeKid;
    private long accessTokenExpirationMs;
    private long refreshTokenExpirationMs;

    public String getKeys() { return keys; }
    public void setKeys(String keys) { this.keys = keys; }

    public String getActiveKid() { return activeKid; }
    public void setActiveKid(String activeKid) { this.activeKid = activeKid; }

    public long getAccessTokenExpirationMs() { return accessTokenExpirationMs; }
    public void setAccessTokenExpirationMs(long accessTokenExpirationMs) { this.accessTokenExpirationMs = accessTokenExpirationMs; }

    public long getRefreshTokenExpirationMs() { return refreshTokenExpirationMs; }
    public void setRefreshTokenExpirationMs(long refreshTokenExpirationMs) { this.refreshTokenExpirationMs = refreshTokenExpirationMs; }
}
