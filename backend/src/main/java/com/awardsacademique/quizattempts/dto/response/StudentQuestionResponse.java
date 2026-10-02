package com.awardsacademique.quizattempts.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

/**
 * A question exposed to a student taking a quiz. Options carry no correctness information.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentQuestionResponse {

    private UUID id;
    private String statement;
    private int displayOrder;
    private List<StudentOptionResponse> options;
}
