package com.awardsacademique.questions.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Payload for creating a question with its answer options.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuestionRequest {

    @NotBlank(message = "Question statement is required")
    private String statement;

    private String explanation;

    private Integer displayOrder;

    @Valid
    @NotEmpty(message = "At least two answer options are required")
    private List<QuestionOptionRequest> options;
}
