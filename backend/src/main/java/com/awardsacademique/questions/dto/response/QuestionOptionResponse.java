package com.awardsacademique.questions.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Response payload for a single answer option.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionOptionResponse {

    private UUID id;
    private String optionText;
    @Getter(onMethod_ = @JsonProperty("isCorrect"))
    private boolean isCorrect;
    private int displayOrder;
}
