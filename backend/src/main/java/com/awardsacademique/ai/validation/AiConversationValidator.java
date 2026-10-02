package com.awardsacademique.ai.validation;

import com.awardsacademique.ai.Repository.AiConversationRepository;
import com.awardsacademique.ai.dto.request.CreateAiConversationRequest;
import com.awardsacademique.ai.dto.request.UpdateAiConversationRequest;
import com.awardsacademique.ai.entity.AiConversation;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AiConversationValidator {

    private final AiConversationRepository aiConversationRepository;

    public void validateCreate(CreateAiConversationRequest request) {
        if (request == null || request.getInitialMessage() == null || request.getInitialMessage().isBlank()) {
            throw new IllegalArgumentException("Initial message is required");
        }
    }

    public void validateUpdate(UpdateAiConversationRequest request) {
        // no strict rules yet; title length is enforced by @Size
    }

    public AiConversation resolveConversation(UUID id, UUID ownerUserId) {
        AiConversation conversation = aiConversationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("AI conversation not found: " + id));
        if (ownerUserId != null && !ownerUserId.equals(conversation.getUserId())) {
            throw new IllegalStateException("You do not have access to this conversation");
        }
        return conversation;
    }
}
