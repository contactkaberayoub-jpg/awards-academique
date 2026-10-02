package com.awardsacademique.payouts.exception;

/**
 * Raised for invalid payout operations (insufficient balance, invalid state
 * transitions, missing payout account, ...). Carries a user-facing message and
 * an HTTP status so a single handler can map them.
 */
public class PayoutException extends RuntimeException {

    private final int status;

    public PayoutException(String message) {
        this(message, 400);
    }

    public PayoutException(String message, int status) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}