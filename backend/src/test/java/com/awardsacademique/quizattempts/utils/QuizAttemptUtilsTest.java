package com.awardsacademique.quizattempts.utils;

import com.awardsacademique.questions.entity.Question;
import com.awardsacademique.questions.entity.QuestionOption;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class QuizAttemptUtilsTest {

    private QuestionOption option(String id, boolean correct) {
        return QuestionOption.builder()
                .id(UUID.randomUUID())
                .isCorrect(correct)
                .build();
    }

    private Question question(String id, List<QuestionOption> options) {
        return Question.builder()
                .id(UUID.fromString(id))
                .options(options)
                .build();
    }

    @Test
    void computeScore_allCorrect_returns100() {
        Question q1 = question("00000000-0000-0000-0000-000000000001", List.of(
                option("a", true), option("b", false)));
        Question q2 = question("00000000-0000-0000-0000-000000000002", List.of(
                option("c", true), option("d", false)));
        List<Question> questions = List.of(q1, q2);

        Map<String, Object> answers = new HashMap<>();
        answers.put(q1.getId().toString(), List.of(
                q1.getOptions().get(0).getId().toString()));
        answers.put(q2.getId().toString(), List.of(
                q2.getOptions().get(0).getId().toString()));

        assertEquals(BigDecimal.valueOf(100).setScale(2), QuizAttemptUtils.computeScore(questions, answers));
    }

    @Test
    void computeScore_halfCorrect_returns50() {
        Question q1 = question("00000000-0000-0000-0000-000000000003", List.of(
                option("a", true), option("b", false)));
        Question q2 = question("00000000-0000-0000-0000-000000000004", List.of(
                option("c", true), option("d", false)));
        List<Question> questions = List.of(q1, q2);

        Map<String, Object> answers = new HashMap<>();
        // q1 correct, q2 wrong
        answers.put(q1.getId().toString(), List.of(
                q1.getOptions().get(0).getId().toString()));
        answers.put(q2.getId().toString(), List.of(
                q2.getOptions().get(1).getId().toString()));

        BigDecimal expected = BigDecimal.valueOf(50).setScale(2);
        assertEquals(expected, QuizAttemptUtils.computeScore(questions, answers));
    }

    @Test
    void computeScore_noneCorrect_returns0() {
        Question q1 = question("00000000-0000-0000-0000-000000000005", List.of(
                option("a", true), option("b", false)));
        List<Question> questions = List.of(q1);

        Map<String, Object> answers = new HashMap<>();
        answers.put(q1.getId().toString(), List.of(
                q1.getOptions().get(1).getId().toString()));

        assertEquals(BigDecimal.ZERO.setScale(2), QuizAttemptUtils.computeScore(questions, answers));
    }

    @Test
    void computeScore_singleAnswerString_isAccepted() {
        Question q1 = question("00000000-0000-0000-0000-000000000006", List.of(
                option("a", true), option("b", false)));
        List<Question> questions = List.of(q1);

        Map<String, Object> answers = new HashMap<>();
        answers.put(q1.getId().toString(), q1.getOptions().get(0).getId().toString());

        assertEquals(BigDecimal.valueOf(100).setScale(2), QuizAttemptUtils.computeScore(questions, answers));
    }
}
