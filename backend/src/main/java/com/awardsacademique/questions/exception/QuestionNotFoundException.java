package com.awardsacademique.questions.exception;

import java.util.UUID;

/**
 * Thrown when a question cannot be found.
 */
public class QuestionNotFoundException extends RuntimeException {

    public QuestionNotFoundException(UUID id) {
        super("Question not found with id: " + id);
    }
}
