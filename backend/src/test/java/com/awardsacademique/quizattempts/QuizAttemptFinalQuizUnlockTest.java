package com.awardsacademique.quizattempts;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.pipeline.CourseCompletionPipeline;
import com.awardsacademique.common.pipeline.ProgressionService;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.questions.Repository.QuestionRepository;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import com.awardsacademique.quizattempts.dto.request.CreateQuizAttemptRequest;
import com.awardsacademique.quizattempts.entity.QuizAttempt;
import com.awardsacademique.quizattempts.mapper.QuizAttemptMapper;
import com.awardsacademique.quizattempts.service.impl.QuizAttemptServiceImpl;
import com.awardsacademique.quizattempts.validation.QuizAttemptValidator;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Sprint: final course quiz. A course-level quiz (lesson_id IS NULL) is the final exam: a
 * student may only start it once every lesson step of the course is satisfied (the "70%
 * lessons complete" condition). Lesson-linked quizzes are untouched by the gate.
 */
@ExtendWith(MockitoExtension.class)
class QuizAttemptFinalQuizUnlockTest {

    private static final String EMAIL = "student@test.com";

    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private QuizAttemptMapper quizAttemptMapper;
    @Mock private QuizAttemptValidator quizAttemptValidator;
    @Mock private AuthorizationService authorizationService;
    @Mock private CourseCompletionPipeline courseCompletionPipeline;
    @Mock private ProgressionService progressionService;

    private QuizAttemptServiceImpl service;
    private UUID userId;
    private UUID courseId;
    private User user;
    private Course course;

    @BeforeEach
    void setUp() {
        service = new QuizAttemptServiceImpl(
                quizAttemptRepository, quizRepository, questionRepository, enrollmentRepository,
                userRepository, quizAttemptMapper, quizAttemptValidator, authorizationService,
                courseCompletionPipeline, progressionService);
        userId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        user = User.builder().id(userId).build();
        course = Course.builder().id(courseId).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, "password", java.util.List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void stubStudentFor(Quiz quiz) {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(quizAttemptValidator.resolveQuiz(quiz.getId())).thenReturn(quiz);
    }

    private void stubAttemptCounter(Quiz quiz) {
        when(quizAttemptRepository.countByUserIdAndQuizId(userId, quiz.getId())).thenReturn(0L);
    }

    private Quiz finalQuiz() {
        return Quiz.builder().id(UUID.randomUUID()).course(course)
                .title("Examen final").status(QuizStatusEnum.published).build();
    }

    // Some lessons are still pending -> the final exam cannot be started and no attempt is saved.
    @Test
    void startFinalQuiz_lessonsNotAllDone_throwsAndSavesNothing() {
        Quiz quiz = finalQuiz();
        stubStudentFor(quiz);
        when(authorizationService.isAdministrator(user)).thenReturn(false);
        when(progressionService.allLessonStepsSatisfiedForCourse(userId, courseId)).thenReturn(false);

        assertThrows(IllegalStateException.class, () ->
                service.start(CreateQuizAttemptRequest.builder().quizId(quiz.getId()).build()));

        verify(quizAttemptRepository, never()).save(any(QuizAttempt.class));
    }

    // Every lesson step satisfied -> the final exam is started and the attempt is persisted.
    @Test
    void startFinalQuiz_allLessonsDone_allowed() {
        Quiz quiz = finalQuiz();
        stubStudentFor(quiz);
        stubAttemptCounter(quiz);
        when(authorizationService.isAdministrator(user)).thenReturn(false);
        when(progressionService.allLessonStepsSatisfiedForCourse(userId, courseId)).thenReturn(true);
        when(quizAttemptRepository.save(any(QuizAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.start(CreateQuizAttemptRequest.builder().quizId(quiz.getId()).build());

        verify(quizAttemptRepository).save(any(QuizAttempt.class));
    }

    // An administrator can always start the final exam (preview/troubleshooting), bypassing
    // the lesson-completion gate.
    @Test
    void startFinalQuiz_adminBypassesLessonGate() {
        Quiz quiz = finalQuiz();
        stubStudentFor(quiz);
        stubAttemptCounter(quiz);
        when(authorizationService.isAdministrator(user)).thenReturn(true);
        when(quizAttemptRepository.save(any(QuizAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.start(CreateQuizAttemptRequest.builder().quizId(quiz.getId()).build());

        verify(quizAttemptRepository).save(any(QuizAttempt.class));
        verify(progressionService, never())
                .allLessonStepsSatisfiedForCourse(userId, courseId);
    }

    // Lesson-linked quizzes never go through the final-exam unlock gate.
    @Test
    void startLessonLinkedQuiz_noFinalGateApplied() {
        Quiz lessonQuiz = Quiz.builder().id(UUID.randomUUID()).course(course)
                .lesson(Lesson.builder().id(UUID.randomUUID()).build())
                .title("Quiz de leçon").status(QuizStatusEnum.published).build();
        stubStudentFor(lessonQuiz);
        stubAttemptCounter(lessonQuiz);
        when(quizAttemptRepository.save(any(QuizAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.start(CreateQuizAttemptRequest.builder().quizId(lessonQuiz.getId()).build());

        verify(quizAttemptRepository).save(any(QuizAttempt.class));
        verify(progressionService, never())
                .allLessonStepsSatisfiedForCourse(userId, courseId);
    }
}