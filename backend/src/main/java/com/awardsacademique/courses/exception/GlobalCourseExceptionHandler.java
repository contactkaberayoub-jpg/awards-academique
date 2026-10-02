package com.awardsacademique.courses.exception;

import com.awardsacademique.authentification.exception.DuplicateEmailException;
import com.awardsacademique.authentification.exception.PasswordResetException;
import com.awardsacademique.authentification.exception.UserNotFoundException;
import com.awardsacademique.authentification.service.impl.GoogleOAuthServiceImpl.GoogleOAuthNotConfiguredException;
import com.awardsacademique.categories.exception.CategoryNotFoundException;
import com.awardsacademique.categories.exception.DuplicateCategoryException;
import com.awardsacademique.certificates.exception.CertificateNotFoundException;
import com.awardsacademique.enrollments.exception.PaymentRequiredException;
import com.awardsacademique.payments.exception.PaymentFailedException;
import com.awardsacademique.payments.paypal.exception.PayPalApiException;
import com.awardsacademique.orders.exception.OrderNotFoundException;
import com.awardsacademique.reviews.exception.ReviewNotFoundException;
import com.awardsacademique.sections.exception.SectionNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@RestControllerAdvice
public class GlobalCourseExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> isAssertionError(e) ? e.getDefaultMessage() : e.getField() + ": " + e.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        return ResponseEntity.badRequest().body(Map.of("status", 400, "error", "Validation", "message", message));
    }

    private static boolean isAssertionError(FieldError fieldError) {
        String[] codes = fieldError.getCodes();
        if (codes == null) {
            return false;
        }
        for (String code : codes) {
            if (code.startsWith("AssertTrue") || code.startsWith("AssertFalse")) {
                return true;
            }
        }
        return false;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("status", 400, "error", "Bad Request", "message", ex.getMessage()));
    }

    @ExceptionHandler(CourseNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleCourseNotFound(CourseNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "error", "Not Found", "message", ex.getMessage()));
    }

    @ExceptionHandler(CategoryNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleCategoryNotFound(CategoryNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "error", "Not Found", "message", ex.getMessage()));
    }

    @ExceptionHandler(DuplicateCategoryException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateCategory(DuplicateCategoryException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("status", 409, "error", "Conflict", "message", ex.getMessage()));
    }

    @ExceptionHandler(DuplicateCourseException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateCourse(DuplicateCourseException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("status", 409, "error", "Conflict", "message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("status", 409, "error", "Conflict", "message", ex.getMessage()));
    }

    @ExceptionHandler(PaymentRequiredException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentRequired(PaymentRequiredException ex) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                .body(Map.of("status", 402, "error", "Payment Required", "message", ex.getMessage()));
    }

    @ExceptionHandler(PaymentFailedException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentFailed(PaymentFailedException ex) {
        HttpStatus status = switch (ex.getPaymentResult()) {
            case INVALID_CARD, CARD_EXPIRED -> HttpStatus.BAD_REQUEST;
            case INSUFFICIENT_FUNDS -> HttpStatus.PAYMENT_REQUIRED;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "error", ex.getPaymentResult().name(),
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(PayPalApiException.class)
    public ResponseEntity<Map<String, Object>> handlePayPalApi(PayPalApiException ex) {
        // Surface the real PayPal cause (e.g. OAuth 401, create-order failure) rather than letting
        // the catch-all Exception handler turn it into a generic, opaque 500. No secrets are logged.
        log.error("PayPal API error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "status", HttpStatus.BAD_GATEWAY.value(),
                "error", "Bad Gateway",
                "message", ex.getMessage() != null ? ex.getMessage() : "PayPal API error"
        ));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("status", 401, "error", "Unauthorized", "message", "Invalid email or password"));
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUsernameNotFound(UsernameNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("status", 401, "error", "Unauthorized", "message", "Invalid email or password"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("status", 403, "error", "Forbidden", "message", "You do not have permission to perform this action"));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of("status", 400, "error", "Bad Request", "message", "Malformed request body or invalid value"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(Map.of("status", 400, "error", "Bad Request", "message", "Invalid parameter value: " + ex.getName()));
    }

    @ExceptionHandler(SectionNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleSectionNotFound(SectionNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "error", "Not Found", "message", ex.getMessage()));
    }

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleOrderNotFound(OrderNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "error", "Not Found", "message", ex.getMessage()));
    }

    @ExceptionHandler(ReviewNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleReviewNotFound(ReviewNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "error", "Not Found", "message", ex.getMessage()));
    }

    @ExceptionHandler(CertificateNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleCertificateNotFound(CertificateNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "error", "Not Found", "message", ex.getMessage()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(UserNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "error", "Not Found", "message", ex.getMessage()));
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateEmail(DuplicateEmailException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("status", 409, "error", "Conflict", "message", ex.getMessage()));
    }

    @ExceptionHandler(PasswordResetException.class)
    public ResponseEntity<Map<String, Object>> handlePasswordReset(PasswordResetException ex) {
        return ResponseEntity.badRequest().body(Map.of("status", 400, "error", "Bad Request", "message", ex.getMessage()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "error", "Not Found", "message", "Resource not found"));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMediaType(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(Map.of("status", 415, "error", "Unsupported Media Type", "message", "Content-Type is not supported"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        Throwable root = ex.getMostSpecificCause();
        String sqlState = (root instanceof SQLException) ? ((SQLException) root).getSQLState() : null;
        String message = root != null ? root.getMessage() : ex.getMessage();

        String constraint = extract(message, "constraint \"([^\"]+)\"");
        String table = extract(message, "relation \"([^\"]+)\"");
        if (table == null) {
            table = extract(message, "table \"([^\"]+)\"");
        }
        String column = extract(message, "column \"([^\"]+)\"");

        log.warn("Data integrity violation | SQLState={} | constraint={} | table={} | column={} | detail={}",
                sqlState, constraint, table, column, message);

        String userMessage = resolveConstraintMessage(sqlState, constraint, table, column);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 409);
        body.put("error", "Conflict");
        body.put("message", userMessage);
        body.put("details", Map.of(
                "sqlState", sqlState != null ? sqlState : "unknown",
                "constraint", constraint != null ? constraint : "unknown",
                "table", table != null ? table : "unknown",
                "column", column != null ? column : "unknown"
        ));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    private static String extract(String message, String regex) {
        if (message == null) {
            return null;
        }
        Matcher matcher = Pattern.compile(regex).matcher(message);
        return matcher.find() ? matcher.group(1) : null;
    }

    private static String resolveConstraintMessage(String sqlState, String constraint, String table, String column) {
        if (sqlState != null) {
            switch (sqlState) {
                case "23505" -> {
                    if (constraint != null) {
                        return switch (constraint) {
                            case "categories_name_key" -> "A category with this name already exists.";
                            case "categories_slug_key" -> "A category with this slug already exists.";
                            case "users_email_key" -> "An account with this email already exists.";
                            case "roles_name_key" -> "A role with this name already exists.";
                            default -> "This record already exists.";
                        };
                    }
                    return "This record already exists.";
                }
                case "23503" -> {
                    return "Cannot perform this operation because the record is still referenced by other data.";
                }
                case "23502" -> {
                    if (column != null) {
                        return "The field '" + column + "' is required.";
                    }
                    return "A required field is missing.";
                }
                case "23514" -> {
                    if (constraint != null) {
                        return switch (constraint) {
                            case "chk_courses_free_price" ->
                                    "A free course must have a price of 0. Set the price to 0 or uncheck the free flag.";
                            case "courses_price_check" -> "Course price must be greater than or equal to 0.";
                            case "courses_average_rating_check" -> "Course rating must be between 0 and 5.";
                            case "reviews_rating_check" -> "Rating must be between 1 and 5.";
                            case "chk_lessons_status" -> "Invalid lesson status.";
                            case "chk_users_email_format" -> "The email format is invalid.";
                            default -> "The value does not satisfy the constraint '" + constraint + "'.";
                        };
                    }
                    return "The value is not valid for this operation.";
                }
                default -> {
                }
            }
        }
        if (constraint != null) {
            return "Data conflict detected (constraint '" + constraint + "'"
                    + (table != null ? " on '" + table + "'" : "") + ").";
        }
        return "Data conflict detected.";
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("error", "ResponseStatusException");
        body.put("message", ex.getReason() != null ? ex.getReason() : "Request failed");
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    @ExceptionHandler(GoogleOAuthNotConfiguredException.class)
    public ResponseEntity<Map<String, Object>> handleGoogleOAuthNotConfigured(GoogleOAuthNotConfiguredException ex) {
        log.warn("Google OAuth is not configured: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are missing or blank");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        body.put("error", "GoogleOAuthNotConfigured");
        body.put("message", "La connexion avec Google est temporairement indisponible. Veuillez réessayer plus tard.");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception ex) {
        //#region debug-point global-handler-fallback
        String simpleName = ex.getClass().getSimpleName();
        String stack = java.util.Arrays.stream(ex.getStackTrace())
                .limit(12)
                .map(StackTraceElement::toString)
                .reduce((a, b) -> a + "\n  at " + b)
                .orElse("");
        log.error("[DEBUG request-failed-500] GlobalCourseExceptionHandler fallback Exception -> 500 matched unhandled {} message={}\n  at: {}",
                simpleName, ex.getMessage(), stack);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 500);
        body.put("error", simpleName);
        body.put("message", ex.getMessage() != null ? ex.getMessage() : "Unknown error");
        body.put("__debug_ex_class", ex.getClass().getName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        //#endregion
    }
}
