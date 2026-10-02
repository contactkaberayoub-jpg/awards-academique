package com.awardsacademique.authentification.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Slf4j
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "google.oauth")
public class GoogleOAuthProperties {
    private String clientId;
    private String clientSecret;
    private String redirectUri = "http://localhost:8080/api/auth/google/callback";
    private List<String> scopes = List.of("openid", "email", "profile");
    private int exchangeCodeTtlSeconds = 300;
    private int jwksCacheTtlSeconds = 3600;
    private String frontendCallbackUrl = "http://localhost:5173/auth/google/callback";

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && clientSecret != null && !clientSecret.isBlank();
    }

    /**
     * SAFE startup diagnostics. Prints presence booleans plus a masked Client ID
     * (e.g. {@code 1234...abcd}); NEVER prints the Client Secret or the full ID.
     */
    @PostConstruct
    void logStartupDiagnostics() {
        boolean hasId = clientId != null && !clientId.isBlank();
        boolean hasSecret = clientSecret != null && !clientSecret.isBlank();
        log.info("Google OAuth configured: {}", isConfigured());
        log.info("Client ID present: {}", hasId);
        if (hasId) {
            log.info("Client ID masked: {}", mask(clientId));
        }
        log.info("Client Secret present: {}", hasSecret);
        log.info("Redirect URI: {}", redirectUri);
    }

    private static String mask(String value) {
        String v = value.trim();
        if (v.length() <= 8) {
            return "****";
        }
        return v.substring(0, 4) + "..." + v.substring(v.length() - 4);
    }
}
