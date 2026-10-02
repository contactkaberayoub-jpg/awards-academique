package com.awardsacademique.ai.utils;

import java.util.UUID;

public final class AiConversationUtils {

    private AiConversationUtils() {
    }

    public static String preview(String content, int maxLength) {
        if (content == null) return "";
        String trimmed = content.trim().replaceAll("\\s+", " ");
        if (trimmed.length() <= maxLength) return trimmed;
        return trimmed.substring(0, Math.max(0, maxLength - 1)) + "…";
    }

    public static String generateDefaultTitle(String firstMessage) {
        String preview = preview(firstMessage, 60);
        return preview.isBlank() ? "Conversation " + UUID.randomUUID().toString().substring(0, 8) : preview;
    }
}
