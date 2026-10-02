package com.awardsacademique.instructorstudent.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Per-student result on the course-level final exam.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalQuizProgressResponse {

    private boolean attempted;
    private boolean passed;
    private BigDecimal score;
    private long attemptsUsed;
}