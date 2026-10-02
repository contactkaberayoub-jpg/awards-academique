package com.awardsacademique.ai.client;

import com.awardsacademique.ai.config.AiTutorProperties;
import com.awardsacademique.ai.exception.AiTutorUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal OpenAI-compatible chat completions client built on the JDK
 * {@link HttpClient}. No extra HTTP/SDK dependencies are required.
 *
 * <p>Only the HTTP status code and the exception type are logged; prompts,
 * provider responses and the API key are never logged.</p>
 */
@Component
@Slf4j
public class AiTutorProviderClient {

    private final AiTutorProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public AiTutorProviderClient(AiTutorProperties properties) {
        this(properties, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build(), new ObjectMapper());
    }

    AiTutorProviderClient(AiTutorProperties properties, HttpClient httpClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
            log.warn("AI tutor API key is not configured. Set AI_API_KEY environment variable. " +
                    "All tutor requests will fail until a valid key is provided.");
        } else {
            log.info("AI tutor provider configured: model={}, baseUrl={}", properties.getModel(), properties.getBaseUrl());
        }
    }

    /**
     * Sends a chat completion request and returns the assistant reply. Throws
     * {@link AiTutorUnavailableException} for any transport, HTTP or payload
     * failure so callers never see provider internals.
     */
    public String chat(List<AiChatMessage> messages) {
        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
            throw new AiTutorUnavailableException("AI tutor API key is not configured");
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", properties.getModel());
            body.put("temperature", properties.getTemperature());
            body.put("max_tokens", properties.getMaxCompletionTokens());

            List<Map<String, String>> payload = new ArrayList<>();
            for (AiChatMessage message : messages) {
                Map<String, String> item = new LinkedHashMap<>();
                item.put("role", message.role());
                item.put("content", message.content());
                payload.add(item);
            }
            body.put("messages", payload);

            String jsonBody = objectMapper.writeValueAsString(body);
            String url = properties.getBaseUrl().replaceAll("/+$", "") + "/chat/completions";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + properties.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("AI tutor provider returned HTTP {} — body: {}",
                        response.statusCode(),
                        response.body() != null && response.body().length() > 500
                                ? response.body().substring(0, 500) : response.body());
                throw new AiTutorUnavailableException(
                        "AI tutor provider returned HTTP " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.isNull() || content.asText().isBlank()) {
                log.warn("AI tutor provider response missing assistant content — body: {}",
                        response.body() != null && response.body().length() > 500
                                ? response.body().substring(0, 500) : response.body());
                throw new AiTutorUnavailableException("AI tutor provider returned an empty response");
            }
            return content.asText().trim();
        } catch (AiTutorUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("AI tutor provider call failed: {}: {}",
                    ex.getClass().getSimpleName(), ex.getMessage());
            throw new AiTutorUnavailableException("AI tutor provider request failed: " + ex.getMessage(), ex);
        }
    }
}