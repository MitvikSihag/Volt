package com.volt.common.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "volt.mail")
public class MailProperties {
    private boolean enabled;
    private String resendApiKey = "";
    private String from;
    /** Prefix for links in mail, e.g. "volt://" (deep link) or "https://volt.app/" (web later). */
    private String linkBase;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getResendApiKey() { return resendApiKey; }
    public void setResendApiKey(String resendApiKey) { this.resendApiKey = resendApiKey; }
    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public String getLinkBase() { return linkBase; }
    public void setLinkBase(String linkBase) { this.linkBase = linkBase; }
}
