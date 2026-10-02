package com.awardsacademique.authentification.service.impl;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.awardsacademique.authentification.Repository.PasswordResetTokenRepository;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.PasswordResetToken;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.exception.PasswordResetException;
import com.awardsacademique.emails.ResendProperties;
import com.awardsacademique.emails.service.interfaces.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Lifecycle tests for the password-reset token mechanism:
 * generic (non-enumerating) forgot-password response, single-use hashed tokens,
 * expiration, invalidation of previous tokens, hashed password storage and the
 * guarantee that the raw token / raw password are never logged.
 */
@ExtendWith(MockitoExtension.class)
class PasswordResetServiceImplTest {

    private static final String GENERIC_RESPONSE =
            "If an account exists for this email, a password reset link has been sent.";

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    private ResendProperties resendProperties;
    private PasswordResetServiceImpl service;

    @BeforeEach
    void setUp() {
        resendProperties = new ResendProperties();
        resendProperties.setFrontendBaseUrl("http://localhost:5173");
        service = new PasswordResetServiceImpl(
                userRepository, tokenRepository, passwordEncoder, emailService, resendProperties, 30);
    }

    private User user(String email) {
        return User.builder()
                .id(UUID.randomUUID())
                .firstName("Alice")
                .email(email)
                .isActive(true)
                .build();
    }

    private PasswordResetToken activeToken(User user, String rawToken) {
        return PasswordResetToken.builder()
                .user(user)
                .tokenHash(PasswordResetServiceImpl.sha256Hex(rawToken))
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .used(false)
                .build();
    }

    // ---------- forgot-password ----------

    @Test
    void forgotPassword_existingUser_returnsGenericResponse_keepsEmailOnlySendsHash() {
        User user = user("alice@test.com");
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(user));
        when(emailService.isConfigured()).thenReturn(true);

        String[] rawTokenHolder = new String[1];
        doAnswer(inv -> {
            String to = inv.getArgument(0);
            String subject = inv.getArgument(1);
            String html = inv.getArgument(2);
            int idx = html.indexOf("/reset-password?token=");
            if (idx >= 0) {
                rawTokenHolder[0] = html.substring(idx + "/reset-password?token=".length())
                        .split("[<\"&\\s]")[0];
            }
            assertEquals("alice@test.com", to);
            assertTrue(subject.contains("mot de passe"));
            assertTrue(html.contains("Awards Académique"));
            return null;
        }).when(emailService).send(any(String.class), any(String.class), any(String.class));

        Map<String, String> result = service.forgotPassword("alice@test.com");

        assertEquals(GENERIC_RESPONSE, result.get("message"));
        assertEquals(1, result.size());

        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(captor.capture());
        PasswordResetToken saved = captor.getValue();

        assertTrue(saved.getTokenHash() != null);
        assertEquals(64, saved.getTokenHash().length(), "must store a 64-char SHA-256 hex hash");
        assertTrue(saved.getTokenHash().matches("[0-9a-f]{64}"), "hash must be lowercase hex");
        assertTrue(saved.getExpiresAt().isAfter(LocalDateTime.now().plusMinutes(25)));

