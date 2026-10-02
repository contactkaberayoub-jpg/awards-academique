package com.awardsacademique.authentification.controller;

import com.awardsacademique.authentification.dto.request.ForgotPasswordRequest;
import com.awardsacademique.authentification.dto.request.ResetPasswordRequest;
import com.awardsacademique.authentification.exception.PasswordResetException;
import com.awardsacademique.authentification.security.CustomUserDetailsService;
import com.awardsacademique.authentification.security.JwtAuthenticationFilter;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.PublicEndpoints;
import com.awardsacademique.authentification.security.SecurityConfig;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.authentification.service.interfaces.AuthService;
import com.awardsacademique.authentification.service.interfaces.GoogleOAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Forgot / reset password HTTP contract tests: email validation, generic
 * non-enumerating response, and the distinct 400 errors for expired / invalid /
 * already-used tokens, weak passwords and mismatched confirmations.
 */
@WebMvcTest(controllers = AuthController.class)
@Import({
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        JwtService.class,
        TokenBlacklistService.class,
        PublicEndpoints.class
})
@TestPropertySource(properties = {
        "jwt.secret=test-secret-min-256-bit!!abcdefghijklmnopqrstuvwxyz012345",
        "jwt.expiration=3600000",
        "cors.allowed-origins=http://localhost:5173"
})
class AuthControllerPasswordResetTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private GoogleOAuthService googleOAuthService;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    private static final String GENERIC =
            "If an account exists for this email, a password reset link has been sent.";

    // ---------- forgot-password ----------

    @Test
    void forgotPassword_validEmail_returnsGenericSuccessMessage() throws Exception {
        when(authService.forgotPassword(any(ForgotPasswordRequest.class)))
                .thenReturn(Map.of("message", GENERIC));

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType("application/json")
                        .content("{\"email\":\"alice@test.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(GENERIC));
    }

    @Test
    void forgotPassword_invalidEmailFormat_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType("application/json")
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("e-mail")));
    }

    @Test
    void forgotPassword_blankEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType("application/json")
                        .content("{\"email\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void forgotPassword_missingBody_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ---------- reset-password ----------

    @Test
    void resetPassword_validRequest_returnsSuccess() throws Exception {
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenReturn(Map.of("message", "Votre mot de passe a été réinitialisé avec succès."));

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType("application/json")
                        .content("{\"token\":\"abc123\",\"newPassword\":\"NewPassword1234\","
                                + "\"confirmPassword\":\"NewPassword1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(containsString("réinitialisé")));
    }

    @Test
    void resetPassword_blankToken_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType("application/json")
                        .content("{\"token\":\"\",\"newPassword\":\"NewPassword1234\","
                                + "\"confirmPassword\":\"NewPassword1234\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("jeton")));
    }

    @Test
    void resetPassword_weakPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType("application/json")
                        .content("{\"token\":\"abc123\",\"newPassword\":\"short\","
                                + "\"confirmPassword\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void resetPassword_expiredToken_returns400WithExpiryMessage() throws Exception {
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenThrow(new PasswordResetException(
                        "Ce jeton de réinitialisation a expiré. Veuillez en demander un nouveau."));

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType("application/json")
                        .content("{\"token\":\"abc123\",\"newPassword\":\"NewPassword1234\","
                                + "\"confirmPassword\":\"NewPassword1234\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("expiré")));
    }

    @Test
    void resetPassword_invalidToken_returns400WithInvalidMessage() throws Exception {
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenThrow(new PasswordResetException(
                        "Le jeton de réinitialisation est invalide ou a expiré."));

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType("application/json")
                        .content("{\"token\":\"abc123\",\"newPassword\":\"NewPassword1234\","
                                + "\"confirmPassword\":\"NewPassword1234\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("invalide")));
    }

    @Test
    void resetPassword_alreadyUsedToken_returns400WithUsedMessage() throws Exception {
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenThrow(new PasswordResetException(
                        "Ce jeton de réinitialisation a déjà été utilisé. Veuillez en demander un nouveau."));

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType("application/json")
                        .content("{\"token\":\"abc123\",\"newPassword\":\"NewPassword1234\","
                                + "\"confirmPassword\":\"NewPassword1234\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("déjà été utilisé")));
    }

    @Test
    void resetPassword_passwordMismatch_returns400() throws Exception {
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenThrow(new PasswordResetException("Les mots de passe ne correspondent pas."));

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType("application/json")
                        .content("{\"token\":\"abc123\",\"newPassword\":\"NewPassword1234\","
                                + "\"confirmPassword\":\"Different5678\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("ne correspondent pas")));
    }
}