package com.awardsacademique.emails.service.impl;

import com.awardsacademique.emails.exception.EmailException;
import com.awardsacademique.emails.service.interfaces.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

/**
 * Primary {@link EmailService} that routes every transactional email to the
 * best configured provider:
 *
 * <ul>
 *   <li>Gmail SMTP ({@link GmailSmtpEmailService}) when {@code MAIL_USERNAME} and
 *       {@code MAIL_APP_PASSWORD} are set;</li>
 *   <li>otherwise Resend ({@link ResendEmailService}) when {@code RESEND_API_KEY}
 *       is set;</li>
 *   <li>otherwise nothing — {@link #isConfigured()} returns false so callers
 *       degrade gracefully.</li>
 * </ul>
 *
 * Feature code keeps depending on the {@link EmailService} interface; this
 * router decides the concrete provider so no call site is SMTP-aware.
 */
@Slf4j
@Service
@Primary
@RequiredArgsConstructor
public class RoutingEmailService implements EmailService {

    private final GmailSmtpEmailService smtpEmailService;
    private final ResendEmailService resendEmailService;

    @Override
    public boolean isConfigured() {
        return smtpEmailService.isConfigured() || resendEmailService.isConfigured();
    }

    @Override
    public void send(String to, String subject, String htmlBody) {
        if (smtpEmailService.isConfigured()) {
            log.debug("Routing transactional email to Gmail SMTP");
            smtpEmailService.send(to, subject, htmlBody);
            return;
        }
        if (resendEmailService.isConfigured()) {
            log.debug("Routing transactional email to Resend");
            resendEmailService.send(to, subject, htmlBody);
            return;
        }
        throw new EmailException(
                "No mail provider is configured (set MAIL_USERNAME/MAIL_APP_PASSWORD or RESEND_API_KEY)");
    }
}