package com.awardsacademique.authentification.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Handles JWT generation, parsing and validation using HMAC-SHA256 (HS256).
 * Secret and expiration are externalized via application.yml:
 *
 * jwt:
 *   secret: <base64-or-plain-secret-min-256-bits>
 *   expiration: 3600000
 */
@Slf4j
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMillis;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration:3600000}") long expirationMillis
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMillis = expirationMillis;
    }

    /**
     * Generates a signed JWT for the given user details with no extra claims.
     */
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    /**
     * Generates a signed JWT for the given user details, including custom claims.
     * A unique token id ("jti") is always injected so the token can be blacklisted
     * explicitly via the /logout endpoint.
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return generateToken(extraClaims, userDetails, null);
    }

    /**
     * Generates a signed JWT for the given user details, including custom claims.
     * When {@code expirationOverrideMillis} is null the default configured expiry
     * is used. Used for short-lived purpose-limited tokens (e.g. one-time OAuth
     * exchange codes).
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails,
                                Long expirationOverrideMillis) {
        long effectiveExpiration = expirationOverrideMillis != null
                ? expirationOverrideMillis
                : expirationMillis;
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + effectiveExpiration);
        Map<String, Object> claims = new HashMap<>(extraClaims);
        claims.putIfAbsent("jti", UUID.randomUUID().toString());

        return Jwts.builder()
                .claims(claims)
                .subject(userDetails.getUsername())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extracts the JWT id ("jti") claim from the token (used for blacklisting).
     */
    public String extractId(String token) {
        try {
            Claims all = extractAllClaims(token);
            Object jti = all.getId();
            return jti != null ? jti.toString() : null;
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Extracts the username (email) from the token's subject claim.
     */
    public String extractUsername(String token) {
        try {
            return extractClaim(token, Claims::getSubject);
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Extracts the expiration date from the token.
     * Returns null if the token is malformed, expired or otherwise unreadable.
     */
    public Date extractExpiration(String token) {
        try {
            return extractClaim(token, Claims::getExpiration);
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Extracts a specific claim from the token using the provided resolver function.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Validates the token against the given user details:
     * checks subject match and expiration.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String username = extractUsername(token);
            boolean tokenExpired = isTokenExpired(token);
            return username.equals(userDetails.getUsername()) && !tokenExpired;
        } catch (ExpiredJwtException | MalformedJwtException |
                 UnsupportedJwtException | SignatureException |
                 IllegalArgumentException ex) {
            log.warn("JWT validation failed: {}", ex.getMessage());
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        Date expiration = extractExpiration(token);
        if (expiration == null) return true;
        return expiration.before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}