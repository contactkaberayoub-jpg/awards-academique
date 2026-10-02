package com.awardsacademique.quizattempts.validation;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import com.awardsacademique.quizattempts.entity.QuizAttempt;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import com.awardsacademique.quizzes.exception.QuizNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class QuizAttemptValidator {

    private final QuizRepository quizRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final AuthorizationService authorizationService;

    public Quiz resolveQuiz(UUID quizId) {
        return quizRepository.findById(quizId)
                .orElseThrow(() -> new QuizNotFoundException(quizId));
    }

    public void validateEnrolledInQuizCourse(Quiz quiz, User user) {
        UUID courseId = quiz.getCourse() != null ? quiz.getCourse().getId() : null;
        if (courseId == null) {
            throw new IllegalArgumentException("Quiz is not attached to a course");
        }
        boolean enrolled = enrollmentRepository
                .findByUserIdAndCourseId(user.getId(), courseId)
                .filter(e -> e.getStatus() == EnrollmentStatusEnum.active)
                .isPresent();
        if (!enrolled) {
            throw new IllegalStateException("You must be enrolled in the course to attempt the quiz");
        }
    }

    public void validateNoInProgressAttempt(UUID userId, UUID quizId) {
        if (quizAttemptRepository.hasInProgressAttempt(userId, quizId)) {
            throw new IllegalStateException("You already have an in-progress attempt for this quiz");
        }
    }

    public void validateOwnerOrAdmin(QuizAttempt attempt, User currentUser) {
        boolean isOwner = attempt.getUser() != null
                && attempt.getUser().getId().equals(currentUser.getId());
        if (!isOwner && !authorizationService.isAdministrator(currentUser)) {
            throw new AccessDeniedException("You can only access your own quiz attempts");
        }
    }

    public void validateCanViewQuizHistory(Quiz quiz, User currentUser) {
        if (authorizationService.isAdministrator(currentUser)) {
            return;
        }
        boolean isInstructor = quiz.getCourse() != null
                && quiz.getCourse().getInstructor() != null
                && quiz.getCourse().getInstructor().getId().equals(currentUser.getId());
        if (!isInstructor) {
            throw new AccessDeniedException("Only administrators or the course instructor can view quiz history");
        }
    }

    /**
     * Non-administrators may only access quizzes that are published. A draft or
     * archived quiz is treated as unavailable so students cannot read or attempt
     * content that is awaiting approval or has been hidden.
     */
    public void validateQuizPublished(Quiz quiz, User currentUser) {
        if (authorizationService.isAdministrator(currentUser)) {
            return;
        }
        if (quiz.getStatus() != QuizStatusEnum.published) {
            throw new QuizNotFoundException(quiz.getId());
        }
    }
}
