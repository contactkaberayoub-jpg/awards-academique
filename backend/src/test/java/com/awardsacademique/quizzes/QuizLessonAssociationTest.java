package com.awardsacademique.quizzes;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.awardsacademique.lessons.entity.LessonTypeEnum;
import com.awardsacademique.questions.Repository.QuestionRepository;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.dto.request.CreateQuizRequest;
import com.awardsacademique.quizzes.dto.request.UpdateQuizRequest;
import com.awardsacademique.quizzes.dto.response.QuizResponse;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import com.awardsacademique.quizzes.mapper.QuizMapper;
import com.awardsacademique.quizzes.service.impl.QuizServiceImpl;
import com.awardsacademique.quizzes.validation.QuizValidator;
import com.awardsacademique.sections.entity.Section;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Sprint: Quiz→Lesson association integrity. Verifies that a Quiz's lesson
 * (via the existing lesson_id FK) must belong to the SAME course as the quiz,
 * enforced at the service layer on both create and update — the boundary that
 * holds even when the frontend is bypassed with a direct API call.
 */
@ExtendWith(MockitoExtension.class)
class QuizLessonAssociationTest {

    @Mock private QuizRepository quizRepository;
    @Mock private QuizMapper quizMapper;
    @Mock private CourseRepository courseRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private LessonRepository lessonRepository;

    private QuizValidator validator;
    private QuizServiceImpl service;

    @BeforeEach
    void setUp() {
        validator = new QuizValidator(courseRepository, lessonRepository);
        service = new QuizServiceImpl(
                quizRepository, quizMapper, courseRepository, questionRepository,
                authorizationService, validator);
    }

    private User instructor() {
        return User.builder().id(UUID.randomUUID()).build();
    }

    private Course course(UUID id) {
        return Course.builder()
                .id(id)
                .status(CourseStatusEnum.pending)
                .build();
    }

    private Lesson lesson(UUID id, Course course) {
        return Lesson.builder()
                .id(id)
                .status(LessonStatusEnum.draft)
                .lessonType(LessonTypeEnum.text)
                .section(Section.builder().id(UUID.randomUUID()).course(course).build())
                .build();
    }

    // Case 4: create with a valid courseId + lessonId of the SAME course → saved
    @Test
    void create_validCourseAndLesson_saved() {
        User owner = instructor();
        Course course = course(UUID.randomUUID());
        Lesson lesson = lesson(UUID.randomUUID(), course);
        Quiz saved = Quiz.builder().id(UUID.randomUUID()).course(course).lesson(lesson).build();

        when(authorizationService.requireCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndDeletedAtIsNull(course.getId())).thenReturn(Optional.of(course));
        when(authorizationService.ownsCourse(course, owner)).thenReturn(true);
        when(lessonRepository.findByIdAndDeletedAtIsNull(lesson.getId())).thenReturn(Optional.of(lesson));
        when(quizRepository.save(any())).thenReturn(saved);
        when(quizMapper.toResponse(any())).thenReturn(QuizResponse.builder().build());
        when(questionRepository.countByQuizId(any())).thenReturn(0L);

        CreateQuizRequest request = CreateQuizRequest.builder()
                .courseId(course.getId())
                .lessonId(lesson.getId())
                .title("Quiz de la leçon")
                .build();

        assertDoesNotThrow(() -> service.create(request));
        verify(quizRepository).save(argThat(q ->
                q.getCourse().getId().equals(course.getId())
                        && q.getLesson().getId().equals(lesson.getId())));
    }

