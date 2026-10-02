package com.awardsacademique.authentification.service.impl;

import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.Role;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.dto.request.ChangePasswordRequest;
import com.awardsacademique.authentification.dto.request.ForgotPasswordRequest;
import com.awardsacademique.authentification.dto.request.InstructorRegisterRequest;
import com.awardsacademique.authentification.dto.request.LoginRequest;
import com.awardsacademique.authentification.dto.request.RegisterRequest;
import com.awardsacademique.authentification.dto.request.ResetPasswordRequest;
import com.awardsacademique.authentification.dto.request.UpdateProfileRequest;
import com.awardsacademique.authentification.dto.response.AuthResponse;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.authentification.service.interfaces.AuthService;
import com.awardsacademique.authentification.service.interfaces.PasswordResetService;
import com.awardsacademique.authentification.validation.AuthValidator;
import com.awardsacademique.emails.service.interfaces.EmailVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuthValidator authValidator;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        authValidator.validateRegister(request);

        Role studentRole = authValidator.resolveDefaultStudentRole();

        LocalDateTime now = LocalDateTime.now();

        User user = User.builder()
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(studentRole)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        User savedUser = userRepository.save(user);

        // Email verification (student registration). Sending is best-effort: when the
        // mail provider is not configured the account is still created and the
        // verification is simply skipped (logged) — never a hard failure.
        emailVerificationService.sendVerificationEmail(savedUser);

        String token = jwtService.generateToken(
                Map.of("role", savedUser.getRole().getName().name()),
                toUserDetails(savedUser)
        );

        return buildAuthResponse(savedUser, token);
    }

    @Override
    @Transactional
    public AuthResponse registerInstructor(InstructorRegisterRequest request) {
        authValidator.validateRegister(toRegisterRequest(request));

        Role instructorRole = authValidator.resolveInstructorRole();

        LocalDateTime now = LocalDateTime.now();

        User user = User.builder()
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(instructorRole)
                .instructorStatus(InstructorStatusEnum.PENDING)
                .professionalTitle(request.getProfessionalTitle() != null ? request.getProfessionalTitle().trim() : null)
                .institution(request.getInstitution() != null ? request.getInstitution().trim() : null)
                .expertise(request.getExpertise() != null ? request.getExpertise().trim() : null)
                .linkedinUrl(request.getLinkedinUrl() != null ? request.getLinkedinUrl().trim() : null)
                .instructorSubmittedAt(now)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(
                Map.of("role", savedUser.getRole().getName().name()),
                toUserDetails(savedUser)
        );

        return buildAuthResponse(savedUser, token);
    }

    private RegisterRequest toRegisterRequest(InstructorRegisterRequest request) {
        return RegisterRequest.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(request.getPassword())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        log.info("=== Starting login for email: {} ===", request.getEmail());

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (org.springframework.security.core.AuthenticationException ex) {
            log.error("Authentication failed for email: {}", request.getEmail());
            throw new BadCredentialsException("Invalid email or password");
        }

        User user = authValidator.resolveUserByEmail(request.getEmail());

        String token = jwtService.generateToken(
                Map.of("role", user.getRole().getName().name()),
                (UserDetails) authentication.getPrincipal()
        );

        log.info("=== Login successful for email: {} ===", request.getEmail());
        return buildAuthResponse(user, token);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole().getName().name())
                .instructorStatus(user.getInstructorStatus() != null ? user.getInstructorStatus().name() : null)
                .emailVerified(user.getEmailVerifiedAt() != null)
                .oauthProvider(user.getOauthProvider())
                .build();
    }

    private AuthResponse buildAuthResponseWithoutToken(User user) {
        return AuthResponse.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole().getName().name())
                .instructorStatus(user.getInstructorStatus() != null ? user.getInstructorStatus().name() : null)
                .emailVerified(user.getEmailVerifiedAt() != null)
                .oauthProvider(user.getOauthProvider())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(String email) {
        User user = authValidator.resolveUserByEmail(email);
        return buildAuthResponseWithoutToken(user);
    }

    @Override
    @Transactional
    public AuthResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = authValidator.resolveUserByEmail(email);

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setAvatarUrl(request.getAvatarUrl());
        user.setBio(request.getBio());
        user.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        return buildAuthResponseWithoutToken(saved);
    }

    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = authValidator.resolveUserByEmail(email);

        authValidator.validateChangePassword(
                user.getPasswordHash(),
                passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash()),
                passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())
        );

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Override
    public void logout(String jwt) {
        try {
            if (jwt != null && !jwt.isEmpty()) {
                String jti = jwtService.extractId(jwt);
                Date expiry = jwtService.extractExpiration(jwt);
                tokenBlacklistService.blacklist(jti, expiry);
            }
        } catch (Exception ex) {
            log.warn("Logout could not blacklist jti (token may be malformed); proceeding idempotently: {}", ex.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(String email) {
        User user = authValidator.resolveUserByEmail(email);
        UserDetails userDetails = toUserDetails(user);
        String newToken = jwtService.generateToken(
                Map.of("role", user.getRole().getName().name()),
                userDetails
        );
        return buildAuthResponse(user, newToken);
    }

    @Override
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        return passwordResetService.forgotPassword(request.getEmail());
    }

    @Override
    public Map<String, String> resetPassword(ResetPasswordRequest request) {
        return passwordResetService.resetPassword(
                request.getToken(), request.getNewPassword(), request.getConfirmPassword());
    }

    @Override
    @Transactional
    public AuthResponse verifyEmail(String token) {
        User user = emailVerificationService.verifyEmail(token);
        return buildAuthResponseWithoutToken(user);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, String> resendVerification(String email) {
        String normalizedEmail = email == null ? null : email.trim().toLowerCase();
        if (normalizedEmail == null || normalizedEmail.isBlank()) {
            return Map.of(
                    "message", "Un nouveau lien de vérification a été envoyé.",
                    "status", "sent");
        }

        // Mirrors the Forgot-Password flow: always answer with the generic "sent"
        // response so the endpoint never reveals whether an email belongs to an account.
        Optional<User> found = userRepository.findByEmail(normalizedEmail);
        if (found.isEmpty() || found.get().getDeletedAt() != null) {
            log.info("Resend verification requested for an unknown or inactive account ({}); "
                    + "returning generic response.", maskEmail(normalizedEmail));
            return Map.of(
                    "message", "Un nouveau lien de vérification a été envoyé.",
                    "status", "sent");
        }

        User user = found.get();
        if (user.getEmailVerifiedAt() != null) {
            return Map.of(
                    "message", "Cette adresse est déjà vérifiée.",
                    "status", "already_verified");
        }

        emailVerificationService.sendVerificationEmail(user);
        return Map.of(
                "message", "Un nouveau lien de vérification a été envoyé.",
                "status", "sent");
    }

    private static String maskEmail(String email) {
        if (email == null || email.isBlank()) return "<absent>";
        int at = email.indexOf('@');
        if (at <= 1) return "*@*" + (at >= 0 ? email.substring(at + 1) : "");
        return email.charAt(0) + "****" + email.substring(at);
    }

    private UserDetails toUserDetails(User user) {
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities("ROLE_" + user.getRole().getName().name())
                .accountLocked(!user.isActive())
                .disabled(user.getDeletedAt() != null)
                .build();
    }
}
