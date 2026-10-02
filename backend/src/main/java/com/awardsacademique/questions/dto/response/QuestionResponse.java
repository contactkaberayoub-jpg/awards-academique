package com.awardsacademique.questions.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

/**
 * Response payload for question data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponse {

    private UUID id;
    private UUID quizId;
    private String statement;
    private String explanation;
    private int displayOrder;
    private List<QuestionOptionResponse> options;
}
