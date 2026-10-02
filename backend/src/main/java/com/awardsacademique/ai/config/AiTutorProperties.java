package com.awardsacademique.ai.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the AI tutor feature, bound from the {@code ai.tutor.*}
 * properties. The provider API key is only ever read from the environment and
 * is never exposed to clients.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "ai.tutor")
public class AiTutorProperties {

    private String apiKey = "";
    private String baseUrl = "https://api.openai.com/v1";
    private String model = "gpt-4o-mini";
    private double temperature = 0.4;
    private int maxMessageLength = 2000;
    private int maxHistoryMessages = 10;
    private int lessonContextMaxCharacters = 12000;
    private int maxCompletionTokens = 800;
    private int timeoutSeconds = 30;
}