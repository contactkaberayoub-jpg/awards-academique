package com.awardsacademique.emails.service.impl;

import com.awardsacademique.emails.SmtpMailProperties;
import com.awardsacademique.emails.exception.EmailException;
import com.awardsacademique.emails.service.interfaces.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Properties;

/**
 * Gmail SMTP transactional email provider built on Spring Mail {@code JavaMailSender}.
 *
 * <p>Credentials are bound at runtime from the {@code MAIL_USERNAME} /
 * {@code MAIL_APP_PASSWORD} environment variables (see {@link SmtpMailProperties}).
 * They are never hard-coded, never logged, and never exposed to the frontend.</p>
 *
 * <p>This provider is only "configured" when real SMTP credentials are present;
 * otherwise {@link #isConfigured()} returns false and callers degrade gracefully
 * (register/forgot-password still succeed, the email is simply skipped and logged).</p>
 */
@Slf4j
@Service
public class GmailSmtpEmailService implements EmailService {

    private final SmtpMailProperties properties;
    private final JavaMailSenderImpl mailSender;

    public GmailSmtpEmailService(SmtpMailProperties properties) {
        this.properties = properties;
        this.mailSender = buildMailSender(properties);
    }

    private static JavaMailSenderImpl buildMailSender(SmtpMailProperties props) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(props.getHost());
        sender.setPort(props.getPort());
        sender.setUsername(props.getUsername());
        sender.setPassword(props.getPassword());
        sender.setProtocol("smtp");

        Properties javaProps = sender.getJavaMailProperties();
        javaProps.put("mail.smtp.auth", String.valueOf(props.isAuth()));
        javaProps.put("mail.smtp.starttls.enable", String.valueOf(props.isStartTlsEnable()));
        javaProps.put("mail.smtp.connectiontimeout", "15000");
        javaProps.put("mail.smtp.timeout", "20000");
        javaProps.put("mail.smtp.writetimeout", "20000");
        return sender;
    }

    @Override
    public boolean isConfigured() {
        String username = properties.getUsername();
        String password = properties.getPassword();
        return username != null && !username.isBlank()
                && !username.contains("${")
                && !username.equalsIgnoreCase("your-gmail@gmail.com")
                && password != null && !password.isBlank()
                && !password.contains("${")
                && !password.equals("your-16-character-app-password");
    }

    @Override
    public void send(String to, String subject, String htmlBody) {
        if (!isConfigured()) {
            throw new EmailException(
                    "SMTP is not configured: MAIL_USERNAME / MAIL_APP_PASSWORD must be set");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(properties.getUsername());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("SMTP email sent to {}", maskEmail(to));
        } catch (EmailException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("SMTP send failed for to={}: {}", maskEmail(to), ex.getMessage());
            throw new EmailException("Failed to send email via SMTP: " + ex.getMessage(), ex);
        }
    }

    /** Masks an email address for logs: first character + **** + domain. */
    private static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "<absent>";
        }
        int at = email.indexOf('@');
        if (at <= 1) {
            return "*@*" + (at >= 0 ? email.substring(at + 1) : "");
        }
        return email.charAt(0) + "****" + email.substring(at);
    }
}