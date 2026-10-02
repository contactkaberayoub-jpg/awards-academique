package com.awardsacademique.quizattempts.utils;

import com.awardsacademique.questions.entity.Question;
import com.awardsacademique.questions.entity.QuestionOption;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class QuizAttemptUtils {

    public static BigDecimal computeScore(
            List<Question> questions,
            Map<String, Object> userAnswers
    ) {
        if (questions == null || questions.isEmpty()) {
            return BigDecimal.ZERO;
        }
        long correct = 0;
        for (Question question : questions) {
            UUID qId = question.getId();
            Set<UUID> correctOptionIds = new HashSet<>(extractCorrectOptionIds(question));
            if (correctOptionIds.isEmpty()) {
                continue;
            }
            Set<UUID> userSelection = extractUserSelection(userAnswers, qId);
            if (userSelection.equals(correctOptionIds)) {
                correct++;
            }
        }
        return BigDecimal.valueOf(correct)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(questions.size()), 2, RoundingMode.HALF_UP);
    }

    private static Collection<UUID> extractCorrectOptionIds(Question question) {
        if (question.getOptions() == null) {
            return java.util.Collections.emptyList();
        }
        return question.getOptions().stream()
                .filter(QuestionOption::isCorrect)
                .map(QuestionOption::getId)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private static Set<UUID> extractUserSelection(Map<String, Object> answers, UUID questionId) {
        if (answers == null || questionId == null) {
            return new HashSet<>();
        }
        Object raw = answers.get(questionId.toString());
        if (raw == null) {
            return new HashSet<>();
        }
        Set<UUID> out = new HashSet<>();
        if (raw instanceof Collection<?> c) {
            for (Object o : c) {
                parseUuid(String.valueOf(o)).ifPresent(out::add);
            }
        } else {
            parseUuid(String.valueOf(raw)).ifPresent(out::add);
        }
        return out;
    }

    private static java.util.Optional<UUID> parseUuid(String value) {
        try {
            return java.util.Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException ex) {
            return java.util.Optional.empty();
        }
    }
}
