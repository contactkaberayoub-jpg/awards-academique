package com.awardsacademique.instructorstudent.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Per-lesson progress state for a student in the course detail view. Lock state follows the
 * sequential progression model (all preceding lesson steps satisfied).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentLessonProgressResponse {

    private UUID lessonId;
    private String title;
    private Integer displayOrder;
    private boolean completed;
    private boolean locked;
}