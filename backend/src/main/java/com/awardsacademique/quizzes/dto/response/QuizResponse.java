package com.awardsacademique.quizzes.dto.response;

import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response payload for quiz data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizResponse {

    private UUID id;
    private UUID courseId;
    private String courseTitle;
    private UUID lessonId;
    private String lessonTitle;
    private String title;
    private QuizStatusEnum status;
    private Integer passingScore;
    private Integer maxAttempts;
    private long questionCount;
    private OffsetDateTime createdAt;
}
