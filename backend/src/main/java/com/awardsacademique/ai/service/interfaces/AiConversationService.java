package com.awardsacademique.ai.service.interfaces;

import com.awardsacademique.ai.dto.request.CreateAiConversationRequest;
import com.awardsacademique.ai.dto.request.UpdateAiConversationRequest;
import com.awardsacademique.ai.dto.response.AiConversationResponse;

import java.util.List;
import java.util.UUID;

public interface AiConversationService {

    AiConversationResponse create(CreateAiConversationRequest request);

    AiConversationResponse update(UUID id, UpdateAiConversationRequest request);

    AiConversationResponse getById(UUID id);

    List<AiConversationResponse> getMine();

    void delete(UUID id);
}
