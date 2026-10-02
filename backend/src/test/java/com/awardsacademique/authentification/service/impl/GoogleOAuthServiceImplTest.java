package com.awardsacademique.authentification.service.impl;

import com.awardsacademique.authentification.config.GoogleOAuthProperties;
import com.awardsacademique.authentification.dto.response.AuthResponse;
import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.Role;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.RoleRepository;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.exception.UserNotFoundException;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.authentification.service.impl.GoogleIdTokenVerifier.GoogleIdTokenParts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoogleOAuthServiceImplTest {

    @Mock
    private GoogleIdTokenVerifier idTokenVerifier;
    @Mock
    private JwtService jwtService;
    @Mock
    private TokenBlacklistService tokenBlacklistService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private GoogleOAuthProperties properties;
    private HttpClient httpClient;
    private GoogleOAuthServiceImpl service;

    @BeforeEach
    void setUp() {
        properties = new GoogleOAuthProperties();
        properties.setClientId("PLACEHOLDER-client.apps.googleusercontent.com");
        properties.setClientSecret("PLACEHOLDER-secret");
        httpClient = mock(HttpClient.class);
        service = new GoogleOAuthServiceImpl(
                properties, idTokenVerifier, jwtService, tokenBlacklistService,
                userRepository, roleRepository, objectMapper, httpClient);
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<String> response(String body, int status) {
        HttpResponse<String> r = mock(HttpResponse.class);
        when(r.statusCode()).thenReturn(status);
        when(r.body()).thenReturn(body);
        return r;
    }

    private void stubHttpResponse(HttpResponse<String> resp) throws Exception {
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(resp);
    }

    private Role role(RoleName name) {
        Role r = new Role();
        r.setId(UUID.randomUUID());
        r.setName(name);
        return r;
    }

    private User user(String email, String provider, String oauthId, RoleName roleName) {
        return User.builder()
                .id(UUID.randomUUID())
                .firstName("Jean")
                .lastName("Dupont")
                .email(email)
                .passwordHash("hash")
                .oauthProvider(provider)
                .oauthId(oauthId)
                .emailVerifiedAt(LocalDateTime.now())
                .role(role(roleName))
                .isActive(true)
                .build();
    }

    // ---------- buildAuthorizationUrl ----------

    @Test
    void buildAuthorizationUrl_containsGoogleEndpointScopesAndState() {
        String url = service.buildAuthorizationUrl("state-123");

        assertTrue(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth?"));
        assertTrue(url.contains("client_id=" + properties.getClientId()));
        assertTrue(url.contains("redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fauth%2Fgoogle%2Fcallback"));
        assertTrue(url.contains("response_type=code"));
        assertTrue(url.contains("state=state-123"));
        assertTrue(url.contains("prompt=select_account"));
        assertTrue(url.contains("access_type=online"));
        // Space-delimited scopes, URL-encoded as %20 — not comma-separated
        assertTrue(url.contains("scope=openid%20email%20profile"),
                "scopes must be space-delimited and URL-encoded");
        assertFalse(url.contains("scope=openid%2Cemail%2Cprofile"),
                "scopes must NOT be comma-separated");
        assertFalse(url.contains("[") || url.contains("]"),
                "scope parameter must not contain brackets");
    }

    @Test
    void buildAuthorizationUrl_scopeWithCustomScopes_encodesSpacesCorrectly() {
        properties.setScopes(java.util.List.of("openid", "profile", "email", "https://www.googleapis.com/auth/userinfo.email"));
        String url = service.buildAuthorizationUrl("state-456");
        // all four scopes joined by space, then URL-encoded
        assertTrue(url.contains("scope=openid%20profile%20email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email"),
                "custom scopes must be space-joined and URL-encoded");
    }

    @Test
    void buildAuthorizationUrl_whenNotConfigured_throws() {
        GoogleOAuthProperties unconfigured = new GoogleOAuthProperties();
        GoogleOAuthServiceImpl unconfiguredService = new GoogleOAuthServiceImpl(
                unconfigured, idTokenVerifier, jwtService, tokenBlacklistService,
                userRepository, roleRepository, objectMapper, httpClient);
        assertThrows(GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException.class,
                () -> unconfiguredService.buildAuthorizationUrl("state"));
    }

    @Test
    void buildAuthorizationUrl_missingClientIdOnly_throwsSafeConfigurationError() {
        GoogleOAuthProperties missingId = new GoogleOAuthProperties();
        missingId.setClientSecret("PLACEHOLDER-secret");
        GoogleOAuthServiceImpl missingIdService = new GoogleOAuthServiceImpl(
                missingId, idTokenVerifier, jwtService, tokenBlacklistService,
                userRepository, roleRepository, objectMapper, httpClient);

        GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException ex =
                assertThrows(GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException.class,
                        () -> missingIdService.buildAuthorizationUrl("state"));
        // The error must not contain the configured secret value.
        assertFalse(ex.getMessage().contains("PLACEHOLDER-secret"));
    }

    @Test
    void buildAuthorizationUrl_missingClientSecretOnly_throwsSafeConfigurationError() {
        GoogleOAuthProperties missingSecret = new GoogleOAuthProperties();
        missingSecret.setClientId("PLACEHOLDER-client.apps.googleusercontent.com");
        GoogleOAuthServiceImpl missingSecretService = new GoogleOAuthServiceImpl(
                missingSecret, idTokenVerifier, jwtService, tokenBlacklistService,
                userRepository, roleRepository, objectMapper, httpClient);

        GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException ex =
                assertThrows(GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException.class,
                        () -> missingSecretService.buildAuthorizationUrl("state"));
        assertFalse(ex.getMessage().contains("PLACEHOLDER-secret"));
    }

    @Test
    void buildAuthorizationUrl_neverContainsClientSecret() {
        String url = service.buildAuthorizationUrl("state-123");

        assertFalse(url.contains(properties.getClientSecret()),
                "the Google authorization URL must never contain the Client Secret");
        assertFalse(url.toLowerCase().contains("client_secret"),
                "the Google authorization URL must not carry a client_secret parameter");
    }

    // ---------- exchangeAuthorizationCode ----------

    @Test
    void exchangeAuthorizationCode_returnsIdTokenOnSuccess() throws Exception {
        stubHttpResponse(response("{\"id_token\":\"id-123\",\"access_token\":\"at\",\"expires_in\":3600}",
                200));

        String idToken = service.exchangeAuthorizationCode("auth-code");

        assertEquals("id-123", idToken);
    }

    @Test
    void exchangeAuthorizationCode_httpNon200_throws() throws Exception {
        stubHttpResponse(response("{\"error\":\"invalid_grant\"}", 400));

        assertThrows(GoogleOAuthServiceImpl.GoogleOAuthException.class,
                () -> service.exchangeAuthorizationCode("bad-code"));
    }

    @Test
    void exchangeAuthorizationCode_missingIdToken_throws() throws Exception {
        stubHttpResponse(response("{\"access_token\":\"at\"}", 200));

        assertThrows(GoogleOAuthServiceImpl.GoogleOAuthException.class,
                () -> service.exchangeAuthorizationCode("code"));
    }

    @Test
    void exchangeAuthorizationCode_notConfigured_throwsWithoutNetwork() {
        GoogleOAuthProperties unconfigured = new GoogleOAuthProperties();
        GoogleOAuthServiceImpl unconfiguredService = new GoogleOAuthServiceImpl(
                unconfigured, idTokenVerifier, jwtService, tokenBlacklistService,
                userRepository, roleRepository, objectMapper, httpClient);

        assertThrows(GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException.class,
                () -> unconfiguredService.exchangeAuthorizationCode("code"));
        try {
            verify(httpClient, never()).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
        } catch (Exception ignored) {
            // never-send verification: no exception expected here
        }
    }

    // ---------- createUserFromGoogle ----------

    @Test
    void createUserFromGoogle_newEmail_createsStudentWithGoogleProvider() {
        GoogleIdTokenParts parts = new GoogleIdTokenParts(
                "google-sub-1", "new@example.com", true, "Emma", "Martin", "Emma Martin", "https://example.com/pic.jpg");

        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName(RoleName.student)).thenReturn(Optional.of(role(RoleName.student)));

        String email = service.createUserFromGoogle(parts);

        assertEquals("new@example.com", email);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createUserFromGoogle_newEmail_savedUserIsStudentWithoutPasswordAndWithNoSideEffects() {
        GoogleIdTokenParts parts = new GoogleIdTokenParts(
                "google-sub-student", "fresh@example.com", true, "Emma", "Martin", "Emma Martin", "https://example.com/pic.jpg");

        when(userRepository.findByEmail("fresh@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName(RoleName.student)).thenReturn(Optional.of(role(RoleName.student)));

        service.createUserFromGoogle(parts);

        org.mockito.ArgumentCaptor<User> captor =
                org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository, org.mockito.Mockito.times(1)).save(captor.capture());
        User saved = captor.getValue();

        // A new Google user is always a STUDENT, never an instructor.
        assertEquals(RoleName.student, saved.getRole().getName());
        assertEquals("Emma", saved.getFirstName());
        assertEquals("Martin", saved.getLastName());
        assertEquals("https://example.com/pic.jpg", saved.getAvatarUrl());
        // No password is created for OAuth-only users...
        assertNull(saved.getPasswordHash());
        // ...but the Google identity is linked and the email is trusted.
        assertEquals("GOOGLE", saved.getOauthProvider());
        assertEquals("google-sub-student", saved.getOauthId());
        assertNotNull(saved.getEmailVerifiedAt());
        // Google login must not create anything beyond the single user account:
        // no second user save and no instructor/application side effect.
        verify(userRepository, org.mockito.Mockito.times(1)).save(any(User.class));
    }

    @Test
    void createUserFromGoogle_existingEmail_linksProviderAndPreservesRole() {
        User existing = user("existing@example.com", null, null, RoleName.instructor);
        existing.setInstructorStatus(InstructorStatusEnum.APPROVED);
        GoogleIdTokenParts parts = new GoogleIdTokenParts(
                "google-sub-2", "existing@example.com", true, "Jean", "Dupont", "Jean Dupont", null);

        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(existing));

        String email = service.createUserFromGoogle(parts);

        assertEquals("existing@example.com", email);
        assertEquals("GOOGLE", existing.getOauthProvider());
        assertEquals("google-sub-2", existing.getOauthId());
        assertEquals(RoleName.instructor, existing.getRole().getName());
    }

    @Test
    void createUserFromGoogle_existingEmailWithProvider_doesNotOverwrite() {
        User existing = user("owned@example.com", "GOOGLE", "google-sub-old", RoleName.student);
        GoogleIdTokenParts parts = new GoogleIdTokenParts(
                "google-sub-new", "owned@example.com", true, "Jean", "Dupont", "Jean Dupont", null);

        when(userRepository.findByEmail("owned@example.com")).thenReturn(Optional.of(existing));

        String email = service.createUserFromGoogle(parts);

        assertEquals("owned@example.com", email);
        // The previously-linked oauth id is preserved.
        assertEquals("google-sub-old", existing.getOauthId());
    }

    @Test
    void createUserFromGoogle_softDeletedAccount_throwsForbidden() {
        User softDeleted = user("gone@example.com", null, null, RoleName.student);
        softDeleted.setDeletedAt(LocalDateTime.now());
        GoogleIdTokenParts parts = new GoogleIdTokenParts(
                "google-sub-3", "gone@example.com", true, "Jean", "Dupont", "Jean Dupont", null);

        when(userRepository.findByEmail("gone@example.com")).thenReturn(Optional.of(softDeleted));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createUserFromGoogle(parts));
        assertEquals(403, ex.getStatusCode().value());
    }

    // ---------- exchangeOneTimeCode ----------

    private GoogleIdTokenParts partsFor(String email) {
        return new GoogleIdTokenParts("sub-" + email, email, true, "Jean", "Dupont", "Jean Dupont", null);
    }

    @Test
    void exchangeOneTimeCode_validCode_generatesAppToken() {
        String code = "one-time-code";
        User student = user("oauth@example.com", "GOOGLE", "sub-x", RoleName.student);

        when(jwtService.extractClaim(any(String.class), any())).thenReturn("google_oauth_exchange");
        when(jwtService.extractUsername(code)).thenReturn("oauth@example.com");
        when(jwtService.extractId(code)).thenReturn("jti-1");
        when(tokenBlacklistService.isBlacklisted("jti-1")).thenReturn(false);
        when(jwtService.extractExpiration(code)).thenReturn(
                new java.util.Date(System.currentTimeMillis() + 60_000));
        when(userRepository.findByEmail("oauth@example.com")).thenReturn(Optional.of(student));
        when(jwtService.generateToken(any(Map.class), any(org.springframework.security.core.userdetails.UserDetails.class)))
                .thenReturn("app-jwt-abc");

        AuthResponse response = service.exchangeOneTimeCode(code);

        assertNotNull(response);
        assertEquals("app-jwt-abc", response.getToken());
        assertEquals("oauth@example.com", response.getEmail());
        assertEquals(RoleName.student.name(), response.getRole());
        verify(tokenBlacklistService).blacklist(org.mockito.ArgumentMatchers.eq("jti-1"), any());
    }

    @Test
    void exchangeOneTimeCode_usedCode_alreadyBlacklisted_throwsBadRequest() {
        String code = "code";

        when(jwtService.extractClaim(any(String.class), any())).thenReturn("google_oauth_exchange");
        when(jwtService.extractUsername(code)).thenReturn("oauth@example.com");
        when(jwtService.extractId(code)).thenReturn("jti-used");
        when(tokenBlacklistService.isBlacklisted("jti-used")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.exchangeOneTimeCode(code));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void exchangeOneTimeCode_wrongPurpose_throwsBadRequest() {
        String code = "code";
        when(jwtService.extractClaim(any(String.class), any())).thenReturn("some_other_purpose");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.exchangeOneTimeCode(code));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void exchangeOneTimeCode_expiredCode_throwsBadRequest() {
        String code = "code";
        when(jwtService.extractClaim(any(String.class), any())).thenReturn("google_oauth_exchange");
        when(jwtService.extractUsername(code)).thenReturn("oauth@example.com");
        when(jwtService.extractId(code)).thenReturn("jti-exp");
        when(tokenBlacklistService.isBlacklisted("jti-exp")).thenReturn(false);
        when(jwtService.extractExpiration(code)).thenReturn(
                new java.util.Date(System.currentTimeMillis() - 60_000));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.exchangeOneTimeCode(code));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void exchangeOneTimeCode_unknownUser_throws() {
        String code = "code";
        when(jwtService.extractClaim(any(String.class), any())).thenReturn("google_oauth_exchange");
        when(jwtService.extractUsername(code)).thenReturn("missing@example.com");
        when(jwtService.extractId(code)).thenReturn("jti-x");
        when(tokenBlacklistService.isBlacklisted("jti-x")).thenReturn(false);
        when(jwtService.extractExpiration(code)).thenReturn(
                new java.util.Date(System.currentTimeMillis() + 60_000));
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> service.exchangeOneTimeCode(code));
    }

    @Test
    void exchangeOneTimeCode_nullCode_throwsBadRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.exchangeOneTimeCode(null));
        assertEquals(400, ex.getStatusCode().value());
    }

    // ---------- validateStateToken / createStateToken ----------

    @Test
    void createStateToken_returnsSignedJwt() {
        when(jwtService.generateToken(any(Map.class), any(org.springframework.security.core.userdetails.UserDetails.class),
                any(Long.class))).thenReturn("state-jwt");

        String state = service.createStateToken();
        assertNotNull(state);
    }

    @Test
    void validateStateToken_validPurpose_andNotExpired_passes() {
        String state = "state";
        when(jwtService.extractClaim(any(String.class), any())).thenReturn("google_oauth_state");
        when(jwtService.extractUsername(state)).thenReturn("abc-123");
        when(jwtService.extractExpiration(state)).thenReturn(
                new java.util.Date(System.currentTimeMillis() + 60_000));

        service.validateStateToken(state); // should not throw
    }

    @Test
    void validateStateToken_null_throwsBadRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.validateStateToken(null));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void validateStateToken_wrongPurpose_throwsBadRequest() {
        String state = "state";
        when(jwtService.extractClaim(any(String.class), any())).thenReturn("other");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.validateStateToken(state));
        assertEquals(400, ex.getStatusCode().value());
    }

    // ---------- handleCallbackAndCreateOneTimeCode ----------

    @Test
    void handleCallbackAndCreateOneTimeCode_fullFlow() throws Exception {
        stubHttpResponse(response("{\"id_token\":\"google-id-token\"}", 200));

        GoogleIdTokenParts parts = partsFor("flow@example.com");
        when(idTokenVerifier.verify("google-id-token")).thenReturn(parts);
        User flowUser = user("flow@example.com", "GOOGLE", "sub-f", RoleName.student);
        when(userRepository.findByEmail("flow@example.com"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(flowUser));
        when(roleRepository.findByName(RoleName.student)).thenReturn(Optional.of(role(RoleName.student)));
        when(jwtService.generateToken(any(Map.class), any(org.springframework.security.core.userdetails.UserDetails.class),
                any(Long.class))).thenReturn("one-time-code");

        String code = service.handleCallbackAndCreateOneTimeCode("auth-code");

        assertEquals("one-time-code", code);
    }

    @Test
    void handleCallbackAndCreateOneTimeCode_googleIdTokenInvalid_throws() throws Exception {
        stubHttpResponse(response("{\"id_token\":\"google-id-token\"}", 200));
        when(idTokenVerifier.verify("google-id-token"))
                .thenThrow(new GoogleIdTokenVerifier.GoogleTokenVerificationException("bad signature"));

        assertThrows(GoogleIdTokenVerifier.GoogleTokenVerificationException.class,
                () -> service.handleCallbackAndCreateOneTimeCode("auth-code"));
    }
}