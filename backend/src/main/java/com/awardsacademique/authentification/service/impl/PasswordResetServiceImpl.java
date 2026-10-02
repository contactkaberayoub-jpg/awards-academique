package com.awardsacademique.authentification.service.impl;

import com.awardsacademique.authentification.Repository.PasswordResetTokenRepository;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.PasswordResetToken;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.exception.PasswordResetException;
import com.awardsacademique.authentification.service.interfaces.PasswordResetService;
import com.awardsacademique.emails.ResendProperties;
import com.awardsacademique.emails.service.interfaces.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class PasswordResetServiceImpl implements PasswordResetService {

    private static final String GENERIC_RESPONSE =
            "If an account exists for this email, a password reset link has been sent.";

    private static final int TOKEN_BYTES = 32;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final ResendProperties resendProperties;

    private final long tokenTtlMinutes;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetServiceImpl(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            ResendProperties resendProperties,
            @Value("${email.password-reset-token-ttl-minutes:30}") long tokenTtlMinutes
    ) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.resendProperties = resendProperties;
        this.tokenTtlMinutes = Math.max(15, tokenTtlMinutes);
    }

    @Override
    @Transactional
    public Map<String, String> forgotPassword(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("L'adresse e-mail est obligatoire.");
        }

        Optional<User> found = userRepository.findByEmail(email.toLowerCase());
        if (found.isPresent() && found.get().getDeletedAt() == null) {
            issueResetTokenFor(found.get());
        } else {
            log.info("Forgot-password requested for an unknown or inactive account ({}); returning generic response.",
                    maskEmail(email));
        }

        return Map.of("message", GENERIC_RESPONSE);
    }

    private void issueResetTokenFor(User user) {
        String rawToken = generateRawToken();
        String tokenHash = sha256Hex(rawToken);

        tokenRepository.invalidateAllForUser(user.getId());

        LocalDateTime now = LocalDateTime.now();
        PasswordResetToken entity = PasswordResetToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(now.plusMinutes(tokenTtlMinutes))
                .createdAt(now)
                .build();
        try {
            tokenRepository.save(entity);
        } catch (DataIntegrityViolationException ex) {
            log.warn("Could not persist a password-reset token for {}: {}", maskEmail(user.getEmail()),
                    ex.getMostSpecificCause().getMessage());
            return;
        }

        sendResetEmail(user, rawToken);
    }

    private void sendResetEmail(User user, String rawToken) {
        if (!emailService.isConfigured()) {
            log.info("Password-reset email skipped for {}: mail provider not configured.",
                    maskEmail(user.getEmail()));
            return;
        }

        String baseUrl = resendProperties.getFrontendBaseUrl().replaceAll("/+$", "");
        String link = baseUrl + "/reset-password?token=" + rawToken;

        String subject = "Réinitialisez votre mot de passe — Awards Académique";
        String html = buildResetEmailHtml(user.getFirstName(), link);

        try {
            emailService.send(user.getEmail(), subject, html);
            log.info("Password-reset email sent to {}", maskEmail(user.getEmail()));
        } catch (Exception ex) {
            log.warn("Failed to send password-reset email to {}: {}", maskEmail(user.getEmail()),
                    ex.getMessage());
        }
    }

    @Override
    @Transactional
    public Map<String, String> resetPassword(String token, String newPassword, String confirmPassword) {
        if (token == null || token.isBlank()) {
            throw new PasswordResetException("Le jeton de réinitialisation est invalide ou a expiré.");
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new PasswordResetException("Le nouveau mot de passe est obligatoire.");
        }
        if (confirmPassword == null || !confirmPassword.equals(newPassword)) {
            throw new PasswordResetException("Les mots de passe ne correspondent pas.");
        }

        String tokenHash = sha256Hex(token);
        PasswordResetToken resetToken = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new PasswordResetException("Le jeton de réinitialisation est invalide ou a expiré."));

        if (resetToken.isUsed()) {
            throw new PasswordResetException("Ce jeton de réinitialisation a déjà été utilisé. Veuillez en demander un nouveau.");
        }
        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new PasswordResetException("Ce jeton de réinitialisation a expiré. Veuillez en demander un nouveau.");
        }

        User user = resetToken.getUser();
        if (user.getDeletedAt() != null || !user.isActive()) {
            throw new PasswordResetException("Ce compte n'est plus actif.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
        tokenRepository.invalidateAllForUser(user.getId());

        return Map.of("message", "Votre mot de passe a été réinitialisé avec succès.");
    }

    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void cleanupExpiredTokens() {
        int removed = tokenRepository.deleteExpiredBefore(LocalDateTime.now());
        if (removed > 0) {
            log.info("Cleaned up {} expired password-reset tokens", removed);
        }
    }

    private String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available on this JVM", ex);
        }
    }

    static String buildResetEmailHtml(String firstName, String link) {
        String safeName = firstName == null || firstName.isBlank() ? "" : escape(firstName.trim());
        return "<div style=\"font-family:Arial,Helvetica,sans-serif;background:#0A0A0B;padding:32px;color:#FBF1E2\">"
                + "<div style=\"max-width:560px;margin:0 auto;border:1px solid #2A2A30;border-radius:16px;padding:32px;"
                + "background:#141416\">"
                + "<h2 style=\"margin-top:0;color:#F5B720\">Awards Académique</h2>"
                + "<p style=\"color:#9B9BA3;font-size:13px\">Sécurité</p>"
                + "<p>Bonjour" + (safeName.isEmpty() ? "" : " " + safeName) + ",</p>"
                + "<p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte. "
                + "Si c'était bien vous, cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>"
                + "<p><a href=\"" + link + "\" style=\"display:inline-block;background:#F5B720;color:#0A0A0B;"
                + "font-weight:bold;text-decoration:none;border-radius:9999px;padding:12px 28px\">"
                + "Réinitialiser mon mot de passe</a></p>"
                + "<p style=\"color:#9B9BA3;font-size:13px\">Ce lien expire dans 30 minutes. "
                + "Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail — votre mot de passe "
                + "actuel reste inchangé et aucun changement ne sera effectué.</p>"
                + "<p style=\"color:#6E6E78;font-size:12px\">Si le bouton ne fonctionne pas, copiez ce lien dans "
                + "votre navigateur :<br><span style=\"word-break:break-all\">" + link + "</span></p>"
                + "<p style=\"color:#9B9BA3;font-size:12px;border-top:1px solid #2A2A30;padding-top:16px;margin-top:24px\">"
                + "Ne partagez jamais ce lien avec qui que ce soit. Awards Académique ne vous demandera jamais "
                + "votre mot de passe par e-mail.</p>"
                + "</div></div>";
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }

    private static String maskEmail(String email) {
        if (email == null || email.isBlank()) return "<absent>";
        int at = email.indexOf('@');
        if (at <= 1) return "*@*" + (at >= 0 ? email.substring(at + 1) : "");
        return email.charAt(0) + "****" + email.substring(at);
    }
}