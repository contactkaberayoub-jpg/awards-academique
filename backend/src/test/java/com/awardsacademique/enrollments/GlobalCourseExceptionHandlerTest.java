package com.awardsacademique.enrollments;

import com.awardsacademique.courses.exception.GlobalCourseExceptionHandler;
import com.awardsacademique.enrollments.exception.PaymentRequiredException;
import com.awardsacademique.payments.paypal.exception.PayPalApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Unit tests for the HTTP mapping of the Sprint 1 enrollment business rule.
 *
 * <p>Verifies that {@link PaymentRequiredException} (thrown by the enrollment flow when a
 * student tries to self-enroll in a paid course) is mapped to HTTP 402 Payment Required with a
 * structured body, and that the pre-existing rules still map to the expected status codes.
 */
class GlobalCourseExceptionHandlerTest {

    private final GlobalCourseExceptionHandler handler = new GlobalCourseExceptionHandler();

    @Test
    void handlePaymentRequired_mapsTo402WithStructuredBody() {
        PaymentRequiredException ex = new PaymentRequiredException(
                "Payment required: this course is not free. Please purchase it before enrolling.");

        ResponseEntity<Map<String, Object>> response = handler.handlePaymentRequired(ex);

        assertEquals(HttpStatus.PAYMENT_REQUIRED, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertEquals(402, body.get("status"));
        assertEquals("Payment Required", body.get("error"));
        assertEquals(ex.getMessage(), body.get("message"));
    }

    @Test
    void handleIllegalArgument_mapsTo400() {
        IllegalArgumentException ex = new IllegalArgumentException("You can only enroll in published courses");

        ResponseEntity<Map<String, Object>> response = handler.handleIllegalArgument(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, response.getBody().get("status"));
    }

    @Test
    void handleIllegalState_mapsTo409() {
        IllegalStateException ex = new IllegalStateException("You are already enrolled in this course");

        ResponseEntity<Map<String, Object>> response = handler.handleIllegalState(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(409, response.getBody().get("status"));
    }

    @Test
    void handlePayPalApi_mapsTo502WithRealMessage() {
        // The PayPal exception must surface as 502 (not the catch-all's generic 500) with the real
        // message, so the root cause (e.g. OAuth 401 from missing credentials) is visible to the client.
        PayPalApiException ex = new PayPalApiException("Failed to obtain PayPal access token: HTTP 401");

        ResponseEntity<Map<String, Object>> response = handler.handlePayPalApi(ex);

        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertEquals(502, body.get("status"));
        assertEquals("Bad Gateway", body.get("error"));
        assertEquals(ex.getMessage(), body.get("message"));
    }
}
