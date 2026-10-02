package com.awardsacademique.authentification.service.impl;

import com.awardsacademique.authentification.config.GoogleOAuthProperties;
import com.awardsacademique.authentification.entity.Role;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.RoleRepository;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.dto.response.AuthResponse;
import com.awardsacademique.authentification.exception.UserNotFoundException;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.authentification.service.interfaces.GoogleOAuthService;
import com.awardsacademique.authentification.service.impl.GoogleIdTokenVerifier.GoogleIdTokenParts;
import com.awardsacademique.authentification.service.impl.GoogleIdTokenVerifier.GoogleTokenVerificationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class GoogleOAuthServiceImpl implements GoogleOAuthService {

    private static final String AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String PROVIDER = "GOOGLE";
    private static final String PURPOSE_STATE = "google_oauth_state";
    private static final String PURPOSE_EXCHANGE = "google_oauth_exchange";

    private final GoogleOAuthProperties properties;
    private final GoogleIdTokenVerifier idTokenVerifier;
    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Autowired
    public GoogleOAuthServiceImpl(GoogleOAuthProperties properties,
                                  GoogleIdTokenVerifier idTokenVerifier,
                                  JwtService jwtService,
                                  TokenBlacklistService tokenBlacklistService,
                                  UserRepository userRepository,
                                  RoleRepository roleRepository,
                                  ObjectMapper objectMapper) {
        this(properties, idTokenVerifier, jwtService, tokenBlacklistService,
                userRepository, roleRepository, objectMapper,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    // For testing: allow injecting a mocked HttpClient.
    GoogleOAuthServiceImpl(GoogleOAuthProperties properties,
                           GoogleIdTokenVerifier idTokenVerifier,
                           JwtService jwtService,
                           TokenBlacklistService tokenBlacklistService,
                           UserRepository userRepository,
                           RoleRepository roleRepository,
                           ObjectMapper objectMapper,
                           HttpClient httpClient) {
        this.properties = properties;
        this.idTokenVerifier = idTokenVerifier;
        this.jwtService = jwtService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    @Override
    public String buildAuthorizationUrl(String state) {
        if (!properties.isConfigured()) {
            throw new GoogleOAuthNotConfiguredException();
        }
        String scopeValue = String.join(" ", properties.getScopes());
        return AUTHORIZATION_ENDPOINT
                + "?client_id=" + urlEncode(properties.getClientId())
                + "&redirect_uri=" + urlEncode(properties.getRedirectUri())
                + "&response_type=code"
                + "&scope=" + urlEncode(scopeValue)
                + "&state=" + urlEncode(state)
                + "&prompt=select_account"
                + "&access_type=online";
    }

    public String exchangeAuthorizationCode(String code) {
        if (!properties.isConfigured()) {
            throw new GoogleOAuthNotConfiguredException();
        }

        try {
            String form = "code=" + urlEncode(code)
                    + "&client_id=" + urlEncode(properties.getClientId())
                    + "&client_secret=" + urlEncode(properties.getClientSecret())
                    + "&redirect_uri=" + urlEncode(properties.getRedirectUri())
                    + "&grant_type=authorization_code";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(TOKEN_ENDPOINT))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Google token exchange failed: HTTP {} body={}",
                        response.statusCode(), sanitizeBody(response.body()));
                throw new GoogleOAuthException("Google token exchange failed with HTTP " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String idToken = root.path("id_token").asText(null);
            if (idToken == null || idToken.isBlank()) {
                throw new GoogleOAuthException("Google token exchange returned no id_token");
            }
            return idToken;

        } catch (GoogleOAuthException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GoogleOAuthException("Interrupted while exchanging code with Google", e);
        } catch (IOException e) {
            throw new GoogleOAuthException("Network error while exchanging code with Google", e);
        } catch (Exception e) {
            throw new GoogleOAuthException("Failed to exchange code with Google", e);
        }
    }

    @Override
    @Transactional
    public AuthResponse exchangeOneTimeCode(String oneTimeCode) {
        if (oneTimeCode == null || oneTimeCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing exchange code");
        }

        String purpose;
        String email;
        try {
            purpose = jwtService.extractClaim(oneTimeCode, claims -> claims.get("purpose", String.class));
            email = jwtService.extractUsername(oneTimeCode);
            String jti = jwtService.extractId(oneTimeCode);
            if (tokenBlacklistService.isBlacklisted(jti)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exchange code has already been used");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid exchange code");
        }

        if (!PURPOSE_EXCHANGE.equals(purpose) || email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid exchange code");
        }

        Date expiry = jwtService.extractExpiration(oneTimeCode);
        if (expiry == null || expiry.before(new Date())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exchange code has expired");
        }

        String jti = jwtService.extractId(oneTimeCode);
        if (jti != null) {
            tokenBlacklistService.blacklist(jti, expiry);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        if (user.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has been deactivated");
        }

        UserDetails userDetails = toUserDetails(user);
        String appToken = jwtService.generateToken(
                Map.of("role", user.getRole().getName().name()),
                userDetails
        );

        log.info("Google OAuth login successful for email={}", email);
        return buildAuthResponse(user, appToken);
    }

    public String generateOneTimeCode(User user) {
        UserDetails userDetails = toUserDetails(user);
        return jwtService.generateToken(
                Map.of("purpose", PURPOSE_EXCHANGE),
                userDetails,
                (long) Math.max(30, properties.getExchangeCodeTtlSeconds()) * 1000L
        );
    }

    @Override
    @Transactional
    public String handleCallbackAndCreateOneTimeCode(String authorizationCode) {
        String idToken = exchangeAuthorizationCode(authorizationCode);
        GoogleIdTokenParts googleParts = idTokenVerifier.verify(idToken);
        String email = createUserFromGoogle(googleParts);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        return generateOneTimeCode(user);
    }

    @Transactional
    public String createUserFromGoogle(GoogleIdTokenParts googleParts) {
        String email = googleParts.email().toLowerCase();
        String sub = googleParts.sub();

        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.getDeletedAt() != null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has been deactivated");
            }
            boolean changed = false;
            if (user.getOauthProvider() == null) {
                user.setOauthProvider(PROVIDER);
                changed = true;
            }
            if (user.getOauthId() == null) {
                user.setOauthId(sub);
                changed = true;
            }
            if (user.getEmailVerifiedAt() == null && googleParts.emailVerified()) {
                user.setEmailVerifiedAt(LocalDateTime.now());
                changed = true;
            }
            if (user.getAvatarUrl() == null && googleParts.picture() != null && !googleParts.picture().isBlank()) {
                user.setAvatarUrl(googleParts.picture());
                changed = true;
            }
            if (changed) {
                user.setUpdatedAt(LocalDateTime.now());
                userRepository.save(user);
            }
            return email;
        }

        Role studentRole = roleRepository.findByName(RoleName.student)
                .orElseThrow(() -> new IllegalStateException("Default role STUDENT is not configured in the database"));

        LocalDateTime now = LocalDateTime.now();
        String firstName = resolveFirstName(googleParts, email);
        String lastName = resolveLastName(googleParts, email);

        User newUser = User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .passwordHash(null)
                .role(studentRole)
                .oauthProvider(PROVIDER)
                .oauthId(sub)
                .avatarUrl(googleParts.picture())
                .emailVerifiedAt(googleParts.emailVerified() ? now : null)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        userRepository.save(newUser);
        log.info("New user created via Google OAuth for email={}", email);
        return email;
    }

    private String resolveFirstName(GoogleIdTokenParts parts, String email) {
        if (parts.firstName() != null && !parts.firstName().isBlank()) {
            return parts.firstName().trim();
        }
        if (parts.name() != null && !parts.name().isBlank()) {
            String[] partsName = parts.name().trim().split("\\s+", 2);
            if (partsName.length > 0 && !partsName[0].isBlank()) {
                return partsName[0];
            }
        }
        int atIdx = email.indexOf('@');
        if (atIdx > 0) {
            return email.substring(0, atIdx);
        }
        return "User";
    }

    private String resolveLastName(GoogleIdTokenParts parts, String email) {
        if (parts.lastName() != null && !parts.lastName().isBlank()) {
            return parts.lastName().trim();
        }
        if (parts.name() != null && !parts.name().isBlank()) {
            String[] partsName = parts.name().trim().split("\\s+", 2);
            if (partsName.length > 1 && !partsName[1].isBlank()) {
                return partsName[1];
            }
        }
        return "";
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

    private UserDetails toUserDetails(User user) {
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash() == null ? "" : user.getPasswordHash())
                .authorities("ROLE_" + user.getRole().getName().name())
                .accountLocked(!user.isActive())
                .disabled(user.getDeletedAt() != null)
                .build();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20");
    }

    public String getFrontendCallbackUrl() {
        return properties.getFrontendCallbackUrl();
    }

    private String sanitizeBody(String body) {
        if (body == null) return "";
        return body.replaceAll("(?i)(access_token\\\\?\"\\s*:\\s*\\\\?\"|refresh_token\\\\?\"\\s*:\\s*\\\\?\")[^\\\\,\"]+", "$1[REDACTED]");
    }

    public String createStateToken() {
        String state = UUID.randomUUID().toString();
        UserDetails anonymous = org.springframework.security.core.userdetails.User
                .withUsername(state)
                .password("")
                .authorities("ROLE_ANONYMOUS")
                .build();
        return jwtService.generateToken(
                Map.of("purpose", PURPOSE_STATE),
                anonymous,
                (long) Math.max(60, properties.getExchangeCodeTtlSeconds()) * 1000L
        );
    }

    public void validateStateToken(String stateToken) {
        if (stateToken == null || stateToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing OAuth state");
        }
        try {
            String purpose = jwtService.extractClaim(stateToken, claims -> claims.get("purpose", String.class));
            String stateSubject = jwtService.extractUsername(stateToken);
            Date expiry = jwtService.extractExpiration(stateToken);
            if (!PURPOSE_STATE.equals(purpose) || stateSubject == null || stateSubject.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OAuth state");
            }
            if (expiry == null || expiry.before(new Date())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OAuth state has expired");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (GoogleTokenVerificationException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OAuth state");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OAuth state");
        }
    }

    public static class GoogleOAuthException extends RuntimeException {
        public GoogleOAuthException(String message) {
            super(message);
        }

        public GoogleOAuthException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class GoogleOAuthNotConfiguredException extends RuntimeException {
        public GoogleOAuthNotConfiguredException() {
            super("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
        }
    }
}