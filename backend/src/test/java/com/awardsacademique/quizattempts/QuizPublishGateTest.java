package com.awardsacademique.quizattempts;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import com.awardsacademique.quizattempts.validation.QuizAttemptValidator;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import com.awardsacademique.quizzes.exception.QuizNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

/**
 * Sprint: publisher-gating. Non-administrators may only attempt/read quizzes
 * that are published; draft or archived quizzes are denied by the backend.
 */
@ExtendWith(MockitoExtension.class)
class QuizPublishGateTest {

    private QuizAttemptValidator validator;

    @Mock private QuizRepository quizRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private AuthorizationService authorizationService;

    @BeforeEach
    void setUp() {
        validator = new QuizAttemptValidator(
                quizRepository, enrollmentRepository, quizAttemptRepository, authorizationService);
    }

    private User student() {
        return User.builder().id(UUID.randomUUID()).build();
    }

    private Quiz quiz(QuizStatusEnum status) {
        return Quiz.builder().id(UUID.randomUUID()).status(status).build();
    }

    @Test
    void validateQuizPublished_student_draftQuiz_denied() {
        User u = student();
        when(authorizationService.isAdministrator(u)).thenReturn(false);
        assertThrows(QuizNotFoundException.class, () ->
                validator.validateQuizPublished(quiz(QuizStatusEnum.draft), u));
    }

    @Test
    void validateQuizPublished_student_archivedQuiz_denied() {
        User u = student();
        when(authorizationService.isAdministrator(u)).thenReturn(false);
        assertThrows(QuizNotFoundException.class, () ->
                validator.validateQuizPublished(quiz(QuizStatusEnum.archived), u));
    }

    @Test
    void validateQuizPublished_student_publishedQuiz_allowed() {
        User u = student();
        when(authorizationService.isAdministrator(u)).thenReturn(false);
        assertDoesNotThrow(() ->
                validator.validateQuizPublished(quiz(QuizStatusEnum.published), u));
    }

    @Test
    void validateQuizPublished_admin_anyStatus_allowed() {
        User admin = student();
        when(authorizationService.isAdministrator(admin)).thenReturn(true);
        assertDoesNotThrow(() ->
                validator.validateQuizPublished(quiz(QuizStatusEnum.draft), admin));
        assertDoesNotThrow(() ->
                validator.validateQuizPublished(quiz(QuizStatusEnum.archived), admin));
    }
}
