package com.awardsacademique.quizattempts.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuizAttemptRequest {

    @NotNull(message = "Quiz ID is required")
    private UUID quizId;

    private Map<String, Object> answers;
}
