package com.awardsacademique.progress.exception;

import java.util.UUID;

public class LessonProgressNotFoundException extends RuntimeException {

    public LessonProgressNotFoundException(UUID id) {
        super("Lesson progress not found with id: " + id);
    }

    public LessonProgressNotFoundException(String message) {
        super(message);
    }
}
