package com.awardsacademique.ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAiConversationRequest {

    @Size(max = 255)
    private String title;

    @NotBlank(message = "First message is required")
    @Size(max = 10000, message = "First message must not exceed 10000 characters")
    private String initialMessage;
}
