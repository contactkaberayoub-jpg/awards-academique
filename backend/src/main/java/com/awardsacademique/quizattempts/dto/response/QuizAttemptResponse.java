package com.awardsacademique.quizattempts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptResponse {

    private UUID id;
    private UUID userId;
    private UUID quizId;
    private String quizTitle;
    private UUID courseId;
    private UUID lessonId;
    private BigDecimal score;
    private Integer passingScore;
    private Integer attemptsUsed;
    private Integer maxAttempts;
    private Boolean passed;
    private String status;
    private Map<String, Object> answers;
    private OffsetDateTime startedAt;
    private OffsetDateTime submittedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
