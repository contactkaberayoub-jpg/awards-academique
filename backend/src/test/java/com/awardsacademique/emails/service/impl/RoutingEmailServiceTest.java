package com.awardsacademique.emails.service.impl;

import com.awardsacademique.emails.exception.EmailException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The default {@link com.awardsacademique.emails.service.interfaces.EmailService}
 * routes to Gmail SMTP when its credentials are set and falls back to Resend.
 */
@ExtendWith(MockitoExtension.class)
class RoutingEmailServiceTest {

    @Mock
    private GmailSmtpEmailService smtp;

    @Mock
    private ResendEmailService resend;

    private RoutingEmailService router() {
        return new RoutingEmailService(smtp, resend);
    }

    @Test
    void routesToSmtp_whenSmtpConfigured() {
        when(smtp.isConfigured()).thenReturn(true);

        router().send("to@test.com", "subject", "<p>html</p>");

        verify(smtp).send("to@test.com", "subject", "<p>html</p>");
        verify(resend, never()).send(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void routesToResend_whenSmtpNotConfiguredButResendIs() {
        when(smtp.isConfigured()).thenReturn(false);
        when(resend.isConfigured()).thenReturn(true);

        router().send("to@test.com", "subject", "<p>html</p>");

        verify(resend).send("to@test.com", "subject", "<p>html</p>");
        verify(smtp, never()).send(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void isConfigured_trueWhenEitherProviderConfigured() {
        when(resend.isConfigured()).thenReturn(true);
        when(smtp.isConfigured()).thenReturn(false);
        assertTrue(router().isConfigured());

        when(smtp.isConfigured()).thenReturn(true);
        assertTrue(router().isConfigured());
    }

    @Test
    void isConfigured_falseWhenNoProviderConfigured() {
        when(smtp.isConfigured()).thenReturn(false);
        when(resend.isConfigured()).thenReturn(false);
        assertFalse(router().isConfigured());
    }

    @Test
    void send_whenNothingConfigured_throws() {
        when(smtp.isConfigured()).thenReturn(false);
        when(resend.isConfigured()).thenReturn(false);

        assertThrows(EmailException.class, () -> router().send("to@test.com", "s", "<p>h</p>"));
    }
}