package com.awardsacademique.enrollments.exception;

/**
 * Thrown when a student tries to self-enroll in a course that is not free.
 *
 * <p>Payment for paid courses is not implemented yet (Sprint 2+). Until then,
 * self-enrollment is only allowed for free courses and this exception signals
 * that the request requires payment. It maps to HTTP 402 Payment Required.
 */
public class PaymentRequiredException extends RuntimeException {

    public PaymentRequiredException(String message) {
        super(message);
    }
}
