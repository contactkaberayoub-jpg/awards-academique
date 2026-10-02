package com.awardsacademique.authentification.service.impl;

import com.awardsacademique.authentification.config.GoogleOAuthProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.Security;
import java.security.Signature;
import java.security.interfaces.RSAPrivateCrtKey;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoogleIdTokenVerifierTest {

    private static final String CLIENT_ID = "test-client.apps.googleusercontent.com";

    private GoogleOAuthProperties properties;
    private HttpClient httpClient;
    private GoogleIdTokenVerifier verifier;
    private KeyPair keyPair;
    private String kid;

    @BeforeEach
    void setUp() throws Exception {
        properties = new GoogleOAuthProperties();
        properties.setClientId(CLIENT_ID);
        httpClient = mock(HttpClient.class);
        verifier = new GoogleIdTokenVerifier(properties, new ObjectMapper(), httpClient);

        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        keyPair = generator.generateKeyPair();
        kid = "test-key-1";
    }

    @SuppressWarnings("unchecked")
    private void stubJwksResponse() throws Exception {
        HttpResponse<String> jwks = mock(HttpResponse.class);
        when(jwks.statusCode()).thenReturn(200);
        when(jwks.body()).thenReturn(jwksJson());
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(jwks);
    }

    private String jwksJson() {
        RSAPrivateCrtKey privateKey = (RSAPrivateCrtKey) keyPair.getPrivate();
        BigInteger modulus = privateKey.getModulus();
        BigInteger exponent = privateKey.getPublicExponent();
        String n = Base64.getUrlEncoder().withoutPadding().encodeToString(modulus.toByteArray());
        String e = Base64.getUrlEncoder().withoutPadding().encodeToString(exponent.toByteArray());
        return "{\"keys\":[{\"kid\":\"" + kid + "\",\"kty\":\"RSA\",\"n\":\"" + n + "\",\"e\":\"" + e + "\"}]}";
    }

    private String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String signToken(String headerJson, String payloadJson) throws Exception {
        String signingInput = base64Url(headerJson.getBytes(StandardCharsets.UTF_8))
                + "." + base64Url(payloadJson.getBytes(StandardCharsets.UTF_8));
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(keyPair.getPrivate());
        signature.update(signingInput.getBytes(StandardCharsets.UTF_8));
        byte[] sig = signature.sign();
        return signingInput + "." + base64Url(sig);
    }

    private String token(long exp, String iss, String aud) throws Exception {
        long iat = System.currentTimeMillis() / 1000;
        return token(exp, iss, aud, iat);
    }

    private String token(long exp, String iss, String aud, long iat) throws Exception {
        String header = "{\"alg\":\"RS256\",\"kid\":\"" + kid + "\",\"typ\":\"JWT\"}";
        String payload = "{"
                + "\"iss\":\"" + iss + "\","
                + "\"sub\":\"google-sub-123\","
                + "\"aud\":\"" + aud + "\","
                + "\"exp\":" + exp + ","
                + "\"iat\":" + iat + ","
                + "\"email\":\"user@example.com\","
                + "\"email_verified\":true,"
                + "\"name\":\"Jean Dupont\","
                + "\"given_name\":\"Jean\","
                + "\"family_name\":\"Dupont\","
                + "\"picture\":\"https://lh3.googleusercontent.com/a/pic\""
                + "}";
        return signToken(header, payload);
    }

    @Test
    void verify_validToken_returnsEmailAndSubject() throws Exception {
        stubJwksResponse();
        long exp = (System.currentTimeMillis() / 1000) + 3600;
        String idToken = token(exp, "https://accounts.google.com", CLIENT_ID);

        GoogleIdTokenVerifier.GoogleIdTokenParts parts = verifier.verify(idToken);

        assertEquals("user@example.com", parts.email());
        assertEquals("google-sub-123", parts.sub());
        assertTrue(parts.emailVerified());
        assertEquals("Jean", parts.firstName());
        assertEquals("Dupont", parts.lastName());
        assertEquals("https://lh3.googleusercontent.com/a/pic", parts.picture());
    }

    @Test
    void verify_tamperedSignature_throws() throws Exception {
        stubJwksResponse();
        long exp = (System.currentTimeMillis() / 1000) + 3600;
        String idToken = token(exp, "https://accounts.google.com", CLIENT_ID);
        String tampered = idToken + "x";

        assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                () -> verifier.verify(tampered));
    }

    @Test
    void verify_wrongIssuer_throws() throws Exception {
        stubJwksResponse();
        long exp = (System.currentTimeMillis() / 1000) + 3600;
        String idToken = token(exp, "https://evil.example.com", CLIENT_ID);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("issuer"));
    }

    @Test
    void verify_wrongAudience_throws() throws Exception {
        stubJwksResponse();
        long exp = (System.currentTimeMillis() / 1000) + 3600;
        String idToken = token(exp, "https://accounts.google.com", "another-client.apps.googleusercontent.com");

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("audience"));
    }

    @Test
    void verify_expiredToken_throws() throws Exception {
        stubJwksResponse();
        long exp = (System.currentTimeMillis() / 1000) - 60;
        String idToken = token(exp, "https://accounts.google.com", CLIENT_ID);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("expired"));
    }

    @Test
    void verify_missingEmail_throws() throws Exception {
        stubJwksResponse();
        String header = "{\"alg\":\"RS256\",\"kid\":\"" + kid + "\",\"typ\":\"JWT\"}";
        long iat = System.currentTimeMillis() / 1000;
        long exp = iat + 3600;
        String payload = "{"
                + "\"iss\":\"https://accounts.google.com\","
                + "\"sub\":\"google-sub-123\","
                + "\"aud\":\"" + CLIENT_ID + "\","
                + "\"exp\":" + exp + ","
                + "\"iat\":" + iat
                + "}";
        String idToken = signToken(header, payload);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("email"));
    }

    @Test
    void verify_unknownKid_throws() throws Exception {
        stubJwksResponse();
        long exp = (System.currentTimeMillis() / 1000) + 3600;
        String header = "{\"alg\":\"RS256\",\"kid\":\"unknown-key\",\"typ\":\"JWT\"}";
        long iat = System.currentTimeMillis() / 1000;
        String payload = "{"
                + "\"iss\":\"https://accounts.google.com\","
                + "\"sub\":\"google-sub-123\","
                + "\"aud\":\"" + CLIENT_ID + "\","
                + "\"exp\":" + exp + ","
                + "\"iat\":" + iat + ","
                + "\"email\":\"user@example.com\""
                + "}";
        String idToken = signToken(header, payload);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("kid") || ex.getMessage().contains("No matching"));
    }

    @Test
    void verify_garbageToken_throws() {
        assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                () -> verifier.verify("not-a-jwt"));
    }

    @Test
    void verify_futureIat_throws() throws Exception {
        stubJwksResponse();
        long now = System.currentTimeMillis() / 1000;
        long exp = now + 3600;
        long iat = now + 600;
        String idToken = token(exp, "https://accounts.google.com", CLIENT_ID, iat);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("issued in the future"));
    }

    @Test
    void verify_futureIatWithinAllowedSkew_accepted() throws Exception {
        stubJwksResponse();
        long now = System.currentTimeMillis() / 1000;
        long exp = now + 3600;
        long iat = now + 60;
        String idToken = token(exp, "https://accounts.google.com", CLIENT_ID, iat);

        GoogleIdTokenVerifier.GoogleIdTokenParts parts = verifier.verify(idToken);

        assertEquals("user@example.com", parts.email());
    }

    @Test
    void verify_missingIat_throws() throws Exception {
        stubJwksResponse();
        String header = "{\"alg\":\"RS256\",\"kid\":\"" + kid + "\",\"typ\":\"JWT\"}";
        long iat = System.currentTimeMillis() / 1000;
        long exp = iat + 3600;
        String payload = "{"
                + "\"iss\":\"https://accounts.google.com\","
                + "\"sub\":\"google-sub-123\","
                + "\"aud\":\"" + CLIENT_ID + "\","
                + "\"exp\":" + exp
                + "}";
        String idToken = signToken(header, payload);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("iat"));
    }

    @Test
    void verify_missingExp_throws() throws Exception {
        stubJwksResponse();
        String header = "{\"alg\":\"RS256\",\"kid\":\"" + kid + "\",\"typ\":\"JWT\"}";
        long iat = System.currentTimeMillis() / 1000;
        String payload = "{"
                + "\"iss\":\"https://accounts.google.com\","
                + "\"sub\":\"google-sub-123\","
                + "\"aud\":\"" + CLIENT_ID + "\","
                + "\"iat\":" + iat + ","
                + "\"email\":\"user@example.com\""
                + "}";
        String idToken = signToken(header, payload);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("exp"));
    }

    @Test
    void verify_iatInMilliseconds_throwsAsFuture() throws Exception {
        stubJwksResponse();
        long now = System.currentTimeMillis() / 1000;
        long exp = now + 3600;
        long iatMilliseconds = (now + 3600) * 1000L;
        String idToken = token(exp, "https://accounts.google.com", CLIENT_ID, iatMilliseconds);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("issued in the future"));
    }

    @Test
    void verify_expiresInOneSecond_accepted() throws Exception {
        stubJwksResponse();
        long now = System.currentTimeMillis() / 1000;
        long exp = now + 1;
        String idToken = token(exp, "https://accounts.google.com", CLIENT_ID);

        GoogleIdTokenVerifier.GoogleIdTokenParts parts = verifier.verify(idToken);

        assertEquals("user@example.com", parts.email());
    }

    @Test
    void verify_expiredByOneSecond_throws() throws Exception {
        stubJwksResponse();
        long now = System.currentTimeMillis() / 1000;
        long exp = now - 1;
        String idToken = token(exp, "https://accounts.google.com", CLIENT_ID);

        GoogleIdTokenVerifier.GoogleTokenVerificationException ex =
                assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                        () -> verifier.verify(idToken));
        assertTrue(ex.getMessage().contains("expired"));
    }
}