    // Case 5 (CORE): create with a lessonId belonging to a DIFFERENT course → rejected
    @Test
    void create_lessonFromDifferentCourse_rejected() {
        User owner = instructor();
        Course courseA = course(UUID.randomUUID());
        Course courseB = course(UUID.randomUUID());
        Lesson lessonOfB = lesson(UUID.randomUUID(), courseB);

        when(authorizationService.requireCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseA.getId())).thenReturn(Optional.of(courseA));
        when(authorizationService.ownsCourse(courseA, owner)).thenReturn(true);
        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonOfB.getId())).thenReturn(Optional.of(lessonOfB));

        CreateQuizRequest request = CreateQuizRequest.builder()
                .courseId(courseA.getId())
                .lessonId(lessonOfB.getId())
                .title("Quiz")
                .build();

        assertThrows(IllegalArgumentException.class, () -> service.create(request));
        verify(quizRepository, never()).save(any());
    }

    // Case 6: create with courseId but no lessonId → valid general course quiz
    @Test
    void create_noLesson_validGeneralQuiz() {
        User owner = instructor();
        Course course = course(UUID.randomUUID());
        Quiz saved = Quiz.builder().id(UUID.randomUUID()).course(course).build();

        when(authorizationService.requireCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndDeletedAtIsNull(course.getId())).thenReturn(Optional.of(course));
        when(authorizationService.ownsCourse(course, owner)).thenReturn(true);
        when(quizRepository.save(any())).thenReturn(saved);
        when(quizMapper.toResponse(any())).thenReturn(QuizResponse.builder().build());
        when(questionRepository.countByQuizId(any())).thenReturn(0L);

        CreateQuizRequest request = CreateQuizRequest.builder()
                .courseId(course.getId())
                .title("Quiz général du cours")
                .build();

        assertDoesNotThrow(() -> service.create(request));
        verify(quizRepository).save(argThat(q -> q.getLesson() == null));
    }

    // Case 8: update to a lesson of the SAME course → succeeds
    @Test
    void update_lessonOfSameCourse_succeeds() {
        User owner = instructor();
        UUID quizId = UUID.randomUUID();
        Course course = course(UUID.randomUUID());
        Lesson lesson = lesson(UUID.randomUUID(), course);
        Quiz quiz = Quiz.builder()
                .id(quizId)
                .course(course)
                .status(QuizStatusEnum.draft)
                .build();

        when(authorizationService.requireCurrentUser()).thenReturn(owner);
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        when(authorizationService.ownsCourse(course, owner)).thenReturn(true);
        when(lessonRepository.findByIdAndDeletedAtIsNull(lesson.getId())).thenReturn(Optional.of(lesson));
        when(quizRepository.save(any())).thenReturn(quiz);
        when(quizMapper.toResponse(any())).thenReturn(QuizResponse.builder().build());
        when(questionRepository.countByQuizId(any())).thenReturn(0L);

        UpdateQuizRequest request = UpdateQuizRequest.builder().lessonId(lesson.getId()).build();

        assertDoesNotThrow(() -> service.update(quizId, request));
        assertEquals(lesson.getId(), quiz.getLesson().getId());
    }

    // Case 9 (CORE): update to a lesson of a DIFFERENT course → rejected
    @Test
    void update_lessonFromDifferentCourse_rejected() {
        User owner = instructor();
        UUID quizId = UUID.randomUUID();
        Course courseA = course(UUID.randomUUID());
        Course courseB = course(UUID.randomUUID());
        Lesson lessonOfB = lesson(UUID.randomUUID(), courseB);
        Quiz quiz = Quiz.builder()
                .id(quizId)
                .course(courseA)
                .status(QuizStatusEnum.draft)
                .build();

        when(authorizationService.requireCurrentUser()).thenReturn(owner);
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        when(authorizationService.ownsCourse(courseA, owner)).thenReturn(true);
        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonOfB.getId())).thenReturn(Optional.of(lessonOfB));

        UpdateQuizRequest request = UpdateQuizRequest.builder().lessonId(lessonOfB.getId()).build();

        assertThrows(IllegalArgumentException.class, () -> service.update(quizId, request));
        verify(quizRepository, never()).save(any());
    }

    // Case 10: instructor cannot publish (direct or via update)
    @Test
    void update_statusPublished_nonAdministrator_denied() {
        User owner = instructor();
        UUID quizId = UUID.randomUUID();
        Course course = course(UUID.randomUUID());
        Quiz quiz = Quiz.builder()
                .id(quizId)
                .course(course)
                .status(QuizStatusEnum.draft)
                .build();

        when(authorizationService.requireCurrentUser()).thenReturn(owner);
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        when(authorizationService.ownsCourse(course, owner)).thenReturn(true);
        when(authorizationService.isAdministrator(owner)).thenReturn(false);
        doThrow(new AccessDeniedException("Only administrators can publish lessons"))
                .when(authorizationService).requireCanPublishLesson(owner);

        UpdateQuizRequest request = UpdateQuizRequest.builder().status(QuizStatusEnum.published).build();

        assertThrows(AccessDeniedException.class, () -> service.update(quizId, request));
        verify(quizRepository).findById(quizId);
        verify(quizRepository, never()).save(any());
    }
}
