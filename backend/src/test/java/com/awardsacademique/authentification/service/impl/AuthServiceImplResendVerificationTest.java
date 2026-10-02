package com.awardsacademique.authentification.service.impl;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.authentification.service.interfaces.PasswordResetService;
import com.awardsacademique.authentification.validation.AuthValidator;
import com.awardsacademique.emails.service.interfaces.EmailVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Resend-verification must behave like Forgot-Password: the same generic
 * response is returned whether or not the email belongs to an account, so the
 * endpoint never reveals whether an email is registered.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceImplResendVerificationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthValidator authValidator;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private EmailVerificationService emailVerificationService;

    @Mock
    private PasswordResetService passwordResetService;

    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(
                userRepository, passwordEncoder, authenticationManager, jwtService,
                authValidator, tokenBlacklistService, emailVerificationService, passwordResetService);
    }

    private User student(String email) {
        return User.builder()
                .id(UUID.randomUUID())
                .firstName("Alice")
                .lastName("Student")
                .email(email)
                .build();
    }

    @Test
    void unknownEmail_returnsGenericSentResponse_withoutSending() {
        when(userRepository.findByEmail("nobody@test.com")).thenReturn(Optional.empty());

        Map<String, String> result = service.resendVerification("nobody@test.com");

        assertEquals("sent", result.get("status"));
        verify(emailVerificationService, never()).sendVerificationEmail(any(User.class));
    }

    @Test
    void deletedAccount_returnsGenericSentResponse_withoutSending() {
        User deleted = student("gone@test.com");
        deleted.setDeletedAt(LocalDateTime.now());
        when(userRepository.findByEmail("gone@test.com")).thenReturn(Optional.of(deleted));

        Map<String, String> result = service.resendVerification("gone@test.com");

        assertEquals("sent", result.get("status"));
        verify(emailVerificationService, never()).sendVerificationEmail(any(User.class));
    }

    @Test
    void verifiedAccount_returnsAlreadyVerified_withoutSending() {
        User verified = student("verified@test.com");
        verified.setEmailVerifiedAt(LocalDateTime.now());
        when(userRepository.findByEmail("verified@test.com")).thenReturn(Optional.of(verified));

        Map<String, String> result = service.resendVerification("verified@test.com");

        assertEquals("already_verified", result.get("status"));
        verify(emailVerificationService, never()).sendVerificationEmail(any(User.class));
    }

    @Test
    void activeUnverifiedAccount_sendsAndReturnsSent() {
        User student = student("student@test.com");
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(student));

        Map<String, String> result = service.resendVerification("student@test.com");

        assertEquals("sent", result.get("status"));
        verify(emailVerificationService).sendVerificationEmail(student);
    }

    @Test
    void blankOrNullEmail_returnsGenericSentResponse_withoutSending() {
        assertEquals("sent", service.resendVerification(null).get("status"));
        assertEquals("sent", service.resendVerification("   ").get("status"));
        verify(emailVerificationService, never()).sendVerificationEmail(any(User.class));
    }

    @Test
    void mixedCaseEmail_isNormalizedBeforeLookup() {
        User student = student("student@test.com");
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(student));

        Map<String, String> result = service.resendVerification("  Student@Test.com  ");

        assertEquals("sent", result.get("status"));
        verify(emailVerificationService).sendVerificationEmail(student);
    }
}