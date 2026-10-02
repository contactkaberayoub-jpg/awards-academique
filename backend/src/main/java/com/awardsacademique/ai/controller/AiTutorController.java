package com.awardsacademique.ai.controller;

import com.awardsacademique.ai.dto.request.TutorChatRequest;
import com.awardsacademique.ai.dto.response.TutorChatResponse;
import com.awardsacademique.ai.service.interfaces.AiTutorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/tutor")
@RequiredArgsConstructor
public class AiTutorController {

    private final AiTutorService aiTutorService;

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TutorChatResponse> chat(@Valid @RequestBody TutorChatRequest request) {
        return ResponseEntity.ok(aiTutorService.chat(request));
    }
}