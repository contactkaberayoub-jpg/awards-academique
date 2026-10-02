package com.awardsacademique.parametres.exception;

/**
 * Raised for invalid parameter operations (unknown key, non-numeric value,
 * revenue split not totaling 100, ...). Carries a user-facing message and an
 * HTTP status so a single handler can map them.
 */
public class ParametreException extends RuntimeException {

    private final int status;

    public ParametreException(String message) {
        this(message, 400);
    }

    public ParametreException(String message, int status) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}