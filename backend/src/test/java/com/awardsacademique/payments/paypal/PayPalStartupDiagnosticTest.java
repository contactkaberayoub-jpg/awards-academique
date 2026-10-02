package com.awardsacademique.payments.paypal;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies the startup diagnostic reports PayPal configuration safely: it may
 * show whether the client secret is present and a masked client id, but must
 * NEVER print the full client id, the client secret, or treat an unset secret
 * as configured. Uses the same {@link PayPalProperties} bean as the rest of the
 * platform, so there is no second configuration system.
 */
class PayPalStartupDiagnosticTest {

    // Realistic-length stand-ins proving masking works; NOT real credentials.
    private static final String LONG_CLIENT_ID = "AYdyzr3m2x3LFpGGwDsbNGEmr4B4MAMMq8XYZWabcd5678";
    private static final String SECRET = "ELnrBSB1234somePayloadNotForLogs";

    @Test
    void configuredMode_masksClientId_andOnlyReportsSecretPresence() {
        PayPalProperties props = new PayPalProperties();
        props.setClientId(LONG_CLIENT_ID);
        props.setClientSecret(SECRET);
        props.setMode("sandbox");
        props.setBaseUrl("https://api-m.sandbox.paypal.com");

        Logger logger = (Logger) LoggerFactory.getLogger(PayPalStartupDiagnostic.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.INFO);
        try {
            new PayPalStartupDiagnostic(props).run(null);
        } finally {
            logger.detachAppender(appender);
        }

        String line = appender.list.get(0).getFormattedMessage();
        // Safe, expected pieces.
        assertTrue(line.contains("mode: sandbox"), line);
        assertTrue(line.contains("client secret present: true"), line);
        // Never the full client id, never any part of the secret.
        assertFalse(line.contains(LONG_CLIENT_ID), "must not print full client id");
        assertFalse(line.contains(SECRET), "must not print the client secret");
        assertFalse(line.contains("ELnrBSB"), "must not print any fragment of the secret");
    }

    @Test
    void unconfiguredMode_reportsConfiguredFalse_andAbsentSecret() {
        PayPalProperties props = new PayPalProperties();
        // No credentials set -> must be reported as not configured, secret absent.

        Logger logger = (Logger) LoggerFactory.getLogger(PayPalStartupDiagnostic.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.INFO);
        try {
            new PayPalStartupDiagnostic(props).run(null);
        } finally {
            logger.detachAppender(appender);
        }

        String line = appender.list.get(0).getFormattedMessage();
        assertTrue(line.contains("PayPal configured: false"), line);
        assertTrue(line.contains("client secret present: false"), line);
        assertFalse(line.contains(SECRET), "must not print any secret");
    }
}
