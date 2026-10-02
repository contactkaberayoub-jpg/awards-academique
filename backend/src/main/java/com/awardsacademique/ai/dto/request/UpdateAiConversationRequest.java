package com.awardsacademique.ai.dto.request;

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
public class UpdateAiConversationRequest {

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;
}
