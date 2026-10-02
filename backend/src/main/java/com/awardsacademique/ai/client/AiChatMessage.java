package com.awardsacademique.ai.client;

/**
 * A single chat message sent to the AI provider. Roles follow the
 * OpenAI-compatible convention: {@code system}, {@code user}, {@code assistant}.
 */
public record AiChatMessage(String role, String content) {
}