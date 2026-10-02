package com.awardsacademique.ai.exception;

public class AiTutorUnavailableException extends RuntimeException {

    public AiTutorUnavailableException(String message) {
        super(message);
    }

    public AiTutorUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}