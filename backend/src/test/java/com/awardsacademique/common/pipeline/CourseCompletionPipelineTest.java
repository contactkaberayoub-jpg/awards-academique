package com.awardsacademique.common.pipeline;

import com.awardsacademique.certificates.service.interfaces.CertificateService;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.progress.Repository.LessonProgressRepository;
import com.awardsacademique.progress.dto.response.CourseProgressResponse;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Sprint: Lesson -> Quiz mandatory progression. Verifies the steps-based completion percentage
 * (a linked published quiz is only "done" once passed) and the completion/certificate gate.
 */
@ExtendWith(MockitoExtension.class)
class CourseCompletionPipelineTest {

    @Mock private LessonProgressRepository lessonProgressRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private CertificateService certificateService;
    @Mock private ProgressionService progressionService;

    private CourseCompletionPipeline pipeline;

    private UUID courseId;
    private UUID userId;
    private Course course;
    private User user;
    private Enrollment enrollment;

    @BeforeEach
    void setUp() {
        pipeline = new CourseCompletionPipeline(
                lessonProgressRepository, enrollmentRepository, quizRepository,
                quizAttemptRepository, certificateService, progressionService);
        courseId = UUID.randomUUID();
        userId = UUID.randomUUID();
        course = Course.builder().id(courseId).build();
        user = User.builder().id(userId).build();
    }

    private Enrollment enrollment(EnrollmentStatusEnum status) {
        return Enrollment.builder()
                .id(UUID.randomUUID())
                .course(course)
                .user(user)
                .status(status)
                .build();
    }

    // Case 9: 8 required steps (5 lessons + 3 linked published quizzes). Lesson 1 done but its
    // quiz not passed -> 1 completed step -> percentage = 1/8 = 12.50%.
    @Test
    void buildCourseProgress_stepsBasedPercentage_whenQuizNotPassed() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(5L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(8L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);

        CourseProgressResponse result = pipeline.buildCourseProgress(enrollment);

        assertEquals(8, result.getTotalSteps());
        assertEquals(1, result.getCompletedSteps());
        assertEquals(0, new BigDecimal("12.50").compareTo(result.getCompletionPercentage()));
    }

