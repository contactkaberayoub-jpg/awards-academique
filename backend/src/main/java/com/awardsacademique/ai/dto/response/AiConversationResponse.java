package com.awardsacademique.ai.dto.response;

import com.awardsacademique.ai.entity.MessageSenderEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationResponse {

    private UUID id;
    private UUID userId;
    private String title;
    private Integer messageCount;
    private String lastMessagePreview;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageSummary {
        private UUID id;
        private MessageSenderEnum sender;
        private String preview;
        private Integer tokensUsed;
        private LocalDateTime createdAt;
    }

    private List<MessageSummary> recentMessages;
}
