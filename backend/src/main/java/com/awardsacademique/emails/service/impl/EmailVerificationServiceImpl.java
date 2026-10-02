package com.awardsacademique.emails.service.impl;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.emails.ResendProperties;
import com.awardsacademique.emails.exception.EmailException;
import com.awardsacademique.emails.service.interfaces.EmailService;
import com.awardsacademique.emails.service.interfaces.EmailVerificationService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Service
public class EmailVerificationServiceImpl implements EmailVerificationService {

    private static final String PURPOSE_EMAIL_VERIFICATION = "email_verification";
    private static final String PURPOSE_CLAIM = "purpose";

    private final SecretKey signingKey;
    private final long tokenTtlMillis;
    private final ResendProperties resendProperties;
    private final EmailService emailService;
    private final UserRepository userRepository;

    public EmailVerificationServiceImpl(
            @Value("${jwt.secret}") String secret,
            @Value("${email.verification-token-ttl-hours:24}") long ttlHours,
            ResendProperties resendProperties,
            EmailService emailService,
            UserRepository userRepository
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.tokenTtlMillis = Math.max(1, ttlHours) * 3_600_000L;
        this.resendProperties = resendProperties;
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    @Override
    public String createVerificationToken(String email) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + tokenTtlMillis);
        return Jwts.builder()
                .subject(email.toLowerCase())
                .claim(PURPOSE_CLAIM, PURPOSE_EMAIL_VERIFICATION)
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    @Override
    public void sendVerificationEmail(User user) {
        if (!emailService.isConfigured()) {
            log.info("Verification email skipped for {}: mail provider not configured. " +
                    "Registration proceeds without a verification email.", maskEmail(user.getEmail()));
            return;
        }

        String token = createVerificationToken(user.getEmail());
        String baseUrl = resendProperties.getFrontendBaseUrl().replaceAll("/+$", "");
        String link = baseUrl + "/verify-email?token=" + token;

        String subject = "Vérifiez votre adresse e-mail — Awards Académique";
        String html = buildVerificationEmailHtml(user.getFirstName(), link);

        try {
            emailService.send(user.getEmail(), subject, html);
            log.info("Verification email sent to {}", maskEmail(user.getEmail()));
        } catch (Exception ex) {
            log.error("Failed to send verification email to {}: {}", maskEmail(user.getEmail()), ex.getMessage());
        }
    }

    @Override
    @Transactional
    public User verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new EmailException("Verification token is required.");
        }

        Claims claims;
        try {
            Jws<Claims> parsed = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token);
            claims = parsed.getPayload();
        } catch (ExpiredJwtException ex) {
            throw new EmailException("Ce lien de vérification a expiré. Veuillez en demander un nouveau.");
        } catch (JwtException | IllegalArgumentException ex) {
            throw new EmailException("Lien de vérification invalide.");
        }

        if (!PURPOSE_EMAIL_VERIFICATION.equals(claims.get(PURPOSE_CLAIM, String.class))) {
            throw new EmailException("Lien de vérification invalide.");
        }

        String email = claims.getSubject();
        if (email == null || email.isBlank()) {
            throw new EmailException("Lien de vérification invalide.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EmailException("Aucun compte associé à cette adresse."));

        user.setEmailVerifiedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    private static String buildVerificationEmailHtml(String firstName, String link) {
        String safeName = firstName == null || firstName.isBlank() ? "" : escape(firstName.trim());
        return "<div style=\"font-family:Arial,Helvetica,sans-serif;background:#0A0A0B;padding:32px;color:#FBF1E2\">"
                + "<div style=\"max-width:560px;margin:0 auto;border:1px solid #2A2A30;border-radius:16px;padding:32px;"
                + "background:#141416\">"
                + "<h2 style=\"margin-top:0;color:#F5B720\">Bienvenue" + (safeName.isEmpty() ? "" : ", " + safeName)
                + "&nbsp;!</h2>"
                + "<p>Merci de créer un compte sur Awards Académique. Pour activer votre compte, confirmez votre "
                + "adresse e-mail :</p>"
                + "<p><a href=\"" + link + "\" style=\"display:inline-block;background:#F5B720;color:#0A0A0B;"
                + "font-weight:bold;text-decoration:none;border-radius:9999px;padding:12px 28px\">Vérifier mon adresse "
                + "e-mail</a></p>"
                + "<p style=\"color:#9B9BA3;font-size:13px\">Ce lien est valable 24 heures. Si vous n'avez pas créé de "
                + "compte, ignorez cet e-mail.</p>"
                + "<p style=\"color:#6E6E78;font-size:12px\">Si le bouton ne fonctionne pas, copiez ce lien dans "
                + "votre navigateur :<br><span style=\"word-break:break-all\">" + link + "</span></p>"
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