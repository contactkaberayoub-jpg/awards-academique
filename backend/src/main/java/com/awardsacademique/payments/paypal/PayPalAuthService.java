package com.awardsacademique.payments.paypal;

import com.awardsacademique.payments.paypal.exception.PayPalApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Service
@Slf4j
public class PayPalAuthService {

    private final PayPalProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    private String cachedAccessToken;
    private Instant tokenExpiresAt = Instant.MIN;

    @Autowired
    public PayPalAuthService(PayPalProperties properties) {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    // For testing
    public PayPalAuthService(PayPalProperties properties, HttpClient httpClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    public synchronized String getAccessToken() {
        if (cachedAccessToken != null && Instant.now().isBefore(tokenExpiresAt.minusSeconds(60))) {
            return cachedAccessToken;
        }

        String clientId = trimToNull(properties.getClientId());
        String clientSecret = trimToNull(properties.getClientSecret());

        // Configuration-loading guard (NOT payment business logic): never let a blank or an
        // unresolved `${...}` placeholder be sent to PayPal as a credential — that would produce a
        // PayPal 401 invalid_client that is impossible to diagnose. Fail fast with a clear, masked
        // message instead.
        String baseUrl = properties.getBaseUrl().replaceAll("/+$", "");
        if (clientId == null || clientId.contains("${")
                || clientSecret == null || clientSecret.contains("${")) {
            log.error("PayPal OAuth cannot start: {} - clientId={} mode={} baseUrl={} clientSecretPresent={}",
                    "missing or unresolved PayPal credentials",
                    mask(clientId), properties.getMode(), baseUrl, clientSecret != null);
            throw new PayPalApiException(
                    "PayPal is not configured: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET must be set");
        }

        try {
            String credentials = clientId + ":" + clientSecret;
            String encodedAuth = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

            String url = baseUrl + "/v1/oauth2/token";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                    .header("Authorization", "Basic " + encodedAuth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("PayPal OAuth failed with status {} - clientId={} mode={} baseUrl={} clientSecretPresent={} body={}",
                        response.statusCode(), mask(clientId), properties.getMode(), baseUrl,
                        clientSecret != null, response.body());
                String oauthDetail = null;
                try {
                    JsonNode errRoot = objectMapper.readTree(response.body());
                    String err = errRoot.path("error").asText(null);
                    String desc = errRoot.path("error_description").asText(null);
                    if (err != null || desc != null) {
                        oauthDetail = (err != null ? "error=" + err : "")
                                + (err != null && desc != null ? " | " : "")
                                + (desc != null ? "error_description=" + desc : "");
                    }
                } catch (Exception ignored) {
                    // body was not JSON; status-only message is still actionable
                }
                throw new PayPalApiException("Failed to obtain PayPal access token: HTTP "
                        + response.statusCode() + (oauthDetail != null ? " (" + oauthDetail + ")" : ""));
            }

            JsonNode root = objectMapper.readTree(response.body());
            String accessToken = root.path("access_token").asText(null);
            int expiresIn = root.path("expires_in").asInt(32400);

            if (accessToken == null || accessToken.isBlank()) {
                throw new PayPalApiException("PayPal OAuth response missing access_token");
            }

            cachedAccessToken = accessToken;
            tokenExpiresAt = Instant.now().plusSeconds(expiresIn);
            return cachedAccessToken;

        } catch (PayPalApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("PayPal OAuth request failed: {}", ex.getMessage(), ex);
            throw new PayPalApiException("PayPal OAuth request failed: " + ex.getMessage(), ex);
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Masks a client id so diagnostics never expose the full credential: first 4 + last 4 chars.
     * Never used for the secret.
     */
    private static String mask(String value) {
        if (value == null || value.isEmpty()) {
            return "<absent>";
        }
        if (value.length() <= 8) {
            return value.charAt(0) + "***";
        }
        return value.substring(0, 4) + "****" + value.substring(value.length() - 4);
    }
}
