package com.awardsacademique.payments.paypal;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves that Spring Boot binds the {@code paypal.*} configuration keys into
 * {@link PayPalProperties} at runtime (property names and env mapping), and documents the
 * unset-placeholder case so it can be detected and rejected instead of being sent to PayPal.
 */
class PayPalPropertiesConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(Props.class);

    @Test
    void bind_paypalKeys_intoProperties() {
        runner.withUserConfiguration(Props.class)
                .withPropertyValues(
                        "paypal.client-id=ABC123client",
                        "paypal.client-secret=DEF456secret",
                        "paypal.base-url=https://api-m.sandbox.paypal.com",
                        "paypal.mode=sandbox",
                        "paypal.timeout-seconds=25",
                        "paypal.mad-to-usd-rate=0.25")
                .run(ctx -> {
                    PayPalProperties p = ctx.getBean(PayPalProperties.class);
                    assertNotNull(p);
                    // Relaxed binding: paypal.client-id <-> clientId, paypal.client-secret <-> clientSecret.
                    assertEquals("ABC123client", p.getClientId());
                    assertEquals("DEF456secret", p.getClientSecret());
                    assertEquals("https://api-m.sandbox.paypal.com", p.getBaseUrl());
                    assertEquals("sandbox", p.getMode());
                    assertEquals(25, p.getTimeoutSeconds());
                    assertEquals(0, new java.math.BigDecimal("0.25").compareTo(p.getMadToUsdRate()));
                });
    }

    @Test
    void unsetMadToUsdRate_bindsAsUnusableAndDetectable() {
        runner.withUserConfiguration(Props.class)
                .withPropertyValues("paypal.mad-to-usd-rate=")
                .run(ctx -> {
                    PayPalProperties p = ctx.getBean(PayPalProperties.class);
                    // An unset/empty rate must be detectable so the MAD conversion path
                    // fails loudly instead of silently using a made-up rate.
                    java.math.BigDecimal rate = p.getMadToUsdRate();
                    boolean unusable = rate == null || rate.compareTo(java.math.BigDecimal.ZERO) <= 0;
                    assertTrue(unusable, "missing rate must be detected as unusable: " + rate);
                });
    }

    @Test
    void unsetClientId_isDetectable_notUsableCredential() {
        runner.withUserConfiguration(Props.class)
                // Force the credentials to be unbound so the assertion is hermetic and does
                // not depend on PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET being absent from the
                // machine environment running the build.
                .withPropertyValues("paypal.client-id=", "paypal.client-secret=")
                .run(ctx -> {
                    PayPalProperties p = ctx.getBean(PayPalProperties.class);
                    // When PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set, the bound value must
                    // be null/blank or the unresolved literal placeholder — both detectable so the
                    // auth service rejects them locally instead of sending a bad Basic header to PayPal.
                    String id = p.getClientId();
                    String secret = p.getClientSecret();
                    boolean idUnusable = id == null || id.isBlank() || id.contains("${");
                    boolean secretUnusable = secret == null || secret.isBlank() || secret.contains("${");
                    assertTrue(idUnusable, "clientId must be detected as unusable when unset: " + id);
                    assertTrue(secretUnusable, "clientSecret must be detected as unusable when unset");
                    // Sandbox defaults apply even without the credentials.
                    assertEquals("https://api-m.sandbox.paypal.com", p.getBaseUrl());
                    assertEquals("sandbox", p.getMode());
                });
    }

    @Test
    void defaultBaseUrlIsPayPalSandbox() {
        runner.withUserConfiguration(Props.class)
                .run(ctx -> {
                    PayPalProperties p = ctx.getBean(PayPalProperties.class);
                    assertEquals("https://api-m.sandbox.paypal.com", p.getBaseUrl());
                    assertEquals("sandbox", p.getMode());
                    assertFalse(p.getBaseUrl().contains("live"));
                });
    }

    @EnableConfigurationProperties(PayPalProperties.class)
    static class Props {
    }
}
