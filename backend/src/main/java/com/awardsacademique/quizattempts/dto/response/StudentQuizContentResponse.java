package com.awardsacademique.quizattempts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

/**
 * Full quiz content for a student taking a quiz, including questions/options without the answer
 * key, plus attempt policy (passing score / max attempts) used to render the quiz UI.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentQuizContentResponse {

    private UUID quizId;
    private String quizTitle;
    private UUID courseId;
    private UUID lessonId;
    private Integer passingScore;
    private Integer maxAttempts;
    private List<StudentQuestionResponse> questions;
}