        String rawFromEmail = rawTokenHolder[0];
        assertEquals(PasswordResetServiceImpl.sha256Hex(rawFromEmail), saved.getTokenHash(),
                "DB must hold the hash of the emailed token, never the raw token");
    }

    @Test
    void forgotPassword_existingUser_invalidatesPreviousResetTokens() {
        User user = user("alice@test.com");
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(user));
        when(emailService.isConfigured()).thenReturn(false);

        service.forgotPassword("alice@test.com");
        service.forgotPassword("alice@test.com");

        verify(tokenRepository, org.mockito.Mockito.times(2))
                .invalidateAllForUser(user.getId());
    }

    @Test
    void forgotPassword_unknownEmail_returnsSameGenericResponse_andSendsNothing() {
        when(userRepository.findByEmail("nobody@test.com")).thenReturn(Optional.empty());

        Map<String, String> result = service.forgotPassword("nobody@test.com");

        assertEquals(GENERIC_RESPONSE, result.get("message"));
        verify(emailService, never()).send(any(String.class), any(String.class), any(String.class));
        verify(tokenRepository, never()).save(any(PasswordResetToken.class));
        verify(tokenRepository, never()).invalidateAllForUser(any(UUID.class));
    }

    @Test
    void forgotPassword_deletedAccount_returnsSameGenericResponse_noTokenCreated() {
        User user = user("gone@test.com");
        user.setDeletedAt(LocalDateTime.now());
        when(userRepository.findByEmail("gone@test.com")).thenReturn(Optional.of(user));

        Map<String, String> result = service.forgotPassword("gone@test.com");

        assertEquals(GENERIC_RESPONSE, result.get("message"));
        verify(tokenRepository, never()).save(any(PasswordResetToken.class));
        verify(emailService, never()).send(any(String.class), any(String.class), any(String.class));
    }

    @Test
    void forgotPassword_blankOrNullEmail_throws() {
        assertThrows(IllegalArgumentException.class, () -> service.forgotPassword(null));
        assertThrows(IllegalArgumentException.class, () -> service.forgotPassword("   "));
    }

    @Test
    void forgotPassword_whenMailNotConfigured_skipsSendingButStillReturnsGenericResponse() {
        User user = user("quiet@test.com");
        when(userRepository.findByEmail("quiet@test.com")).thenReturn(Optional.of(user));
        when(emailService.isConfigured()).thenReturn(false);

        Map<String, String> result = service.forgotPassword("quiet@test.com");

        assertEquals(GENERIC_RESPONSE, result.get("message"));
        verify(tokenRepository).save(any(PasswordResetToken.class));
        verify(emailService, never()).send(any(String.class), any(String.class), any(String.class));
    }

    // ---------- reset-password ----------

    @Test
    void resetPassword_validSingleUseToken_updatesHashedPassword_andMarksUsed() {
        User user = user("alice@test.com");
        String rawToken = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
        when(tokenRepository.findByTokenHash(PasswordResetServiceImpl.sha256Hex(rawToken)))
                .thenReturn(Optional.of(activeToken(user, rawToken)));
        when(passwordEncoder.encode("NewPassword1234")).thenReturn("$2a$10$encoded-hash-value");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tokenRepository.save(any(PasswordResetToken.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> result = service.resetPassword(rawToken, "NewPassword1234", "NewPassword1234");

        assertTrue(result.get("message").contains("réinitialisé"));
        assertEquals("$2a$10$encoded-hash-value", user.getPasswordHash(),
                "the new password must be stored as a BCrypt hash, never the raw value");
        assertTrue(user.getPasswordHash().startsWith("$2a$"), "hash must use the BCrypt prefix");
        verify(passwordEncoder).encode(eq("NewPassword1234"));

        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(captor.capture());
        assertTrue(captor.getValue().isUsed(), "successful reset must mark the token as used (single-use)");
        verify(tokenRepository).invalidateAllForUser(user.getId());
    }

    @Test
    void resetPassword_expiredToken_throws_andDoesNotTouchUser() {
        User user = user("alice@test.com");
        String rawToken = "expired-token-abcdef0123456789abcdef0123456789abcdef01234567";
        PasswordResetToken expired = activeToken(user, rawToken);
        expired.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(tokenRepository.findByTokenHash(PasswordResetServiceImpl.sha256Hex(rawToken)))
                .thenReturn(Optional.of(expired));

        PasswordResetException ex = assertThrows(PasswordResetException.class,
                () -> service.resetPassword(rawToken, "NewPassword1234", "NewPassword1234"));
        assertTrue(ex.getMessage().toLowerCase().contains("expiré"));
        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(any(String.class));
    }

    @Test
    void resetPassword_alreadyUsedToken_throws_singleUseEnforced() {
        User user = user("alice@test.com");
        String rawToken = "used-token-abcdef0123456789abcdef0123456789abcdef01234567";
        PasswordResetToken used = activeToken(user, rawToken);
        used.setUsed(true);

        when(tokenRepository.findByTokenHash(PasswordResetServiceImpl.sha256Hex(rawToken)))
                .thenReturn(Optional.of(used));

        PasswordResetException ex = assertThrows(PasswordResetException.class,
                () -> service.resetPassword(rawToken, "NewPassword1234", "NewPassword1234"));
        assertTrue(ex.getMessage().contains("déjà été utilisé"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resetPassword_unknownOrInvalidToken_throws() {
        when(tokenRepository.findByTokenHash(any(String.class))).thenReturn(Optional.empty());

        PasswordResetException ex = assertThrows(PasswordResetException.class,
                () -> service.resetPassword("garbage-token", "NewPassword1234", "NewPassword1234"));
        assertTrue(ex.getMessage().toLowerCase().contains("invalide"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resetPassword_blankToken_throws() {
        assertThrows(PasswordResetException.class,
                () -> service.resetPassword("", "NewPassword1234", "NewPassword1234"));
        assertThrows(PasswordResetException.class,
                () -> service.resetPassword(null, "NewPassword1234", "NewPassword1234"));
        verify(tokenRepository, never()).findByTokenHash(any(String.class));
    }

    @Test
    void resetPassword_passwordMismatch_throws_beforeTokenLookup() {
        PasswordResetException ex = assertThrows(PasswordResetException.class,
                () -> service.resetPassword("some-token", "NewPassword1234", "Different5678"));
        assertTrue(ex.getMessage().contains("ne correspondent pas"));
        verify(tokenRepository, never()).findByTokenHash(any(String.class));
        verify(passwordEncoder, never()).encode(any(String.class));
    }

    @Test
    void resetPassword_deletedUser_throws() {
        User user = user("gone@test.com");
        user.setDeletedAt(LocalDateTime.now());
        String rawToken = "tok-abcdef0123456789abcdef0123456789abcdef0123456789ab";
        when(tokenRepository.findByTokenHash(PasswordResetServiceImpl.sha256Hex(rawToken)))
                .thenReturn(Optional.of(activeToken(user, rawToken)));

        assertThrows(PasswordResetException.class,
                () -> service.resetPassword(rawToken, "NewPassword1234", "NewPassword1234"));
        verify(userRepository, never()).save(any(User.class));
    }

    // ---------- never log raw secrets ----------

    @Test
    void rawPasswordAndRawToken_areNeverLogged() {
        Logger serviceLogger = (Logger) LoggerFactory.getLogger(PasswordResetServiceImpl.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        Level original = serviceLogger.getLevel();
        String rawToken = "topsecret-token-abc123rocks-abcdef0123456789abcdef0123";
        try {
            serviceLogger.addAppender(appender);
            serviceLogger.setLevel(Level.INFO);

            User user = user("alice@test.com");
            when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(user));
            when(emailService.isConfigured()).thenReturn(false);
            when(tokenRepository.findByTokenHash(PasswordResetServiceImpl.sha256Hex(rawToken)))
                    .thenReturn(Optional.of(activeToken(user, rawToken)));
            when(passwordEncoder.encode("SuperSecret-P@ssw0rd")).thenReturn("$2a$10$hash");
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
            when(tokenRepository.save(any(PasswordResetToken.class))).thenAnswer(inv -> inv.getArgument(0));

            service.forgotPassword("alice@test.com");
            service.resetPassword(rawToken, "SuperSecret-P@ssw0rd", "SuperSecret-P@ssw0rd");
        } finally {
            serviceLogger.detachAppender(appender);
            serviceLogger.setLevel(original);
        }

        List<String> logLines = appender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .toList();
        assertTrue(logLines.stream().noneMatch(line -> line.contains(rawToken)),
                "raw reset token must never be logged; got: " + logLines);
        assertTrue(logLines.stream().noneMatch(line -> line.contains("SuperSecret-P@ssw0rd")),
                "raw password must never be logged; got: " + logLines);
    }

    // ---------- email template ----------

    @Test
    void buildResetEmailHtml_professionalEmailContainsActionExpiryWarningAndFallback() {
        String html = PasswordResetServiceImpl.buildResetEmailHtml("Alice",
                "http://localhost:5173/reset-password?token=abc123");

        assertTrue(html.contains("Awards Académique"));
        assertTrue(html.contains("Réinitialiser mon mot de passe"));
        assertTrue(html.contains("expire dans 30 minutes"));
        assertTrue(html.contains("Si vous n'avez pas demandé cette réinitialisation"));
        assertTrue(html.contains("http://localhost:5173/reset-password?token=abc123"));
        assertTrue(html.contains("Ne partagez jamais ce lien"));
    }

    @Test
    void buildResetEmailHtml_htmlEscapesUserFirstName() {
        String html = PasswordResetServiceImpl.buildResetEmailHtml("<script>alert(1)</script>",
                "http://localhost:5173/reset-password?token=abc");
        assertTrue(html.contains("&lt;script&gt;"));
        assertTrue(!html.contains("<script>"));
    }
}