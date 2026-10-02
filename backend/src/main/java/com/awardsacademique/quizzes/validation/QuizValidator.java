package com.awardsacademique.quizzes.validation;

import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.lessons.exception.LessonNotFoundException;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Encapsulates business validation rules for quiz operations.
 */
@Component
@RequiredArgsConstructor
public class QuizValidator {

    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;

    public Course resolveCourse(UUID courseId) {
        return courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }

    public Lesson resolveLesson(UUID lessonId, UUID courseId) {
        if (lessonId == null) {
            return null;
        }
        Lesson lesson = lessonRepository.findByIdAndDeletedAtIsNull(lessonId)
                .orElseThrow(() -> new LessonNotFoundException(lessonId));
        if (courseId != null && !lesson.getSection().getCourse().getId().equals(courseId)) {
            throw new IllegalArgumentException("The lesson does not belong to the selected course");
        }
        return lesson;
    }

    public void validatePublish(QuizStatusEnum currentStatus) {
        if (currentStatus != QuizStatusEnum.draft && currentStatus != QuizStatusEnum.archived) {
            throw new IllegalStateException("Only draft or archived quizzes can be published");
        }
    }

    public void validateArchive(QuizStatusEnum currentStatus) {
        if (currentStatus != QuizStatusEnum.published) {
            throw new IllegalStateException("Only published quizzes can be archived");
        }
    }
}
