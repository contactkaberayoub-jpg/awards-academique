package com.awardsacademique.quizzes.controller;

import com.awardsacademique.quizzes.dto.request.CreateQuizRequest;
import com.awardsacademique.quizzes.dto.request.UpdateQuizRequest;
import com.awardsacademique.quizzes.dto.response.QuizResponse;
import com.awardsacademique.quizzes.service.interfaces.QuizService;
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
@RequestMapping("/api/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";

    private final QuizService quizService;

    @PostMapping
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<QuizResponse> create(@Valid @RequestBody CreateQuizRequest request) {
        QuizResponse created = quizService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping(UUID_ID)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<QuizResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.getById(id));
    }

    @GetMapping("/course" + UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<List<QuizResponse>> getByCourse(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.getByCourse(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<List<QuizResponse>> getAll() {
        return ResponseEntity.ok(quizService.getAll());
    }

    @PutMapping(UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<QuizResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateQuizRequest request
    ) {
        return ResponseEntity.ok(quizService.update(id, request));
    }

    @PostMapping(UUID_ID + "/publish")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<QuizResponse> publish(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.publish(id));
    }

    @PostMapping(UUID_ID + "/archive")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<QuizResponse> archive(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.archive(id));
    }

    @DeleteMapping(UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        quizService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
