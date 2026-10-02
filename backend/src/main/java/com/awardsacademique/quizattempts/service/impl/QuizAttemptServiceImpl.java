package com.awardsacademique.quizattempts.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.common.pipeline.CourseCompletionPipeline;
import com.awardsacademique.common.pipeline.ProgressionService;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.questions.Repository.QuestionRepository;
import com.awardsacademique.questions.entity.Question;
import com.awardsacademique.questions.entity.QuestionOption;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import com.awardsacademique.quizattempts.dto.request.CreateQuizAttemptRequest;
import com.awardsacademique.quizattempts.dto.request.UpdateQuizAttemptRequest;
import com.awardsacademique.quizattempts.dto.response.QuizAttemptResponse;
import com.awardsacademique.quizattempts.dto.response.StudentOptionResponse;
import com.awardsacademique.quizattempts.dto.response.StudentQuestionResponse;
import com.awardsacademique.quizattempts.dto.response.StudentQuizContentResponse;
import com.awardsacademique.quizattempts.entity.AttemptStatusEnum;
import com.awardsacademique.quizattempts.entity.QuizAttempt;
import com.awardsacademique.quizattempts.exception.QuizAttemptNotFoundException;
import com.awardsacademique.quizattempts.mapper.QuizAttemptMapper;
import com.awardsacademique.quizattempts.service.interfaces.QuizAttemptService;
import com.awardsacademique.quizattempts.utils.QuizAttemptUtils;
import com.awardsacademique.quizattempts.validation.QuizAttemptValidator;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizAttemptServiceImpl implements QuizAttemptService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final QuizAttemptMapper quizAttemptMapper;
    private final QuizAttemptValidator quizAttemptValidator;
    private final AuthorizationService authorizationService;
    private final CourseCompletionPipeline courseCompletionPipeline;
    private final ProgressionService progressionService;

    @Override
    @Transactional
    public QuizAttemptResponse start(CreateQuizAttemptRequest request) {
        User currentUser = requireCurrentUser();
        Quiz quiz = quizAttemptValidator.resolveQuiz(request.getQuizId());
        quizAttemptValidator.validateQuizPublished(quiz, currentUser);
        quizAttemptValidator.validateEnrolledInQuizCourse(quiz, currentUser);
        quizAttemptValidator.validateNoInProgressAttempt(currentUser.getId(), quiz.getId());

        // Course-level quiz (lesson_id IS NULL) = final exam: only unlockable once the student
        // has satisfied every lesson step (the "70% lessons complete" condition). Administrators
        // are exempt so they can always preview the exam.
        if (quiz.getLesson() == null
                && quiz.getCourse() != null
                && !authorizationService.isAdministrator(currentUser)) {
            if (!progressionService.allLessonStepsSatisfiedForCourse(
                    currentUser.getId(), quiz.getCourse().getId())) {
                throw new IllegalStateException(
                        "The final exam unlocks once every lesson of the course is completed");
            }
        }

        long used = quizAttemptRepository.countByUserIdAndQuizId(currentUser.getId(), quiz.getId());
        if (quiz.getMaxAttempts() != null && used >= quiz.getMaxAttempts()) {
            throw new IllegalStateException("Maximum attempts reached for this quiz: " + quiz.getMaxAttempts());
        }

        QuizAttempt attempt = QuizAttempt.builder()
                .user(currentUser)
                .quiz(quiz)
                .score(BigDecimal.ZERO)
                .status(AttemptStatusEnum.in_progress)
                .answers(request.getAnswers() != null ? request.getAnswers() : new HashMap<>())
                .build();
        QuizAttempt saved = quizAttemptRepository.save(attempt);
        return enrichResponse(quizAttemptMapper.toResponse(saved), quiz, used + 1);
    }

    @Override
    @Transactional
    public QuizAttemptResponse submit(UUID attemptId, UpdateQuizAttemptRequest request) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new QuizAttemptNotFoundException(attemptId));
        User currentUser = requireCurrentUser();
        quizAttemptValidator.validateOwnerOrAdmin(attempt, currentUser);
        if (attempt.getStatus() != AttemptStatusEnum.in_progress) {
            throw new IllegalStateException("Only in-progress attempts can be submitted");
        }

        Quiz quiz = attempt.getQuiz();
        List<Question> questions = questionRepository.findByQuizIdOrderByDisplayOrderAsc(quiz.getId());
        // The live DB trigger fn_score_quiz_attempt re-grades on submit using
        // answers ->> question_id = option_id (single-string values). Normalize every answer
        // to its single selected option id so the persisted grade and this Java grade agree.
        Map<String, Object> normalizedAnswers = normalizeAnswers(request.getAnswers());
        BigDecimal computedScore = QuizAttemptUtils.computeScore(questions, normalizedAnswers);

        attempt.setAnswers(normalizedAnswers);
        attempt.setScore(computedScore);
        attempt.setStatus(AttemptStatusEnum.passed);
        attempt.setSubmittedAt(LocalDateTime.now());

        QuizAttempt saved = quizAttemptRepository.save(attempt);
        long attemptsUsed = quizAttemptRepository.countByUserIdAndQuizId(
                saved.getUser().getId(), quiz.getId());
        QuizAttemptResponse response = enrichResponse(
                quizAttemptMapper.toResponse(saved), quiz, attemptsUsed);
        response.setPassed(response.getScore() != null
                && quiz.getPassingScore() != null
                && response.getScore().compareTo(BigDecimal.valueOf(quiz.getPassingScore())) >= 0);

        // After a quiz submission the student may have just crossed the "all published quizzes
        // passed" threshold. Recompute the enrollment completion and potentially auto-issue the
        // certificate (same pipeline as markLessonCompleted).
        UUID courseId = quiz.getCourse() != null ? quiz.getCourse().getId() : null;
        courseCompletionPipeline.recomputeForUserAndCourse(saved.getUser().getId(), courseId);

        return response;
    }

    @Override
    public QuizAttemptResponse getById(UUID id) {
        User currentUser = requireCurrentUser();
        QuizAttempt attempt = quizAttemptRepository.findById(id)
                .orElseThrow(() -> new QuizAttemptNotFoundException(id));
        quizAttemptValidator.validateOwnerOrAdmin(attempt, currentUser);
        long attemptsUsed = quizAttemptRepository.countByUserIdAndQuizId(
                attempt.getUser().getId(), attempt.getQuiz().getId());
        QuizAttemptResponse resp = enrichResponse(
                quizAttemptMapper.toResponse(attempt), attempt.getQuiz(), attemptsUsed);
        resp.setPassed(resp.getScore() != null
                && attempt.getQuiz().getPassingScore() != null
                && resp.getScore().compareTo(BigDecimal.valueOf(attempt.getQuiz().getPassingScore())) >= 0);
        return resp;
    }

    @Override
    public List<QuizAttemptResponse> getMyHistory() {
        User currentUser = requireCurrentUser();
        return quizAttemptRepository.findByUserIdOrderByStartedAtDesc(currentUser.getId())
                .stream()
                .map(a -> {
                    long used = quizAttemptRepository.countByUserIdAndQuizId(
                            a.getUser().getId(), a.getQuiz().getId());
                    QuizAttemptResponse r = enrichResponse(
                            quizAttemptMapper.toResponse(a), a.getQuiz(), used);
                    r.setPassed(r.getScore() != null
                            && a.getQuiz().getPassingScore() != null
                            && r.getScore().compareTo(BigDecimal.valueOf(a.getQuiz().getPassingScore())) >= 0);
                    return r;
                })
                .toList();
    }

    @Override
    public List<QuizAttemptResponse> getMyHistoryByQuiz(UUID quizId) {
        User currentUser = requireCurrentUser();
        Quiz quiz = quizAttemptValidator.resolveQuiz(quizId);
        return quizAttemptRepository
                .findByUserIdAndQuizIdOrderByStartedAtDesc(currentUser.getId(), quiz.getId())
                .stream()
                .map(a -> {
                    long used = quizAttemptRepository.countByUserIdAndQuizId(
                            a.getUser().getId(), a.getQuiz().getId());
                    return enrichResponse(quizAttemptMapper.toResponse(a), a.getQuiz(), used);
                })
                .toList();
    }

    @Override
    public List<QuizAttemptResponse> getHistoryByQuiz(UUID quizId) {
        User currentUser = requireCurrentUser();
        Quiz quiz = quizAttemptValidator.resolveQuiz(quizId);
        quizAttemptValidator.validateCanViewQuizHistory(quiz, currentUser);
        return quizAttemptRepository.findByQuizIdOrderByStartedAtDesc(quiz.getId())
                .stream()
                .map(a -> {
                    long used = quizAttemptRepository.countByUserIdAndQuizId(
                            a.getUser().getId(), a.getQuiz().getId());
                    return enrichResponse(quizAttemptMapper.toResponse(a), a.getQuiz(), used);
                })
                .toList();
    }

    @Override
    public QuizAttemptResponse getBestForQuiz(UUID quizId) {
        User currentUser = requireCurrentUser();
        Quiz quiz = quizAttemptValidator.resolveQuiz(quizId);
        quizAttemptValidator.validateQuizPublished(quiz, currentUser);
        quizAttemptValidator.validateEnrolledInQuizCourse(quiz, currentUser);
        return quizAttemptRepository
                .findBestAttemptForUserOnQuiz(currentUser.getId(), quiz.getId())
                .map(a -> {
                    long used = quizAttemptRepository.countByUserIdAndQuizId(
                            a.getUser().getId(), a.getQuiz().getId());
                    QuizAttemptResponse r = enrichResponse(
                            quizAttemptMapper.toResponse(a), a.getQuiz(), used);
                    r.setPassed(r.getScore() != null
                            && a.getQuiz().getPassingScore() != null
                            && r.getScore().compareTo(BigDecimal.valueOf(a.getQuiz().getPassingScore())) >= 0);
                    return r;
                })
                .orElseGet(() -> {
                    QuizAttemptResponse empty = QuizAttemptResponse.builder()
                            .userId(currentUser.getId())
                            .quizId(quiz.getId())
                            .quizTitle(quiz.getTitle())
                            .courseId(quiz.getCourse() != null ? quiz.getCourse().getId() : null)
                            .lessonId(quiz.getLesson() != null ? quiz.getLesson().getId() : null)
                            .score(BigDecimal.ZERO)
                            .passingScore(quiz.getPassingScore())
                            .attemptsUsed((int) quizAttemptRepository.countByUserIdAndQuizId(
                                    currentUser.getId(), quiz.getId()))
                            .maxAttempts(quiz.getMaxAttempts())
                            .passed(false)
                            .status(AttemptStatusEnum.in_progress.name())
                            .build();
                    return empty;
                });
    }

    @Override
    @Transactional(readOnly = true)
    public StudentQuizContentResponse getStudentQuizContent(UUID quizId) {
        User currentUser = requireCurrentUser();
        Quiz quiz = quizAttemptValidator.resolveQuiz(quizId);
        quizAttemptValidator.validateQuizPublished(quiz, currentUser);
        quizAttemptValidator.validateEnrolledInQuizCourse(quiz, currentUser);

        List<StudentQuestionResponse> questions = questionRepository
                .findByQuizIdOrderByDisplayOrderAsc(quiz.getId())
                .stream()
                .map(q -> StudentQuestionResponse.builder()
                        .id(q.getId())
                        .statement(q.getStatement())
                        .displayOrder(q.getDisplayOrder() == null ? 0 : q.getDisplayOrder())
                        .options(q.getOptions() == null ? java.util.List.of()
                                : q.getOptions().stream()
                                        .sorted(java.util.Comparator
                                                .comparing(o -> o.getDisplayOrder() == null ? 0 : o.getDisplayOrder()))
                                        .map(this::toStudentOption)
                                        .toList())
                        .build())
                .toList();

        return StudentQuizContentResponse.builder()
                .quizId(quiz.getId())
                .quizTitle(quiz.getTitle())
                .courseId(quiz.getCourse() != null ? quiz.getCourse().getId() : null)
                .lessonId(quiz.getLesson() != null ? quiz.getLesson().getId() : null)
                .passingScore(quiz.getPassingScore())
                .maxAttempts(quiz.getMaxAttempts())
                .questions(questions)
                .build();
    }

    private StudentOptionResponse toStudentOption(QuestionOption option) {
        return StudentOptionResponse.builder()
                .id(option.getId())
                .optionText(option.getOptionText())
                .displayOrder(option.getDisplayOrder() == null ? 0 : option.getDisplayOrder())
                .build();
    }

    @Override
    @Transactional
    public void delete(UUID id) {        QuizAttempt attempt = quizAttemptRepository.findById(id)
                .orElseThrow(() -> new QuizAttemptNotFoundException(id));
        User currentUser = requireCurrentUser();
        if (!authorizationService.isAdministrator(currentUser)) {
            throw new AccessDeniedException("Only administrators can delete quiz attempts");
        }
        UUID userId = attempt.getUser() != null ? attempt.getUser().getId() : null;
        UUID courseId = attempt.getQuiz() != null && attempt.getQuiz().getCourse() != null
                ? attempt.getQuiz().getCourse().getId() : null;
        quizAttemptRepository.delete(attempt);
        courseCompletionPipeline.recomputeForUserAndCourse(userId, courseId);
    }

    private Map<String, Object> normalizeAnswers(Map<String, Object> answers) {
        Map<String, Object> result = new HashMap<>();
        if (answers == null) {
            return result;
        }
        for (Map.Entry<String, Object> entry : answers.entrySet()) {
            Object value = entry.getValue();
            String single = null;
            if (value instanceof Collection<?> c) {
                for (Object o : c) {
                    if (o != null && !o.toString().isBlank()) {
                        single = o.toString();
                        break;
                    }
                }
            } else if (value != null) {
                single = value.toString();
            }
            if (single != null && !single.isBlank()) {
                result.put(entry.getKey(), single);
            }
        }
        return result;
    }

    private QuizAttemptResponse enrichResponse(
            QuizAttemptResponse response, Quiz quiz, long attemptsUsed) {
        if (response == null) {
            return null;
        }
        response.setPassingScore(quiz.getPassingScore());
        response.setMaxAttempts(quiz.getMaxAttempts());
        response.setAttemptsUsed(Math.toIntExact(attemptsUsed));
        response.setPassed(response.getScore() != null
                && quiz.getPassingScore() != null
                && response.getScore().compareTo(BigDecimal.valueOf(quiz.getPassingScore())) >= 0
                && AttemptStatusEnum.passed.name().equals(response.getStatus()));
        return response;
    }

    private User requireCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication required");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
    }
}

