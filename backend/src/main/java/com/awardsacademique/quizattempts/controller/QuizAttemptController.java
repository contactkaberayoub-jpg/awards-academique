package com.awardsacademique.quizattempts.controller;

import com.awardsacademique.quizattempts.dto.request.CreateQuizAttemptRequest;
import com.awardsacademique.quizattempts.dto.request.UpdateQuizAttemptRequest;
import com.awardsacademique.quizattempts.dto.response.QuizAttemptResponse;
import com.awardsacademique.quizattempts.dto.response.StudentQuizContentResponse;
import com.awardsacademique.quizattempts.service.interfaces.QuizAttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/quiz-attempts")
@RequiredArgsConstructor
public class QuizAttemptController {

    private final QuizAttemptService quizAttemptService;

    @PostMapping
    @PreAuthorize("hasAnyRole('student','administrator')")
    public ResponseEntity<QuizAttemptResponse> start(
            @Valid @RequestBody CreateQuizAttemptRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(quizAttemptService.start(request));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('student','administrator')")
    public ResponseEntity<QuizAttemptResponse> submit(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateQuizAttemptRequest request) {
        return ResponseEntity.ok(quizAttemptService.submit(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<QuizAttemptResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(quizAttemptService.getById(id));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<QuizAttemptResponse>> getMyHistory() {
        return ResponseEntity.ok(quizAttemptService.getMyHistory());
    }

    @GetMapping("/me/quizzes/{quizId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<QuizAttemptResponse>> getMyHistoryByQuiz(
            @PathVariable UUID quizId) {
        return ResponseEntity.ok(quizAttemptService.getMyHistoryByQuiz(quizId));
    }

    @GetMapping("/quizzes/{quizId}")
    @PreAuthorize("hasAnyRole('instructor','administrator')")
    public ResponseEntity<List<QuizAttemptResponse>> getHistoryByQuiz(
            @PathVariable UUID quizId) {
        return ResponseEntity.ok(quizAttemptService.getHistoryByQuiz(quizId));
    }

    @GetMapping("/me/quizzes/{quizId}/best")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<QuizAttemptResponse> getBestForQuiz(@PathVariable UUID quizId) {
        return ResponseEntity.ok(quizAttemptService.getBestForQuiz(quizId));
    }

    @GetMapping("/quizzes/{quizId}/content")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StudentQuizContentResponse> getQuizContent(@PathVariable UUID quizId) {
        return ResponseEntity.ok(quizAttemptService.getStudentQuizContent(quizId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        quizAttemptService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
