package com.awardsacademique.emails.service.impl;

import com.awardsacademique.emails.ResendProperties;
import com.awardsacademique.emails.exception.EmailException;
import com.awardsacademique.emails.service.interfaces.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Resend transactional email provider built on the JDK {@link HttpClient}.
 * No extra HTTP/SDK dependencies are required.
 *
 * <p>The Resend API key is read from the {@code RESEND_API_KEY} environment
 * variable at runtime. It is never hard-coded, never written to logs, and
 * never included in outgoing HTTP bodies — only in the {@code Authorization}
 * header.</p>
 *
 * <p>Logging is deliberately restricted to request status and the configured
 * "from" address; the API key, full headers, and message bodies are never
 * logged.</p>
 */
@Slf4j
@Service
public class ResendEmailService implements EmailService {

    private final ResendProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public ResendEmailService(ResendProperties properties) {
        this(properties, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build(), new ObjectMapper());
    }

    // Package-visible for tests.
    ResendEmailService(ResendProperties properties, HttpClient httpClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean isConfigured() {
        String key = properties.getApiKey();
        return key != null && !key.isBlank() && !key.contains("${");
    }

    @Override
    public void send(String to, String subject, String htmlBody) {
        if (!isConfigured()) {
            throw new EmailException(
                    "Resend is not configured: RESEND_API_KEY must be set");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", properties.getFrom());
        payload.put("to", new String[]{to});
        payload.put("subject", subject);
        payload.put("html", htmlBody);

        try {
            String jsonBody = objectMapper.writeValueAsString(payload);
            String url = properties.getApiBaseUrl().replaceAll("/+$", "") + "/emails";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Authorization", "Bearer " + properties.getApiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String apiMessage = extractErrorMessage(response.body());
                log.error("Resend failed with HTTP {} for to={} from={}: {}",
                        response.statusCode(), maskEmail(to), maskEmail(properties.getFrom()),
                        apiMessage != null ? apiMessage : response.body());
                throw new EmailException("Failed to send email via Resend: HTTP "
                        + response.statusCode()
                        + (apiMessage != null ? " (" + apiMessage + ")" : ""));
            }

            log.info("Resend accepted email to={} from={}", maskEmail(to), maskEmail(properties.getFrom()));
        } catch (EmailException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Resend request failed for to={}: {}", maskEmail(to), ex.getMessage());
            throw new EmailException("Failed to send email via Resend: " + ex.getMessage(), ex);
        }
    }

    /** Best-effort extraction of the Resend API error message from a JSON body. */
    private String extractErrorMessage(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            Map<?, ?> parsed = objectMapper.readValue(body, Map.class);
            Object message = parsed.get("message");
            return message instanceof String && !((String) message).isBlank() ? (String) message : null;
        } catch (Exception ex) {
            return null;
        }
    }

    /** Masks an email address for logs: first character + **** + domain. */
    private static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "<absent>";
        }
        int at = email.indexOf('@');
        if (at <= 1) {
            return "*@*" + (at >= 0 ? email.substring(at + 1) : "");
        }
        return email.charAt(0) + "****" + email.substring(at);
    }
}