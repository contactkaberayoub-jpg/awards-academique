package com.awardsacademique.emails.service.interfaces;

/**
 * Transactional email abstraction. The concrete provider (currently Resend)
 * is behind this interface so feature code never depends on a specific vendor.
 */
public interface EmailService {

    /**
     * Sends a plain transactional email.
     *
     * @param to      recipient address
     * @param subject email subject
     * @param htmlBody HTML body (already fully assembled)
     * @throws com.awardsacademique.emails.exception.EmailException when the email cannot be sent
     */
    void send(String to, String subject, String htmlBody);

    /**
     * Flag telling whether a usable provider configuration is present. When
     * false, callers should degrade gracefully (log, skip) instead of failing
     * the user-facing operation.
     */
    boolean isConfigured();
}