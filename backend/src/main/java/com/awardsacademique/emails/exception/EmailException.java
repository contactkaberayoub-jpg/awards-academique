package com.awardsacademique.emails.exception;

/**
 * Thrown when a transactional email cannot be delivered through the configured
 * provider (transport failure, provider-side HTTP error, misconfiguration).
 */
public class EmailException extends RuntimeException {

    public EmailException(String message) {
        super(message);
    }

    public EmailException(String message, Throwable cause) {
        super(message, cause);
    }
}