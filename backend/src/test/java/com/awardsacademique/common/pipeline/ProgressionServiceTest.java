package com.awardsacademique.common.pipeline;

import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.progress.Repository.LessonProgressRepository;
import com.awardsacademique.progress.entity.LessonProgress;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import com.awardsacademique.sections.entity.Section;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Sprint: Lesson -> Quiz mandatory progression. Verifies the sequential unlock decision and the
 * steps-based progress accounting introduced by {@link ProgressionService}.
 */
@ExtendWith(MockitoExtension.class)
class ProgressionServiceTest {

    @Mock private LessonRepository lessonRepository;
    @Mock private LessonProgressRepository lessonProgressRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;

    private ProgressionService service;

    private UUID courseId;
    private UUID sectionId;
    private UUID userId;
    private Section section;
    private Course course;

    @BeforeEach
    void setUp() {
        service = new ProgressionService(
                lessonRepository, lessonProgressRepository, quizRepository, quizAttemptRepository);
        courseId = UUID.randomUUID();
        sectionId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    private Course course() {
        return Course.builder().id(courseId).build();
    }

    private Section section() {
        return Section.builder().id(sectionId).course(course()).displayOrder(0).build();
    }

    private Lesson lesson(UUID id, int order) {
        return Lesson.builder().id(id).section(section()).displayOrder(order).build();
    }

    private Quiz publishedQuiz(UUID id) {
        return Quiz.builder().id(id).status(QuizStatusEnum.published).build();
    }

    private Quiz draftQuiz(UUID id) {
        return Quiz.builder().id(id).status(QuizStatusEnum.draft).build();
    }

    private void stubOrdered(Lesson... lessons) {
        when(lessonRepository.findBySectionCourseIdAndDeletedAtIsNull(courseId))
                .thenReturn(List.of(lessons));
    }

    private void stubCompleted(UUID lessonId, boolean completed) {
        LessonProgress progress = LessonProgress.builder().completed(completed).build();
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId))
                .thenReturn(completed ? Optional.of(progress) : Optional.empty());
    }

    private void stubMandatoryQuiz(UUID lessonId, Optional<Quiz> quizFactory) {
        when(quizRepository.findByLessonId(lessonId)).thenReturn(quizFactory);
    }

    private void stubPassed(UUID quizId, boolean passed) {
        when(quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, quizId))
                .thenReturn(passed);
    }

    // 1. First lesson in the course is always unlocked.
    @Test
    void firstLesson_isUnlocked() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        stubOrdered(l1);
        assertTrue(service.isLessonUnlocked(userId, l1));
    }

    // 2. Lesson 2 is locked while Lesson 1 is not completed.
    @Test
    void lesson2_locked_whenLesson1NotCompleted() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        stubOrdered(l1, l2);
        stubCompleted(l1.getId(), false);

        assertFalse(service.isLessonUnlocked(userId, l2));
    }

    // 3. Lesson 2 is unlocked when Lesson 1 is completed and has no mandatory quiz.
    @Test
    void lesson2_unlocked_whenLesson1Completed_noMandatoryQuiz() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        stubOrdered(l1, l2);
        stubCompleted(l1.getId(), true);
        stubMandatoryQuiz(l1.getId(), Optional.empty());

        assertTrue(service.isLessonUnlocked(userId, l2));
    }

    // 4. A PUBLISHED quiz linked to a completed lesson is a mandatory gate: if not passed, the
    //    next lesson stays locked.
    @Test
    void lesson2_locked_whenLesson1QuizPublishedButNotPassed() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        Quiz q1 = publishedQuiz(UUID.randomUUID());
        stubOrdered(l1, l2);
        stubCompleted(l1.getId(), true);
        stubMandatoryQuiz(l1.getId(), Optional.of(q1));
        stubPassed(q1.getId(), false);

        assertFalse(service.isLessonUnlocked(userId, l2));
    }

    // 5. Passing the linked published quiz unlocks the next lesson.
    @Test
    void lesson2_unlocked_whenLesson1QuizPublishedAndPassed() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        Quiz q1 = publishedQuiz(UUID.randomUUID());
        stubOrdered(l1, l2);
        stubCompleted(l1.getId(), true);
        stubMandatoryQuiz(l1.getId(), Optional.of(q1));
        stubPassed(q1.getId(), true);

        assertTrue(service.isLessonUnlocked(userId, l2));
    }

    // 6. A DRAFT/ARCHIVED quiz linked to a completed lesson is NOT mandatory: it does not gate
    //    the next lesson.
    @Test
    void lesson2_unlocked_whenLesson1QuizIsDraft() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        Quiz draft = draftQuiz(UUID.randomUUID());
        stubOrdered(l1, l2);
        stubCompleted(l1.getId(), true);
        stubMandatoryQuiz(l1.getId(), Optional.of(draft));

        assertTrue(service.isLessonUnlocked(userId, l2));
    }

    // 7. A general (non-lesson-linked) published quiz does NOT gate progress.
    @Test
    void lesson2_unlocked_generalCourseQuizDoesNotBlock() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        stubOrdered(l1, l2);
        stubCompleted(l1.getId(), true);
        stubMandatoryQuiz(l1.getId(), Optional.empty());

        assertTrue(service.isLessonUnlocked(userId, l2));
    }

    // Case 9: 8-step course. Lessons 1,2,4 have published quizzes.
    // Total steps = 5 lessons + 3 mandatory quizzes = 8.
    // Lesson 1 completed but its quiz not passed -> only 1 step satisfied -> 1/8.
    @Test
    void stepCounts_mandatoryQuizzesAddSteps() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        Lesson l3 = lesson(UUID.randomUUID(), 3);
        Lesson l4 = lesson(UUID.randomUUID(), 4);
        Lesson l5 = lesson(UUID.randomUUID(), 5);
        stubOrdered(l1, l2, l3, l4, l5);

        when(quizRepository.existsByLessonIdAndStatus(any(UUID.class), eq(QuizStatusEnum.published)))
                .thenReturn(true, true, false, true, false);

        Quiz q1 = publishedQuiz(UUID.randomUUID());
        Quiz q2 = publishedQuiz(UUID.randomUUID());
        Quiz q4 = publishedQuiz(UUID.randomUUID());
        stubMandatoryQuiz(l1.getId(), Optional.of(q1));
        stubMandatoryQuiz(l2.getId(), Optional.of(q2));
        stubMandatoryQuiz(l3.getId(), Optional.empty());
        stubMandatoryQuiz(l4.getId(), Optional.of(q4));
        stubMandatoryQuiz(l5.getId(), Optional.empty());

        stubCompleted(l1.getId(), true);
        stubCompleted(l2.getId(), false);
        stubCompleted(l3.getId(), false);
        stubCompleted(l4.getId(), false);
        stubCompleted(l5.getId(), false);

        // Only lesson 1 done, quiz 1 not passed.
        stubPassed(q1.getId(), false);
        stubPassed(q2.getId(), false);
        stubPassed(q4.getId(), false);

        assertEquals(8, service.totalStepsOfCourse(courseId));
        assertEquals(1, service.completedStepsForUser(userId, courseId));
    }

    // ==== Final-exam unlock (allLessonStepsSatisfiedForCourse) ====

    // All ordered lessons completed without mandatory quizzes -> final exam is unlocked.
    @Test
    void allLessonStepsSatisfied_allDone_true() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        stubOrdered(l1, l2);
        stubCompleted(l1.getId(), true);
        stubCompleted(l2.getId(), true);
        stubMandatoryQuiz(l1.getId(), Optional.empty());
        stubMandatoryQuiz(l2.getId(), Optional.empty());

        assertTrue(service.allLessonStepsSatisfiedForCourse(userId, courseId));
    }

    // Any lesson not completed keeps the final exam locked.
    @Test
    void allLessonStepsSatisfied_lessonNotCompleted_false() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        Lesson l2 = lesson(UUID.randomUUID(), 2);
        stubOrdered(l1, l2);
        stubCompleted(l1.getId(), true);
        stubCompleted(l2.getId(), false);

        assertFalse(service.allLessonStepsSatisfiedForCourse(userId, courseId));
    }

    // A completed lesson whose published mandatory quiz is not passed also keeps the final
    // exam locked (the lesson step is not satisfied until the quiz is passed).
    @Test
    void allLessonStepsSatisfied_mandatoryQuizNotPassed_false() {
        Lesson l1 = lesson(UUID.randomUUID(), 1);
        stubOrdered(l1);
        stubCompleted(l1.getId(), true);
        Quiz q1 = publishedQuiz(UUID.randomUUID());
        stubMandatoryQuiz(l1.getId(), Optional.of(q1));
        stubPassed(q1.getId(), false);

        assertFalse(service.allLessonStepsSatisfiedForCourse(userId, courseId));
    }
}
