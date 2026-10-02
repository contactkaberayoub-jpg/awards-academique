package com.awardsacademique.courses;

import com.awardsacademique.categories.Repository.CategoryRepository;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.mapper.CourseMapper;
import com.awardsacademique.courses.service.impl.CourseServiceImpl;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.awardsacademique.lessons.entity.LessonTypeEnum;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Sprint: publisher-gating. Verifies the admin's single Course publish action
 * atomically cascades to the course's eligible (draft) lessons and quizzes, and
 * that archived/published content is left untouched.
 */
@ExtendWith(MockitoExtension.class)
class CoursePublishCascadeTest {

    @Mock private CourseRepository courseRepository;
    @Mock private CourseMapper courseMapper;
    @Mock private CategoryRepository categoryRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private LessonRepository lessonRepository;
    @Mock private QuizRepository quizRepository;

    private CourseServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CourseServiceImpl(
                courseRepository, courseMapper, categoryRepository,
                authorizationService, lessonRepository, quizRepository);
    }

    private Course course(CourseStatusEnum status) {
        return Course.builder()
                .id(UUID.randomUUID())
                .status(status)
                .published(status == CourseStatusEnum.published)
                .build();
    }

    private Lesson lesson(Course course, LessonStatusEnum status) {
        return Lesson.builder()
                .id(UUID.randomUUID())
                .status(status)
                .lessonType(LessonTypeEnum.text)
                .section(com.awardsacademique.sections.entity.Section.builder()
                        .id(UUID.randomUUID())
                        .course(course)
                        .build())
                .build();
    }

    private Quiz quiz(Course course, QuizStatusEnum status) {
        return Quiz.builder()
                .id(UUID.randomUUID())
                .course(course)
                .status(status)
                .build();
    }

    @Test
    void publish_cascadesDraftLessonsAndQuizzesToPublished() {
        Course course = course(CourseStatusEnum.pending);
        Lesson draftLesson = lesson(course, LessonStatusEnum.draft);

        when(courseRepository.findByIdAndDeletedAtIsNull(course.getId())).thenReturn(Optional.of(course));
        doNothing().when(authorizationService).requireAdministrator();
        when(lessonRepository.findBySectionCourseIdAndDeletedAtIsNull(course.getId()))
                .thenReturn(List.of(draftLesson));
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(course.getId()))
                .thenReturn(List.of());
        when(courseMapper.toResponse(any())).thenReturn(null);

        service.publish(course.getId());

        assertEquals(CourseStatusEnum.published, course.getStatus());
        assertEquals(LessonStatusEnum.published, draftLesson.getStatus());
        verify(courseRepository).save(course);
        verify(lessonRepository).save(draftLesson);
    }

    @Test
    void publish_cascadesDraftQuizzesToPublished() {
        Course course = course(CourseStatusEnum.rejected);
        Quiz draftQuiz = quiz(course, QuizStatusEnum.draft);

        when(courseRepository.findByIdAndDeletedAtIsNull(course.getId())).thenReturn(Optional.of(course));
        doNothing().when(authorizationService).requireAdministrator();
        when(lessonRepository.findBySectionCourseIdAndDeletedAtIsNull(course.getId())).thenReturn(List.of());
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(course.getId()))
                .thenReturn(List.of(draftQuiz));
        when(courseMapper.toResponse(any())).thenReturn(null);

        service.publish(course.getId());

        assertEquals(CourseStatusEnum.published, course.getStatus());
        assertEquals(QuizStatusEnum.published, draftQuiz.getStatus());
        verify(quizRepository).save(draftQuiz);
    }

    @Test
    void publish_skipsArchivedContent() {
        Course course = course(CourseStatusEnum.pending);
        Lesson archivedLesson = lesson(course, LessonStatusEnum.archived);
        Quiz archivedQuiz = quiz(course, QuizStatusEnum.archived);

        when(courseRepository.findByIdAndDeletedAtIsNull(course.getId())).thenReturn(Optional.of(course));
        doNothing().when(authorizationService).requireAdministrator();
        when(lessonRepository.findBySectionCourseIdAndDeletedAtIsNull(course.getId()))
                .thenReturn(List.of(archivedLesson));
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(course.getId()))
                .thenReturn(List.of(archivedQuiz));
        when(courseMapper.toResponse(any())).thenReturn(null);

        service.publish(course.getId());

        assertEquals(LessonStatusEnum.archived, archivedLesson.getStatus());
        assertEquals(QuizStatusEnum.archived, archivedQuiz.getStatus());
        verify(lessonRepository, never()).save(archivedLesson);
        verify(quizRepository, never()).save(archivedQuiz);
    }

    @Test
    void publish_leavesAlreadyPublishedContentUntouched() {
        Course course = course(CourseStatusEnum.pending);
        Lesson publishedLesson = lesson(course, LessonStatusEnum.published);
        Quiz publishedQuiz = quiz(course, QuizStatusEnum.published);

        when(courseRepository.findByIdAndDeletedAtIsNull(course.getId())).thenReturn(Optional.of(course));
        doNothing().when(authorizationService).requireAdministrator();
        when(lessonRepository.findBySectionCourseIdAndDeletedAtIsNull(course.getId()))
                .thenReturn(List.of(publishedLesson));
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(course.getId()))
                .thenReturn(List.of(publishedQuiz));
        when(courseMapper.toResponse(any())).thenReturn(null);

        service.publish(course.getId());

        assertEquals(LessonStatusEnum.published, publishedLesson.getStatus());
        assertEquals(QuizStatusEnum.published, publishedQuiz.getStatus());
        verify(lessonRepository, never()).save(publishedLesson);
        verify(quizRepository, never()).save(publishedQuiz);
    }

    @Test
    void publish_failureRollsBackAtomically() {
        Course course = course(CourseStatusEnum.pending);
        Lesson draftLesson = lesson(course, LessonStatusEnum.draft);
        Quiz draftQuiz = quiz(course, QuizStatusEnum.draft);

        when(courseRepository.findByIdAndDeletedAtIsNull(course.getId())).thenReturn(Optional.of(course));
        doNothing().when(authorizationService).requireAdministrator();
        doThrow(new IllegalStateException("boom")).when(lessonRepository)
                .findBySectionCourseIdAndDeletedAtIsNull(course.getId());

        assertThrows(IllegalStateException.class, () -> service.publish(course.getId()));

        assertEquals(CourseStatusEnum.published, course.getStatus());
        assertEquals(LessonStatusEnum.draft, draftLesson.getStatus());
        assertEquals(QuizStatusEnum.draft, draftQuiz.getStatus());
        verify(courseRepository).save(course);
        verify(lessonRepository, never()).save(draftLesson);
        verify(quizRepository, never()).save(draftQuiz);
    }

    @Test
    void restore_cascadesDraftContentToPublished() {
        Course course = course(CourseStatusEnum.archived);
        Lesson draftLesson = lesson(course, LessonStatusEnum.draft);

        when(courseRepository.findByIdAndDeletedAtIsNull(course.getId())).thenReturn(Optional.of(course));
        doNothing().when(authorizationService).requireAdministrator();
        when(lessonRepository.findBySectionCourseIdAndDeletedAtIsNull(course.getId()))
                .thenReturn(List.of(draftLesson));
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(course.getId())).thenReturn(List.of());
        when(courseMapper.toResponse(any())).thenReturn(null);

        service.restore(course.getId());

        assertEquals(CourseStatusEnum.published, course.getStatus());
        assertEquals(LessonStatusEnum.published, draftLesson.getStatus());
        verify(lessonRepository).save(draftLesson);
    }

    @Test
    void publish_nonAdministrator_denied() {
        Course course = course(CourseStatusEnum.pending);

        doThrow(new org.springframework.security.access.AccessDeniedException("denied"))
                .when(authorizationService).requireAdministrator();

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.publish(course.getId()));

        assertEquals(CourseStatusEnum.pending, course.getStatus());
        verify(courseRepository, never()).save(course);
        verify(lessonRepository, never()).save(any());
        verify(quizRepository, never()).save(any());
    }
}
