package com.awardsacademique.quizattempts.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateQuizAttemptRequest {

    @NotNull(message = "Answers payload is required")
    private Map<String, Object> answers;
}
