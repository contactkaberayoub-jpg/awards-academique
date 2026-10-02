package com.awardsacademique.resources.exception;

import java.util.UUID;

/**
 * Thrown when a lesson resource cannot be found.
 */
public class LessonResourceNotFoundException extends RuntimeException {

    public LessonResourceNotFoundException(UUID id) {
        super("Lesson resource not found with id: " + id);
    }

    public LessonResourceNotFoundException(String message) {
        super(message);
    }
}
