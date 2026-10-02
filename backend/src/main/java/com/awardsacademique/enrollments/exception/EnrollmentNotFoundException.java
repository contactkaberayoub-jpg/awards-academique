package com.awardsacademique.enrollments.exception;

import java.util.UUID;

/**
 * Thrown when an enrollment cannot be found.
 */
public class EnrollmentNotFoundException extends RuntimeException {

    public EnrollmentNotFoundException(UUID id) {
        super("Enrollment not found with id: " + id);
    }

    public EnrollmentNotFoundException(String message) {
        super(message);
    }
}
