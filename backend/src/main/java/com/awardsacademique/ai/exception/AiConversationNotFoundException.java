package com.awardsacademique.ai.exception;

import java.util.UUID;

public class AiConversationNotFoundException extends RuntimeException {

    public AiConversationNotFoundException(UUID id) {
        super("AI conversation not found: " + id);
    }

    public AiConversationNotFoundException(String message) {
        super(message);
    }
}
