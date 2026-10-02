package com.awardsacademique.reviews.exception;

import java.util.UUID;

/**
 * Thrown when a review cannot be found.
 */
public class ReviewNotFoundException extends RuntimeException {

    public ReviewNotFoundException(UUID id) {
        super("Review not found with id: " + id);
    }
}
