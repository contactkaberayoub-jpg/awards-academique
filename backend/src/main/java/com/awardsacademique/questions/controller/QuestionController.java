package com.awardsacademique.questions.controller;

import com.awardsacademique.questions.dto.request.CreateQuestionRequest;
import com.awardsacademique.questions.dto.request.UpdateQuestionRequest;
import com.awardsacademique.questions.dto.response.QuestionResponse;
import com.awardsacademique.questions.service.interfaces.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";
    private static final String UUID_QUIZ_ID = "/quiz/{quizId:[0-9a-fA-F\\-]{36}}";

    private final QuestionService questionService;

    @PostMapping(UUID_QUIZ_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<QuestionResponse> create(
            @PathVariable UUID quizId,
            @Valid @RequestBody CreateQuestionRequest request
    ) {
        QuestionResponse created = questionService.create(quizId, request);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/questions/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping(UUID_QUIZ_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<List<QuestionResponse>> getByQuiz(@PathVariable UUID quizId) {
        return ResponseEntity.ok(questionService.getByQuiz(quizId));
    }

    @PutMapping(UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<QuestionResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateQuestionRequest request
    ) {
        return ResponseEntity.ok(questionService.update(id, request));
    }

    @DeleteMapping(UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        questionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
