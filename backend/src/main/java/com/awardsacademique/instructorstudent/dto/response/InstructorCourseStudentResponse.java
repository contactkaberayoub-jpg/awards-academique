package com.awardsacademique.instructorstudent.dto.response;

import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One student row inside the instructor course students list. Every value comes from the
 * database (enrollment, progress pipeline, quiz attempts, certificates) — nothing is invented.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstructorCourseStudentResponse {

    private UUID enrollmentId;
    private UUID userId;
    private String studentName;
    private String studentEmail;

    private EnrollmentStatusEnum enrollmentStatus;
    private BigDecimal completionPercentage;
    private OffsetDateTime enrolledAt;
    private OffsetDateTime completedAt;

    /** Course-level final quiz attempt summary for this student (null when no quiz row exists). */
    private FinalQuizProgressResponse finalQuiz;

    /** Certificate issued for this course/student, if any. */
    private StudentCertificateResponse certificate;
}