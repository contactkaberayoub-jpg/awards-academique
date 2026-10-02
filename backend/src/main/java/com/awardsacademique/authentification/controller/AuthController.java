package com.awardsacademique.authentification.controller;

import com.awardsacademique.authentification.dto.request.ChangePasswordRequest;
import com.awardsacademique.authentification.dto.request.ForgotPasswordRequest;
import com.awardsacademique.authentification.dto.request.InstructorRegisterRequest;
import com.awardsacademique.authentification.dto.request.LoginRequest;
import com.awardsacademique.authentification.dto.request.RegisterRequest;
import com.awardsacademique.authentification.dto.request.ResetPasswordRequest;
import com.awardsacademique.authentification.dto.request.UpdateProfileRequest;
import com.awardsacademique.authentification.dto.request.VerifyEmailRequest;
import com.awardsacademique.authentification.dto.response.AuthResponse;
import com.awardsacademique.authentification.service.interfaces.AuthService;
import com.awardsacademique.authentification.service.interfaces.GoogleOAuthService;
import com.awardsacademique.authentification.service.impl.GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleOAuthService googleOAuthService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/register-instructor")
    public ResponseEntity<AuthResponse> registerInstructor(@Valid @RequestBody InstructorRegisterRequest request) {
        AuthResponse response = authService.registerInstructor(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        AuthResponse response = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        AuthResponse response = authService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        authService.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String jwt = authorizationHeader.substring(7);
            authService.logout(jwt);
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh-token")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> refreshToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        AuthResponse refreshed = authService.refreshToken(authentication.getName());
        return ResponseEntity.ok(refreshed);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        Map<String, String> result = authService.forgotPassword(request);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        Map<String, String> result = authService.resetPassword(request);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        AuthResponse response = authService.verifyEmail(request.getToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        Map<String, String> result = authService.resendVerification(email);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/google")
    public ResponseEntity<Void> googleAuth() {
        try {
            String state = googleOAuthService.createStateToken();
            String authUrl = googleOAuthService.buildAuthorizationUrl(state);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(authUrl))
                    .build();
        } catch (GoogleOAuthNotConfiguredException ex) {
            log.error("Google OAuth is not configured: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are missing or blank");
            return redirectToFrontendError("oauth_not_configured");
        }
    }

    @GetMapping("/google/callback")
    public ResponseEntity<Void> googleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error
    ) {
        if (error != null && !error.isBlank()) {
            log.warn("Google OAuth callback returned an error: {}", error);
            return redirectToFrontendError("oauth_denied");
        }
        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            log.warn("Google OAuth callback missing authorization code or state");
            return redirectToFrontendError("oauth_failed");
        }
        try {
            googleOAuthService.validateStateToken(state);
            String oneTimeCode = googleOAuthService.handleCallbackAndCreateOneTimeCode(code);
            return redirectToFrontend("?code=" + URLEncoder.encode(oneTimeCode, StandardCharsets.UTF_8));
        } catch (Exception ex) {
            log.warn("Google OAuth callback failed: {}", ex.getMessage());
            return redirectToFrontendError("oauth_failed");
        }
    }

    private ResponseEntity<Void> redirectToFrontend(String query) {
        String redirectUrl = googleOAuthService.getFrontendCallbackUrl() + query;
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl))
                .build();
    }

    private ResponseEntity<Void> redirectToFrontendError(String errorCode) {
        return redirectToFrontend("?error=" + URLEncoder.encode(errorCode, StandardCharsets.UTF_8));
    }

    @PostMapping("/google/exchange")
    public ResponseEntity<AuthResponse> googleExchange(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        AuthResponse response = googleOAuthService.exchangeOneTimeCode(code);
        return ResponseEntity.ok(response);
    }
}
