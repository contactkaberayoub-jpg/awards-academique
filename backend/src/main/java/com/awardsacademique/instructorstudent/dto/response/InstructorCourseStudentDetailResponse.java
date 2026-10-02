package com.awardsacademique.instructorstudent.dto.response;

import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Full student detail for one (course, student) pair: enrollment, per-lesson progress state,
 * final exam state, certificate and the student's other enrollments on the same instructor's
 * courses.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstructorCourseStudentDetailResponse {

    private UUID userId;
    private String studentName;
    private String studentEmail;

    private UUID courseId;
    private String courseTitle;
    private UUID enrollmentId;
    private EnrollmentStatusEnum enrollmentStatus;
    private BigDecimal completionPercentage;
    private OffsetDateTime enrolledAt;
    private OffsetDateTime completedAt;

    /** Final exam configuration + the student's real result on it. */
    private StudentFinalQuizResponse finalQuiz;

    private StudentCertificateResponse certificate;

    /** Ordered lessons of the course with the student's real progress/lock state. */
    private List<StudentLessonProgressResponse> lessons;

    /** Other courses of this same instructor in which this student is enrolled. */
    private List<InstructorStudentCourseResponse> otherCourses;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentFinalQuizResponse {
        private UUID id;
        private String title;
        private Integer passingScore;
        private Integer maxAttempts;
        private QuizStatusEnum status;
        private boolean attempted;
        private boolean passed;
        private BigDecimal score;
        private long attemptsUsed;
    }
}