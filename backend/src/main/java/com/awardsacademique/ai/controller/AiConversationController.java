package com.awardsacademique.ai.controller;

import com.awardsacademique.ai.dto.request.CreateAiConversationRequest;
import com.awardsacademique.ai.dto.request.UpdateAiConversationRequest;
import com.awardsacademique.ai.dto.response.AiConversationResponse;
import com.awardsacademique.ai.service.interfaces.AiConversationService;
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
@RequestMapping("/api/ai/conversations")
@RequiredArgsConstructor
public class AiConversationController {

    private final AiConversationService aiConversationService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiConversationResponse> create(@Valid @RequestBody CreateAiConversationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(aiConversationService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiConversationResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAiConversationRequest request
    ) {
        return ResponseEntity.ok(aiConversationService.update(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiConversationResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(aiConversationService.getById(id));
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AiConversationResponse>> getMine() {
        return ResponseEntity.ok(aiConversationService.getMine());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        aiConversationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
