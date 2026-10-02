package com.awardsacademique.authentification.service.impl;

import com.awardsacademique.authentification.config.GoogleOAuthProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class GoogleIdTokenVerifier {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String EXPECTED_ISSUER = "https://accounts.google.com";
    // Small tolerance for clock skew between token issuer and this JVM. Deliberately
    // tiny: must never accept tokens that are due to a skewed local clock by hours.
    private static final long IAT_MAX_FUTURE_SKEW_SECONDS = 300L;

    private final GoogleOAuthProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final ConcurrentHashMap<String, PublicKey> keyCache = new ConcurrentHashMap<>();
    private volatile long cacheExpiresAtMs = 0;

    @Autowired
    public GoogleIdTokenVerifier(GoogleOAuthProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    // For testing: allow injecting a mocked HttpClient.
    GoogleIdTokenVerifier(GoogleOAuthProperties properties, ObjectMapper objectMapper, HttpClient httpClient) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    public GoogleIdTokenParts verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new GoogleTokenVerificationException("ID token is null or blank");
        }

        String[] parts = idToken.split("\\.");
        if (parts.length != 3) {
            throw new GoogleTokenVerificationException("Invalid JWT format: expected 3 parts, got " + parts.length);
        }

        try {
            String headerJson = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);

            JsonNode header = objectMapper.readTree(headerJson);
            JsonNode payload = objectMapper.readTree(payloadJson);

            String kid = header.path("kid").asText(null);
            String alg = header.path("alg").asText(null);

            if (kid == null || kid.isBlank()) {
                throw new GoogleTokenVerificationException("ID token header missing 'kid'");
            }
            if (!"RS256".equals(alg)) {
                throw new GoogleTokenVerificationException("Unsupported algorithm: " + alg);
            }

            PublicKey publicKey = resolvePublicKey(kid);

            byte[] signatureBytes = Base64.getUrlDecoder().decode(parts[2]);
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initVerify(publicKey);
            sig.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8));
            if (!sig.verify(signatureBytes)) {
                throw new GoogleTokenVerificationException("ID token signature verification failed");
            }

            String iss = payload.path("iss").asText(null);
            if (!EXPECTED_ISSUER.equals(iss)) {
                throw new GoogleTokenVerificationException("Invalid issuer: " + iss);
            }

            String aud = payload.path("aud").asText(null);
            if (aud == null || !aud.equals(properties.getClientId())) {
                throw new GoogleTokenVerificationException("Invalid audience");
            }

            long exp = payload.path("exp").asLong(0);
            long iat = payload.path("iat").asLong(0);
            long nowEpochSec = System.currentTimeMillis() / 1000;
            long remainingSeconds = exp - nowEpochSec;

            if (exp <= 0) {
                throw new GoogleTokenVerificationException("ID token missing 'exp'");
            }
            if (iat <= 0) {
                throw new GoogleTokenVerificationException("ID token missing 'iat'");
            }
            if (iat > nowEpochSec + IAT_MAX_FUTURE_SKEW_SECONDS) {
                throw new GoogleTokenVerificationException(
                        "ID token issued in the future (iat=" + iat + ", now=" + nowEpochSec + ")");
            }
            if (exp < nowEpochSec) {
                log.warn("Google ID token rejected as expired. "
                                + "exp={} iat={} now={} remainingSeconds={}",
                        exp, iat, nowEpochSec, remainingSeconds);
                throw new GoogleTokenVerificationException("ID token has expired");
            }
            log.debug("Google ID token claims validated. "
                            + "exp={} iat={} now={} remainingSeconds={} sub={} aud={}",
                    exp, iat, nowEpochSec, remainingSeconds,
                    payload.path("sub").asText(null), aud);

            String sub = payload.path("sub").asText(null);
            if (sub == null || sub.isBlank()) {
                throw new GoogleTokenVerificationException("ID token missing 'sub'");
            }

            String email = payload.path("email").asText(null);
            if (email == null || email.isBlank()) {
                throw new GoogleTokenVerificationException("ID token missing 'email'");
            }

            return new GoogleIdTokenParts(
                    sub,
                    email,
                    payload.path("email_verified").asBoolean(false),
                    payload.path("given_name").asText(null),
                    payload.path("family_name").asText(null),
                    payload.path("name").asText(null),
                    payload.path("picture").asText(null)
            );

        } catch (GoogleTokenVerificationException e) {
            throw e;
        } catch (Exception e) {
            throw new GoogleTokenVerificationException("Failed to verify ID token: " + e.getMessage(), e);
        }
    }

    private PublicKey resolvePublicKey(String kid) {
        PublicKey cached = keyCache.get(kid);
        if (cached != null && System.currentTimeMillis() < cacheExpiresAtMs) {
            return cached;
        }
        refreshKeyCache();
        PublicKey key = keyCache.get(kid);
        if (key == null) {
            throw new GoogleTokenVerificationException("No matching public key found for kid: " + kid);
        }
        return key;
    }

    private void refreshKeyCache() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GOOGLE_JWKS_URI))
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new GoogleTokenVerificationException(
                        "Failed to fetch Google JWKS: HTTP " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode keys = root.path("keys");
            ConcurrentHashMap<String, PublicKey> freshCache = new ConcurrentHashMap<>();

            if (keys.isArray()) {
                for (JsonNode keyNode : keys) {
                    String keyKid = keyNode.path("kid").asText(null);
                    String kty = keyNode.path("kty").asText(null);
                    String n = keyNode.path("n").asText(null);
                    String e = keyNode.path("e").asText(null);
                    if ("RSA".equals(kty) && keyKid != null && n != null && e != null) {
                        try {
                            freshCache.put(keyKid, buildRsaPublicKey(n, e));
                        } catch (Exception ex) {
                            log.warn("Skipping unusable Google JWK kid={}: {}", keyKid, ex.getMessage());
                        }
                    }
                }
            }

            keyCache.clear();
            keyCache.putAll(freshCache);
            int ttlSeconds = Math.max(1, properties.getJwksCacheTtlSeconds());
            cacheExpiresAtMs = System.currentTimeMillis() + (ttlSeconds * 1000L);
            log.debug("Google JWKS refreshed: {} keys cached for {}s", freshCache.size(), ttlSeconds);

        } catch (GoogleTokenVerificationException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GoogleTokenVerificationException("Interrupted while fetching Google JWKS", e);
        } catch (Exception e) {
            throw new GoogleTokenVerificationException("Failed to fetch Google JWKS: " + e.getMessage(), e);
        }
    }

    private PublicKey buildRsaPublicKey(String modulusB64Url, String exponentB64Url) throws Exception {
        byte[] modulusBytes = Base64.getUrlDecoder().decode(modulusB64Url);
        byte[] exponentBytes = Base64.getUrlDecoder().decode(exponentB64Url);
        RSAPublicKeySpec keySpec = new RSAPublicKeySpec(
                new BigInteger(1, modulusBytes),
                new BigInteger(1, exponentBytes));
        return KeyFactory.getInstance("RSA").generatePublic(keySpec);
    }

    public record GoogleIdTokenParts(
            String sub,
            String email,
            boolean emailVerified,
            String firstName,
            String lastName,
            String name,
            String picture
    ) {}

    public static class GoogleTokenVerificationException extends RuntimeException {
        public GoogleTokenVerificationException(String message) {
            super(message);
        }

        public GoogleTokenVerificationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}