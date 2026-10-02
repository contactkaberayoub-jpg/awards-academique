package com.awardsacademique.lessons.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalLessonExceptionHandler {

    @ExceptionHandler(LessonNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleLessonNotFound(LessonNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                Map.of("status", 404, "error", "Not Found", "message", ex.getMessage())
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidLessonRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(
                Map.of("status", 400, "error", "Bad Request", "message", ex.getMessage())
        );
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleVideoTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(
                Map.of("status", 413, "error", "Payload Too Large", "message", "Video file exceeds the maximum allowed size")
        );
    }
}
