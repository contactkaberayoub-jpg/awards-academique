package com.awardsacademique.emails;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves Spring Boot binds the {@code resend.*} configuration keys into
 * {@link ResendProperties} at runtime and that an unset/unresolved API key is
 * detectable (so {@code ResendEmailService} rejects it locally instead of
 * sending an empty Bearer header to Resend).
 */
class ResendPropertiesConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(Props.class);

    @Test
    void bind_resendKeys_intoProperties() {
        runner.withUserConfiguration(Props.class)
                .withPropertyValues(
                        "resend.api-key=re_1234567890ABC",
                        "resend.from=noreply@awards.test",
                        "resend.api-base-url=https://example.com",
                        "resend.frontend-base-url=https://app.example.test",
                        "resend.timeout-seconds=25")
                .run(ctx -> {
                    ResendProperties p = ctx.getBean(ResendProperties.class);
                    assertNotNull(p);
                    assertEquals("re_1234567890ABC", p.getApiKey());
                    assertEquals("noreply@awards.test", p.getFrom());
                    assertEquals("https://example.com", p.getApiBaseUrl());
                    assertEquals("https://app.example.test", p.getFrontendBaseUrl());
                    assertEquals(25, p.getTimeoutSeconds());
                });
    }

    @Test
    void unsetApiKey_isDetectable_notUsableCredential() {
        runner.withUserConfiguration(Props.class)
                // Force the API key to be unbound so the assertion is hermetic and does not
                // depend on RESEND_API_KEY being absent from the machine environment.
                .withPropertyValues("resend.api-key=")
                .run(ctx -> {
                    ResendProperties p = ctx.getBean(ResendProperties.class);
                    // When RESEND_API_KEY is not set the bound value is blank (default:
                    // `${RESEND_API_KEY:}`) — detectable so the service refuses to send.
                    String key = p.getApiKey();
                    boolean unusable = key == null || key.isBlank() || key.contains("${");
                    assertTrue(unusable, "apiKey must be detected as unusable when unset: " + key);
                    // Safe defaults apply even without the API key.
                    assertEquals("onboarding@resend.dev", p.getFrom());
                    assertEquals("https://api.resend.com", p.getApiBaseUrl());
                    assertEquals("http://localhost:5173", p.getFrontendBaseUrl());
                });
    }

    @EnableConfigurationProperties(ResendProperties.class)
    static class Props {
    }
}