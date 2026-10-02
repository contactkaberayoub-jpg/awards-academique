package com.awardsacademique.emails.service.impl;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.emails.ResendProperties;
import com.awardsacademique.emails.exception.EmailException;
import com.awardsacademique.emails.service.interfaces.EmailService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Token lifecycle tests for email verification: a token signed for the right
 * purpose and matching account verifies the email; expired, tampered / foreign
 * tokens and wrong-purpose tokens are rejected; sending is skipped locally
 * when no mail provider is configured.
 */
@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceImplTest {

    private static final String SECRET = "test-secret-min-256-bit!!abcdefghijklmnopqrstuvwxyz012345";
    private static final String PURPOSE_EMAIL_VERIFICATION = "email_verification";
    private static final String SUBJECT = "Vérifiez votre adresse e-mail — Awards Académique";

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    private ResendProperties resendProperties;
    private EmailVerificationServiceImpl service;

    @BeforeEach
    void setUp() {
        resendProperties = new ResendProperties();
        resendProperties.setApiKey("re_test_key");
        service = new EmailVerificationServiceImpl(SECRET, 24, resendProperties, emailService, userRepository);
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    private String token(String subject, String purpose, long issuedAtMillis, long expiryMillis) {
        return Jwts.builder()
                .subject(subject)
                .claim("purpose", purpose)
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date(issuedAtMillis))
                .expiration(new Date(expiryMillis))
                .signWith(signingKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    @Test
    void createVerificationToken_roundTripsForSameSecret() {
        String token = service.createVerificationToken("Student@Test.com");
        String subject = Jwts.parser().verifyWith(signingKey()).build().parseSignedClaims(token).getPayload().getSubject();
        assertEquals("student@test.com", subject);
        assertEquals(PURPOSE_EMAIL_VERIFICATION,
                Jwts.parser().verifyWith(signingKey()).build().parseSignedClaims(token).getPayload().get("purpose", String.class));
    }

    @Test
    void verifyEmail_validToken_marksEmailVerifiedAndSaves() {
        User user = User.builder().id(UUID.randomUUID()).email("student@test.com").build();
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        long now = System.currentTimeMillis();
        User verified = service.verifyEmail(token("student@test.com", PURPOSE_EMAIL_VERIFICATION, now - 1000, now + 3_600_000));

        assertNotNull(verified.getEmailVerifiedAt());
        verify(userRepository).save(user);
    }

    @Test
    void verifyEmail_expiredToken_rejects() {
        long now = System.currentTimeMillis();
        String expired = token("student@test.com", PURPOSE_EMAIL_VERIFICATION, now - 3_600_000, now - 1000);

        EmailException ex = assertThrows(EmailException.class, () -> service.verifyEmail(expired));
        assertTrue(ex.getMessage().contains("expiré"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void verifyEmail_wrongPurpose_rejects() {
        long now = System.currentTimeMillis();
        String passwordReset = token("student@test.com", "password_reset", now - 1000, now + 3_600_000);

        EmailException ex = assertThrows(EmailException.class, () -> service.verifyEmail(passwordReset));
        assertTrue(ex.getMessage().contains("invalide"));
    }

    @Test
    void verifyEmail_tokenSignedByDifferentKey_rejects() {
        SecretKey otherKey = Keys.hmacShaKeyFor("another-secret-key-256-bit!!abcdefghijklmnopqrstuvwxyz".getBytes());
        long now = System.currentTimeMillis();
        String foreign = Jwts.builder()
                .subject("student@test.com")
                .claim("purpose", PURPOSE_EMAIL_VERIFICATION)
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date(now - 1000))
                .expiration(new Date(now + 3_600_000))
                .signWith(otherKey, SignatureAlgorithm.HS256)
                .compact();

        EmailException ex = assertThrows(EmailException.class, () -> service.verifyEmail(foreign));
        assertTrue(ex.getMessage().contains("invalide"));
    }

    @Test
    void verifyEmail_unknownEmail_doesNotSave() {
        long now = System.currentTimeMillis();
        when(userRepository.findByEmail("nobody@test.com")).thenReturn(Optional.empty());
        String t = token("nobody@test.com", PURPOSE_EMAIL_VERIFICATION, now - 1000, now + 3_600_000);

        EmailException ex = assertThrows(EmailException.class, () -> service.verifyEmail(t));
        assertTrue(ex.getMessage().contains("Aucun compte"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void verifyEmail_nullAndBlankTokens_reject() {
        EmailException nullEx = assertThrows(EmailException.class, () -> service.verifyEmail(null));
        EmailException blankEx = assertThrows(EmailException.class, () -> service.verifyEmail("   "));

        assertEquals("Verification token is required.", nullEx.getMessage());
        assertEquals("Verification token is required.", blankEx.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void verifyEmail_whenAlreadyVerified_refreshesAndStaysVerified() {
        LocalDateTime already = LocalDateTime.now().minusDays(1);
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("student@test.com")
                .emailVerifiedAt(already)
                .build();
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        long now = System.currentTimeMillis();
        User verified = service.verifyEmail(
                token("student@test.com", PURPOSE_EMAIL_VERIFICATION, now - 1000, now + 3_600_000));

        verify(userRepository).save(user);
        assertNotNull(verified.getEmailVerifiedAt());
        assertFalse(verified.getEmailVerifiedAt().isBefore(already));
    }

    @Test
    void sendVerificationEmail_whenNoProviderConfigured_skipsSending() {
        User user = User.builder().firstName("Alice").email("alice@test.com").build();

        service.sendVerificationEmail(user);

        verify(emailService, never()).send(any(String.class), any(String.class), any(String.class));
    }

    @Test
    void sendVerificationEmail_whenConfigured_buildsLinkFromFrontendBaseUrl() {
        when(emailService.isConfigured()).thenReturn(true);
        resendProperties.setFrontendBaseUrl("https://app.awardsacademique.com/");
        User user = User.builder().firstName("Alice").email("alice@test.com").build();

        service.sendVerificationEmail(user);

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).send(eq("alice@test.com"), eq(SUBJECT), htmlCaptor.capture());
        String html = htmlCaptor.getValue();
        assertTrue(html.contains("https://app.awardsacademique.com/verify-email?token="));
        assertTrue(html.contains("Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur"));
        assertTrue(html.contains("alice@test.com") == false);
    }

    @Test
    void sendVerificationEmail_whenSendFails_doesNotThrow() {
        when(emailService.isConfigured()).thenReturn(true);
        doThrow(new RuntimeException("smtp down")).when(emailService)
                .send(any(String.class), any(String.class), any(String.class));
        User user = User.builder().firstName("Bob").email("bob@test.com").build();

        assertDoesNotThrow(() -> service.sendVerificationEmail(user));
    }
}