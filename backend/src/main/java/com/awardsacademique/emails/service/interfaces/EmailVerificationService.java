package com.awardsacademique.emails.service.interfaces;

import com.awardsacademique.authentification.entity.User;

/**
 * Email verification: token generation, sending, and verification.
 * Tokens are short-lived JWTs carrying the account email as subject with a
 * dedicated purpose claim, signed with the application JWT secret.
 */
public interface EmailVerificationService {

    /**
     * Generates a one-purpose verification token for the given email.
     */
    String createVerificationToken(String email);

    /**
     * Sends a "verify your email" message to the user with a signed link.
     * No-op (log-level) when the provider is not configured.
     */
    void sendVerificationEmail(User user);

    /**
     * Verifies the token and marks the account verified.
     *
     * @param token the signed verification token
     * @return the verified user
     * @throws com.awardsacademique.emails.exception.EmailException when the token is invalid/expired
     */
    User verifyEmail(String token);
}