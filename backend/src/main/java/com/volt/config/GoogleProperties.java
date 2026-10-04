package com.volt.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "volt.google")
public class GoogleProperties {

    private List<String> clientIds = List.of();
    private List<String> issuers = List.of();
    private String jwkSetUri;

    public List<String> getClientIds() { return clientIds; }
    public void setClientIds(List<String> clientIds) { this.clientIds = clientIds; }

    public List<String> getIssuers() { return issuers; }
    public void setIssuers(List<String> issuers) { this.issuers = issuers; }

    public String getJwkSetUri() { return jwkSetUri; }
    public void setJwkSetUri(String jwkSetUri) { this.jwkSetUri = jwkSetUri; }
}
