package com.awardsacademique.questions.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.questions.Repository.QuestionRepository;
import com.awardsacademique.questions.dto.request.CreateQuestionRequest;
import com.awardsacademique.questions.dto.request.QuestionOptionRequest;
import com.awardsacademique.questions.dto.request.UpdateQuestionRequest;
import com.awardsacademique.questions.dto.response.QuestionResponse;
import com.awardsacademique.questions.entity.Question;
import com.awardsacademique.questions.entity.QuestionOption;
import com.awardsacademique.questions.mapper.QuestionMapper;
import com.awardsacademique.questions.service.interfaces.QuestionService;
import com.awardsacademique.questions.validation.QuestionValidator;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuestionServiceImpl implements QuestionService {

    private final QuestionRepository questionRepository;
    private final QuestionMapper questionMapper;
    private final AuthorizationService authorizationService;
    private final QuestionValidator questionValidator;

    private void requireCanManage(Quiz quiz, User user) {
        if (!authorizationService.isAdministrator(user) && !authorizationService.ownsCourse(quiz.getCourse(), user)) {
            throw new AccessDeniedException("You can only manage questions for your own courses");
        }
    }

    private List<QuestionOption> toOptions(Question question, List<QuestionOptionRequest> optionRequests) {
        questionValidator.validateAnswerChoices(optionRequests);

        List<QuestionOption> options = new ArrayList<>();
        int order = 0;
        for (QuestionOptionRequest request : optionRequests) {
            QuestionOption option = QuestionOption.builder()
                    .question(question)
                    .optionText(request.getOptionText())
                    .isCorrect(Boolean.TRUE.equals(request.getIsCorrect()))
                    .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : order)
                    .build();
            options.add(option);
            order++;
        }
        return options;
    }

    @Override
    @Transactional
    public QuestionResponse create(UUID quizId, CreateQuestionRequest request) {
        Quiz quiz = questionValidator.resolveQuiz(quizId);
        User currentUser = authorizationService.requireCurrentUser();
        requireCanManage(quiz, currentUser);

        questionValidator.ensureUniqueDisplayOrder(quizId, request.getDisplayOrder(), null);

        Question question = Question.builder()
                .quiz(quiz)
                .statement(request.getStatement())
                .explanation(request.getExplanation())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        question.setOptions(toOptions(question, request.getOptions()));

        Question saved = questionRepository.save(question);
        return questionMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuestionResponse> getByQuiz(UUID quizId) {
        Quiz quiz = questionValidator.resolveQuiz(quizId);
        User currentUser = authorizationService.requireCurrentUser();
        requireCanManage(quiz, currentUser);

        return questionRepository.findByQuizIdOrderByDisplayOrderAsc(quizId).stream()
                .map(questionMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public QuestionResponse update(UUID id, UpdateQuestionRequest request) {
        Question question = questionValidator.resolveQuestion(id);
        User currentUser = authorizationService.requireCurrentUser();
        requireCanManage(question.getQuiz(), currentUser);

        if (question.getQuiz().getStatus() == QuizStatusEnum.published
                && !authorizationService.isAdministrator(currentUser)) {
            throw new AccessDeniedException("Questions of published quizzes can only be modified by administrators");
        }

        if (request.getDisplayOrder() != null) {
            questionValidator.ensureUniqueDisplayOrder(
                    question.getQuiz().getId(), request.getDisplayOrder(), question.getId());
        }

        if (request.getStatement() != null) {
            question.setStatement(request.getStatement());
        }
        if (request.getExplanation() != null) {
            question.setExplanation(request.getExplanation());
        }
        if (request.getDisplayOrder() != null) {
            question.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getOptions() != null) {
            question.getOptions().clear();
            question.getOptions().addAll(toOptions(question, request.getOptions()));
        }

        return questionMapper.toResponse(questionRepository.save(question));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Question question = questionValidator.resolveQuestion(id);
        User currentUser = authorizationService.requireCurrentUser();
        Course course = question.getQuiz().getCourse();
        authorizationService.requireCanModifyCourse(course, currentUser);

        questionRepository.delete(question);
    }
}

