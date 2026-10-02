package com.awardsacademique.emails;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for the Resend transactional-email provider.
 *
 * <p>The API key is bound from the {@code RESEND_API_KEY} environment variable
 * (never from a hard-coded value). A blank or unresolved key is detected at
 * runtime by {@link ResendEmailService} and rejected locally instead of being
 * sent to Resend.</p>
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "resend")
public class ResendProperties {
    private String apiKey;
    private String from = "onboarding@resend.dev";
    private String apiBaseUrl = "https://api.resend.com";
    private String frontendBaseUrl = "http://localhost:5173";
    private int timeoutSeconds = 20;
}