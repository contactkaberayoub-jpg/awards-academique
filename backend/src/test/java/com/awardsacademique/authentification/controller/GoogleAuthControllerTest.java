package com.awardsacademique.authentification.controller;

import com.awardsacademique.authentification.security.CustomUserDetailsService;
import com.awardsacademique.authentification.security.JwtAuthenticationFilter;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.PublicEndpoints;
import com.awardsacademique.authentification.security.SecurityConfig;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.authentification.service.impl.GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException;
import com.awardsacademique.authentification.service.interfaces.AuthService;
import com.awardsacademique.authentification.service.interfaces.GoogleOAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class GoogleAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private GoogleOAuthService googleOAuthService;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    private static final String FAKE_AUTH_URL =
            "https://accounts.google.com/o/oauth2/v2/auth"
                    + "?client_id=test.apps.googleusercontent.com"
                    + "&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fauth%2Fgoogle%2Fcallback"
                    + "&response_type=code"
                    + "&scope=openid%20email%20profile"
                    + "&state=signed-state-jwt"
                    + "&prompt=select_account"
                    + "&access_type=online";

    @Test
    void getGoogleAuth_returns302ToGoogleWithCorrectParams() throws Exception {
        when(googleOAuthService.createStateToken()).thenReturn("signed-state-jwt");
        when(googleOAuthService.buildAuthorizationUrl("signed-state-jwt")).thenReturn(FAKE_AUTH_URL);

        mockMvc.perform(get("/api/auth/google"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location",
                        containsString("accounts.google.com/o/oauth2/v2/auth")))
                .andExpect(header().string("Location",
                        containsString("client_id=test.apps.googleusercontent.com")))
                .andExpect(header().string("Location",
                        containsString("redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fauth%2Fgoogle%2Fcallback")))
                .andExpect(header().string("Location",
                        containsString("scope=openid%20email%20profile")))
                .andExpect(header().string("Location",
                        not(containsString("%2C"))))
                .andExpect(header().string("Location",
                        not(containsString("["))))
                .andExpect(header().string("Location",
                        not(containsString("]"))))
                .andExpect(header().string("Location",
                        containsString("state=signed-state-jwt")));
    }

    @Test
    void getGoogleAuth_isPubliclyAccessible_noAuthenticationRequired() throws Exception {
        when(googleOAuthService.createStateToken()).thenReturn("signed-state-jwt");
        when(googleOAuthService.buildAuthorizationUrl("signed-state-jwt")).thenReturn(FAKE_AUTH_URL);

        // No Authorization header/bearer token: a Guest must still be redirected (not 401/403).
        mockMvc.perform(get("/api/auth/google"))
                .andExpect(status().isFound());
    }

    @Test
    void googleCallback_isPublic_andRedirectsToFrontendWithOneTimeCodeOnly() throws Exception {
        when(googleOAuthService.getFrontendCallbackUrl())
                .thenReturn("http://localhost:5173/auth/google/callback");
        when(googleOAuthService.handleCallbackAndCreateOneTimeCode("google-auth-code"))
                .thenReturn("one-time-exchange-code");

        mockMvc.perform(get("/api/auth/google/callback")
                        .param("code", "google-auth-code")
                        .param("state", "signed-state-jwt"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location",
                        "http://localhost:5173/auth/google/callback?code=one-time-exchange-code"))
                // The application JWT must never be placed in a URL query parameter.
                .andExpect(header().string("Location", not(containsString("token="))))
                .andExpect(header().string("Location", not(containsString("jwt="))));
    }

    @Test
    void getGoogleAuth_whenOAuthNotConfigured_redirectsToFrontendWithFriendlyError() throws Exception {
        when(googleOAuthService.createStateToken())
                .thenThrow(new GoogleOAuthNotConfiguredException());
        when(googleOAuthService.getFrontendCallbackUrl())
                .thenReturn("http://localhost:5173/auth/google/callback");

        // A misconfigured server must never leak a 500 with the raw class name:
        // user is redirected to the friendly frontend Google callback page instead.
        mockMvc.perform(get("/api/auth/google"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location",
                        "http://localhost:5173/auth/google/callback?error=oauth_not_configured"))
                .andExpect(header().string("Location", not(containsString("InternalServerError"))))
                .andExpect(header().string("Location", not(containsString("GoogleOAuthNotConfigured"))));
    }
}
