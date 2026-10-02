package com.awardsacademique.payments.paypal;

import com.awardsacademique.payments.paypal.exception.PayPalApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for {@link PayPalAuthService} OAuth token handling.
 *
 * <p>No real credentials or network calls: the {@link HttpClient} is stubbed and the
 * client/secret are non-real placeholders that prove the service builds the Basic header from
 * properties rather than hard-coding credentials.
 */
@ExtendWith(MockitoExtension.class)
class PayPalAuthServiceTest {

    private PayPalProperties properties;
    private HttpClient httpClient;
    private ObjectMapper objectMapper = new ObjectMapper();
    private PayPalAuthService service;

    // Placeholders mirroring the shape of a PayPal oauth cred pair — NOT real credentials.
    private static final String CLIENT_ID = "PUBLIC-PLACEHOLDER";
    private static final String CLIENT_SECRET = "SECRET-PLACEHOLDER";

    @BeforeEach
    void setUp() {
        properties = new PayPalProperties();
        properties.setClientId(CLIENT_ID);
        properties.setClientSecret(CLIENT_SECRET);
        httpClient = mock(HttpClient.class);
        service = new PayPalAuthService(properties, httpClient, objectMapper);
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<String> response(String body, int status) {
        HttpResponse<String> r = mock(HttpResponse.class);
        when(r.statusCode()).thenReturn(status);
        when(r.body()).thenReturn(body);
        return r;
    }

    private void stubTokenResponse(HttpResponse<String> resp) throws Exception {
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(resp);
    }

    @Test
    void getAccessToken_onSuccess_returnsTokenAndCachesIt() throws Exception {
        HttpResponse<String> ok = response("{\"access_token\":\"tok-123\",\"expires_in\":3600}", 200);
        stubTokenResponse(ok);

        String first = service.getAccessToken();
        String second = service.getAccessToken();

        assertEquals("tok-123", first);
        assertEquals("tok-123", second);
        // Within the validity window, the cached token is reused without a second HTTP round-trip.
        verify(httpClient, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void getAccessToken_httpFailure_throwsPayPalApiException() throws Exception {
        HttpResponse<String> bad = response("{\"error\":\"invalid_client\"}", 401);
        stubTokenResponse(bad);

        assertThrows(PayPalApiException.class, service::getAccessToken);
    }

    @Test
    void getAccessToken_oauthFailure_surfacesErrorAndDescriptionInMessage() throws Exception {
        HttpResponse<String> bad = response(
                "{\"error\":\"invalid_client\",\"error_description\":\"Client Authentication failed\"}", 401);
        stubTokenResponse(bad);

        PayPalApiException ex = assertThrows(PayPalApiException.class, service::getAccessToken);

        assertTrue(ex.getMessage().contains("HTTP 401"), ex.getMessage());
        assertTrue(ex.getMessage().contains("error=invalid_client"), ex.getMessage());
        assertTrue(ex.getMessage().contains("error_description=Client Authentication failed"), ex.getMessage());
    }

    @Test
    void getAccessToken_missingToken_throwsPayPalApiException() throws Exception {
        HttpResponse<String> noToken = response("{\"scope\":\"nothing\"}", 200);
        stubTokenResponse(noToken);

        assertThrows(PayPalApiException.class, service::getAccessToken);
    }

    @Test
    void getAccessToken_usesConfiguredCredentials() throws Exception {
        // The token endpoint uses the property-supplied creds; no hard-coded credentials.
        HttpResponse<String> ok = response("{\"access_token\":\"tok-abc\",\"expires_in\":3600}", 200);
        stubTokenResponse(ok);

        String token = service.getAccessToken();
        assertNotNull(token);
        assertEquals("tok-abc", token);
    }

    @Test
    void oauthRequest_targetsSandboxTokenEndpoint_withBasicCredentials() throws Exception {
        // Verify the OAuth round-trip shape WITHOUT any real credentials: sandbox host, /v1/oauth2/token,
        // Basic header decoding to configured clientId:clientSecret, grant_type=client_credentials.
        HttpResponse<String> ok = response("{\"access_token\":\"tok-xyz\",\"expires_in\":3600}", 200);
        stubTokenResponse(ok);

        service.getAccessToken();

        ArgumentCaptor<HttpRequest> captor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(captor.capture(), any(HttpResponse.BodyHandler.class));
        HttpRequest sent = captor.getValue();

        assertEquals(URI.create("https://api-m.sandbox.paypal.com/v1/oauth2/token"), sent.uri());
        String auth = sent.headers().firstValue("Authorization").orElse("");
        assertTrue(auth.startsWith("Basic "));
        String decoded = new String(Base64.getDecoder().decode(auth.substring("Basic ".length())),
                StandardCharsets.UTF_8);
        assertEquals(CLIENT_ID + ":" + CLIENT_SECRET, decoded);
        // grant_type lives in the request body.
        String body = readBody(sent);
        assertTrue(body.contains("grant_type=client_credentials"), body);
        // App id header is not present, but content type is set.
        assertTrue(sent.headers().firstValue("Content-Type").orElse("").startsWith("application/x-www-form-urlencoded"));
    }

    @Test
    void missingOrUnresolvedCredentials_failFastWithoutCallingPayPal() throws Exception {
        // If PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set (blank / unresolved placeholder),
        // the auth service must fail locally instead of sending a bad Basic header to PayPal.
        PayPalProperties unset = new PayPalProperties();
        unset.setClientId("${PAYPAL_CLIENT_ID}");
        unset.setClientSecret("${PAYPAL_CLIENT_SECRET}");
        service = new PayPalAuthService(unset, httpClient, objectMapper);

        PayPalApiException ex = assertThrows(PayPalApiException.class, service::getAccessToken);
        assertTrue(ex.getMessage().contains("must be set"), ex.getMessage());
        // No HTTP call was made with the bogus credentials.
        verify(httpClient, never()).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    private String readBody(HttpRequest request) throws Exception {
        java.util.List<java.nio.ByteBuffer> buffers = new java.util.ArrayList<>();
        request.bodyPublisher().orElseThrow().subscribe(new java.util.concurrent.Flow.Subscriber<java.nio.ByteBuffer>() {
            private java.util.concurrent.Flow.Subscription subscription;

            @Override
            public void onSubscribe(java.util.concurrent.Flow.Subscription subscription) {
                this.subscription = subscription;
                subscription.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(java.nio.ByteBuffer item) {
                java.nio.ByteBuffer copy = java.nio.ByteBuffer.allocate(item.remaining());
                copy.put(item);
                copy.flip();
                buffers.add(copy);
            }

            @Override
            public void onError(Throwable throwable) {
            }

            @Override
            public void onComplete() {
            }
        });
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        for (java.nio.ByteBuffer buffer : buffers) {
            out.writeBytes(buffer.array());
        }
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }
}