    // A lesson completed AND its linked published quiz passed advance the percentage: 2/8.
    @Test
    void buildCourseProgress_lessonAndQuizPassed_advancesSteps() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(5L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(8L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(2L);

        CourseProgressResponse result = pipeline.buildCourseProgress(enrollment);

        assertEquals(2, result.getCompletedSteps());
        assertEquals(0, new BigDecimal("25.00").compareTo(result.getCompletionPercentage()));
    }

    // When every step is satisfied (all lessons + all published quizzes passed) the enrollment is
    // marked completed and a certificate is issued.
    @Test
    void recompute_allStepsSatisfied_marksCompletedAndIssuesCertificate() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                .thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(1L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(2L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(2L);

        Quiz published = Quiz.builder()
                .id(UUID.randomUUID())
                .course(course)
                .status(QuizStatusEnum.published)
                .build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId))
                .thenReturn(List.of(published));
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, published.getId()))
                .thenReturn(true);

        pipeline.recomputeForUserAndCourse(userId, courseId);

        assertEquals(EnrollmentStatusEnum.completed, enrollment.getStatus());
        assertNotNull(enrollment.getCompletedAt());
        verify(certificateService).issueForCompletion(eq(userId), eq(courseId));
    }

    // A linked published quiz that is NOT passed prevents completion (percentage < 100).
    @Test
    void recompute_quizNotPassed_doesNotComplete() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                .thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(1L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(2L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);

        Quiz published = Quiz.builder()
                .id(UUID.randomUUID())
                .course(course)
                .status(QuizStatusEnum.published)
                .build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId))
                .thenReturn(List.of(published));
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, published.getId()))
                .thenReturn(false);

        pipeline.recomputeForUserAndCourse(userId, courseId);

        assertEquals(EnrollmentStatusEnum.active, enrollment.getStatus());
    }

    // All lesson/step work done, but a PUBLISHED COURSE-LEVEL quiz (lesson_id = null) has no
    // passed attempt -> formal completion + certificate MUST be withheld (mirrors DB trigger
    // gate in V19). This is the exact production bug the DB trigger used to violate.
    @Test
    void recompute_courseLevelPublishedQuizNotPassed_doesNotComplete() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                .thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(1L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(1L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);

        // Course-level quiz: no lesson association (lesson_id = null).
        Quiz courseLevelPublished = Quiz.builder()
                .id(UUID.randomUUID())
                .course(course)
                .status(QuizStatusEnum.published)
                .build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId))
                .thenReturn(List.of(courseLevelPublished));
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, courseLevelPublished.getId()))
                .thenReturn(false);

        pipeline.recomputeForUserAndCourse(userId, courseId);

        assertEquals(EnrollmentStatusEnum.active, enrollment.getStatus());
        verify(certificateService, org.mockito.Mockito.never())
                .issueForCompletion(eq(userId), eq(courseId));
    }

    // Same as above but the course-level quiz now HAS a passed attempt -> completion + cert.
    @Test
    void recompute_courseLevelQuizPassed_completes() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                .thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(1L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(1L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);

        Quiz courseLevelPublished = Quiz.builder()
                .id(UUID.randomUUID())
                .course(course)
                .status(QuizStatusEnum.published)
                .build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId))
                .thenReturn(List.of(courseLevelPublished));
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, courseLevelPublished.getId()))
                .thenReturn(true);

        pipeline.recomputeForUserAndCourse(userId, courseId);

        assertEquals(EnrollmentStatusEnum.completed, enrollment.getStatus());
        verify(certificateService).issueForCompletion(eq(userId), eq(courseId));
    }

    // Multiple published quizzes: one still unpassed -> no completion; this mirrors the mixed
    // "2 passed / 1 not passed" TEST 5 scenario at the Java-truth (source-of-truth) level.
    @Test
    void recompute_multiplePublishedQuizzesOneUnpassed_doesNotComplete() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                .thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(1L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(1L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);

        Quiz q1 = Quiz.builder().id(UUID.randomUUID()).course(course).status(QuizStatusEnum.published).build();
        Quiz q2 = Quiz.builder().id(UUID.randomUUID()).course(course).status(QuizStatusEnum.published).build();
        Quiz q3 = Quiz.builder().id(UUID.randomUUID()).course(course).status(QuizStatusEnum.published).build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId)).thenReturn(List.of(q1, q2, q3));
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, q1.getId())).thenReturn(true);
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, q2.getId())).thenReturn(true);
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, q3.getId())).thenReturn(false);

        pipeline.recomputeForUserAndCourse(userId, courseId);

        assertEquals(EnrollmentStatusEnum.active, enrollment.getStatus());
        verify(certificateService, org.mockito.Mockito.never())
                .issueForCompletion(eq(userId), eq(courseId));
    }

    // ==== 70/30 final-exam model ====

    // All lesson steps done + published course-level final quiz passed -> 70% + 30% = 100%.
    @Test
    void buildCourseProgress_finalQuizPassed_reaches100() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(1L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(1L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);

        Quiz finalQuiz = Quiz.builder().id(UUID.randomUUID()).course(course).status(QuizStatusEnum.published).build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId)).thenReturn(List.of(finalQuiz));
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, finalQuiz.getId())).thenReturn(true);

        CourseProgressResponse result = pipeline.buildCourseProgress(enrollment);

        assertTrue(result.isFinalQuizConfigured());
        assertTrue(result.isFinalQuizPassed());
        assertEquals(finalQuiz.getId(), result.getFinalQuizId());
        assertEquals(0, new BigDecimal("100.00").compareTo(result.getCompletionPercentage()));
    }

    // Lessons are fully complete but the published course-level final quiz is NOT passed:
    // completion stays at 70% and the certificate MUST NOT be issued.
    @Test
    void recompute_finalQuizNotPassed_capsAt70AndDoesNotComplete() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                .thenReturn(Optional.of(enrollment));
        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(1L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(1L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);

        Quiz finalQuiz = Quiz.builder().id(UUID.randomUUID()).course(course).status(QuizStatusEnum.published).build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId)).thenReturn(List.of(finalQuiz));
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, finalQuiz.getId())).thenReturn(false);

        pipeline.recomputeForUserAndCourse(userId, courseId);

        assertEquals(0, new BigDecimal("70.00").compareTo(enrollment.getCompletionPercentage()));
        assertEquals(EnrollmentStatusEnum.active, enrollment.getStatus());
        verify(certificateService, org.mockito.Mockito.never())
                .issueForCompletion(eq(userId), eq(courseId));
    }

    // Partial lesson steps are weighted by 0.7; a passed final exam still adds the 30%.
    @Test
    void buildCourseProgress_partialLessonSteps_weighted70Percent() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(2L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(2L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);

        Quiz finalQuiz = Quiz.builder().id(UUID.randomUUID()).course(course).status(QuizStatusEnum.published).build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId)).thenReturn(List.of(finalQuiz));
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, finalQuiz.getId())).thenReturn(true);

        CourseProgressResponse result = pipeline.buildCourseProgress(enrollment);

        // 50% lesson steps * 0.7 = 35, + 30 for the passed final exam = 65%.
        assertEquals(0, new BigDecimal("65.00").compareTo(result.getCompletionPercentage()));
        assertTrue(result.isFinalQuizConfigured());
        assertTrue(result.isFinalQuizPassed());
    }

    // Courses without any course-level final quiz keep the legacy steps-based percentage,
    // so existing published courses stay finishable at 100%.
    @Test
    void buildCourseProgress_noFinalQuiz_legacyStepsPercentage() {
        enrollment = enrollment(EnrollmentStatusEnum.active);
        UUID eid = enrollment.getId();

        when(lessonProgressRepository.countCompletedByEnrollmentId(eid)).thenReturn(1L);
        when(lessonProgressRepository.countTotalLessonsByEnrollmentId(eid)).thenReturn(1L);
        when(progressionService.totalStepsOfCourse(courseId)).thenReturn(1L);
        when(progressionService.completedStepsForUser(userId, courseId)).thenReturn(1L);
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId)).thenReturn(List.of());

        CourseProgressResponse result = pipeline.buildCourseProgress(enrollment);

        assertEquals(0, new BigDecimal("100.00").compareTo(result.getCompletionPercentage()));
        assertFalse(result.isFinalQuizConfigured());
        assertFalse(result.isFinalQuizPassed());
        assertNull(result.getFinalQuizId());
    }
}
