package com.awardsacademique.common.pipeline;

import com.awardsacademique.certificates.service.interfaces.CertificateService;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.progress.Repository.LessonProgressRepository;
import com.awardsacademique.progress.dto.response.CourseProgressResponse;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Central pipeline for "student completed something → reflect on Enrollment → if 100% + all
 * quizzes passed → auto-issue certificate".
 *
 * Shared by LessonProgressServiceImpl and QuizAttemptServiceImpl so both mutations stay in sync
 * with the same source of truth (single recompute + persist logic).
 */
@Component
@RequiredArgsConstructor
public class CourseCompletionPipeline {

    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final CertificateService certificateService;
    private final ProgressionService progressionService;

    @Transactional
    public void recomputeForEnrollment(UUID enrollmentId) {
        if (enrollmentId == null) {
            return;
        }
        enrollmentRepository.findById(enrollmentId)
                .ifPresent(this::recomputeAndPersist);
    }

    @Transactional
    public void recomputeForUserAndCourse(UUID userId, UUID courseId) {
        if (userId == null || courseId == null) {
            return;
        }
        enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .ifPresent(this::recomputeAndPersist);
    }

    private void recomputeAndPersist(Enrollment enrollment) {
        if (enrollment == null || enrollment.getCourse() == null || enrollment.getUser() == null) {
            return;
        }
        CourseProgressResponse progress = buildCourseProgress(enrollment);
        BigDecimal pct = progress.getCompletionPercentage() == null
                ? BigDecimal.ZERO
                : progress.getCompletionPercentage();

        enrollment.setCompletionPercentage(pct);
        enrollment.setLastActivityAt(LocalDateTime.now());

        boolean allLessonsDone = progress.getTotalLessons() > 0
                && progress.getCompletedLessons() == progress.getTotalLessons();
        boolean allStepsDone = progress.getTotalSteps() > 0
                && progress.getCompletedSteps() == progress.getTotalSteps();
        boolean allPublishedQuizzesPassed = allPublishedQuizzesPassed(
                enrollment.getUser().getId(), enrollment.getCourse().getId());

        if (allStepsDone
                && allLessonsDone
                && allPublishedQuizzesPassed) {
            enrollment.setStatus(EnrollmentStatusEnum.completed);
            if (enrollment.getCompletedAt() == null) {
                enrollment.setCompletedAt(LocalDateTime.now());
            }
            try {
                certificateService.issueForCompletion(
                        enrollment.getUser().getId(), enrollment.getCourse().getId());
            } catch (RuntimeException ignored) {
                // Never block progress persistence due to a downstream certificate failure.
            }
        }
        enrollmentRepository.save(enrollment);
    }

    /**
     * Single source of truth for course progression. Shared by the recompute pipeline and the
     * read endpoints ({@link LessonProgressServiceImpl}).
     *
     * <p>Step accounting: a linked published quiz counts as an extra required step that is only
     * satisfied once passed (see {@link ProgressionService}). When the course exposes a PUBLISHED
     * course-level final quiz (lesson_id IS NULL) the 70/30 model is applied: the lesson steps
     * build the first 70% and passing the final exam adds the last 30%. Without a final exam the
     * legacy steps-based percentage (0-100%) is kept so existing courses stay finishable.</p>
     */
    public CourseProgressResponse buildCourseProgress(Enrollment enrollment) {
        if (enrollment == null || enrollment.getCourse() == null || enrollment.getUser() == null) {
            return CourseProgressResponse.builder().completionPercentage(BigDecimal.ZERO).build();
        }
        UUID courseId = enrollment.getCourse().getId();
        UUID userId = enrollment.getUser().getId();

        long completed = lessonProgressRepository.countCompletedByEnrollmentId(enrollment.getId());
        long total = lessonProgressRepository.countTotalLessonsByEnrollmentId(enrollment.getId());
        long totalSteps = progressionService.totalStepsOfCourse(courseId);
        long completedSteps = progressionService.completedStepsForUser(userId, courseId);

        BigDecimal lessonStepsPct = BigDecimal.ZERO;
        if (totalSteps > 0) {
            lessonStepsPct = BigDecimal.valueOf(completedSteps)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(totalSteps), 4, RoundingMode.HALF_UP);
        }

        // Published course-level quizzes (lesson_id IS NULL) are the final exams of the course.
        Quiz finalQuiz = null;
        boolean allFinalQuizzesPassed = true;
        for (Quiz quiz : quizzesOf(courseId)) {
            if (quiz.getLesson() != null || quiz.getStatus() != QuizStatusEnum.published) {
                continue;
            }
            if (finalQuiz == null) {
                finalQuiz = quiz;
            }
            if (!quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, quiz.getId())) {
                allFinalQuizzesPassed = false;
            }
        }
        boolean finalQuizConfigured = finalQuiz != null;

        BigDecimal percentage;
        if (finalQuizConfigured) {
            // 70% lessons / 30% final exam.
            BigDecimal weighted = lessonStepsPct.multiply(BigDecimal.valueOf(0.70));
            if (allFinalQuizzesPassed) {
                weighted = weighted.add(BigDecimal.valueOf(30));
            }
            percentage = weighted.setScale(2, RoundingMode.HALF_UP);
        } else {
            percentage = lessonStepsPct.setScale(2, RoundingMode.HALF_UP);
        }

        return CourseProgressResponse.builder()
                .enrollmentId(enrollment.getId())
                .courseId(courseId)
                .totalLessons(total)
                .completedLessons(completed)
                .totalSteps(totalSteps)
                .completedSteps(completedSteps)
                .completionPercentage(percentage)
                .finalQuizConfigured(finalQuizConfigured)
                .finalQuizPassed(finalQuizConfigured && allFinalQuizzesPassed)
                .finalQuizId(finalQuizConfigured ? finalQuiz.getId() : null)
                .build();
    }

    private List<Quiz> quizzesOf(UUID courseId) {
        List<Quiz> quizzes = quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        return quizzes == null ? List.of() : quizzes;
    }

    private boolean allPublishedQuizzesPassed(UUID userId, UUID courseId) {
        List<Quiz> quizzes = quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        if (quizzes == null || quizzes.isEmpty()) {
            return true;
        }
        for (Quiz q : quizzes) {
            if (q.getStatus() != QuizStatusEnum.published) {
                continue;
            }
            if (!quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, q.getId())) {
                return false;
            }
        }
        return true;
    }
}
