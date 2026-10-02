package com.awardsacademique.quizzes;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.questions.Repository.QuestionRepository;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.dto.request.CreateQuizRequest;
import com.awardsacademique.quizzes.dto.response.QuizResponse;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.mapper.QuizMapper;
import com.awardsacademique.quizzes.service.impl.QuizServiceImpl;
import com.awardsacademique.quizzes.validation.QuizValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Sprint: final course quiz. A course-level quiz (lesson_id IS NULL) is the course's final
 * exam and only ONE is allowed per course, so the 70/30 completion model stays unambiguous.
 */
@ExtendWith(MockitoExtension.class)
class FinalQuizDuplicatesTest {

    @Mock private QuizRepository quizRepository;
    @Mock private QuizMapper quizMapper;
    @Mock private CourseRepository courseRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private AuthorizationService authorizationService;
    @Mock private QuizValidator quizValidator;

    private QuizServiceImpl service;
    private UUID courseId;
    private Course course;
    private User instructor;

    @BeforeEach
    void setUp() {
        service = new QuizServiceImpl(
                quizRepository, quizMapper, courseRepository,
                questionRepository, authorizationService, quizValidator);
        courseId = UUID.randomUUID();
        course = Course.builder().id(courseId).build();
        instructor = User.builder().id(UUID.randomUUID()).build();
    }

    private void stubOwner() {
        when(authorizationService.requireCurrentUser()).thenReturn(instructor);
        when(quizValidator.resolveCourse(courseId)).thenReturn(course);
        when(authorizationService.isAdministrator(instructor)).thenReturn(false);
        when(authorizationService.ownsCourse(course, instructor)).thenReturn(true);
    }

    // A second course-level quiz for the same course is rejected (no duplicate final exams).
    @Test
    void createCourseLevelQuiz_secondOne_throwsDuplicate() {
        stubOwner();
        when(quizValidator.resolveLesson(null, courseId)).thenReturn(null);
        when(quizRepository.existsByCourseIdAndLessonIsNull(courseId)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () ->
                service.create(CreateQuizRequest.builder()
                        .courseId(courseId).lessonId(null).title("Examen final").build()));
    }

    // The first course-level quiz is accepted and persisted with its config.
    @Test
    void createCourseLevelQuiz_firstOne_allowed() {
        stubOwner();
        when(quizValidator.resolveLesson(null, courseId)).thenReturn(null);
        when(quizRepository.existsByCourseIdAndLessonIsNull(courseId)).thenReturn(false);

        Quiz saved = Quiz.builder().id(UUID.randomUUID()).course(course).title("Examen final").build();
        when(quizRepository.save(any(Quiz.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(quizMapper.toResponse(any(Quiz.class))).thenReturn(new QuizResponse());
        when(questionRepository.countByQuizId(any())).thenReturn(0L);

        QuizResponse response = assertDoesNotThrow(() ->
                service.create(CreateQuizRequest.builder()
                        .courseId(courseId).lessonId(null).title("Examen final")
                        .passingScore(80).maxAttempts(2).build()));

        assertEquals(0, response.getQuestionCount());
    }

    // Lesson-linked quizzes are NOT final exams and remain allowed even when a final exam
    // already exists for the course (existing lesson-quiz behavior is preserved).
    @Test
    void createLessonLinkedQuiz_allowedEvenWhenFinalQuizExists() {
        stubOwner();
        Lesson lesson = Lesson.builder().id(UUID.randomUUID()).build();
        when(quizValidator.resolveLesson(lesson.getId(), courseId)).thenReturn(lesson);

        Quiz saved = Quiz.builder().id(UUID.randomUUID()).course(course).lesson(lesson).title("Quiz de leçon").build();
        when(quizRepository.save(any(Quiz.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(quizMapper.toResponse(any(Quiz.class))).thenReturn(new QuizResponse());
        when(questionRepository.countByQuizId(any())).thenReturn(0L);

        assertDoesNotThrow(() ->
                service.create(CreateQuizRequest.builder()
                        .courseId(courseId).lessonId(lesson.getId()).title("Quiz de leçon").build()));
    }
}