package com.awardsacademique.instructorstudent.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A course of the same instructor in which the student is enrolled ("Courses de cet instructeur").
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstructorStudentCourseResponse {

    private UUID courseId;
    private String courseTitle;
    private String enrollmentStatus;
    private BigDecimal completionPercentage;
    private OffsetDateTime completedAt;
    private StudentCertificateResponse certificate;
}