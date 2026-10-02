package com.awardsacademique.ai.mapper;

import com.awardsacademique.ai.dto.response.AiConversationResponse;
import com.awardsacademique.ai.entity.AiConversation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AiConversationMapper {

    @Mapping(target = "messageCount", ignore = true)
    @Mapping(target = "lastMessagePreview", ignore = true)
    @Mapping(target = "recentMessages", ignore = true)
    AiConversationResponse toResponse(AiConversation conversation);
}
