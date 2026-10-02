package com.awardsacademique.quizattempts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * A quiz answer option exposed to students. Unlike the instructor DTO ({@code QuestionOptionResponse})
 * this payload intentionally omits {@code isCorrect} so students cannot see the answer key before
 * submitting.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentOptionResponse {

    private UUID id;
    private String optionText;
    private int displayOrder;
}
