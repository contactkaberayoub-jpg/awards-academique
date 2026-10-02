package com.awardsacademique.emails.service.impl;

import com.awardsacademique.emails.SmtpMailProperties;
import com.awardsacademique.emails.exception.EmailException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Gmail SMTP provider activation guard: real credentials are required before the
 * provider is considered configured; the Gmail placeholders and unresolved
 * ${...} values are never treated as usable credentials.
 */
class GmailSmtpEmailServiceTest {

    private SmtpMailProperties properties;
    private GmailSmtpEmailService service;

    @BeforeEach
    void setUp() {
        properties = new SmtpMailProperties();
        service = new GmailSmtpEmailService(properties);
    }

    @Test
    void notConfigured_whenCredentialsEmpty() {
        assertFalse(service.isConfigured());
    }

    @Test
    void notConfigured_whenPlaceholderValuesUsed() {
        properties.setUsername("your-gmail@gmail.com");
        properties.setPassword("your-16-character-app-password");
        assertFalse(service.isConfigured(),
                "the documentation placeholder must not be treated as a real credential");
    }

    @Test
    void notConfigured_whenUnresolvedPlaceholderExpression() {
        properties.setUsername("${MAIL_USERNAME}");
        properties.setPassword("${MAIL_APP_PASSWORD}");
        assertFalse(service.isConfigured());
    }

    @Test
    void configured_whenRealCredentialsPresent() {
        properties.setUsername("real.account@gmail.com");
        properties.setPassword("abcd efgh ijkl mnop");
        assertTrue(service.isConfigured());
    }

    @Test
    void send_whenNotConfigured_throwsEmailException() {
        EmailException ex = assertThrows(EmailException.class,
                () -> service.send("to@test.com", "subject", "<p>html</p>"));
        assertEquals(true, ex.getMessage().contains("MAIL_USERNAME"));
    }
}