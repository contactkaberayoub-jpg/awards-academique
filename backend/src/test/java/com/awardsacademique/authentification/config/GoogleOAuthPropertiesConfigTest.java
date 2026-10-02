package com.awardsacademique.authentification.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves Spring Boot binds the {@code google.oauth.*} configuration keys into
 * {@link GoogleOAuthProperties} and that an unset/unresolved client id is
 * detectable (so the OAuth service rejects it locally instead of redirecting
 * to Google with empty credentials).
 */
class GoogleOAuthPropertiesConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(Props.class);

    @Test
    void bind_googleOAuthKeys_intoProperties() {
        runner.withPropertyValues(
                "google.oauth.client-id=abc.apps.googleusercontent.com",
                "google.oauth.client-secret=GOCSPX-secret",
                "google.oauth.redirect-uri=https://api.awards.test/api/auth/google/callback",
                "google.oauth.scopes=openid,email,profile",
                "google.oauth.exchange-code-ttl-seconds=120",
                "google.oauth.jwks-cache-ttl-seconds=7200",
                "google.oauth.frontend-callback-url=https://app.awards.test/auth/google/callback")
                .run(ctx -> {
                    GoogleOAuthProperties p = ctx.getBean(GoogleOAuthProperties.class);
                    assertNotNull(p);
                    assertEquals("abc.apps.googleusercontent.com", p.getClientId());
                    assertEquals("GOCSPX-secret", p.getClientSecret());
                    assertEquals("https://api.awards.test/api/auth/google/callback", p.getRedirectUri());
                    assertEquals(List.of("openid", "email", "profile"), p.getScopes());
                    assertEquals(120, p.getExchangeCodeTtlSeconds());
                    assertEquals(7200, p.getJwksCacheTtlSeconds());
                    assertEquals("https://app.awards.test/auth/google/callback", p.getFrontendCallbackUrl());
                    assertTrue(p.isConfigured());
                });
    }

    @Test
    void unsetCredentials_isDetectable_notConfigured() {
        runner.run(ctx -> {
            GoogleOAuthProperties p = ctx.getBean(GoogleOAuthProperties.class);
            boolean unusable = p.getClientId() == null || p.getClientId().isBlank()
                    || p.getClientSecret() == null || p.getClientSecret().isBlank();
            assertTrue(unusable, "credentials must be detected as unusable when unset");
            assertFalse(p.isConfigured());
            // Safe defaults apply even without credentials.
            assertEquals("http://localhost:8080/api/auth/google/callback", p.getRedirectUri());
            assertEquals(List.of("openid", "email", "profile"), p.getScopes());
            assertEquals(300, p.getExchangeCodeTtlSeconds());
            assertEquals(3600, p.getJwksCacheTtlSeconds());
            assertEquals("http://localhost:5173/auth/google/callback", p.getFrontendCallbackUrl());
        });
    }

    @EnableConfigurationProperties(GoogleOAuthProperties.class)
    static class Props {
    }
}