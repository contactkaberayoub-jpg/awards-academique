package com.awardsacademique.questions.validation;

import com.awardsacademique.questions.Repository.QuestionRepository;
import com.awardsacademique.questions.dto.request.QuestionOptionRequest;
import com.awardsacademique.questions.entity.Question;
import com.awardsacademique.questions.exception.QuestionNotFoundException;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.exception.QuizNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class QuestionValidator {

    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;

    public Quiz resolveQuiz(UUID quizId) {
        return quizRepository.findById(quizId)
                .orElseThrow(() -> new QuizNotFoundException(quizId));
    }

    public Question resolveQuestion(UUID id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new QuestionNotFoundException(id));
    }

    public void ensureUniqueDisplayOrder(UUID quizId, Integer displayOrder, UUID excludeQuestionId) {
        if (displayOrder == null) {
            return;
        }
        List<Question> siblings = questionRepository.findByQuizIdOrderByDisplayOrderAsc(quizId);
        boolean conflict = siblings.stream()
                .anyMatch(q -> !q.getId().equals(excludeQuestionId)
                        && displayOrder.equals(q.getDisplayOrder()));
        if (conflict) {
            throw new IllegalStateException(
                    "Another question already uses displayOrder=" + displayOrder + " in this quiz");
        }
    }

    public void validateAnswerChoices(List<QuestionOptionRequest> options) {
        if (options == null || options.size() < 2) {
            throw new IllegalArgumentException("At least two answer options are required");
        }
        long blank = options.stream()
                .filter(o -> o == null || o.getOptionText() == null || o.getOptionText().isBlank())
                .count();
        if (blank > 0) {
            throw new IllegalArgumentException("Answer option text cannot be empty");
        }
        boolean anyCorrect = options.stream()
                .anyMatch(option -> Boolean.TRUE.equals(option.getIsCorrect()));
        if (!anyCorrect) {
            throw new IllegalArgumentException("At least one answer option must be marked as correct");
        }
    }
}
