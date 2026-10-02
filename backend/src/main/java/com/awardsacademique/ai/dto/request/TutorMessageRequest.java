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
public class TutorMessageRequest {

    @NotBlank(message = "Message role is required")
    @Size(max = 10, message = "Message role is invalid")
    private String role;

    @NotBlank(message = "Message content is required")
    @Size(max = 2000, message = "History message must be at most 2000 characters")
    private String content;
}