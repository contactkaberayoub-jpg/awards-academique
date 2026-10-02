package com.awardsacademique.questions.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Payload for a single answer option of a question.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionOptionRequest {

    @NotBlank(message = "Option text is required")
    private String optionText;

    private Boolean isCorrect;

    private Integer displayOrder;
}
