package com.awardsacademique.ai.service.impl;

import com.awardsacademique.ai.Repository.AiConversationRepository;
import com.awardsacademique.ai.dto.request.CreateAiConversationRequest;
import com.awardsacademique.ai.dto.request.UpdateAiConversationRequest;
import com.awardsacademique.ai.dto.response.AiConversationResponse;
import com.awardsacademique.ai.mapper.AiConversationMapper;
import com.awardsacademique.ai.service.interfaces.AiConversationService;
import com.awardsacademique.ai.validation.AiConversationValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiConversationServiceImpl implements AiConversationService {

    private final AiConversationRepository aiConversationRepository;
    private final AiConversationMapper aiConversationMapper;
    private final AiConversationValidator aiConversationValidator;

    @Override
    public AiConversationResponse create(CreateAiConversationRequest request) {
        throw new UnsupportedOperationException("AI module not yet implemented");
    }

    @Override
    public AiConversationResponse update(UUID id, UpdateAiConversationRequest request) {
        throw new UnsupportedOperationException("AI module not yet implemented");
    }

    @Override
    public AiConversationResponse getById(UUID id) {
        throw new UnsupportedOperationException("AI module not yet implemented");
    }

    @Override
    public List<AiConversationResponse> getMine() {
        throw new UnsupportedOperationException("AI module not yet implemented");
    }

    @Override
    public void delete(UUID id) {
        throw new UnsupportedOperationException("AI module not yet implemented");
    }
}
