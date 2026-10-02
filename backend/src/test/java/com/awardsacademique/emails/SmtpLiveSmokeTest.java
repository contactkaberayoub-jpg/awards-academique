package com.awardsacademique.emails;

import com.awardsacademique.emails.service.impl.GmailSmtpEmailService;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Live SMTP smoke test. Only runs when {@code RUN_LIVE_SMTP_TEST=1} is set AND
 * real credentials are bound (MAIL_USERNAME / MAIL_APP_PASSWORD). Sends one
 * real message to the configured sender so delivery through Gmail SMTP can be
 * verified end-to-end. Skipped in all ordinary builds and CI.
 */
@SpringBootTest
class SmtpLiveSmokeTest {

    @Autowired
    private GmailSmtpEmailService smtpEmailService;

    @Test
    void sendsRealMessageThroughConfiguredSmtp() {
        boolean explicitlyEnabled = "1".equals(System.getenv("RUN_LIVE_SMTP_TEST"));
        Assumptions.assumeTrue(explicitlyEnabled,
                "Set RUN_LIVE_SMTP_TEST=1 to enable the live SMTP smoke test");
        Assumptions.assumeTrue(smtpEmailService.isConfigured(),
                "SMTP is not configured: set MAIL_USERNAME / MAIL_APP_PASSWORD");

        String recipient = System.getenv("MAIL_USERNAME");
        Assumptions.assumeTrue(recipient != null && !recipient.isBlank(),
                "MAIL_USERNAME must be set to run the live SMTP smoke test");

        smtpEmailService.send(
                recipient,
                "[Awards Académique] Test SMTP " + System.currentTimeMillis(),
                "<p>Bonjour,</p>"
                        + "<p>Ceci est un e-mail de test envoyé via Gmail SMTP "
                        + "par la plateforme Awards Académique.</p>"
                        + "<p>SMTP configuré et testé avec succès.</p>");
    }
}