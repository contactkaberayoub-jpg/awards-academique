package com.awardsacademique.quizzes.exception;

import java.util.UUID;

/**
 * Thrown when a quiz cannot be found.
 */
public class QuizNotFoundException extends RuntimeException {

    public QuizNotFoundException(UUID id) {
        super("Quiz not found with id: " + id);
    }
}
