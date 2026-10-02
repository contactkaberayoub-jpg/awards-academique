package com.awardsacademique.common.pipeline;

import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.progress.Repository.LessonProgressRepository;
import com.awardsacademique.progress.entity.LessonProgress;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Single owner of the sequential "playing order" of a course and of the unlock decision for a
 * lesson.
 *
 * <p>A lesson is unlocked for a given student when every lesson that comes before it in the
 * flat course order (sorted by section display order, then lesson display order) is completed
 * and, when that preceding lesson is linked to a PUBLISHED quiz, that quiz has at least one
 * passing attempt. This makes a published quiz linked to a lesson a mandatory gate before the
 * NEXT lesson can be opened.</p>
 */
@Component
@RequiredArgsConstructor
public class ProgressionService {

    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;

    /**
     * The flat, sequential list of non-deleted lessons of a course,
     * sorted by (section display order, lesson display order).
     */
    public List<Lesson> orderedLessonsOfCourse(UUID courseId) {
        return lessonRepository.findBySectionCourseIdAndDeletedAtIsNull(courseId).stream()
                .sorted(Comparator
                        .comparing((Lesson l) -> l.getSection() == null || l.getSection().getDisplayOrder() == null
                                ? Integer.MAX_VALUE : l.getSection().getDisplayOrder())
                        .thenComparing(l -> l.getDisplayOrder() == null ? Integer.MAX_VALUE : l.getDisplayOrder()))
                .toList();
    }

    /**
     * The PUBLISHED quiz linked to the given lesson, if any. Draft/archived linked quizzes do not
     * gate anything (they are not mandatory).
     */
    public Optional<Quiz> publishedQuizForLesson(UUID lessonId) {
        return quizRepository.findByLessonId(lessonId)
                .filter(q -> q.getStatus() == QuizStatusEnum.published);
    }

    public boolean lessonHasMandatoryQuiz(Lesson lesson) {
        return lesson != null
                && lesson.getId() != null
                && quizRepository.existsByLessonIdAndStatus(lesson.getId(), QuizStatusEnum.published);
    }

    public boolean isLessonCompleted(UUID userId, UUID lessonId) {
        return lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)
                .map(LessonProgress::isCompleted)
                .orElse(false);
    }

    public boolean isQuizPassed(UUID userId, UUID quizId) {
        return quizAttemptRepository.existsPassedAttemptForUserOnQuiz(userId, quizId);
    }

    /**
     * True when the student has satisfied every requirement of the given lesson itself:
     * the lesson must be completed and, if it links a published quiz, that quiz must be passed.
     */
    public boolean isLessonStepSatisfied(UUID userId, Lesson lesson) {
        if (lesson == null || lesson.getId() == null) {
            return false;
        }
        if (!isLessonCompleted(userId, lesson.getId())) {
            return false;
        }
        Optional<Quiz> mandatory = publishedQuizForLesson(lesson.getId());
        return mandatory.isEmpty() || isQuizPassed(userId, mandatory.get().getId());
    }

    /**
     * Unlock decision: a lesson is unlocked when every lesson strictly before it in the flat
     * course order has its step satisfied (completed + its linked published quiz passed).
     */
    public boolean isLessonUnlocked(UUID userId, Lesson lesson) {
        if (lesson == null || lesson.getSection() == null || lesson.getSection().getCourse() == null) {
            return true;
        }
        UUID courseId = lesson.getSection().getCourse().getId();
        List<Lesson> ordered = orderedLessonsOfCourse(courseId);
        for (Lesson candidate : ordered) {
            if (candidate.getId() != null && candidate.getId().equals(lesson.getId())) {
                return true;
            }
            if (!isLessonStepSatisfied(userId, candidate)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Number of required steps in the course: every lesson plus one extra step for each lesson
     * that owns a published (mandatory) quiz.
     */
    public long totalStepsOfCourse(UUID courseId) {
        List<Lesson> ordered = orderedLessonsOfCourse(courseId);
        long withMandatoryQuiz = ordered.stream().filter(this::lessonHasMandatoryQuiz).count();
        return ordered.size() + withMandatoryQuiz;
    }

    /**
     * True when the student has satisfied every lesson step of the course (every ordered lesson
     * completed and, for lessons owning a published quiz, that quiz passed). This is the
     * "70% lessons complete" condition that unlocks the course-level final exam.
     */
    public boolean allLessonStepsSatisfiedForCourse(UUID userId, UUID courseId) {
        return orderedLessonsOfCourse(courseId).stream()
                .allMatch(lesson -> isLessonStepSatisfied(userId, lesson));
    }

    /**
     * Number of satisfied steps for the student on the course: completed lessons plus passed
     * published mandatory quizzes.
     */
    public long completedStepsForUser(UUID userId, UUID courseId) {
        List<Lesson> ordered = orderedLessonsOfCourse(courseId);
        long count = 0;
        for (Lesson lesson : ordered) {
            if (isLessonCompleted(userId, lesson.getId())) {
                count++;
            }
            Optional<Quiz> mandatory = publishedQuizForLesson(lesson.getId());
            if (mandatory.isPresent() && isQuizPassed(userId, mandatory.get().getId())) {
                count++;
            }
        }
        return count;
    }
}
