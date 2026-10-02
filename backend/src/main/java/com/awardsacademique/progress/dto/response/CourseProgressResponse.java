package com.awardsacademique.progress.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseProgressResponse {

    private UUID courseId;
    private UUID enrollmentId;
    private long totalLessons;
    private long completedLessons;
    /**
     * Total required completion steps for the course. A required step is either an enrolled,
     * non-deleted lesson (1 point) or a lesson having a linked, PUBLISHED mandatory quiz
     * (1 additional point as long as that quiz is required to progress).
     */
    private long totalSteps;
    /**
     * Completed required steps. On top of completed lessons, a linked published quiz counts
     * toward completion only once the student has a passing attempt on it.
     */
    private long completedSteps;
    private BigDecimal completionPercentage;
    /**
     * True when the course exposes at least one PUBLISHED course-level final quiz
     * (lesson_id IS NULL). In that case the 70/30 completion model applies:
     * lesson steps count for 70% and passing the final exam adds the last 30%.
     */
    private boolean finalQuizConfigured;
    /**
     * True when every PUBLISHED course-level final quiz of the course has at least one
     * passing attempt. A final exam that is configured but not yet passed caps a fully
     * completed course at 70% and withholds completion.
     */
    private boolean finalQuizPassed;
    /**
     * Id of the (single) published course-level final quiz, used to launch the final exam
     * from the student learning space. Null when no final quiz is configured.
     */
    private UUID finalQuizId;
}
