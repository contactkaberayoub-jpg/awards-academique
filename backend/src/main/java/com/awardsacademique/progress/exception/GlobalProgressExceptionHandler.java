package com.awardsacademique.progress.exception;

import com.awardsacademique.lessons.exception.LessonNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Scoped exception handler for the Progress module. Intercepts exceptions thrown
 * by com.awardsacademique.progress controllers/services before any global handler.
 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackages = "com.awardsacademique.progress")
public class GlobalProgressExceptionHandler {

    @ExceptionHandler(LessonProgressNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleLessonProgressNotFound(
            LessonProgressNotFoundException ex) {
        log.warn("Lesson progress not found: {}", ex.getMessage());
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(LessonNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleLessonNotFound(LessonNotFoundException ex) {
        log.warn("Lesson not found (progress context): {}", ex.getMessage());
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(com.awardsacademique.enrollments.exception.EnrollmentNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEnrollmentNotFound(
            com.awardsacademique.enrollments.exception.EnrollmentNotFoundException ex) {
        log.warn("Enrollment not found (progress context): {}", ex.getMessage());
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Invalid progress request: {}", ex.getMessage());
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied on progress: {}", ex.getMessage());
        return buildError(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Validation failed");
        log.warn("Progress validation failed: {}", message);
        return buildError(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Progress data integrity violation: {}", ex.getMessage());
        String msg = ex.getMessage() != null && ex.getMessage().contains("uk_lesson_progress_enrollment_lesson")
                ? "Progress for this (enrollment, lesson) already exists"
                : "Data integrity violation on progress operation";
        return buildError(HttpStatus.CONFLICT, msg);
    }

    private ResponseEntity<Map<String, Object>> buildError(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", OffsetDateTime.now());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
