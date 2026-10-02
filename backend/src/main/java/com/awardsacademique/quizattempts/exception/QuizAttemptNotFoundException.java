package com.awardsacademique.quizattempts.exception;

import java.util.UUID;

public class QuizAttemptNotFoundException extends RuntimeException {

    public QuizAttemptNotFoundException(UUID id) {
        super("Quiz attempt not found with id: " + id);
    }

    public QuizAttemptNotFoundException(String message) {
        super(message);
    }
}
