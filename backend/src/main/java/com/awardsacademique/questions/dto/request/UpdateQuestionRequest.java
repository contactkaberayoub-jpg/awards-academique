package com.awardsacademique.questions.dto.request;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Payload for updating a question and its answer options.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateQuestionRequest {

    private String statement;

    private String explanation;

    private Integer displayOrder;

    @Valid
    private List<QuestionOptionRequest> options;
}
